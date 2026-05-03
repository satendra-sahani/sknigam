/**
 * Gemini Vision fallback parser for image-only (scanned) ECI roll PDFs.
 *
 * Background: our primary parser (eciRollPdfParser.ts) only works on
 * text-layer PDFs — it's deterministic and free but returns
 * ImageOnlyPdfError when the PDF is a scan (which most ECI SIR Final
 * Rolls are).  This module is the fallback: it sends the PDF to Gemini's
 * multimodal API, which reads the scan and returns structured voter
 * records including BOTH Hindi (as printed) and transliterated English.
 *
 * Tradeoffs vs. text-layer parsing:
 *   + Works on scanned PDFs.  Reads Devanagari natively, no OCR tuning.
 *   + Returns both Hindi (fullNameHi) and transliterated English (fullName)
 *     for every record — useful for English-speaking staff + search.
 *   − Not deterministic.  Gemini is an LLM doing vision+OCR+translation,
 *     so accuracy is ~95-99% per field, not 100%.  One wrong digit in an
 *     EPIC = wrong person's phone is dialled.  The UI must flag
 *     vision-parsed rows and require human review before import.
 *   − Costs API quota.  Free tier on gemini-2.0-flash gives ~1500 req/day
 *     which at 12 requests per 35-page PDF is ~125 PDFs/day; paid is a few
 *     cents per PDF.  We configure model + key via env.
 *
 * Chunking: Gemini stops emitting voter records after ~30-40 per call even
 * on large PDFs (observed: 30 voters returned from a 35-page / ~1000-voter
 * PDF despite "CRITICAL INSTRUCTION: extract every record" framing).  So
 * for any PDF over CHUNK_PAGE_THRESHOLD pages we split it into CHUNK_PAGES-
 * sized sub-PDFs (using pdf-lib) and call Gemini once per chunk, then merge.
 * Chunks run with bounded parallelism so a 35-page PDF finishes in ~1 min
 * instead of 4+.
 *
 * Env required:
 *   GEMINI_API_KEY   (from https://aistudio.google.com/apikey)
 *   GEMINI_MODEL     (default: "gemini-2.0-flash".  Chosen over gemini-flash-
 *                     latest because 2.0-flash has a far more generous free-
 *                     tier quota: 15 RPM / 1 500 RPD vs 5 RPM / 50 RPD on
 *                     -latest (which aliases to gemini-3-flash).  At 12 Gemini
 *                     calls per 35-page PDF, -latest's 50/day runs out after
 *                     ~4 previews; 2.0-flash comfortably handles 100+.
 *                     Other viable choices: "gemini-2.5-flash" (pinned,
 *                     10 RPM / 250 RPD), "gemini-2.5-pro" (best accuracy,
 *                     slower, paid only), "gemini-flash-latest" (newest).)
 */
import { PDFDocument } from 'pdf-lib';
import type { ParsedVoterRow } from './eciRollPdfParser';

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super(
      'Gemini vision parsing is not configured. Set GEMINI_API_KEY in the API .env ' +
        'file to enable image-only PDF parsing.',
    );
    this.name = 'GeminiNotConfiguredError';
  }
}

export class GeminiParseFailedError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'GeminiParseFailedError';
    this.cause = cause;
  }
}

export interface GeminiParseResult {
  rows: ParsedVoterRow[];
  partNumber?: number;
  assemblyConstituency?: string;
  assemblyConstituencyHi?: string;
  warnings: string[];
  modelUsed: string;
  usageNote: string;
}

/** Progress events the parser emits (via optional onProgress callback)
 *  so callers can stream real-time feedback to the UI.  Entirely opt-in —
 *  existing callers that don't pass a callback see the same blocking API
 *  they always did. */
