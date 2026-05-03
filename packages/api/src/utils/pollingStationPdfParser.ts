/**
 * Polling-station PDF parser.
 *
 * Input: a per-AC electoral roll PDF downloaded from CEO UP (rollpdf.aspx).
 * These PDFs typically open with an AC cover page and a "List of Polling
 * Stations" summary table, then repeat the per-booth sections thereafter.
 *
 * Output: a normalised array of polling stations.  We intentionally pull
 * *only* the summary, not the per-voter pages — that's orders of magnitude
 * fewer tokens and far more reliable.
 *
 * Two extraction strategies, tried in order:
 *   1. Summary table: rows of the shape "<partNumber> <booth name> ... <voters>"
 *      found in the first few pages.
 *   2. Header scan: every "Polling Station No. <N>" (or Hindi equivalent)
 *      block in the body gives us at least the part number + name.  We use
 *      this as a fallback when the summary table isn't recognisable.
 */
import { PDFParse } from 'pdf-parse';
import { transliterateHindi } from './hindiTransliterate';

export interface ParsedPollingStation {
  partNumber: number;
  name: string;           // best available English/romanised name
  nameHi?: string;        // raw Hindi as printed, when we got it
  village?: string;       // extracted location hint
  totalVoters?: number;   // from summary table, if present
}

export interface ParsedPollingStationPdf {
  assemblyConstituencyNumber?: number;
  assemblyConstituencyHi?: string;
  assemblyConstituencyEn?: string;
  stations: ParsedPollingStation[];
  warnings: string[];
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

// Matches common ASCII-digit "Part No. <N>" headings in Hindi PDFs.
// The Devanagari label भाग संख्या can survive visual-order munging as
// भाग सख्या / भागसख्या / भाग संख्या, so we are liberal.
const PART_HEADER_RE =
  /(?:भाग\s*[संसख्या]{2,}|Part\s*(?:No\.?|Number))[:\-\s]+([\d०-९]+)/gi;

// Heuristic row matcher for the summary table.  The CEO UP PDFs render each
// summary row in the rough shape:
//    <partNumber>   <polling-station-name Hindi>   <voters>
// with the English location rarely present.  The regex below accepts the
// common permutations.
const SUMMARY_ROW_RE =
  /^\s*([\d०-९]{1,4})\s+([^\n]{3,}?)\s+([\d०-९,]{2,6})\s*$/;

export async function parsePollingStationPdf(
  buffer: Buffer,
): Promise<ParsedPollingStationPdf> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  let rawText = '';
  try {
    const result = await parser.getText();
    rawText = result.text || '';
  } finally {
    await parser.destroy().catch(() => {});
  }

  const warnings: string[] = [];
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => normalise(l))
    .filter((l) => l.length > 0);

  // --- AC header --------------------------------------------------------
  let acNumber: number | undefined;
  let acHi: string | undefined;
  for (const line of lines.slice(0, 80)) {
    // "विधान सभा" or "Assembly Constituency" + "<num> - <name>"
    const m =
      line.match(/(?:Assembly\s*Constituency|विधान\s*सभा)[^\d]{0,12}([\d०-९]+)\s*[-–:]\s*(.+)/i) ||
      line.match(/नाम\s*:\s*([\d०-९]+)\s*[-–]\s*(.+)/);
    if (m) {
      const n = parseInt(hiToAsciiDigits(m[1]), 10);
      if (!isNaN(n) && n >= 1 && n <= 403) {
        acNumber = n;
        acHi = m[2].trim();
        break;
      }
    }
  }

  // --- Strategy 1: summary table ---------------------------------------
  // The cover pages contain a "List of Polling Stations" table.  Rows are
  // usually on contiguous lines.  We harvest every line matching
  // SUMMARY_ROW_RE in the first ~400 lines (covers the summary sections on
  // any reasonable AC size, well before the per-voter body begins).
  const tableRows: ParsedPollingStation[] = [];
  for (const line of lines.slice(0, 400)) {
    const m = line.match(SUMMARY_ROW_RE);
    if (!m) continue;
    const part = parseInt(hiToAsciiDigits(m[1]), 10);
    const name = m[2].trim();
    const voters = parseInt(hiToAsciiDigits(m[3].replace(/,/g, '')), 10);
    // guard against false positives: part numbers above 800 are unrealistic
    // for any UP AC, as are voter counts under 50 or above 5000.
    if (!part || part > 800) continue;
    if (!name || name.length < 2) continue;
    if (!voters || voters < 50 || voters > 5000) continue;
    tableRows.push({
      partNumber: part,
      name: transliterateHindi(name),
      nameHi: name,
      totalVoters: voters,
    });
  }

  // --- Strategy 2: header scan (fallback) ------------------------------
  if (tableRows.length === 0) {
    warnings.push('Summary table not recognised; falling back to section-header scan.');
    const joined = lines.join('\n');
    const seen = new Set<number>();
    let m: RegExpExecArray | null;
    PART_HEADER_RE.lastIndex = 0;
    while ((m = PART_HEADER_RE.exec(joined)) !== null) {
      const part = parseInt(hiToAsciiDigits(m[1]), 10);
      if (!part || seen.has(part)) continue;
      seen.add(part);
      // Look at the next ~3 lines for a booth name — usually the next
      // non-empty line is "<name>, <village>".
      const idx = lines.findIndex((l) => l.includes(m![0]));
      const tail = idx >= 0 ? lines.slice(idx + 1, idx + 4).join(' ') : '';
      const nameHi = tail.split(/[,;।]/)[0].trim() || `भाग ${part}`;
      tableRows.push({
        partNumber: part,
        name: transliterateHindi(nameHi),
        nameHi,
      });
    }
  }

  // Deduplicate by partNumber (keep first occurrence, which is the summary).
  const unique = new Map<number, ParsedPollingStation>();
  for (const r of tableRows) {
    if (!unique.has(r.partNumber)) unique.set(r.partNumber, r);
  }
  const stations = Array.from(unique.values()).sort(
    (a, b) => a.partNumber - b.partNumber,
  );

  if (stations.length === 0) {
    warnings.push(
      'No polling stations extracted. PDF may be an image scan, or the layout is unusual — OCR required.',
    );
  }

  return {
    assemblyConstituencyNumber: acNumber,
    assemblyConstituencyHi: acHi,
    assemblyConstituencyEn: acHi ? transliterateHindi(acHi) : undefined,
    stations,
    warnings,
  };
}
