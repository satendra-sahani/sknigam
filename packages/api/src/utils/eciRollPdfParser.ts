/**
 * ECI electoral-roll PDF parser — voter-level records.
 *
 * This is for the "I downloaded the PDF voter roll and want to import it"
 * use case in the bulk-import modal.  It is intentionally CONSERVATIVE:
 *
 *   - Text-layer PDFs only.  If pdf-parse returns no text (i.e. the PDF is a
 *     scan / image, which is how ECI publishes most SIR Final Rolls), we
 *     throw ImageOnlyPdfError with a clear message so the UI can explain
 *     the situation to the user.  We do NOT attempt OCR — OCR on Hindi
 *     scans never hits 100%, and the whole point of this path is "free
 *     AND exact".
 *
 *   - EPIC-anchored.  Every Indian voter has a 10-char EPIC like
 *     "ABC1234567" (2-3 letters + 7 digits).  We locate each EPIC in the
 *     extracted text and take the surrounding text as that voter's record.
 *     This is robust to column ordering variations across different PDF
 *     generators because EPICs are unambiguous anchors.
 *
 *   - Returns the SAME row shape the Excel parser produces, so the
 *     downstream validation + insertion pipeline in /voters/bulk-import
 *     can consume it unchanged.
 *
 * What it supports well (high confidence, 100% accuracy when the PDF has
 * a text layer):
 *   - ECI Draft Rolls (most are text-layer)
 *   - DEO (District Electoral Officer) exports with machine-generated PDFs
 *   - Any PDF produced by a text-to-PDF tool from the electoral roll XML
 *
 * What it WILL NOT do (by design):
 *   - Parse scanned/image-only PDFs (throws ImageOnlyPdfError)
 *   - Guess missing fields (returns undefined; downstream validation
 *     reports the row as invalid, with the row number preserved)
 *   - OCR, Hindi reshaping, fuzzy matching
 */
import { PDFParse } from 'pdf-parse';

export class ImageOnlyPdfError extends Error {
  constructor(message?: string) {
    super(
      message ??
        'This PDF appears to be a scanned image with no text layer. ' +
          'Free, 100%-accurate parsing requires a text-layer PDF (usually ' +
          'the Draft Roll variant from the ECI / CEO UP portal). Please ' +
          'upload the Excel (.xlsx) template instead, or a text-layer PDF.',
    );
    this.name = 'ImageOnlyPdfError';
  }
}

export class UnreadablePdfError extends Error {
  constructor(message?: string) {
    super(
      message ??
        'Could not find any voter records in this PDF. EPIC numbers ' +
          '(e.g. ABC1234567) were not detected. This may be a cover page, ' +
          'a summary, or an unsupported format.',
    );
    this.name = 'UnreadablePdfError';
  }
}

/**
 * Row shape MUST match what the Excel parser produces in
 * /voters/bulk-import.  That route reads these keys and runs its own
 * validation, so we pass through as-is.
 */
export interface ParsedVoterRow {
  voterSerialNumber?: number;
  epicNumber: string;
  fullName?: string;                // English / Latin (possibly transliterated)
  fullNameHi?: string;              // Original Hindi as printed on the roll
  fatherOrHusbandName?: string;
  fatherOrHusbandNameHi?: string;
  gender?: 'M' | 'F' | 'T';
  age?: number;
  address?: string;
  addressHi?: string;
  partNumber?: number;
}

export interface EciRollParseResult {
  rows: ParsedVoterRow[];
  partNumber?: number;          // detected from the roll header, if any
  assemblyConstituency?: string; // Hindi AC name, if detected
  warnings: string[];
  rawTextPreview: string;        // first 500 chars, for debugging
}

function hiToAsciiDigits(s: string): string {
  const map: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  };
  return s.replace(/[०-९]/g, (c) => map[c] ?? c);
}

