/**
 * Local vision PDF parser — offline replacement for geminiVisionPdfParser.
 *
 * Runs a multimodal LLM (Qwen2.5-VL 7B by default) via Ollama on the same
 * VPS as the API, so PDF parsing no longer leaves the host.  Same input
 * contract as the Gemini parser (PDF buffer in, structured voter records
 * out) so the bulk-import route only swaps one import statement.
 *
 * Pipeline:
 *   1. pdftoppm (poppler-utils) rasterises each page to PNG at 200 DPI.
 *      We tried Gemini's "send the whole PDF" trick — Ollama models accept
 *      images, not PDFs, so per-page rasterisation is unavoidable.
 *   2. For each page image, POST to Ollama's /api/generate with format=json
 *      and the same OCR+transliteration prompt the Gemini parser used.
 *      Concurrency is configurable but defaults to 1, because the VPS is
 *      CPU-only — two parallel inferences just thrash the same cores.
 *   3. Merge per-page voter arrays, dedupe by EPIC, sort by serial number.
 *
 * Trade-offs vs Gemini (documented for the next person who reads this):
 *   - Slower.  A 35-page PDF that took ~1 min on Gemini takes 30 min – 2 hrs
 *     here, depending on page density.  No GPU on the VPS.
 *   - Quality is comparable on clear scans, weaker on faded/skewed pages —
 *     the UI must still flag vision rows for human review, same as before.
 *   - Memory: Qwen2.5-VL 7B occupies ~6 GB resident while a parse is in
 *     flight.  Ollama keeps the model loaded for 5 minutes after the last
 *     request then evicts (configurable via OLLAMA_KEEP_ALIVE).
 *
 * Env:
 *   OLLAMA_HOST            (default: "http://127.0.0.1:11434")
 *   OLLAMA_VISION_MODEL    (default: "qwen2.5vl:7b")
 *   LOCAL_VISION_DPI       (default: 200) — higher = better OCR, slower
 *   LOCAL_VISION_CONCURRENCY (default: 1) — page-level parallelism
 *   LOCAL_VISION_TIMEOUT_MS  (default: 600000 = 10 min) — per-page timeout
 */
import { spawn } from 'child_process';
import { mkdtemp, readFile, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';
import type { ParsedVoterRow } from './eciRollPdfParser';

export class LocalVisionNotAvailableError extends Error {
  constructor(message?: string) {
    super(
      message ??
        'Local vision parser is not available. Make sure Ollama is running ' +
          'on the API host (systemctl status ollama) and the configured model ' +
          '(OLLAMA_VISION_MODEL) has been pulled (`ollama pull qwen2.5vl:7b`).',
    );
    this.name = 'LocalVisionNotAvailableError';
  }
}

export class LocalVisionParseFailedError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'LocalVisionParseFailedError';
    this.cause = cause;
  }
}

export interface LocalVisionParseResult {
  rows: ParsedVoterRow[];
  partNumber?: number;
  assemblyConstituency?: string;
  assemblyConstituencyHi?: string;
  warnings: string[];
  modelUsed: string;
  usageNote: string;
}

/** Progress events the parser emits (via optional onProgress callback).
 *  Shape mirrors GeminiProgressEvent so the existing voters.ts streaming
 *  envelope passes events through unchanged. */
export type LocalVisionProgressEvent =
  | { type: 'start'; totalPages: number; totalChunks: number }
  | {
      type: 'chunk_started';
      index: number;
      total: number;
      attempt: number;
    }
  | {
      type: 'chunk_done';
      index: number;
      total: number;
      rowsInChunk: ParsedVoterRow[];
      runningTotal: number;
      partNumber?: number;
      assemblyConstituencyEn?: string;
      assemblyConstituencyHi?: string;
    }
  | {
      type: 'chunk_waiting';
      index: number;
      total: number;
      waitMs: number;
      reason: string;
    }
  | {
      type: 'chunk_error';
      index: number;
      total: number;
      message: string;
      runningTotal: number;
    };

export interface LocalVisionParseOptions {
  onProgress?: (e: LocalVisionProgressEvent) => void;
  /** Test-mode cap — stop once we've extracted at least this many voters. */
  maxVoters?: number;
}

