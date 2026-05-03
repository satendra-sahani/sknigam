'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import api from '@/lib/api';

interface Props {
  onClose: () => void;
  onImported: () => void;
  /** Pre-fill the Booth ID input so callers that open the modal from a
   *  specific booth row (e.g. the Upload button on /explore) target that
   *  booth automatically.  The user can still edit the field. */
  defaultBoothId?: string;
}

interface PreviewRow {
  row: number;
  status: 'valid' | 'invalid';
  data?: any;
  errors?: string[];
}

interface DuplicateBreakdownEntry {
  boothId: string;
  count: number;
  boothName?: string;
}

interface PreviewSummary {
  total: number;
  valid: number;
  invalid: number;
  /** New field — how many EPICs in this upload already live in the DB.
   *  Populated even when invalid === 0 (replaceExisting mode counts them
   *  as valid-but-reassignable, so the UI needs a separate counter). */
  existingInDb?: number;
  /** Per-booth distribution of duplicates.  Answers "where do my voters
   *  currently live?" — shown as a small list under the preview when
   *  duplicates are present. */
  duplicateBreakdown?: DuplicateBreakdownEntry[];
  preview: PreviewRow[];
  warnings?: string[];
  source?: 'pdf-text' | 'pdf-vision' | 'excel';
}

/** One voter row as it streams in from the server during parse.
 *  Shape mirrors ParsedVoterRow — undefined fields render as "-". */
interface LiveVoter {
  voterSerialNumber?: number;
  epicNumber: string;
  fullName?: string;
  fullNameHi?: string;
  fatherOrHusbandName?: string;
  fatherOrHusbandNameHi?: string;
  gender?: 'M' | 'F' | 'T';
  age?: number;
  address?: string;
  addressHi?: string;
}

type Stage = 'idle' | 'uploading' | 'parsing' | 'error';

interface ProgressState {
  stage: Stage;
  totalPages?: number;
  totalChunks: number;
  completedChunks: number;
  failedChunks: number;
  votersFound: number;
  partNumber?: number;
  acHi?: string;
  acEn?: string;
  message?: string;
  // Which chunks are currently in flight (0-based indices) — lets the UI
  // render "chunk 3, chunk 4 running" even before either completes.
  inFlightChunks: number[];
  // Last status line per chunk: "waiting 47s (429)", "attempt 2", etc.
  chunkStatuses: Record<number, string>;
  // Last server heartbeat timestamp — used to drive a subtle "alive" dot
  // so the user sees the stream proving it's healthy even between events.
  lastTickAt?: number;
}

const EMPTY_PROGRESS: ProgressState = {
  stage: 'idle',
  totalChunks: 0,
  completedChunks: 0,
  failedChunks: 0,
  votersFound: 0,
  inFlightChunks: [],
  chunkStatuses: {},
};

/** Cap on live-preview rows kept in React state.  For a 1000-voter roll,
 *  rendering every row while parsing would balloon the DOM and slow the
 *  modal's render loop; 200 is plenty for spot-checking.  The full row
 *  set still lands in MongoDB at import time. */
const MAX_LIVE_ROWS = 200;