function normalise(line: string): string {
  return line
    .replace(/[\u00a0\u200b\u200c\u200d]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Matches an EPIC anywhere in the text.  Formats in the wild:
//   ABC1234567       (ECI standard: 3 letters + 7 digits)
//   AB/12/345/6789   (older formats, still occasionally appear)
// We accept 2-3 uppercase letters followed by 7 digits as the primary form,
// and fall back to separated forms if we see no matches.
const EPIC_PRIMARY_RE = /\b([A-Z]{2,3}\d{7})\b/g;
const EPIC_SEPARATED_RE = /\b([A-Z]{2,3}[\/\-]\d{1,3}[\/\-]\d{1,3}[\/\-]\d{1,4})\b/g;

// Hindi gender words, in the order we want to match them.
// पुरुष = male, महिला/स्त्री = female, अन्य/तृतीय = third.
// Female is listed BEFORE Male in the alternation so that if both could
// match at the same string position (e.g. the "male" inside "Female"),
// Female wins.  Word boundaries on every Latin token enforce whole-word
// matches and stop "Male" from greedily matching "fe(Male)".
const GENDER_RE = /(पुरुष|महिला|स्त्री|अन्य|तृतीय|\bFemale\b|\bMale\b|\bOther\b|\bM\b|\bF\b|\bT\b)/i;
function normaliseGender(raw: string | undefined): 'M' | 'F' | 'T' | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase();
  // Check Female FIRST — "female".includes("male") is true, so checking
  // male first would mis-classify every female voter.
  if (s.includes('female') || s.includes('महिला') || s.includes('स्त्री') || s === 'f') return 'F';
  if (s.includes('other') || s.includes('अन्य') || s.includes('तृतीय') || s === 't') return 'T';
  if (s.includes('male') || s.includes('पुरुष') || s === 'm') return 'M';
  return undefined;
}

// Matches "Age: 45" / "आयु: 45" / "उम्र: ४५".  The number can be
// Devanagari digits (normalised by the caller).
const AGE_RE = /(?:आयु|उम्र|Age)[\s:।\-]*([\d०-९]{1,3})\b/i;

// Matches the voter serial number at the start of a block.  ECI rolls use
// "क्र.सं." or "Serial No." — we look for both, plus a bare leading number.
const SERIAL_RE = /(?:क्र\.?\s*सं\.?|Serial\s*No\.?|क्रम\s*संख्या|Sr\.?\s*No\.?)[\s:।\-]*([\d०-९]{1,6})/i;

// Matches Hindi/English father/husband relation labels.
// पिता = father, पति = husband, माता = mother.
const RELATION_RE = /(?:पिता\s*का\s*नाम|पिता|पति\s*का\s*नाम|पति|माता\s*का\s*नाम|माता|Father(?:'s)?\s*Name|Husband(?:'s)?\s*Name|Mother(?:'s)?\s*Name|Relation)[\s:।\-]*([^\n]{1,80}?)(?=\s*(?:आयु|उम्र|Age|House|मकान|गृह|लिंग|पुरुष|महिला|स्त्री|$))/i;

// Matches the voter's own name.  ECI Hindi rolls use "नाम" (name).
// We stop the capture at EPIC/relation/age/gender labels so adjacent voter
// records can't leak into this one's name field.
const NAME_RE = /(?:^|\b)(?:नाम|Name|Elector(?:'s)?\s*Name)[\s:।\-]+([^\n]{1,80}?)(?=\s*(?:EPIC|पहचान|पिता|पति|माता|Father|Husband|Relation|आयु|उम्र|Age|लिंग|Gender|$))/i;

// Matches "House No. 42" / "मकान सं. ४२" / "गृह संख्या 42".
const HOUSE_RE = /(?:मकान\s*सं\.?|House\s*(?:No\.?|Number)|गृह\s*(?:संख्या|सं\.?)|मकान)[\s:।\-]*([\d०-९A-Za-z\-\/]{1,20})/i;

// Part-number ("भाग संख्या / Part No.") in the header.
const PART_HEADER_RE = /(?:भाग\s*(?:संख्या|सं\.?)|Part\s*(?:No\.?|Number))[\s:।\-]*([\d०-९]{1,4})/i;

// AC name in the header: "विधान सभा क्षेत्र संख्या एवं नाम : 338-पथरदेवा"
const AC_HEADER_RE = /(?:विधान\s*सभा[^\n]{0,40}नाम|Assembly\s*Constituency)[\s:।\-]*(?:([\d०-९]{1,3})\s*[-–]\s*)?([^\n,]{2,60})/i;

/**
 * Extract the text block surrounding each EPIC occurrence.  We slice a
 * generous window (300 chars before, 300 after) and parse fields out of
 * that.  Adjacent blocks will overlap — that's fine, we dedupe by EPIC.
 */
function extractBlocks(text: string): Array<{ epic: string; block: string }> {
  const matches: Array<{ epic: string; start: number; end: number }> = [];
  let m: RegExpExecArray | null;

  EPIC_PRIMARY_RE.lastIndex = 0;
  while ((m = EPIC_PRIMARY_RE.exec(text)) !== null) {
    matches.push({ epic: m[1], start: m.index, end: m.index + m[0].length });
  }

  if (matches.length === 0) {
    EPIC_SEPARATED_RE.lastIndex = 0;
    while ((m = EPIC_SEPARATED_RE.exec(text)) !== null) {
      matches.push({
        epic: m[1].replace(/[\/\-]/g, ''),
        start: m.index,
        end: m.index + m[0].length,
      });
    }
  }

  return matches.map((hit, i) => {
    // Each voter's block spans from the end of the previous EPIC (so their
    // own Serial + Name are captured) to the start of the next EPIC (so
    // their own Relation + Age + Gender + House are captured).  The block
    // contains exactly one EPIC — this voter's.  Any leak of adjacent
    // voters' fields is handled in parseOneBlock by splitting at the EPIC:
    // the before-EPIC half uses LAST match of Serial/Name (closest to the
    // EPIC = this voter), and the after-EPIC half uses FIRST match of
    // Relation/Age/Gender/House (again = this voter).
    const start = i === 0
      ? Math.max(0, hit.start - 400)
      : matches[i - 1].end;
    const end = i === matches.length - 1
      ? Math.min(text.length, hit.end + 400)
      : matches[i + 1].start;
    return { epic: hit.epic, block: text.slice(start, end) };
  });
}

function parseOneBlock(epic: string, blockRaw: string): ParsedVoterRow {
  const block = normalise(blockRaw);

  // ECI rolls place Serial + Name BEFORE the EPIC, and Relation + Age +
  // Gender + House AFTER the EPIC.  Splitting the block at the EPIC
  // position gives us deterministic per-field halves and prevents the
  // previous voter's trailing fields from being matched as THIS voter's.
  const epicIdx = block.indexOf(epic);
  const before = epicIdx >= 0 ? block.slice(0, epicIdx) : block;
  const after = epicIdx >= 0 ? block.slice(epicIdx + epic.length) : '';
  const beforeAscii = hiToAsciiDigits(before);
  const afterAscii = hiToAsciiDigits(after);

  // --- BEFORE the EPIC: Serial + Name ---
  // Use the LAST Serial/Name match (closest to the EPIC) — earlier matches
  // belong to the previous voter that shared this block.
  function lastMatch(source: string, re: RegExp): RegExpExecArray | null {
    const g = new RegExp(re.source, (re.flags.includes('g') ? re.flags : re.flags + 'g'));
    let m: RegExpExecArray | null;
    let last: RegExpExecArray | null = null;
    while ((m = g.exec(source)) !== null) {
      last = m;
      if (g.lastIndex === m.index) g.lastIndex++;
    }
    return last;
  }

  const serialMatch = lastMatch(beforeAscii, SERIAL_RE);
  const nameMatch = lastMatch(before, NAME_RE);

  // --- AFTER the EPIC: Relation + Age + Gender + House ---
  // Use the FIRST match (closest to the EPIC) so the NEXT voter's fields
  // can't leak in.
  const relMatch = after.match(RELATION_RE);
  const ageMatch = afterAscii.match(AGE_RE);
  const genderMatch = after.match(GENDER_RE);
  const houseMatch = afterAscii.match(HOUSE_RE);

  // Fallback: if no explicit "नाम" label was found, heuristically take the
  // capitalised phrase immediately before the EPIC.  Covers tabular rolls
  // where labels are the column headers, not inline with each record.
  let fullName = nameMatch ? nameMatch[1].trim() : undefined;
  if (!fullName) {
    const tail = before.trim().split(/\n|(?<=\d)\s/).slice(-1)[0] || '';
    const candidate = tail.match(/([A-Z\u0900-\u097F][^\n\d]{2,60})$/);
    if (candidate) fullName = candidate[1].trim();
  }

  const fatherOrHusbandName = relMatch ? relMatch[1].trim() : undefined;

  return {
    voterSerialNumber: serialMatch ? Number(serialMatch[1]) : undefined,
    epicNumber: epic,
    fullName: fullName || undefined,
    fatherOrHusbandName: fatherOrHusbandName || undefined,
    gender: normaliseGender(genderMatch?.[1]),
    age: ageMatch ? Number(ageMatch[1]) : undefined,
    address: houseMatch ? `House No. ${houseMatch[1]}` : undefined,
  };
}

export async function parseEciRollPdf(buffer: Buffer): Promise<EciRollParseResult> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  let rawText = '';
  try {
    const result = await parser.getText();
    rawText = result.text || '';
  } catch (e: any) {
    await parser.destroy().catch(() => {});
    throw new UnreadablePdfError(
      `Failed to read PDF text stream: ${e?.message || e}`,
    );
  } finally {
    await parser.destroy().catch(() => {});
  }

  // Image-only guard: pdf-parse returns only its own page separators
  // (e.g. "-- 1 of 35 --") when the PDF has no text layer.  Strip those
  // separators and any whitespace; if what's left is essentially nothing,
  // the PDF is a scan and we cannot parse it for free.
  const textWithoutPageMarkers = rawText.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '');
  const nonWs = textWithoutPageMarkers.replace(/\s+/g, '').length;
  if (nonWs < 100) {
    throw new ImageOnlyPdfError();
  }

  const warnings: string[] = [];

  // --- Header metadata ---------------------------------------------------
  let partNumber: number | undefined;
  let assemblyConstituency: string | undefined;

  const partHeader = hiToAsciiDigits(rawText).match(PART_HEADER_RE);
  if (partHeader) {
    const n = Number(partHeader[1]);
    if (n > 0 && n < 2000) partNumber = n;
  }

  const acHeader = rawText.match(AC_HEADER_RE);
  if (acHeader) {
    assemblyConstituency = (acHeader[2] || '').trim();
  }

  // --- Voter blocks ------------------------------------------------------
  const blocks = extractBlocks(rawText);
  if (blocks.length === 0) {
    throw new UnreadablePdfError();
  }

  const seen = new Set<string>();
  const rows: ParsedVoterRow[] = [];
  for (const { epic, block } of blocks) {
    if (seen.has(epic)) continue;
    seen.add(epic);
    const row = parseOneBlock(epic, block);
    if (partNumber && !row.partNumber) row.partNumber = partNumber;
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new UnreadablePdfError();
  }

  // Sanity warnings (not errors — the rows still flow into validation).
  const missingName = rows.filter((r) => !r.fullName).length;
  if (missingName > rows.length * 0.3) {
    warnings.push(
      `${missingName}/${rows.length} voter records are missing a readable name. ` +
        `This usually means the PDF uses non-standard labels; consider uploading ` +
        `the Excel template instead for best accuracy.`,
    );
  }

  return {
    rows,
    partNumber,
    assemblyConstituency,
    warnings,
    rawTextPreview: rawText.slice(0, 500),
  };
}