const VOTERS_PER_PAGE_ESTIMATE = 25;
const MAX_RETRIES_PER_PAGE = 2;
const RETRY_BASE_MS = 3000;

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_VISION_MODEL || 'qwen2.5vl:7b';
const DPI = Number(process.env.LOCAL_VISION_DPI) || 200;
const CONCURRENCY = Number(process.env.LOCAL_VISION_CONCURRENCY) || 1;
const PER_PAGE_TIMEOUT_MS = Number(process.env.LOCAL_VISION_TIMEOUT_MS) || 600_000;
/** How long Ollama should keep the model resident after the last request.
 *  Defaults to "5m" matching Ollama's own default; set to "0" to evict
 *  immediately after each parse (saves RAM on a busy box). */
const OLLAMA_KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || '5m';

/** Same prompt the Gemini parser used — only the chunk-size language is
 *  changed because we now send one page at a time, not 3-page chunks. */
const PROMPT = `You are an OCR + data-extraction assistant for Indian Election
Commission (ECI) electoral-roll PDFs.

Extract EVERY voter record visible in this page image.  Do NOT stop early.
Do NOT summarise or emit a "sample" — output one JSON record per voter,
for every voter on this page, in the order they appear.  An ECI roll page
typically holds ~30 voters (3 columns × 10 rows).

For every voter record (each numbered entry in the roll), extract:
  - serialNumber      (the क्र.सं. / Serial No. — integer, globally unique across the roll)
  - epicNumber        (the EPIC / photo-ID no. — always Latin letters + digits, e.g. "ABC1234567")
  - fullNameHi        (the name EXACTLY as printed in Devanagari, verbatim)
  - fullNameEn        (TRANSLITERATE the Hindi name to Latin — do NOT translate meaning.
                       E.g. "राम कुमार शर्मा" -> "Ram Kumar Sharma", never "King Kumar")
  - fatherOrHusbandNameHi (Devanagari, verbatim; पिता or पति as shown)
  - fatherOrHusbandNameEn (transliterated)
  - gender            ("M" for पुरुष/Male, "F" for महिला/स्त्री/Female, "T" for अन्य/तृतीय/Other)
  - age               (integer)
  - addressHi         (मकान सं. / House No. string in Devanagari if present)
  - addressEn         (transliterated; or "House No. <number>" if only the number is shown)

ALSO extract the roll header (if visible on this page):
  - partNumber              (भाग संख्या / Part No.)
  - assemblyConstituencyEn  (AC name in Latin)
  - assemblyConstituencyHi  (AC name in Devanagari)

RULES:
  1. If a field is unreadable, blurry, or missing, return an empty string
     or null — DO NOT guess or fabricate.
  2. EPIC numbers use only A-Z and 0-9.  Never return Devanagari digits in
     EPIC.  If you cannot read an EPIC clearly, skip the entire record.
  3. Transliterate Hindi names letter-by-letter to Latin (IAST-lite:
     श=Sh, ष=Sh, स=S, त=T, ठ=Th, etc.).  Do NOT translate meaning.
  4. Return ONLY a JSON object with this exact shape, no markdown:
     {
       "partNumber": <int or null>,
       "assemblyConstituencyEn": <string or null>,
       "assemblyConstituencyHi": <string or null>,
       "voters": [ { "serialNumber": ..., "epicNumber": ..., ... }, ... ]
     }`;

interface LocalVoter {
  serialNumber?: number | null;
  epicNumber: string;
  fullNameEn?: string | null;
  fullNameHi?: string | null;
  fatherOrHusbandNameEn?: string | null;
  fatherOrHusbandNameHi?: string | null;
  gender?: 'M' | 'F' | 'T' | null;
  age?: number | null;
  addressEn?: string | null;
  addressHi?: string | null;
}

interface LocalResponse {
  partNumber?: number | null;
  assemblyConstituencyEn?: string | null;
  assemblyConstituencyHi?: string | null;
  voters: LocalVoter[];
}

