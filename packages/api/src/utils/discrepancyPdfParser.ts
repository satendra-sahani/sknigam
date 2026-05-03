import { PDFParse } from 'pdf-parse';
import { DISCREPANCY_REASONS, DiscrepancyReasonKey } from '../models/VoterDiscrepancy';
import { transliterateHindi } from './hindiTransliterate';

export interface ParsedDiscrepancyRow {
  voterSerialNumber: number;
  partSerialNumber?: number;
  epicNumber: string;
  voterNameHi: string;
  voterNameEn: string;
  age?: number;
  genderHi?: 'पुरुष' | 'महिला' | 'अन्य';
  gender?: 'M' | 'F' | 'T';
  discrepancyReasonHi: string[];
  discrepancyReasonKey: DiscrepancyReasonKey[];
  discrepancyReasonEn: string[];
}

export interface ParsedDiscrepancyPdf {
  assemblyConstituencyNumber: number;
  assemblyConstituency: string;        // English / romanized
  assemblyConstituencyHi?: string;     // Hindi as printed
  partNumber: number;
  partNameHi?: string;
  partNameEn?: string;
  rows: ParsedDiscrepancyRow[];
  warnings: string[];
}

function normalise(line: string): string {
  return line
    .replace(/[\u00a0\u200b\u200c\u200d]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hiToAsciiDigits(s: string): string {
  const map: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  };
  return s.replace(/[०-९]/g, (c) => map[c] ?? c);
}

// The PDF's text extraction yields Devanagari glyphs in visual order, so the
// i-matra (ि) appears before its consonant.  That means "पुरुष" can appear as
// "पुरु ष" and "महिला" as "मिहला".  We accept both logical-order and
// visual-order spellings.
const GENDER_MATCHERS: Array<{ re: RegExp; hi: 'पुरुष' | 'महिला' | 'अन्य'; en: 'M' | 'F' | 'T' }> = [
  { re: /पुरु\s*ष/,          hi: 'पुरुष', en: 'M' },
  { re: /म\s*(िह|हि)ला/,     hi: 'महिला', en: 'F' },
  { re: /स्त्\s*री/,         hi: 'महिला', en: 'F' },
  { re: /अन्य/,              hi: 'अन्य',  en: 'T' },
  { re: /ट्रा\s*स?ं?\s*ज/,   hi: 'अन्य',  en: 'T' },
];

function detectGender(text: string): { hi?: 'पुरुष' | 'महिला' | 'अन्य'; en?: 'M' | 'F' | 'T'; matched?: string; index?: number } {
  for (const m of GENDER_MATCHERS) {
    const match = text.match(m.re);
    if (match && match.index !== undefined) {
      return { hi: m.hi, en: m.en, matched: match[0], index: match.index };
    }
  }
  return {};
}

function canonicaliseReason(phrase: string): DiscrepancyReasonKey | null {
  const cleaned = phrase.replace(/\s+/g, '');

  // Name mismatch — PDF may show "नाम मे िभन्नता" (visual) or "नाम मे भिन्नता"
  if (/नाममे(िभ|भि)न्नता/.test(cleaned)) return 'name_mismatch';

  // Unmapped with last SIR — "अंितम एसआईआर के साथ अनमैप्ड"
  if (/एसआईआर/.test(cleaned) && /अनमैप्\s*ड/.test(cleaned)) return 'unmapped_with_last_sir';
  if (/(अंितम|अंतिम).*अनमैप/.test(cleaned)) return 'unmapped_with_last_sir';

  // Parent age diffs — look for the Hindi stem plus <15 / >50
  if (/(माता|िपता)/.test(cleaned) && /<\s*15/.test(cleaned)) return 'parent_age_diff_lt_15';
  if (/(माता|िपता)/.test(cleaned) && />\s*50/.test(cleaned)) return 'parent_age_diff_gt_50';

  // Grandparent age diff
  if (/(दादा|नाना)/.test(cleaned) && /<\s*40/.test(cleaned)) return 'grandparent_age_diff_lt_40';

  // Children >= 6
  if (/संतान/.test(cleaned) && (/>=\s*6/.test(cleaned) || /≥\s*6/.test(cleaned) || /=6/.test(cleaned))) {
    return 'children_gte_6';
  }

  return null;
}

function reasonEnFor(key: DiscrepancyReasonKey): string {
  return DISCREPANCY_REASONS.find((r) => r.key === key)?.en ?? key;
}

function reasonHiFor(key: DiscrepancyReasonKey): string {
  return DISCREPANCY_REASONS.find((r) => r.key === key)?.hi ?? key;
}

// Split a blob of reasons into individual phrases.  The PDF uses commas (",")
// between reasons; we also split on "।" and ";" defensively.
function splitReasons(raw: string): string[] {
  return raw
    .split(/[,;।]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const EPIC_RE = /\b([A-Z]{3}\d{6,9})\b/;
const ROW_START_RE = /^\s*(\d+)\s+(\d+)\s+([A-Z]{3}\d{6,9})\s*(.*)$/;

// Header regexes — the "नाम:" label is distinctive and survives visual
// reordering.  The AC number comes after `नाम:` followed by a hyphen.
const HEADER_RE = /नाम\s*:\s*([\d०-९]+)\s*[-–]\s*([^\n]+)/g;

export async function parseDiscrepancyPdf(buffer: Buffer): Promise<ParsedDiscrepancyPdf> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  let rawText = '';
  try {
    const result = await parser.getText();
    rawText = result.text || '';
  } finally {
    await parser.destroy().catch(() => {});
  }

  const warnings: string[] = [];
  const fullLines = rawText.split(/\r?\n/).map((l: string) => normalise(l));
  const lines = fullLines.filter((l: string) => l.length > 0);

  // --- Extract headers ------------------------------------------------------
  let assemblyConstituencyNumber = 0;
  let assemblyConstituencyHi: string | undefined;
  let partNumber = 0;
  let partNameHi: string | undefined;

  const headers: Array<{ num: number; text: string }> = [];
  let m: RegExpExecArray | null;
  const joined = lines.join('\n');
  HEADER_RE.lastIndex = 0;
  while ((m = HEADER_RE.exec(joined)) !== null) {
    const num = parseInt(hiToAsciiDigits(m[1]), 10);
    const text = m[2].trim();
    if (!isNaN(num)) headers.push({ num, text });
    if (headers.length >= 2) break;
  }
  if (headers[0]) {
    assemblyConstituencyNumber = headers[0].num;
    assemblyConstituencyHi = headers[0].text;
  }
  if (headers[1]) {
    partNumber = headers[1].num;
    partNameHi = headers[1].text;
  }

  if (!assemblyConstituencyNumber) warnings.push('Could not detect Assembly Constituency from PDF header.');
  if (!partNumber) warnings.push('Could not detect Part number from PDF header.');

  const assemblyConstituency = assemblyConstituencyHi ? transliterateHindi(assemblyConstituencyHi) : '';
  const partNameEn = partNameHi ? transliterateHindi(partNameHi) : undefined;

  // --- Extract rows with line-continuation handling -------------------------
  // A row starts with "<srNo> <partSrNo> <EPIC>" on one line.  Its reason may
  // wrap onto the next line (which won't match ROW_START_RE).  We buffer a
  // row and flush it when we see the next row start or a page break.

  interface Buffered {
    voterSerialNumber: number;
    partSerialNumber: number;
    epicNumber: string;
    rest: string; // accumulated: name + age + gender + reasons
  }

  const buffered: Buffered[] = [];
  let current: Buffered | null = null;

  // Recognise the "page header" boilerplate that repeats on each page.  We
  // skip any line that's obviously a re-print of the column headers or page
  // separators (e.g. "-- 1 of 9 --").
  const isBoilerplate = (line: string): boolean => {
    if (/^-{2,}\s*\d+\s*of\s*\d+\s*-{2,}$/i.test(line)) return true;
    if (/ईपीआईसी\s*संख/.test(line)) return true;
    if (/िवसंगित/.test(line) && /कारण/.test(line)) return true;
    if (/नाम\s*:\s*[\d०-९]/.test(line)) return true;
    if (/^(?:कर्\s*|क्र\s*)/.test(line) && line.length < 15) return true;
    if (/^(ऐसे\s*व्|ऐसे\s*व)/.test(line)) return true;
    return false;
  };

  for (const line of lines) {
    if (isBoilerplate(line)) {
      // Flush pending row at a page boundary
      continue;
    }

    const startMatch = line.match(ROW_START_RE);
    if (startMatch) {
      if (current) buffered.push(current);
      current = {
        voterSerialNumber: parseInt(startMatch[1], 10),
        partSerialNumber: parseInt(startMatch[2], 10),
        epicNumber: startMatch[3].toUpperCase(),
        rest: (startMatch[4] || '').trim(),
      };
    } else if (current) {
      // Continuation of the previous row's reason
      current.rest = (current.rest + ' ' + line).trim();
    }
  }
  if (current) buffered.push(current);

  // --- Split each buffered row into name / age / gender / reasons ----------
  const rows: ParsedDiscrepancyRow[] = [];
  const seenEpics = new Set<string>();

  for (const b of buffered) {
    if (seenEpics.has(b.epicNumber)) continue;

    const gen = detectGender(b.rest);
    if (gen.index === undefined) {
      warnings.push(`Row with EPIC ${b.epicNumber} has no gender token — skipped.`);
      continue;
    }

    const beforeGender = b.rest.slice(0, gen.index).trim();
    const afterGender = b.rest.slice(gen.index + (gen.matched?.length ?? 0)).trim();

    // age = last number before the gender token
    const ageMatch = beforeGender.match(/(\d{1,3})\s*$/);
    const age = ageMatch ? parseInt(ageMatch[1], 10) : undefined;
    const nameHiRaw = ageMatch
      ? beforeGender.slice(0, beforeGender.length - ageMatch[0].length).trim()
      : beforeGender;

    const reasonHiList = splitReasons(afterGender);
    const reasonKeys: DiscrepancyReasonKey[] = [];
    const reasonHiDisplay: string[] = [];
    const reasonEnList: string[] = [];
    for (const r of reasonHiList) {
      const key = canonicaliseReason(r);
      if (key) {
        reasonKeys.push(key);
        // Store the canonical Hindi so the UI renders the official phrase
        // regardless of how the PDF's visual ordering mangled the extract.
        reasonHiDisplay.push(reasonHiFor(key));
        reasonEnList.push(reasonEnFor(key));
      } else {
        reasonHiDisplay.push(r);
        reasonEnList.push(transliterateHindi(r));
      }
    }

    rows.push({
      voterSerialNumber: b.voterSerialNumber,
      partSerialNumber: b.partSerialNumber,
      epicNumber: b.epicNumber,
      voterNameHi: nameHiRaw || '—',
      voterNameEn: transliterateHindi(nameHiRaw || ''),
      age,
      genderHi: gen.hi,
      gender: gen.en,
      discrepancyReasonHi: reasonHiDisplay,
      discrepancyReasonKey: reasonKeys,
      discrepancyReasonEn: reasonEnList,
    });
    seenEpics.add(b.epicNumber);
  }

  if (rows.length === 0) {
    warnings.push('No voter rows extracted. The PDF may be an image scan — run OCR first.');
  }

  return {
    assemblyConstituencyNumber,
    assemblyConstituency,
    assemblyConstituencyHi,
    partNumber,
    partNameHi,
    partNameEn,
    rows,
    warnings,
  };
}