export type GeminiProgressEvent =
  | { type: 'start'; totalPages: number; totalChunks: number }
  | {
      // Emitted the moment a chunk is sent to Gemini (before waiting for
      // the response).  Lets the UI show "chunks in flight" so the bar
      // doesn't look frozen during the ~30s Gemini round-trip.
      type: 'chunk_started';
      index: number;
      total: number;
      attempt: number;     // 1 on first try, 2+ if we're retrying after 429
    }
  | {
      type: 'chunk_done';
      index: number;       // 0-based chunk index
      total: number;       // total chunks we'll do
      rowsInChunk: ParsedVoterRow[];  // voters parsed from this chunk
      runningTotal: number;           // cumulative voter count so far
      partNumber?: number;
      assemblyConstituencyEn?: string;
      assemblyConstituencyHi?: string;
    }
  | {
      // Emitted when we decide to sleep before a retry (typically the 5 RPM
      // free-tier 429).  Lets the UI say "rate-limited, retrying in 47s"
      // rather than just staring at 0% while we wait.
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

export interface GeminiParseOptions {
  onProgress?: (e: GeminiProgressEvent) => void;
  /** Test-mode cap.  When set, only enough chunks to (likely) cover this
   *  many voters are dispatched to Gemini — saves OCR time when the caller
   *  just wants to sanity-check a new PDF template with a handful of rows. */
  maxVoters?: number;
}

/** Conservative estimate of voters per chunk.  Gemini tapers off around 30
 *  records per single-call response; a 3-page chunk (see CHUNK_PAGES) can
 *  realistically yield ~90.  We use the lower bound when translating
 *  `maxVoters` into "how many chunks do I need?" so we never accidentally
 *  stop short of the cap. */
const VOTERS_PER_CHUNK_ESTIMATE = 25;

/** Chunking config.  Tuned against observation that Gemini emits ~30
 *  records per call before tapering off.  3 pages × ~30 voters/page = ~90
 *  voters per chunk, comfortably within the response budget.  Threshold
 *  of 4 means a 3-page PDF still takes the fast single-call path. */
const CHUNK_PAGES = 3;
const CHUNK_PAGE_THRESHOLD = 4;
/** Max parallel Gemini calls.  Tuned per active model's free-tier RPM:
 *    - gemini-2.0-flash       — 15 RPM → concurrency 4 is safe
 *    - gemini-2.5-flash       — 10 RPM → concurrency 3
 *    - gemini-flash-latest    —  5 RPM → concurrency 2
 *  We default to 4 because gemini-2.0-flash is our default model; if you
 *  swap GEMINI_MODEL to a stingier one you may want to lower this via a
 *  future CHUNK_CONCURRENCY env override. */
const CHUNK_CONCURRENCY = Number(process.env.GEMINI_CONCURRENCY) || 4;
/** Retry config for 429 (rate-limit) responses.  Gemini's 429 body
 *  contains "Please retry in Ns" — we parse that and honour it.  If
 *  absent, fall back to exponential backoff starting at BASE. */
const MAX_RETRIES_PER_CHUNK = 4;
const RETRY_BASE_MS = 3000;

/** Response schema we demand from Gemini (OpenAPI 3.0 subset used by the
 *  Gemini REST API).  Strict enough that the service refuses to emit
 *  malformed JSON — any missing or wrong-typed field comes back as an
 *  error before reaching us. */
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    partNumber: { type: 'INTEGER', nullable: true },
    assemblyConstituencyEn: { type: 'STRING', nullable: true },
    assemblyConstituencyHi: { type: 'STRING', nullable: true },
    voters: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          serialNumber: { type: 'INTEGER', nullable: true },
          epicNumber: { type: 'STRING' },
          fullNameEn: { type: 'STRING', nullable: true },
          fullNameHi: { type: 'STRING', nullable: true },
          fatherOrHusbandNameEn: { type: 'STRING', nullable: true },
          fatherOrHusbandNameHi: { type: 'STRING', nullable: true },
          gender: { type: 'STRING', enum: ['M', 'F', 'T'], nullable: true },
          age: { type: 'INTEGER', nullable: true },
          addressEn: { type: 'STRING', nullable: true },
          addressHi: { type: 'STRING', nullable: true },
        },
        required: ['epicNumber'],
      },
    },
  },
  required: ['voters'],
};

/** The prompt tells Gemini exactly what to extract and how to format it.
 *  We deliberately ask for BOTH Hindi (verbatim) and English (transliteration)
 *  for every human-readable field, since the source is a Hindi-script roll.
 *  Key framings:
 *    - "Do not translate meaning, only transliterate" → keeps names faithful
 *    - "If unreadable, return empty string" → no hallucination
 *    - "EPIC is Latin letters + digits only" → prevents Hindi-digit errors */