function toRow(v: LocalVoter): ParsedVoterRow | null {
  const epic = (v.epicNumber || '').trim().toUpperCase();
  if (!epic || !/^[A-Z]{2,3}\d{6,7}$/.test(epic)) return null;
  const s = (x: string | null | undefined) => {
    const t = (x ?? '').trim();
    return t.length > 0 ? t : undefined;
  };
  return {
    voterSerialNumber: typeof v.serialNumber === 'number' ? v.serialNumber : undefined,
    epicNumber: epic,
    fullName: s(v.fullNameEn),
    fullNameHi: s(v.fullNameHi),
    fatherOrHusbandName: s(v.fatherOrHusbandNameEn),
    fatherOrHusbandNameHi: s(v.fatherOrHusbandNameHi),
    gender: v.gender === 'M' || v.gender === 'F' || v.gender === 'T' ? v.gender : undefined,
    age: typeof v.age === 'number' && v.age > 0 && v.age < 130 ? v.age : undefined,
    address: s(v.addressEn),
    addressHi: s(v.addressHi),
  };
}

/** Ask Ollama whether the configured model is loaded/loadable. Returns
 *  true on a 200 from /api/tags listing that model.  Used by the
 *  isLocalVisionAvailable() check the route uses before dispatching. */
export async function isLocalVisionAvailable(): Promise<boolean> {
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/tags`, { method: 'GET' });
    if (!r.ok) return false;
    const j = (await r.json()) as { models?: Array<{ name?: string }> };
    return (j.models || []).some(
      (m) => (m.name || '').toLowerCase() === OLLAMA_MODEL.toLowerCase(),
    );
  } catch {
    return false;
  }
}

/** Spawn pdftoppm to rasterise the PDF into per-page PNGs in a temp dir.
 *  Returns the absolute paths in page order. */
async function rasterisePdfToImages(buffer: Buffer): Promise<{ dir: string; pages: string[] }> {
  const dir = await mkdtemp(join(tmpdir(), 'eci-vision-'));
  const pdfPath = join(dir, 'in.pdf');
  await import('fs/promises').then((fs) => fs.writeFile(pdfPath, buffer));
  await new Promise<void>((resolve, reject) => {
    const child = spawn('pdftoppm', ['-r', String(DPI), '-png', pdfPath, join(dir, 'p')], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (e) =>
      reject(new LocalVisionParseFailedError(`Could not run pdftoppm: ${e.message}`, e)),
    );
    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new LocalVisionParseFailedError(
            `pdftoppm exited ${code}: ${stderr.slice(0, 400)}`,
          ),
        );
      } else resolve();
    });
  });
  const all = await readdir(dir);
  const pngs = all
    .filter((n) => n.toLowerCase().endsWith('.png'))
    .sort()
    .map((n) => join(dir, n));
  return { dir, pages: pngs };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Recover whatever voter objects we can from a truncated JSON response —
 *  same heuristic as the Gemini parser used. */
function tryRecoverTruncatedJson(raw: string): LocalResponse | null {
  const votersIdx = raw.indexOf('"voters"');
  if (votersIdx === -1) return null;
  const arrayStart = raw.indexOf('[', votersIdx);
  if (arrayStart === -1) return null;
  let depth = 0;
  let lastObjEnd = -1;
  let inString = false;
  let escape = false;
  for (let i = arrayStart; i < raw.length; i++) {
    const c = raw[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 1) lastObjEnd = i;
    }
  }
  if (lastObjEnd === -1) return null;
  const repaired = raw.slice(0, lastObjEnd + 1) + ']}';
  try {
    const obj = JSON.parse(repaired) as LocalResponse;
    if (Array.isArray(obj.voters) && obj.voters.length > 0) return obj;
  } catch {
    /* fall through */
  }
  return null;
}

async function callOllamaOnce(
  imageBase64: string,
  hooks: { onAttempt?: (attempt: number) => void; onWait?: (waitMs: number, reason: string) => void } = {},
): Promise<LocalResponse> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES_PER_PAGE; attempt++) {
    hooks.onAttempt?.(attempt + 1);
    const t0 = Date.now();
    try {
      console.log(
        `[local-vision] attempt ${attempt + 1}/${MAX_RETRIES_PER_PAGE + 1} — calling ${OLLAMA_MODEL} (${imageBase64.length} b64 chars)`,
      );
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PER_PAGE_TIMEOUT_MS);
      const resp = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: PROMPT,
          images: [imageBase64],
          format: 'json',
          stream: false,
          keep_alive: OLLAMA_KEEP_ALIVE,
          options: {
            temperature: 0,
            // Cap output so a runaway model doesn't generate forever; one
            // page should comfortably fit in <8k tokens.
            num_predict: 8192,
          },
        }),
      }).finally(() => clearTimeout(timer));
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`Ollama HTTP ${resp.status}: ${body.slice(0, 400)}`);
      }
      const j = (await resp.json()) as { response?: string; error?: string };
      if (j.error) throw new Error(`Ollama error: ${j.error}`);
      const raw = j.response ?? '';
      if (!raw) throw new Error('Ollama returned an empty response');
      let parsed: LocalResponse;
      try {
        parsed = JSON.parse(raw) as LocalResponse;
      } catch {
        const recovered = tryRecoverTruncatedJson(raw);
        if (recovered) parsed = recovered;
        else
          throw new Error(
            `Ollama returned non-JSON (${raw.length} chars). First 200: ${raw.slice(0, 200)}`,
          );
      }
      if (!Array.isArray(parsed.voters)) parsed.voters = [];
      console.log(
        `[local-vision] ✓ attempt ${attempt + 1} succeeded in ${Date.now() - t0}ms — ${parsed.voters.length} voters`,
      );
      return parsed;
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message ?? e);
      console.log(`[local-vision] ✗ attempt ${attempt + 1} failed after ${Date.now() - t0}ms: ${msg.slice(0, 200)}`);
      if (attempt === MAX_RETRIES_PER_PAGE) throw e;
      const waitMs = RETRY_BASE_MS * Math.pow(2, attempt);
      hooks.onWait?.(waitMs, 'retry backoff');
      await sleep(waitMs);
    }
  }
  throw lastErr ?? new Error('callOllamaOnce: exhausted retries');
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const idx = next++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function parseEciRollPdfWithLocalVision(
  buffer: Buffer,
  opts: LocalVisionParseOptions = {},
): Promise<LocalVisionParseResult> {
  if (!(await isLocalVisionAvailable())) {
    throw new LocalVisionNotAvailableError();
  }

  const emit = (e: LocalVisionProgressEvent) => {
    if (!opts.onProgress) return;
    try {
      opts.onProgress(e);
    } catch {
      /* never let UI callbacks crash parsing */
    }
  };

  // Count pages up front for progress reporting.  pdf-lib parse failure
  // here means the PDF is malformed — fail fast before rasterising.
  let totalPages: number;
  try {
    const src = await PDFDocument.load(buffer);
    totalPages = src.getPageCount();
  } catch (e: any) {
    throw new LocalVisionParseFailedError(`Could not read PDF structure: ${e?.message || e}`, e);
  }

  // Test-mode early stop: if the caller only wants N voters, cap how many
  // pages we rasterise/process.  Uses a conservative per-page estimate so
  // we never end up with fewer than N rows due to a thin page.
  let pageLimit = totalPages;
  let testLimitNote: string | null = null;
  if (opts.maxVoters && opts.maxVoters > 0) {
    const needed = Math.max(1, Math.ceil(opts.maxVoters / VOTERS_PER_PAGE_ESTIMATE));
    if (needed < totalPages) {
      pageLimit = needed;
      testLimitNote = `Test mode: only first ${needed} of ${totalPages} pages processed (target ~${opts.maxVoters} voters).`;
    }
  }

  const { dir, pages } = await rasterisePdfToImages(buffer);
  const targetPages = pages.slice(0, pageLimit);
  console.log(
    `[local-vision] totalPages=${totalPages}, processing=${targetPages.length}, model=${OLLAMA_MODEL}, dpi=${DPI}, concurrency=${CONCURRENCY}`,
  );
  emit({ type: 'start', totalPages, totalChunks: targetPages.length });

  const warnings: string[] = [];
  const pageErrors: string[] = [];
  let mergedPartNumber: number | undefined;
  let mergedAcEn: string | undefined;
  let mergedAcHi: string | undefined;
  const allVoters: LocalVoter[] = [];
  let successfulPages = 0;
  let runningTotal = 0;

  try {
    const responses = await runWithConcurrency(targetPages, CONCURRENCY, async (imgPath, idx) => {
      try {
        const imgBuffer = await readFile(imgPath);
        const b64 = imgBuffer.toString('base64');
        const r = await callOllamaOnce(b64, {
          onAttempt: (attempt) =>
            emit({ type: 'chunk_started', index: idx, total: targetPages.length, attempt }),
          onWait: (waitMs, reason) =>
            emit({ type: 'chunk_waiting', index: idx, total: targetPages.length, waitMs, reason }),
        });
        const chunkRows: ParsedVoterRow[] = [];
        for (const v of r.voters || []) {
          const row = toRow(v);
          if (row) {
            if (typeof r.partNumber === 'number' && !row.partNumber) row.partNumber = r.partNumber;
            chunkRows.push(row);
          }
        }
        runningTotal += chunkRows.length;
        console.log(
          `[local-vision] page ${idx + 1}/${targetPages.length} done — ${chunkRows.length} rows (running total ${runningTotal})`,
        );
        if (mergedPartNumber === undefined && typeof r.partNumber === 'number')
          mergedPartNumber = r.partNumber;
        if (!mergedAcEn && r.assemblyConstituencyEn) mergedAcEn = r.assemblyConstituencyEn;
        if (!mergedAcHi && r.assemblyConstituencyHi) mergedAcHi = r.assemblyConstituencyHi;
        emit({
          type: 'chunk_done',
          index: idx,
          total: targetPages.length,
          rowsInChunk: chunkRows,
          runningTotal,
          partNumber: mergedPartNumber,
          assemblyConstituencyEn: mergedAcEn,
          assemblyConstituencyHi: mergedAcHi,
        });
        return { ok: true as const, idx, response: r };
      } catch (e: any) {
        const msg = e?.message || String(e);
        console.log(`[local-vision] page ${idx + 1}/${targetPages.length} FAILED: ${msg.slice(0, 200)}`);
        pageErrors.push(`page ${idx + 1}/${targetPages.length}: ${msg}`);
        emit({
          type: 'chunk_error',
          index: idx,
          total: targetPages.length,
          message: msg,
          runningTotal,
        });
        return { ok: false as const, idx, error: e };
      }
    });

    for (const r of responses) {
      if (!r.ok) continue;
      successfulPages++;
      if (Array.isArray(r.response.voters)) allVoters.push(...r.response.voters);
    }
  } finally {
    // Always clean up the temp dir, even if parsing threw.
    rm(dir, { recursive: true, force: true }).catch(() => {
      /* best-effort cleanup */
    });
  }

  if (successfulPages === 0) {
    throw new LocalVisionParseFailedError(
      `All ${targetPages.length} PDF pages failed to parse. First error: ` +
        (pageErrors[0] || 'unknown'),
    );
  }
  if (pageErrors.length > 0) {
    warnings.push(
      `${pageErrors.length} of ${targetPages.length} page(s) failed to parse; voters from those pages are missing. First failure: ${pageErrors[0]}`,
    );
  }
  if (testLimitNote) warnings.push(testLimitNote);

  const rows: ParsedVoterRow[] = [];
  for (const v of allVoters) {
    const row = toRow(v);
    if (row) {
      if (mergedPartNumber && !row.partNumber) row.partNumber = mergedPartNumber;
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    throw new LocalVisionParseFailedError(
      'Local vision parser returned zero voter records. The PDF may be too low-quality, too few pages, or not an electoral roll. Try a higher-resolution scan.',
    );
  }

  // Dedupe by EPIC (same defence the Gemini parser used).
  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    if (seen.has(r.epicNumber)) return false;
    seen.add(r.epicNumber);
    return true;
  });
  if (deduped.length < rows.length) {
    warnings.push(`Removed ${rows.length - deduped.length} duplicate record(s) with repeated EPIC numbers.`);
  }

  deduped.sort((a, b) => {
    const sa = a.voterSerialNumber ?? Number.MAX_SAFE_INTEGER;
    const sb = b.voterSerialNumber ?? Number.MAX_SAFE_INTEGER;
    return sa - sb;
  });

  return {
    rows: deduped,
    partNumber: mergedPartNumber,
    assemblyConstituency: mergedAcEn,
    assemblyConstituencyHi: mergedAcHi,
    warnings,
    modelUsed: OLLAMA_MODEL,
    usageNote:
      `Records were extracted by ${OLLAMA_MODEL} running offline on the API host. ` +
      `Accuracy is typically 90-95% per field. Please spot-check the preview before ` +
      `confirming the import — especially EPIC numbers and mobile-number-adjacent rows.`,
  };
}
