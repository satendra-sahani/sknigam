import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import * as XLSX from 'xlsx';
import mongoose from 'mongoose';
import Voter from '../models/Voter';
import Booth from '../models/Booth';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createAuditLog } from '../middleware/audit';
import { upload } from '../middleware/upload';
import { mongoIdParam, paginationQuery } from '../utils/validators';
import {
  parseEciRollPdf,
  ImageOnlyPdfError,
  UnreadablePdfError,
} from '../utils/eciRollPdfParser';
import {
  parseEciRollPdfWithGemini,
  isGeminiConfigured,
  GeminiNotConfiguredError,
  GeminiParseFailedError,
} from '../utils/geminiVisionPdfParser';
import {
  fileHash,
  getCachedParse,
  setCachedParse,
  type CachedParse,
} from '../utils/parseResultCache';

const router = Router();

const VALID_GRIEVANCES = new Set([
  'Roads', 'Water', 'Electricity', 'Employment', 'Education',
  'Health', 'Pension', 'Corruption', 'LawAndOrder', 'Other',
]);

// Staff may only see voters in booths they are assigned to (Stage 3 will enforce;
// Stage 2 allows super_admin full access, staff/politician read-only by constituency).
function buildVoterFilter(req: AuthRequest): any {
  const filter: any = {};
  const q = req.query;

  if (q.assemblyConstituency) filter.assemblyConstituency = q.assemblyConstituency;
  if (q.boothId && mongoose.isValidObjectId(q.boothId as string)) filter.boothId = q.boothId;
  if (q.partNumber) filter.partNumber = parseInt(q.partNumber as string, 10);
  if (q.caste) filter.caste = q.caste;
  if (q.religion) filter.religion = q.religion;
  if (q.gender) filter.gender = q.gender;
  if (q.votingIntention) filter.votingIntention = q.votingIntention;
  if (q.verificationStatus !== undefined) filter.verificationStatus = q.verificationStatus === 'true';
  if (q.favouriteCandidate) filter.favouriteCandidate = q.favouriteCandidate;

  if (q.search) {
    const s = String(q.search);
    filter.$or = [
      { fullName: { $regex: s, $options: 'i' } },
      { epicNumber: { $regex: s, $options: 'i' } },
      { fatherOrHusbandName: { $regex: s, $options: 'i' } },
      { mobileNumber: { $regex: s } },
    ];
  }

  // Politicians only see their constituency
  if (req.user?.role === 'politician' && req.user.assemblyConstituency) {
    filter.assemblyConstituency = req.user.assemblyConstituency;
  }

  return filter;
}