const PROMPT = `You are an OCR + data-extraction assistant for Indian Election
Commission (ECI) electoral-roll PDFs.

Extract EVERY voter record visible in this PDF chunk, from first page to
last page of the chunk.  Do NOT stop early.  Do NOT summarise or emit a
"sample" — output one JSON record per voter, for every voter on these
pages, in the order they appear.  An ECI roll page typically holds ~30
voters (3 columns × 10 rows).  If this chunk has P pages, expect roughly
P × 30 records in your output.

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

ALSO extract the roll header (if visible on any page in this chunk):
  - partNumber              (भाग संख्या / Part No.)
  - assemblyConstituencyEn  (AC name in Latin)
  - assemblyConstituencyHi  (AC name in Devanagari)

RULES:
  1. If a field is unreadable, blurry, or missing, return an empty string
     or null — DO NOT guess or fabricate.
  2. EPIC numbers use only A-Z and 0-9.  Never return Devanagari digits in
     EPIC.  If you cannot read an EPIC clearly, skip the entire record.
  3. Transliterate Hindi names letter-by-letter to Latin using the widely-
     used scheme (IAST-lite: श=Sh, ष=Sh, स=S, त=T, ठ=Th, etc.).  Do NOT
     translate the meaning of words.
  4. Return ONLY the JSON object.  No markdown, no commentary.`;

/** Convert ECI/Gemini output into our ParsedVoterRow shape.  Also does
 *  minor cleanup: trim whitespace, uppercase EPIC, drop records without
 *  a readable EPIC (Rule #2 above means Gemini should've already skipped
 *  them, but we defend anyway). */
interface GeminiVoter {
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

interface GeminiResponse {
  partNumber?: number | null;
  assemblyConstituencyEn?: string | null;
  assemblyConstituencyHi?: string | null;
  voters: GeminiVoter[];
}

function toRow(v: GeminiVoter): ParsedVoterRow | null {
  const epic = (v.epicNumber || '').trim().toUpperCase();
  if (!epic || !/^[A-Z]{2,3}\d{6,7}$/.test(epic)) {
    return null;
  }
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

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/** Recover voter records from a truncated JSON response.  Gemini
 *  occasionally hits its output-token cap mid-object; rather than throw
 *  everything away, we find the last complete `}` inside the `voters`
 *  array and hand-close the JSON there. */
function tryRecoverTruncatedJson(raw: string): GeminiResponse | null {
  const votersIdx = raw.indexOf('"voters"');
  if (votersIdx === -1) return null;
  const arrayStart = raw.indexOf('[', votersIdx);
  if (arrayStart === -1) return null;

  // Walk forward tracking brace depth; collect every `}` that returns us
  // to depth 1 (meaning that object is a direct child of the voters array).
  let depth = 0;
  let lastObjEnd = -1;
  let inString = false;
  let escape = false;
  for (let i = arrayStart; i < raw.length; i++) {
    const c = raw[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 1) lastObjEnd = i;  // completed one voter record
    }
  }
  if (lastObjEnd === -1) return null;

  const repaired = raw.slice(0, lastObjEnd + 1) + ']}';
  try {
    const obj = JSON.parse(repaired) as GeminiResponse;
    if (Array.isArray(obj.voters) && obj.voters.length > 0) return obj;
  } catch {
    // fall through
  }
  return null;
}

/** Split a PDF buffer into sub-PDFs, each containing up to `pagesPerChunk`
 *  consecutive pages from the original.  Returns chunks in page order. */
async function splitPdfIntoChunks(
  buffer: Buffer,
  pagesPerChunk: number,
): Promise<Buffer[]> {
  const src = await PDFDocument.load(buffer);
  const totalPages = src.getPageCount();
  const chunks: Buffer[] = [];
  for (let start = 0; start < totalPages; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk, totalPages);
    const dst = await PDFDocument.create();
    const indices = Array.from({ length: end - start }, (_, i) => start + i);
    const copied = await dst.copyPages(src, indices);
    copied.forEach((p) => dst.addPage(p));
    const bytes = await dst.save();
    chunks.push(Buffer.from(bytes));
  }
  return chunks;
}