export default function ImportVotersModal({ onClose, onImported, defaultBoothId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [boothId, setBoothId] = useState(defaultBoothId ?? '');
  const [parseLimit, setParseLimit] = useState<string>('');
  const [preview, setPreview] = useState<PreviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Streaming UI state.  Kept separate from `preview` so the progress
  // region can render as soon as `start` arrives, long before the final
  // `done` event builds the full preview summary.
  const [progress, setProgress] = useState<ProgressState>(EMPTY_PROGRESS);
  const [liveVoters, setLiveVoters] = useState<LiveVoter[]>([]);
  // When the server short-circuits on cached parse (e.g. user clicks
  // Import after Preview of the same file), we flash a brief "used
  // cached parse" note so they know why it finished instantly.
  const [cacheNote, setCacheNote] = useState<string | null>(null);

  /** Replace-existing mode.  When true, EPICs that already exist in the DB
   *  are re-assigned to the target booth (via a bulkWrite update) instead of
   *  being rejected as duplicates.  Needed when the same PDF has been
   *  imported before against a different booth and the user wants to
   *  re-assign those voters to the current booth. */
  const [replaceExisting, setReplaceExisting] = useState(false);

  /** Streaming preview.  Posts multipart FormData with stream=true, reads
   *  the NDJSON response body line-by-line, and routes each event:
   *    - meta          : ack, file size visible
   *    - progress/start: bar appears, shows "N pages · M chunks"
   *    - progress/chunk_done: tick bar, append rows to table, update counts
   *    - progress/chunk_error: tick failed counter
   *    - done          : set the final PreviewSummary, flip stage → done
   *    - error         : surface toast + inline error card
   *  If any network/parse error happens, we still set stage='error' so the
   *  user has a clear visual state instead of an infinite spinner. */
  async function runPreview() {
    if (!file) {
      toast.error('Select an Excel (.xlsx) or PDF file');
      return;
    }
    setLoading(true);
    setPreview(null);
    setLiveVoters([]);
    setCacheNote(null);
    setProgress({ ...EMPTY_PROGRESS, stage: 'uploading' });

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9003/api';
    const token = Cookies.get('accessToken') || localStorage.getItem('accessToken') || '';

    const fd = new FormData();
    fd.append('file', file);
    if (boothId) fd.append('boothId', boothId);
    fd.append('stream', 'true');
    if (replaceExisting) fd.append('replaceExisting', 'true');
    const limitN = parseInt(parseLimit, 10);
    if (!Number.isNaN(limitN) && limitN > 0) fd.append('parseLimit', String(limitN));

    let resp: Response;
    try {
      resp = await fetch(`${apiBase}/voters/bulk-import`, {
        method: 'POST',
        // Deliberately NOT setting Content-Type so the browser adds the
        // correct multipart boundary automatically.
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
    } catch (e: any) {
      setProgress((s) => ({ ...s, stage: 'error', message: e?.message || 'Upload failed' }));
      toast.error(e?.message || 'Upload failed');
      setLoading(false);
      return;
    }

    if (!resp.body) {
      setProgress((s) => ({ ...s, stage: 'error', message: 'Streaming not supported' }));
      toast.error('Streaming not supported by this browser/connection');
      setLoading(false);
      return;
    }

    setProgress((s) => ({ ...s, stage: 'parsing' }));

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let terminatedByEvent = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Last line may be partial — stash it back for the next read.
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: any;
          try {
            evt = JSON.parse(line);
          } catch {
            continue; // skip malformed line, keep reading
          }
          if (handleEvent(evt)) terminatedByEvent = true;
        }
      }
      // Drain any trailing buffered event.
      if (buffer.trim()) {
        try {
          const evt = JSON.parse(buffer);
          if (handleEvent(evt)) terminatedByEvent = true;
        } catch {
          /* ignore trailing junk */
        }
      }
      if (!terminatedByEvent) {
        // Stream ended without a 'done' or 'error' — treat as an error so
        // the user isn't stuck with a running bar.
        setProgress((s) => ({ ...s, stage: 'error', message: 'Stream ended unexpectedly' }));
      }
    } catch (e: any) {
      setProgress((s) => ({ ...s, stage: 'error', message: e?.message || 'Stream read error' }));
      toast.error(e?.message || 'Stream read error');
    } finally {
      setLoading(false);
    }
  }

  /** Route one NDJSON event to the right React state update.  Returns
   *  true if this event was terminal (done or error), so the caller knows
   *  whether a mid-stream disconnect is an anomaly. */
  function handleEvent(evt: any): boolean {
    if (!evt || typeof evt !== 'object') return false;

    if (evt.type === 'meta') {
      // File acknowledged by server; just wait for the first progress tick.
      return false;
    }

    if (evt.type === 'tick') {
      // Heartbeat — the server is alive and parsing; update "last tick"
      // so we can render a subtle animated dot proving the stream is live.
      setProgress((s) => ({ ...s, lastTickAt: evt.at ?? Date.now() }));
      return false;
    }

    if (evt.type === 'cache_hit') {
      // Server recognised the file from a previous parse within the last
      // 30 min.  No chunks will fire; the 'done' event is right behind.
      const ageSec = Math.round((evt.ageMs ?? 0) / 1000);
      setCacheNote(
        `Reused cached parse from ${ageSec}s ago — no Gemini call needed (${evt.voterCount} voters).`,
      );
      setProgress((s) => ({
        ...s,
        stage: 'parsing',
        totalChunks: 1,
        completedChunks: 1,
        votersFound: evt.voterCount ?? s.votersFound,
        partNumber: evt.partNumber ?? s.partNumber,
        acHi: evt.assemblyConstituencyHi ?? s.acHi,
        acEn: evt.assemblyConstituencyEn ?? s.acEn,
      }));
      return false;
    }

    if (evt.type === 'progress' && evt.event) {
      const pe = evt.event;
      if (pe.type === 'start') {
        setProgress((s) => ({
          ...s,
          stage: 'parsing',
          totalChunks: pe.totalChunks ?? 0,
          totalPages: pe.totalPages,
        }));
      } else if (pe.type === 'chunk_started') {
        // Track this chunk as "in flight" so the UI can show a spinner
        // against it even before it completes.  Attempt > 1 means we're
        // retrying after a 429.
        setProgress((s) => ({
          ...s,
          inFlightChunks: s.inFlightChunks.includes(pe.index)
            ? s.inFlightChunks
            : [...s.inFlightChunks, pe.index],
          chunkStatuses: {
            ...s.chunkStatuses,
            [pe.index]: pe.attempt > 1 ? `retrying (attempt ${pe.attempt})` : 'parsing…',
          },
        }));
      } else if (pe.type === 'chunk_waiting') {
        // The worker is sleeping before a retry — usually 5 RPM rate limit.
        // Show the remaining wait so the user knows we're not stuck.
        const waitSec = Math.round((pe.waitMs ?? 0) / 1000);
        setProgress((s) => ({
          ...s,
          chunkStatuses: {
            ...s.chunkStatuses,
            [pe.index]: `${pe.reason} — waiting ${waitSec}s`,
          },
        }));
      } else if (pe.type === 'chunk_done') {
        setProgress((s) => ({
          ...s,
          completedChunks: s.completedChunks + 1,
          votersFound: pe.runningTotal ?? s.votersFound,
          partNumber: pe.partNumber ?? s.partNumber,
          acHi: pe.assemblyConstituencyHi ?? s.acHi,
          acEn: pe.assemblyConstituencyEn ?? s.acEn,
          inFlightChunks: s.inFlightChunks.filter((i) => i !== pe.index),
          chunkStatuses: Object.fromEntries(
            Object.entries(s.chunkStatuses).filter(([k]) => Number(k) !== pe.index),
          ),
        }));
        if (Array.isArray(pe.rowsInChunk) && pe.rowsInChunk.length > 0) {
          setLiveVoters((prev) => {
            if (prev.length >= MAX_LIVE_ROWS) return prev;
            const room = MAX_LIVE_ROWS - prev.length;
            return prev.concat(pe.rowsInChunk.slice(0, room));
          });
        }
      } else if (pe.type === 'chunk_error') {
        setProgress((s) => ({
          ...s,
          failedChunks: s.failedChunks + 1,
          inFlightChunks: s.inFlightChunks.filter((i) => i !== pe.index),
          chunkStatuses: Object.fromEntries(
            Object.entries(s.chunkStatuses).filter(([k]) => Number(k) !== pe.index),
          ),
        }));
      }
      return false;
    }

    if (evt.type === 'done') {
      setPreview(evt.data as PreviewSummary);
      setProgress((s) => ({ ...s, stage: 'idle' })); // preview panel takes over
      return true;
    }

    if (evt.type === 'error') {
      const msg = String(evt.error || 'Parse failed');
      const hint = evt.hint ? String(evt.hint) : undefined;
      setProgress((s) => ({ ...s, stage: 'error', message: hint ? `${msg}\n\n${hint}` : msg }));
      toast.error(hint ? `${msg}\n\n${hint}` : msg, { duration: hint ? 10000 : 4000 });
      return true;
    }

    return false;
  }

  /** Final import.  Runs the same non-stream JSON path as before — server
   *  re-parses and insertMany's the validated rows.  We intentionally do
   *  NOT stream this step, because the progress signal the user cares
   *  about (chunked parse progress) was already shown during preview;
   *  import itself is DB-bound and fast once parsing completes. */
  async function runImport() {
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (boothId) fd.append('boothId', boothId);
      fd.append('confirm', 'true');
      if (replaceExisting) fd.append('replaceExisting', 'true');
      const limitN = parseInt(parseLimit, 10);
      if (!Number.isNaN(limitN) && limitN > 0) fd.append('parseLimit', String(limitN));
      const res = await api.post('/voters/bulk-import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(res.data.message || 'Imported');
      onImported();
    } catch (err: any) {
      const body = err.response?.data;
      toast.error(body?.hint ? `${body.error}\n\n${body.hint}` : body?.error || 'Import failed', {
        duration: body?.hint ? 10000 : 4000,
      });
    } finally {
      setImporting(false);
    }
  }

  const pct =
    progress.totalChunks > 0
      ? Math.round(((progress.completedChunks + progress.failedChunks) / progress.totalChunks) * 100)
      : 0;

  const isStreaming = progress.stage === 'parsing' || progress.stage === 'uploading';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Bulk Import Voters</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload an <strong>Excel (.xlsx)</strong> or a <strong>PDF</strong> (ECI Draft/Final Roll).
            </p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Text-layer PDFs parse instantly and free.  Scanned/image PDFs use Gemini vision OCR
              (~95-99% accurate, spot-check before confirming).  Excel columns: voterSerialNumber,
              epicNumber, fullName, fatherOrHusbandName, gender (M/F/T), age, address, partNumber,
              caste, religion, mobileNumber.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {!preview && progress.stage === 'idle' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Excel or PDF File</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm file:font-medium hover:file:bg-slate-200"
                />
                {file && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {file.name.toLowerCase().endsWith('.pdf') ? (
                      <>📄 PDF detected — if it&apos;s a scanned image, parsing will use Gemini OCR (~3 min for a 35-page roll).</>
                    ) : (
                      <>📊 Excel detected.</>
                    )}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Booth ID (optional — overrides partNumber column)
                </label>
                <input
                  value={boothId}
                  onChange={(e) => setBoothId(e.target.value)}
                  placeholder="24-char booth ObjectId"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Test limit (optional — parse only the first N voters)
                </label>
                <input
                  type="number"
                  min={1}
                  value={parseLimit}
                  onChange={(e) => setParseLimit(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="e.g. 2, 5, 50 — leave blank to parse the full file"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Handy for testing a new PDF template quickly — the parser will stop early
                  (scanned/OCR PDFs only send the first Gemini chunk) and both the preview
                  and the final import will be capped to this count.
                </p>
              </div>

              {/* Replace-existing toggle.  Off by default — default behaviour
                  is still "reject duplicates" so an accidental re-upload
                  doesn't silently re-assign voters across booths.  When on,
                  existing EPICs are moved to the current boothId. */}
              <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600"
                />
                <span className="text-xs text-amber-900 leading-relaxed">
                  <strong>Replace existing voters with same EPIC.</strong>
                  {' '}
                  <span className="text-amber-800">
                    Use this when re-uploading a roll that was previously
                    imported against a different booth — voters whose EPIC
                    already exists will be re-assigned to the booth above
                    instead of being rejected as duplicates.  Canvassing
                    state (visits, remarks, voting intention) is preserved.
                  </span>
                </span>
              </label>
            </>
          )}

          {/* Live progress panel — visible during streaming and briefly after
              errors.  Shows the progress bar, live counters, and an append-
              only table of the first MAX_LIVE_ROWS voters discovered so far. */}
          {(isStreaming || progress.stage === 'error') && (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">
                    {progress.stage === 'uploading' && 'Uploading file…'}
                    {progress.stage === 'parsing' &&
                      (progress.totalChunks > 0
                        ? `Parsing PDF · ${progress.completedChunks + progress.failedChunks} of ${progress.totalChunks} chunks`
                        : 'Analysing PDF…')}
                    {progress.stage === 'error' && 'Parse failed'}
                  </span>
                  <span className="font-mono text-slate-500">
                    {progress.totalChunks > 0 ? `${pct}%` : ''}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      progress.stage === 'error'
                        ? 'bg-rose-500'
                        : progress.totalChunks === 0
                        ? 'bg-sky-400 animate-pulse w-1/4'
                        : 'bg-sky-500'
                    }`}
                    style={progress.totalChunks > 0 ? { width: `${pct}%` } : undefined}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 text-[11px]">
                  <Stat label="Pages" value={progress.totalPages ?? '-'} />
                  <Stat label="Chunks" value={`${progress.completedChunks}/${progress.totalChunks || '?'}`} />
                  <Stat label="Voters found" value={progress.votersFound} emphasis />
                  <Stat label="Failed chunks" value={progress.failedChunks} danger={progress.failedChunks > 0} />
                </div>

                {(progress.acEn || progress.acHi || progress.partNumber) && (
                  <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                    <span className="text-slate-400">Roll header:</span>{' '}
                    {progress.acHi && <strong>{progress.acHi}</strong>}
                    {progress.acEn && <> / {progress.acEn}</>}
                    {progress.partNumber && <> · Part {progress.partNumber}</>}
                  </div>
                )}

                {/* Live per-chunk status.  Shows spinner + status for every
                    chunk currently in flight (typically up to CHUNK_CONCURRENCY
                    = 2).  Keeps the panel obviously animated during the ~30s
                    gap between `chunk_started` and the first `chunk_done`. */}
                {progress.inFlightChunks.length > 0 && (
                  <div className="text-[11px] text-slate-700 pt-1 border-t border-slate-200 space-y-1">
                    {progress.inFlightChunks.map((idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                        <span className="font-mono text-slate-500">chunk {idx + 1}/{progress.totalChunks}</span>
                        <span className="text-slate-600">{progress.chunkStatuses[idx] ?? 'parsing…'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Liveness dot: updates every 3s via server tick, proves the
                    stream is healthy even when no chunk has landed recently. */}
                {progress.lastTickAt && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>live · last signal {Math.max(0, Math.round((Date.now() - progress.lastTickAt) / 1000))}s ago</span>
                  </div>
                )}

                {cacheNote && (
                  <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-2 flex items-center gap-2">
                    <span>⚡</span>
                    <span>{cacheNote}</span>
                  </div>
                )}

                {progress.stage === 'error' && progress.message && (
                  <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 whitespace-pre-wrap">
                    {progress.message}
                  </div>
                )}
              </div>

              {liveVoters.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase text-slate-500 mb-2">
                    Live preview · first {Math.min(liveVoters.length, MAX_LIVE_ROWS)} voters
                    {liveVoters.length >= MAX_LIVE_ROWS && ' (more will land at import)'}
                  </h3>
                  <div className="border border-slate-200 rounded-lg max-h-72 overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium text-slate-500">#</th>
                          <th className="px-2 py-1.5 text-left font-medium text-slate-500">EPIC</th>
                          <th className="px-2 py-1.5 text-left font-medium text-slate-500">Name (Hi / En)</th>
                          <th className="px-2 py-1.5 text-left font-medium text-slate-500">Rel.</th>
                          <th className="px-2 py-1.5 text-left font-medium text-slate-500">G</th>
                          <th className="px-2 py-1.5 text-left font-medium text-slate-500">Age</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {liveVoters.map((v, i) => (
                          <tr key={`${v.epicNumber}-${i}`} className="hover:bg-slate-50">
                            <td className="px-2 py-1.5 font-mono text-slate-500">{v.voterSerialNumber ?? '-'}</td>
                            <td className="px-2 py-1.5 font-mono text-slate-700">{v.epicNumber}</td>
                            <td className="px-2 py-1.5 text-slate-800">
                              <div>{v.fullNameHi ?? '-'}</div>
                              <div className="text-slate-500 text-[10px]">{v.fullName ?? '-'}</div>
                            </td>
                            <td className="px-2 py-1.5 text-slate-600">
                              <div>{v.fatherOrHusbandNameHi ?? '-'}</div>
                              <div className="text-slate-400 text-[10px]">{v.fatherOrHusbandName ?? '-'}</div>
                            </td>
                            <td className="px-2 py-1.5 font-mono text-slate-600">{v.gender ?? '-'}</td>
                            <td className="px-2 py-1.5 font-mono text-slate-600">{v.age ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {preview && (
            <div className="space-y-3">
              {preview.source === 'pdf-text' && (
                <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs text-sky-900">
                  <span>📄</span>
                  <div>
                    <p className="font-medium">Parsed from text-layer PDF</p>
                    <p className="text-sky-800">
                      {preview.valid} voter records extracted deterministically from the PDF text stream.
                      No OCR — 100% fidelity to what the PDF says.
                    </p>
                  </div>
                </div>
              )}

              {preview.source === 'pdf-vision' && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900">
                  <span>🤖</span>
                  <div className="space-y-1">
                    <p className="font-semibold">AI-parsed via Gemini vision</p>
                    <p className="text-amber-800">
                      This PDF was a scanned image, so it was read by AI (Gemini).
                      Accuracy is typically <strong>95–99%</strong>, NOT 100%. Please spot-check
                      a few EPIC numbers and names in the preview below before confirming
                      the import. Bilingual output: fullName (English transliteration) + fullNameHi (Hindi verbatim).
                    </p>
                  </div>
                </div>
              )}

              {preview.warnings && preview.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                  <p className="font-medium">Parser warnings</p>
                  {preview.warnings.map((w, i) => (
                    <p key={i} className="text-amber-800">• {w}</p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[11px] uppercase text-slate-500">Total</p>
                  <p className="text-xl font-semibold text-slate-900">{preview.total}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-[11px] uppercase text-emerald-700">
                    {replaceExisting ? 'Insert + Reassign' : 'Valid'}
                  </p>
                  <p className="text-xl font-semibold text-emerald-800">{preview.valid}</p>
                </div>
                <div className="bg-rose-50 rounded-lg p-3">
                  <p className="text-[11px] uppercase text-rose-700">Invalid</p>
                  <p className="text-xl font-semibold text-rose-800">{preview.invalid}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-[11px] uppercase text-amber-700">Already in DB</p>
                  <p className="text-xl font-semibold text-amber-800">{preview.existingInDb ?? 0}</p>
                </div>
              </div>

              {/* Diagnostic: where the existing EPICs currently live.
                  Surfaces when we detect duplicates — answers the "my
                  835 voters disappeared" question by pointing at the
                  booth they actually landed on during a prior upload. */}
              {preview.duplicateBreakdown && preview.duplicateBreakdown.length > 0 && (
                <div className="border border-amber-200 bg-amber-50/60 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-900">
                    {preview.existingInDb} EPIC
                    {(preview.existingInDb ?? 0) === 1 ? '' : 's'} from this file already exist in the DB:
                  </p>
                  <ul className="text-[11px] text-amber-900 space-y-0.5 font-mono">
                    {preview.duplicateBreakdown.slice(0, 8).map((d) => (
                      <li key={d.boothId} className="flex items-baseline gap-2">
                        <span className="tabular-nums w-12 text-right">{d.count}</span>
                        <span className="text-amber-800">under booth</span>
                        <span className="text-amber-950">
                          {d.boothName || d.boothId.slice(-8)}
                        </span>
                      </li>
                    ))}
                    {preview.duplicateBreakdown.length > 8 && (
                      <li className="text-amber-700 italic">
                        …and {preview.duplicateBreakdown.length - 8} more booths
                      </li>
                    )}
                  </ul>
                  {!replaceExisting && (preview.existingInDb ?? 0) > 0 && (
                    <p className="text-[11px] text-amber-900 pt-1 border-t border-amber-200">
                      ↑ These will be rejected as duplicates.  Tick{' '}
                      <strong>&ldquo;Replace existing voters&rdquo;</strong> at the top to re-assign them
                      to the current booth instead.
                    </p>
                  )}
                </div>
              )}

              {preview.invalid > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase text-slate-500 mb-2">Errors (first 50)</h3>
                  <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-500">Row</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-500">Errors</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {preview.preview
                          .filter((r) => r.status === 'invalid')
                          .map((r) => (
                            <tr key={r.row}>
                              <td className="px-3 py-2 font-mono text-slate-600">{r.row}</td>
                              <td className="px-3 py-2 text-rose-700">{r.errors?.join('; ')}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          {!preview ? (
            <button
              onClick={runPreview}
              disabled={!file || loading}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition"
            >
              {loading ? 'Validating…' : 'Preview'}
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setPreview(null);
                  setLiveVoters([]);
                  setCacheNote(null);
                  setProgress(EMPTY_PROGRESS);
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Back
              </button>
              <button
                onClick={runImport}
                disabled={preview.valid === 0 || importing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 transition"
              >
                {importing ? 'Importing…' : `Import ${preview.valid} Voters`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasis,
  danger,
}: {
  label: string;
  value: number | string;
  emphasis?: boolean;
  danger?: boolean;
}) {
  const valueCls = danger
    ? 'text-rose-700 font-semibold'
    : emphasis
    ? 'text-sky-700 font-semibold'
    : 'text-slate-800 font-medium';
  return (
    <div className="bg-white rounded border border-slate-200 px-2 py-1">
      <div className="text-slate-400 uppercase tracking-wide">{label}</div>
      <div className={valueCls}>{value}</div>
    </div>
  );
}