// GET /api/voters — paginated list with filters
router.get(
  '/',
  authenticate,
  requireRole('super_admin', 'staff', 'politician'),
  paginationQuery,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 200);
      const skip = (page - 1) * limit;
      const filter = buildVoterFilter(req);

      const [voters, total] = await Promise.all([
        Voter.find(filter)
          .populate('boothId', 'name partNumber assemblyConstituency')
          .sort({ partNumber: 1, voterSerialNumber: 1 })
          .skip(skip)
          .limit(limit),
        Voter.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: { voters, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/voters/:id
router.get(
  '/:id',
  authenticate,
  requireRole('super_admin', 'staff', 'politician'),
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const voter = await Voter.findById(req.params.id)
        .populate('boothId', 'name partNumber assemblyConstituency district')
        .populate('visitedBy', 'name phone');
      if (!voter) {
        res.status(404).json({ success: false, error: 'Voter not found' });
        return;
      }
      if (
        req.user?.role === 'politician' &&
        req.user.assemblyConstituency &&
        voter.assemblyConstituency !== req.user.assemblyConstituency
      ) {
        res.status(403).json({ success: false, error: 'Not in your constituency' });
        return;
      }
      res.json({ success: true, data: voter });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// POST /api/voters — create single voter (super_admin only)
router.post(
  '/',
  authenticate,
  requireRole('super_admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const body = req.body;
      const required = ['voterSerialNumber', 'epicNumber', 'fullName', 'gender', 'address', 'boothId'];
      for (const f of required) {
        if (body[f] === undefined || body[f] === null || body[f] === '') {
          res.status(400).json({ success: false, error: `${f} is required` });
          return;
        }
      }
      const booth = await Booth.findById(body.boothId);
      if (!booth) {
        res.status(400).json({ success: false, error: 'Invalid boothId' });
        return;
      }
      const voter = await Voter.create({
        ...body,
        partNumber: booth.partNumber,
        assemblyConstituency: booth.assemblyConstituency,
      });
      await createAuditLog(
        req.user!.userId,
        req.user!.role,
        'voter_import',
        req,
        voter._id.toString(),
        undefined,
        { epicNumber: voter.epicNumber, fullName: voter.fullName },
      );
      res.status(201).json({ success: true, data: voter, message: 'Voter created' });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({ success: false, error: 'Duplicate EPIC number' });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// PUT /api/voters/:id — update voter (super_admin + staff on visit)
router.put(
  '/:id',
  authenticate,
  requireRole('super_admin', 'staff'),
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }

      const existing = await Voter.findById(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Voter not found' });
        return;
      }

      const update: any = { ...req.body };
      delete update.epicNumber;
      delete update.boothId;
      delete update.partNumber;
      delete update.assemblyConstituency;

      if (Array.isArray(update.grievances)) {
        update.grievances = update.grievances.filter((g: string) => VALID_GRIEVANCES.has(g));
      }

      const isVisit = !!(update.verificationStatus || update.staffRemarks || update.visitDate);
      if (isVisit && req.user?.role === 'staff') {
        update.visitedBy = req.user.userId;
        update.visitDate = update.visitDate || new Date();
      }

      const voter = await Voter.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });

      await createAuditLog(
        req.user!.userId,
        req.user!.role,
        isVisit ? 'voter_visit' : 'voter_update',
        req,
        req.params.id,
        { verificationStatus: existing.verificationStatus },
        { verificationStatus: voter?.verificationStatus },
      );

      res.json({ success: true, data: voter, message: 'Voter updated' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// DELETE /api/voters/:id
router.delete(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const voter = await Voter.findByIdAndDelete(req.params.id);
      if (!voter) {
        res.status(404).json({ success: false, error: 'Voter not found' });
        return;
      }
      await createAuditLog(
        req.user!.userId,
        req.user!.role,
        'voter_update',
        req,
        req.params.id,
        { epicNumber: voter.epicNumber },
        { deleted: true },
      );
      res.json({ success: true, message: 'Voter deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// POST /api/voters/bulk-import — Excel OR text-layer PDF import (preview + confirm flow)
// Excel columns: voterSerialNumber, epicNumber, fullName, fatherOrHusbandName,
//   gender (M/F/T), age, address, partNumber, caste, religion, mobileNumber, ...
// PDF: only text-layer PDFs (ECI Draft Rolls, DEO exports) are parsed;
//   scanned/image PDFs are rejected with a clear message (no OCR).
router.post(
  '/bulk-import',
  authenticate,
  requireRole('super_admin'),
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    // `stream=true` (body or query) switches this endpoint from a single
    // JSON reply to an NDJSON stream.  Each line is `{type, ...}`.  Events:
    //   - {type:'meta', source, isPdf}                 before parsing
    //   - {type:'progress', ...GeminiProgressEvent}    per Gemini chunk
    //   - {type:'done', data: <preview-or-import-body>} final success
    //   - {type:'error', error, hint?}                 terminal failure
    // Non-stream path is entirely unchanged; clients that don't opt in see
    // the same {success, data, message} JSON they always got.
    const wantsStream = req.body.stream === 'true' || req.query.stream === 'true';
    let streamHeadersSent = false;
    const emit = (obj: unknown): void => {
      if (!wantsStream) return;
      if (!streamHeadersSent) {
        res.status(200);
        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering
        res.setHeader('Connection', 'keep-alive');
        // Disable Nagle's algorithm on the underlying TCP socket — otherwise
        // small NDJSON writes (like a 200-byte chunk_done event) can be
        // batched by the OS and not reach the browser for 40ms+.  On a long
        // parse with infrequent events, that batching is invisible most of
        // the time but on localhost-over-loopback it's enough to make the
        // progress bar look frozen between ticks.
        req.socket?.setNoDelay?.(true);
        // Force headers out NOW so the browser's fetch() resolves and the
        // NDJSON reader can start consuming, rather than waiting for the
        // first write to incidentally flush them.
        res.flushHeaders?.();
        streamHeadersSent = true;
      }
      try {
        const line = JSON.stringify(obj) + '\n';
        // Server-side trace so we can watch stream frames in the API console.
        // Truncate long payloads (chunk_done carries rows) so logs stay readable.
        const preview = line.length > 300 ? line.slice(0, 300).replace(/\n$/, '') + '…' : line.replace(/\n$/, '');
        console.log(`[bulk-import:stream] → ${preview}`);
        res.write(line);
      } catch (err) {
        console.log('[bulk-import:stream] write failed (client likely gone):', (err as Error).message);
      }
    };
    // Heartbeat: during long Gemini parses the gap between chunk_done
    // events can exceed 30s.  Without occasional traffic the browser's
    // visual state looks frozen (even though the stream is healthy) and
    // intermediate proxies may also idle-close the connection.  A 3-second
    // tick keeps both animated and alive.
    let heartbeatHandle: NodeJS.Timeout | null = null;
    const startHeartbeat = () => {
      if (heartbeatHandle || !wantsStream) return;
      heartbeatHandle = setInterval(() => {
        emit({ type: 'tick', at: Date.now() });
      }, 3000);
    };
    const stopHeartbeat = () => {
      if (heartbeatHandle) { clearInterval(heartbeatHandle); heartbeatHandle = null; }
    };

    // Terminal helpers.  In stream mode we ALWAYS return HTTP 200 and put
    // the success/error distinction in the final NDJSON event, because
    // once we've started writing we can't change the status code.
    const replyOk = (data: any, message?: string): void => {
      stopHeartbeat();
      if (wantsStream) {
        emit({ type: 'done', success: true, data, message });
        res.end();
      } else {
        res.json({ success: true, data, message });
      }
    };
    const replyErr = (status: number, error: string, extras: Record<string, unknown> = {}): void => {
      stopHeartbeat();
      if (wantsStream) {
        emit({ type: 'error', success: false, error, ...extras });
        res.end();
      } else {
        res.status(status).json({ success: false, error, ...extras });
      }
    };
    // If the client disconnects mid-parse, stop the heartbeat so we don't
    // leak the interval.  We can't abort the Gemini calls (they're plain
    // Promises), but at least we stop emitting.
    req.on('close', stopHeartbeat);

    try {
      if (!req.file) {
        replyErr(400, 'Excel (.xlsx) or PDF file is required');
        return;
      }

      const isPdf =
        req.file.mimetype === 'application/pdf' ||
        req.file.originalname.toLowerCase().endsWith('.pdf');

      let rows: any[] = [];
      const pdfWarnings: string[] = [];
      let pdfSource: 'pdf-text' | 'pdf-vision' = 'pdf-text';

      // Optional row cap — used for quick-testing a new PDF template
      // without parsing or inserting the full roll.  Accepts any positive
      // integer; unset / NaN / ≤0 means "no cap".
      const rawParseLimit = (req.body.parseLimit as string) || (req.query.parseLimit as string) || '';
      const parsedLimit = parseInt(rawParseLimit, 10);
      const parseLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 0;

      // Announce what kind of parse is about to run so the UI can render
      // a sensible progress skeleton immediately (before the first chunk).
      emit({ type: 'meta', isPdf, fileName: req.file.originalname, fileSize: req.file.size });
      // Start the keep-alive tick now — any events that follow (cache_hit,
      // progress, done) naturally interleave with the ticks; the UI reads
      // ticks as a liveness signal and ignores them for counters.
      startHeartbeat();

      if (isPdf) {
        // Cache short-circuit: if the exact same PDF bytes were parsed
        // within the last 30 min (typically via a Preview click just
        // moments before), skip parsing entirely.  This is the Preview →
        // Import same-file flow; without the cache, the user would pay
        // the full Gemini round-trip twice.
        const hash = fileHash(req.file.buffer);
        // Composite key ensures Preview + Import reuse the same parse when
        // both use the same parseLimit — and that an unlimited import never
        // serves a truncated cached parse.
        const cacheKey = parseLimit > 0 ? `${hash}:${parseLimit}` : hash;
        console.log(`[bulk-import] PDF received: ${req.file.size} bytes, hash=${hash.slice(0, 12)}…, stream=${wantsStream}, confirm=${req.body.confirm === 'true'}, parseLimit=${parseLimit}`);
        const cached = getCachedParse(cacheKey);
        if (cached) {
          console.log(`[bulk-import] CACHE HIT — ${cached.rows.length} rows, ${Math.round((Date.now() - cached.cachedAt) / 1000)}s old`);
          rows = cached.rows.map((r) => ({ ...r }));
          pdfWarnings.push(...cached.warnings);
          pdfSource = cached.source === 'pdf-vision' ? 'pdf-vision' : 'pdf-text';
          emit({
            type: 'cache_hit',
            source: cached.source,
            voterCount: cached.rows.length,
            ageMs: Date.now() - cached.cachedAt,
            partNumber: cached.partNumber,
            assemblyConstituencyEn: cached.assemblyConstituency,
            assemblyConstituencyHi: cached.assemblyConstituencyHi,
          });
        } else {
          // Two-stage PDF flow (cache miss):
          //   1. Try the free, deterministic text-layer parser.  If it succeeds,
          //      we get 100% accuracy at zero API cost.
          //   2. If the PDF has no text layer (scanned/image), fall back to the
          //      Gemini vision parser — accurate (~95-99%) but probabilistic
          //      and API-cost-bearing.  The preview surfaces a warning so the
          //      user spot-checks before confirming the import.
          const userWantsVision =
            req.body.useVision === 'true' || req.query.useVision === 'true';
          // These locals capture just-parsed metadata so we can hand them to
          // the cache after success without re-deriving from the mapped rows.
          let parsedPartNumber: number | undefined;
          let parsedAcEn: string | undefined;
          let parsedAcHi: string | undefined;
          const justParsedWarnings: string[] = [];

          try {
            if (userWantsVision) throw new ImageOnlyPdfError('User requested vision parsing');
            const parsed = await parseEciRollPdf(req.file.buffer);
            rows = parsed.rows.map((r) => ({
              voterSerialNumber: r.voterSerialNumber,
              epicNumber: r.epicNumber,
              fullName: r.fullName,
              fullNameHi: r.fullNameHi,
              fatherOrHusbandName: r.fatherOrHusbandName,
              fatherOrHusbandNameHi: r.fatherOrHusbandNameHi,
              gender: r.gender,
              age: r.age,
              address: r.address,
              addressHi: r.addressHi,
              partNumber: r.partNumber,
            }));
            justParsedWarnings.push(...parsed.warnings);
            pdfWarnings.push(...parsed.warnings);
            pdfSource = 'pdf-text';
            parsedPartNumber = parsed.partNumber;
            parsedAcHi = parsed.assemblyConstituency;
          } catch (e: any) {
            const isNoText = e instanceof ImageOnlyPdfError || e instanceof UnreadablePdfError;
            if (!isNoText) throw e;

            // Fall back to Gemini vision, if configured.
            if (!isGeminiConfigured()) {
              replyErr(400, e.message, {
                hint:
                  'This PDF has no text layer, and Gemini vision parsing is not configured on ' +
                  'the server. Ask an admin to set GEMINI_API_KEY in the API .env file, or ' +
                  'upload the Excel (.xlsx) template instead.',
              });
              return;
            }

            try {
              const vision = await parseEciRollPdfWithGemini(req.file.buffer, {
                // Pipe chunk-level progress through the NDJSON stream so the
                // UI can tick the progress bar and append voter rows live.
                // The parser's GeminiProgressEvent already has a discriminating
                // `type` field ('start' | 'chunk_done' | 'chunk_error'); wrap
                // it in an envelope so the outer stream also has a top-level
                // discriminator ('progress') distinct from 'meta' / 'done' /
                // 'error'.  Client flattens envelope.event on receipt.
                onProgress: wantsStream
                  ? (evt) => emit({ type: 'progress', event: evt })
                  : undefined,
                maxVoters: parseLimit > 0 ? parseLimit : undefined,
              });
              rows = vision.rows.map((r) => ({
                voterSerialNumber: r.voterSerialNumber,
                epicNumber: r.epicNumber,
                fullName: r.fullName,
                fullNameHi: r.fullNameHi,
                fatherOrHusbandName: r.fatherOrHusbandName,
                fatherOrHusbandNameHi: r.fatherOrHusbandNameHi,
                gender: r.gender,
                age: r.age,
                address: r.address,
                addressHi: r.addressHi,
                partNumber: r.partNumber,
              }));
              const combined = [vision.usageNote, ...vision.warnings];
              justParsedWarnings.push(...combined);
              pdfWarnings.push(...combined);
              pdfSource = 'pdf-vision';
              parsedPartNumber = vision.partNumber;
              parsedAcEn = vision.assemblyConstituency;
              parsedAcHi = vision.assemblyConstituencyHi;
            } catch (visionErr: any) {
              if (visionErr instanceof GeminiNotConfiguredError) {
                replyErr(400, visionErr.message);
                return;
              }
              if (visionErr instanceof GeminiParseFailedError) {
                replyErr(502, visionErr.message, {
                  hint: 'Gemini could not parse this PDF. Try a higher-resolution scan, or upload the Excel template.',
                });
                return;
              }
              throw visionErr;
            }
          }

          // Store the parse result against the composite cache key so the
          // next request with these exact bytes + same parseLimit (typically
          // the Import click that follows this Preview) lands on the cache
          // instead of re-hitting Gemini.  Truncated parses live under a
          // separate `${hash}:${N}` key so an unlimited import never sees
          // a partial cached parse.
          if (rows.length > 0) {
            setCachedParse(cacheKey, {
              rows: rows as CachedParse['rows'],
              source: pdfSource,
              warnings: justParsedWarnings,
              partNumber: parsedPartNumber,
              assemblyConstituency: parsedAcEn,
              assemblyConstituencyHi: parsedAcHi,
              cachedAt: Date.now(),
            });
          }
        }
      } else {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: undefined });
      }

      if (rows.length === 0) {
        replyErr(400, isPdf ? 'No voter records found in PDF' : 'Excel file is empty');
        return;
      }

      // Test-mode row cap.  Applied after parsing (or cache hit, or Excel
      // load) so it works uniformly across every source path.  We truncate
      // before booth lookup / validation so downstream queries aren't run
      // against the full roll just to throw most of it away.
      if (parseLimit > 0 && rows.length > parseLimit) {
        const dropped = rows.length - parseLimit;
        rows = rows.slice(0, parseLimit);
        pdfWarnings.push(`Test mode: limited to first ${parseLimit} voter${parseLimit === 1 ? '' : 's'} (dropped ${dropped}).`);
        console.log(`[bulk-import] parseLimit=${parseLimit} applied — truncated from ${parseLimit + dropped} to ${rows.length} rows`);
      }

      // Allow targeting: either explicit boothId in body OR partNumber per row
      const targetBoothId = (req.body.boothId as string) || (req.query.boothId as string);
      let targetBooth = null as null | { _id: any; partNumber: number; assemblyConstituency: string };
      if (targetBoothId) {
        const b = await Booth.findById(targetBoothId).select('_id partNumber assemblyConstituency');
        if (!b) {
          replyErr(400, 'Invalid boothId');
          return;
        }
        targetBooth = { _id: b._id, partNumber: b.partNumber, assemblyConstituency: b.assemblyConstituency };
      }

      const partNumbers = Array.from(new Set(rows.map((r) => r.partNumber).filter(Boolean).map(Number)));
      const boothsByPart = new Map<number, { _id: any; partNumber: number; assemblyConstituency: string }>();
      if (partNumbers.length > 0) {
        const booths = await Booth.find({ partNumber: { $in: partNumbers } }).select('_id partNumber assemblyConstituency');
        for (const b of booths) {
          boothsByPart.set(b.partNumber, { _id: b._id, partNumber: b.partNumber, assemblyConstituency: b.assemblyConstituency });
        }
      }

      // ----- Existing-EPIC lookup -------------------------------------
      // Pull the FULL existing voter doc (not just epicNumber) so we can:
      //   1. report to the UI exactly which booth/partNumber each duplicate
      //      is currently under — answers "where are my voters?" diagnostically
      //   2. in replaceExisting mode, bulk-update them to the new booth.
      const replaceExisting =
        req.body.replaceExisting === 'true' || req.query.replaceExisting === 'true';
      const existingVoters = await Voter.find({
        epicNumber: { $in: rows.map((r) => r.epicNumber).filter(Boolean).map((e) => String(e).trim().toUpperCase()) },
      }).select('_id epicNumber boothId partNumber assemblyConstituency');
      const existingByEpic = new Map(existingVoters.map((v) => [v.epicNumber, v]));
      // Aggregate "where do these duplicates live today" so the preview
      // response can tell the user e.g. "832 under booth X, 3 under booth Y".
      const duplicateBoothCounts = new Map<string, number>();
      for (const v of existingVoters) {
        const k = String(v.boothId);
        duplicateBoothCounts.set(k, (duplicateBoothCounts.get(k) || 0) + 1);
      }
      console.log(
        `[bulk-import] ${existingVoters.length}/${rows.length} EPICs already exist; ` +
          `replaceExisting=${replaceExisting}; ` +
          `distribution: ${Array.from(duplicateBoothCounts.entries()).map(([b, c]) => `${b.slice(-6)}=${c}`).join(', ') || '(none)'}`,
      );

      const results: {
        row: number;
        status: 'valid' | 'invalid';
        data?: any;
        errors?: string[];
        // When replaceExisting is true and this EPIC exists, the insert path
        // becomes an UPDATE on this _id rather than a new insertMany row.
        existingId?: any;
      }[] = [];
      const seenEpics = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const raw = rows[i];
        const errs: string[] = [];

        const epic = String(raw.epicNumber || '').trim().toUpperCase();
        if (!epic) errs.push('epicNumber is required');
        else if (seenEpics.has(epic)) errs.push('Duplicate epicNumber within this file');
        else if (existingByEpic.has(epic) && !replaceExisting) errs.push('Duplicate epicNumber (already in DB — tick "Replace existing" to re-assign)');

        if (!raw.fullName) errs.push('fullName is required');
        if (!raw.voterSerialNumber) errs.push('voterSerialNumber is required');
        if (!raw.address) errs.push('address is required');

        const gender = String(raw.gender || '').toUpperCase();
        if (!['M', 'F', 'T'].includes(gender)) errs.push('gender must be M, F or T');

        let booth = targetBooth;
        if (!booth) {
          const part = Number(raw.partNumber);
          if (!part) errs.push('partNumber is required when boothId is not provided');
          else booth = boothsByPart.get(part) || null;
          if (part && !booth) errs.push(`No booth found for partNumber ${part}`);
        }

        if (errs.length === 0 && booth) {
          seenEpics.add(epic);
          const existing = existingByEpic.get(epic);
          results.push({
            row: i + 2,
            status: 'valid',
            existingId: existing?._id,  // undefined → insert, set → update
            data: {
              voterSerialNumber: Number(raw.voterSerialNumber),
              epicNumber: epic,
              fullName: String(raw.fullName).trim(),
              fullNameHi: raw.fullNameHi ? String(raw.fullNameHi).trim() : undefined,
              fatherOrHusbandName: raw.fatherOrHusbandName ? String(raw.fatherOrHusbandName).trim() : undefined,
              fatherOrHusbandNameHi: raw.fatherOrHusbandNameHi ? String(raw.fatherOrHusbandNameHi).trim() : undefined,
              gender,
              age: raw.age ? Number(raw.age) : undefined,
              dateOfBirth: raw.dateOfBirth ? new Date(raw.dateOfBirth) : undefined,
              address: String(raw.address).trim(),
              addressHi: raw.addressHi ? String(raw.addressHi).trim() : undefined,
              boothId: booth._id,
              partNumber: booth.partNumber,
              assemblyConstituency: booth.assemblyConstituency,
              caste: raw.caste ? String(raw.caste).trim() : undefined,
              subCaste: raw.subCaste ? String(raw.subCaste).trim() : undefined,
              religion: raw.religion ? String(raw.religion).trim() : undefined,
              mobileNumber: raw.mobileNumber ? String(raw.mobileNumber).replace(/\D/g, '').slice(-10) : undefined,
              email: raw.email ? String(raw.email).trim().toLowerCase() : undefined,
            },
          });
        } else {
          results.push({ row: i + 2, status: 'invalid', data: raw, errors: errs });
        }
      }

      const validRows = results.filter((r) => r.status === 'valid');
      const invalidRows = results.filter((r) => r.status === 'invalid');

      if (req.body.confirm === 'true' || req.query.confirm === 'true') {
        if (validRows.length === 0) {
          replyErr(400, 'No valid rows to import', { data: { errors: invalidRows } });
          return;
        }
        // Split valid rows by whether they're net-new or being re-assigned.
        // In non-replaceExisting mode, updates[] is always empty because
        // duplicate EPICs were already rejected upstream.
        const inserts = validRows.filter((r) => !r.existingId);
        const updates = validRows.filter((r) => !!r.existingId);

        let insertedCount = 0;
        let updatedCount = 0;

        if (inserts.length > 0) {
          const inserted = await Voter.insertMany(
            inserts.map((r) => r.data),
            { ordered: false },
          );
          insertedCount = inserted.length;
        }

        if (updates.length > 0) {
          // bulkWrite with updateOne ops: for each existing EPIC, overwrite
          // the mutable fields (booth assignment + PDF-parsed content) while
          // preserving the _id and any canvassing state the voter already has
          // (verificationStatus, staffRemarks, visitDate, votingIntention,
          // etc. — those fields are NOT in r.data so $set leaves them alone).
          const ops = updates.map((r) => ({
            updateOne: {
              filter: { _id: r.existingId },
              update: { $set: r.data },
            },
          }));
          const result = await Voter.bulkWrite(ops, { ordered: false });
          updatedCount = (result.modifiedCount ?? 0) + (result.upsertedCount ?? 0);
        }

        console.log(
          `[bulk-import] INSERT ${insertedCount} + UPDATE ${updatedCount} ` +
            `(${invalidRows.length} rejected) replaceExisting=${replaceExisting}`,
        );

        await createAuditLog(
          req.user!.userId,
          req.user!.role,
          'voter_import',
          req,
          undefined,
          undefined,
          {
            imported: insertedCount,
            reassigned: updatedCount,
            failed: invalidRows.length,
            replaceExisting,
          },
        );
        replyOk(
          {
            imported: insertedCount,
            reassigned: updatedCount,
            failed: invalidRows.length,
            replaceExisting,
            errors: invalidRows.slice(0, 50),
            warnings: pdfWarnings,
            source: isPdf ? pdfSource : 'excel',
          },
          updatedCount > 0
            ? `${insertedCount} voters imported, ${updatedCount} re-assigned to this booth`
            : `${insertedCount} voters imported`,
        );
        return;
      }

      // Preview mode — include diagnostic info about where existing EPICs
      // currently live so the UI can say "832 voters already under booth X".
      // Look up the booth names so the UI can render human-readable labels
      // instead of raw ObjectIds.
      const duplicateBreakdown: Array<{ boothId: string; count: number; boothName?: string }> = [];
      if (duplicateBoothCounts.size > 0) {
        const ids = Array.from(duplicateBoothCounts.keys());
        const booths = await Booth.find({ _id: { $in: ids } }).select('_id name assemblyConstituency');
        const nameById = new Map(booths.map((b) => [String(b._id), b.name || b.assemblyConstituency || '']));
        for (const [boothId, count] of duplicateBoothCounts.entries()) {
          duplicateBreakdown.push({
            boothId,
            count,
            boothName: nameById.get(boothId),
          });
        }
        duplicateBreakdown.sort((a, b) => b.count - a.count);
      }

      replyOk(
        {
          total: rows.length,
          valid: validRows.length,
          invalid: invalidRows.length,
          existingInDb: existingVoters.length,
          duplicateBreakdown,
          preview: results.slice(0, 50),
          warnings: pdfWarnings,
          source: isPdf ? pdfSource : 'excel',
        },
        'Preview generated. Post again with confirm=true to import.',
      );
    } catch (error: any) {
      // If we've already started streaming, an outer res.status() would
      // throw — route through replyErr which does the right thing in both
      // modes.
      replyErr(500, error.message || 'Internal error');
    }
  },
);

// GET /api/voters/stats/summary — quick counts for dashboard cards
router.get(
  '/stats/summary',
  authenticate,
  requireRole('super_admin', 'politician'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const baseFilter = buildVoterFilter(req);
      const [total, verified, male, female] = await Promise.all([
        Voter.countDocuments(baseFilter),
        Voter.countDocuments({ ...baseFilter, verificationStatus: true }),
        Voter.countDocuments({ ...baseFilter, gender: 'M' }),
        Voter.countDocuments({ ...baseFilter, gender: 'F' }),
      ]);
      res.json({
        success: true,
        data: {
          total,
          verified,
          unverified: total - verified,
          male,
          female,
          verificationRate: total > 0 ? Math.round((verified / total) * 100) : 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