/** Run tasks with bounded parallelism.  Preserves input order in the
 *  returned array. */
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

/** Parse a Gemini 429 body for the server-suggested retry delay.  Body
 *  looks like: "...Please retry in 47.879909699s..." — we extract the
 *  float and convert to ms.  Returns null if no hint found. */
function retryAfterMsFromError(errBody: string): number | null {
  const m = errBody.match(/retry in ([\d.]+)s/i);
  if (!m) return null;
  const seconds = parseFloat(m[1]);
  if (!isFinite(seconds) || seconds <= 0) return null;
  // Add a small jitter buffer so we don't land on the edge of the window
  // and get another 429.
  return Math.ceil(seconds * 1000) + 500;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One Gemini call against one (chunk of) PDF, with retry on 429.
 *  Returns the raw parsed response — merging into the final
 *  GeminiParseResult happens upstream.
 *
 *  `onAttempt` and `onWait` are optional progress hooks (used by the
 *  outer chunker to fire `chunk_started` and `chunk_waiting` events so
 *  the UI can show a live status per chunk across retries). */
async function callGeminiOnce(
  pdfBuffer: Buffer,
  modelName: string,
  apiKey: string,
  hooks: {
    onAttempt?: (attempt: number) => void;
    onWait?: (waitMs: number, reason: string) => void;
  } = {},
): Promise<GeminiResponse> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES_PER_CHUNK; attempt++) {
    hooks.onAttempt?.(attempt + 1);
    const t0 = Date.now();
    try {
      console.log(`[gemini] attempt ${attempt + 1}/${MAX_RETRIES_PER_CHUNK + 1} — calling ${modelName} (${pdfBuffer.length} bytes)`);
      const res = await callGeminiOnceInner(pdfBuffer, modelName, apiKey);
      console.log(`[gemini] ✓ attempt ${attempt + 1} succeeded in ${Date.now() - t0}ms`);
      return res;
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message ?? e);
      const is429 = /HTTP 429/.test(msg) || /RESOURCE_EXHAUSTED/.test(msg);
      console.log(`[gemini] ✗ attempt ${attempt + 1} failed after ${Date.now() - t0}ms: ${msg.slice(0, 200)}`);
      if (!is429 || attempt === MAX_RETRIES_PER_CHUNK) {
        console.log(`[gemini] giving up (is429=${is429}, attempt=${attempt}, max=${MAX_RETRIES_PER_CHUNK})`);
        throw e;
      }
      // Prefer the server-suggested wait; fall back to exponential backoff.
      const hinted = retryAfterMsFromError(msg);
      const backoff = RETRY_BASE_MS * Math.pow(2, attempt);
      const waitMs = hinted ?? backoff;
      console.log(`[gemini] 429 — waiting ${waitMs}ms (hinted=${hinted != null}) before retry`);
      hooks.onWait?.(waitMs, hinted ? 'rate-limited (429)' : 'retry backoff');
      await sleep(waitMs);
    }
  }
  throw lastErr ?? new Error('callGeminiOnce: exhausted retries');
}

async function callGeminiOnceInner(
  pdfBuffer: Buffer,
  modelName: string,
  apiKey: string,
): Promise<GeminiResponse> {
  // We hit the REST API directly (not the @google/generative-ai SDK)
  // because the SDK's TypeScript types don't surface `thinkingConfig`,
  // and 2.5-class models default to a large "thinking" budget that eats
  // our output tokens before any JSON is emitted.  thinkingBudget: 0
  // disables thinking entirely — fine for deterministic OCR+transliteration
  // tasks where reasoning doesn't help.
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const reqBody = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: 'application/pdf', data: pdfBuffer.toString('base64') } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 65535,
      temperature: 0.0,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 500)}`);
  }
  const json: any = await resp.json();
  const raw: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!raw) {
    throw new Error(
      `Gemini returned an empty text part. Raw response prefix: ` +
        JSON.stringify(json).slice(0, 400),
    );
  }

  try {
    return JSON.parse(raw) as GeminiResponse;
  } catch (e) {
    // Most common failure: the response got truncated (hit output token
    // cap) mid-array.  Attempt to recover whatever complete voter objects
    // we can by snipping at the last valid `}` and closing the array.
    const recovered = tryRecoverTruncatedJson(raw);
    if (recovered) return recovered;
    throw new Error(
      `Gemini returned non-JSON response (${raw.length} chars). ` +
        `First 200 chars: ${raw.slice(0, 200)}\n` +
        `Last 200 chars: ${raw.slice(-200)}`,
    );
  }
}

export async function parseEciRollPdfWithGemini(
  buffer: Buffer,
  opts: GeminiParseOptions = {},
): Promise<GeminiParseResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiNotConfiguredError();

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const emit = (e: GeminiProgressEvent) => {
    if (!opts.onProgress) return;
    try { opts.onProgress(e); } catch { /* never let UI callbacks crash parsing */ }
  };

  // Count pages up front so we know whether to chunk.
  let totalPages: number;
  try {
    const src = await PDFDocument.load(buffer);
    totalPages = src.getPageCount();
  } catch (e: any) {
    throw new GeminiParseFailedError(
      `Could not read PDF structure: ${e?.message || e}`,
      e,
    );
  }

  // Build the list of chunks to send.  For small PDFs (<= threshold)
  // we send the original buffer as a single chunk — zero split overhead.
  let chunks: Buffer[];
  if (totalPages <= CHUNK_PAGE_THRESHOLD) {
    chunks = [buffer];
  } else {
    try {
      chunks = await splitPdfIntoChunks(buffer, CHUNK_PAGES);
    } catch (e: any) {
      throw new GeminiParseFailedError(
        `Could not split PDF into page-range chunks: ${e?.message || e}`,
        e,
      );
    }
  }

  // Test-mode early stop: if the caller only wants N voters, cap how many
  // chunks we actually send.  Uses a conservative per-chunk estimate so we
  // never end up with fewer than N rows just because a chunk was thin.
  let testLimitNote: string | null = null;
  if (opts.maxVoters && opts.maxVoters > 0 && chunks.length > 1) {
    const neededChunks = Math.max(
      1,
      Math.ceil(opts.maxVoters / VOTERS_PER_CHUNK_ESTIMATE),
    );
    if (neededChunks < chunks.length) {
      console.log(
        `[gemini-chunker] maxVoters=${opts.maxVoters} → limiting to ${neededChunks}/${chunks.length} chunks`,
      );
      testLimitNote =
        `Test mode: only first ${neededChunks} of ${chunks.length} PDF chunks sent to Gemini ` +
        `(target ~${opts.maxVoters} voters).`;
      chunks = chunks.slice(0, neededChunks);
    }
  }

  console.log(`[gemini-chunker] totalPages=${totalPages}, chunks=${chunks.length}, concurrency=${CHUNK_CONCURRENCY}, perChunkBytes=${chunks.map((c) => c.length).join(',')}`);
  emit({ type: 'start', totalPages, totalChunks: chunks.length });

  const warnings: string[] = [];
  const chunkErrors: string[] = [];
  // Merge state — updated inside the parallel runner so `chunk_done`
  // events can report cumulative counts to the UI.
  let mergedPartNumber: number | undefined;
  let mergedAcEn: string | undefined;
  let mergedAcHi: string | undefined;
  const allVoters: GeminiVoter[] = [];
  let successfulChunks = 0;
  let runningTotal = 0;

  const responses = await runWithConcurrency(chunks, CHUNK_CONCURRENCY, async (chunk, idx) => {
    try {
      const r = await callGeminiOnce(chunk, modelName, apiKey, {
        // Fire chunk_started on every attempt (1st try + each retry) so the
        // UI can say "chunk 5/12 · attempt 2".
        onAttempt: (attempt) => emit({ type: 'chunk_started', index: idx, total: chunks.length, attempt }),
        // Fire chunk_waiting when we're about to sleep (usually 429 rate
        // limit) — UI uses this to render "rate-limited, retrying in 47s".
        onWait: (waitMs, reason) =>
          emit({ type: 'chunk_waiting', index: idx, total: chunks.length, waitMs, reason }),
      });
      // Convert this chunk's voters into ParsedVoterRow shape immediately
      // so the progress event carries real, UI-ready rows (not raw Gemini
      // voter objects).  We also accumulate into the final allVoters[] via
      // r.response.voters inside the merge pass below — but emit what we
      // have now so the user sees rows streaming in.
      const chunkRows: ParsedVoterRow[] = [];
      for (const v of r.voters || []) {
        const row = toRow(v);
        if (row) {
          if (typeof r.partNumber === 'number' && !row.partNumber) row.partNumber = r.partNumber;
          chunkRows.push(row);
        }
      }
      runningTotal += chunkRows.length;
      console.log(`[gemini-chunker] chunk ${idx + 1}/${chunks.length} done — ${chunkRows.length} rows (running total ${runningTotal})`);
      // Capture header info on first non-null hit so the UI can show the
      // AC name as soon as chunk 0 returns.
      if (mergedPartNumber === undefined && typeof r.partNumber === 'number') mergedPartNumber = r.partNumber;
      if (!mergedAcEn && r.assemblyConstituencyEn) mergedAcEn = r.assemblyConstituencyEn;
      if (!mergedAcHi && r.assemblyConstituencyHi) mergedAcHi = r.assemblyConstituencyHi;
      emit({
        type: 'chunk_done',
        index: idx,
        total: chunks.length,
        rowsInChunk: chunkRows,
        runningTotal,
        partNumber: mergedPartNumber,
        assemblyConstituencyEn: mergedAcEn,
        assemblyConstituencyHi: mergedAcHi,
      });
      return { ok: true as const, idx, response: r };
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.log(`[gemini-chunker] chunk ${idx + 1}/${chunks.length} FAILED: ${msg.slice(0, 200)}`);
      chunkErrors.push(`chunk ${idx + 1}/${chunks.length}: ${msg}`);
      emit({
        type: 'chunk_error',
        index: idx,
        total: chunks.length,
        message: msg,
        runningTotal,
      });
      return { ok: false as const, idx, error: e };
    }
  });

  // Second pass: merge the raw voter objects into allVoters[] in chunk
  // order.  We kept header-field merging inline above (so progress events
  // could report it live); here we just concatenate the voter arrays.
  for (const r of responses) {
    if (!r.ok) continue;
    successfulChunks++;
    if (Array.isArray(r.response.voters)) allVoters.push(...r.response.voters);
  }

  if (successfulChunks === 0) {
    throw new GeminiParseFailedError(
      `All ${chunks.length} PDF chunks failed to parse. First error: ` +
        (chunkErrors[0] || 'unknown'),
    );
  }
  if (chunkErrors.length > 0) {
    warnings.push(
      `${chunkErrors.length} of ${chunks.length} page-range chunk(s) failed; ` +
        `records from those pages are missing.  First failure: ${chunkErrors[0]}`,
    );
  }
  if (chunks.length > 1) {
    warnings.push(
      `Split the ${totalPages}-page PDF into ${chunks.length} chunks of ≤${CHUNK_PAGES} ` +
        `page(s) and parsed each separately.`,
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
    throw new GeminiParseFailedError(
      'Gemini returned zero voter records. The PDF may be too low-quality, ' +
        'too few pages, or not an electoral roll. Try a higher-resolution scan.',
    );
  }

  // Dedupe by EPIC — Gemini occasionally repeats a record across pages,
  // and a single voter can legitimately appear in two chunks if a page
  // boundary happens to fall inside a record's visual footprint.
  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    if (seen.has(r.epicNumber)) return false;
    seen.add(r.epicNumber);
    return true;
  });
  if (deduped.length < rows.length) {
    warnings.push(
      `Removed ${rows.length - deduped.length} duplicate record(s) with repeated EPIC numbers.`,
    );
  }

  // Sort by serial number when we have it — chunks arrive in page order
  // so this is usually a no-op, but it's defensive against out-of-order
  // voters within a chunk and against gaps caused by partial failures.
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
    modelUsed: modelName,
    usageNote:
      'Records were extracted by Gemini vision OCR. Accuracy is typically 95-99% per field. ' +
      'Please spot-check the preview before confirming the import — especially EPIC numbers ' +
      'and mobile-number-adjacent rows.',
  };
}
