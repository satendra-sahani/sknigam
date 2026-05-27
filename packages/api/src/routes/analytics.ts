import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Voter from '../models/Voter';
import Booth from '../models/Booth';
import VoterAssignment from '../models/VoterAssignment';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UP_DISTRICTS, UP_CONSTITUENCIES } from '../data/upReferenceData';
import { STATE_HI, DISTRICT_HI, AC_HI_BY_NUMBER, AC_HI_BY_NAME } from '../data/upHindiNames';
import {
  getPoliticianScope,
  applyBoothScope as applyBoothScopeToMatch,
} from '../utils/politicianScope';

const router = Router();

/**
 * Shared filter built from query + role scope.
 * super_admin: unrestricted (but may opt into filters).
 * politician: hard-scoped to their assemblyConstituency.
 * staff: scoped to booths they have active assignments for.
 */
async function buildScope(req: AuthRequest): Promise<any> {
  const scope: any = {};
  const q = req.query;

  if (q.assemblyConstituency) scope.assemblyConstituency = q.assemblyConstituency;
  if (q.boothId && mongoose.isValidObjectId(q.boothId as string)) scope.boothId = new mongoose.Types.ObjectId(q.boothId as string);
  if (q.partNumber) scope.partNumber = parseInt(q.partNumber as string, 10);

  // Survey-time voter attribute filters — applied directly to the Voter
  // collection match.  These are no-ops when the voter doc doesn't carry
  // the field (e.g. voters without `religion` simply fall outside the
  // match), which is the desired behaviour for "show me voters with X".
  if (q.caste) scope.caste = q.caste;
  if (q.subCaste) scope.subCaste = q.subCaste;
  if (q.religion) scope.religion = q.religion;
  if (q.gender) scope.gender = q.gender;
  if (q.votingIntention) scope.votingIntention = q.votingIntention;
  if (q.partySupport) scope.partySupport = q.partySupport;
  if (q.influenceLevel) scope.influenceLevel = q.influenceLevel;
  if (q.educationLevel) scope.educationLevel = q.educationLevel;
  if (q.verificationStatus !== undefined) {
    scope.verificationStatus = q.verificationStatus === 'true';
  }

  // Free-text search across name / EPIC / mobile / father-or-husband-name.
  // Mirrors the /voters list endpoint's behaviour so the same Filters modal
  // works identically on analytics dashboards.
  if (q.search) {
    const s = String(q.search);
    scope.$or = [
      { fullName: { $regex: s, $options: 'i' } },
      { epicNumber: { $regex: s, $options: 'i' } },
      { fatherOrHusbandName: { $regex: s, $options: 'i' } },
      { mobileNumber: { $regex: s } },
    ];
  }

  // Age range — both ends optional + inclusive.
  const ageMin = q.ageMin !== undefined ? parseInt(q.ageMin as string, 10) : NaN;
  const ageMax = q.ageMax !== undefined ? parseInt(q.ageMax as string, 10) : NaN;
  if (Number.isFinite(ageMin) || Number.isFinite(ageMax)) {
    scope.age = {};
    if (Number.isFinite(ageMin)) scope.age.$gte = ageMin;
    if (Number.isFinite(ageMax)) scope.age.$lte = ageMax;
  }

  // Grievances — accept comma-list or repeated query params.
  const grRaw = q.grievances;
  let grievances: string[] = [];
  if (Array.isArray(grRaw)) grievances = grRaw.map(String);
  else if (typeof grRaw === 'string' && grRaw.length)
    grievances = grRaw.split(',').map((s) => s.trim()).filter(Boolean);
  if (grievances.length) scope.grievances = { $all: grievances };

  // District filter — Voter docs don't carry `district`, so we translate
  // it via the Booth collection into a boothId $in list.  Used by the
  // /explore page's Charts view at the district level.  If the district
  // has no booths on record, force an empty match rather than silently
  // ignoring the filter.
  if (q.district) {
    const boothIds = await Booth.find({ district: q.district }).distinct('_id');
    scope.boothId = boothIds.length > 0
      ? { $in: boothIds }
      : new mongoose.Types.ObjectId(); // forces empty set
  }

  // Optional date-range filter applied to visitDate (canvassing date).
  // Lets booth/analytics views show "what did we learn this week / this
  // month".  Dates missing on a voter simply exclude them from the match,
  // which is desirable for date-scoped dashboards.  Accepts either
  // `dateFrom`/`dateTo` (legacy alias) or `visitDateFrom`/`visitDateTo`
  // so the same Filters modal payload works on every endpoint.
  const fromRaw = (q.visitDateFrom as string) || (q.dateFrom as string);
  const toRaw = (q.visitDateTo as string) || (q.dateTo as string);
  if (fromRaw || toRaw) {
    const range: any = {};
    if (fromRaw) {
      const d = new Date(fromRaw);
      if (!Number.isNaN(d.getTime())) range.$gte = d;
    }
    if (toRaw) {
      const d = new Date(toRaw);
      if (!Number.isNaN(d.getTime())) {
        // Make the end date inclusive of the whole day the user picked.
        d.setHours(23, 59, 59, 999);
        range.$lte = d;
      }
    }
    if (Object.keys(range).length > 0) scope.visitDate = range;
  }

  if (req.user?.role === 'politician') {
    // Narrow to the admin-assigned booth slice.  We translate the slice
    // back into a `boothId` filter on the Voter collection.
    const polScope = await getPoliticianScope(req);
    if (polScope.empty) {
      scope.boothId = new mongoose.Types.ObjectId(); // forces empty set
    } else if (polScope.boothIds && polScope.boothIds.length > 0) {
      // If a district filter already produced a boothId list, intersect;
      // otherwise just set.
      if (scope.boothId && scope.boothId.$in) {
        const existing: any[] = scope.boothId.$in;
        const allowed = new Set(polScope.boothIds.map((b) => b.toString()));
        const overlap = existing.filter((id) => allowed.has(id.toString()));
        scope.boothId = overlap.length > 0
          ? { $in: overlap }
          : new mongoose.Types.ObjectId();
      } else {
        scope.boothId = { $in: polScope.boothIds };
      }
    } else if (polScope.assemblyConstituency) {
      scope.assemblyConstituency = polScope.assemblyConstituency;
    }
  }
  if (req.user?.role === 'staff') {
    const assignments = await VoterAssignment.find({ staffId: req.user.userId, isActive: true }).select('boothId');
    const boothIds = assignments.map((a) => a.boothId);
    if (boothIds.length === 0) {
      scope.boothId = new mongoose.Types.ObjectId(); // forces empty set
    } else {
      scope.boothId = { $in: boothIds };
    }
  }
  return scope;
}

// GET /api/analytics/overview — high-level counts
router.get(
  '/overview',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const scope = await buildScope(req);
      const [total, verified, boothCount, assignments] = await Promise.all([
        Voter.countDocuments(scope),
        Voter.countDocuments({ ...scope, verificationStatus: true }),
        Booth.countDocuments(scope.assemblyConstituency ? { assemblyConstituency: scope.assemblyConstituency } : {}),
        VoterAssignment.countDocuments({ isActive: true }),
      ]);
      res.json({
        success: true,
        data: {
          totalVoters: total,
          verified,
          unverified: total - verified,
          verificationRate: total > 0 ? Math.round((verified / total) * 1000) / 10 : 0,
          totalBooths: boothCount,
          activeAssignments: assignments,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

function aggregateGroup(field: string) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const scope = await buildScope(req);
      const pipeline: any[] = [{ $match: scope }];
      pipeline.push({
        $group: {
          _id: `$${field}`,
          count: { $sum: 1 },
          verified: { $sum: { $cond: ['$verificationStatus', 1, 0] } },
        },
      });
      pipeline.push({ $sort: { count: -1 } });
      pipeline.push({ $limit: 50 });
      const rows = await Voter.aggregate(pipeline);
      res.json({
        success: true,
        data: rows.map((r) => ({ key: r._id || 'Unknown', count: r.count, verified: r.verified })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

// GET /api/analytics/caste
router.get('/caste', authenticate, requireRole('super_admin', 'politician', 'staff'), aggregateGroup('caste'));

// GET /api/analytics/religion
router.get('/religion', authenticate, requireRole('super_admin', 'politician', 'staff'), aggregateGroup('religion'));

// GET /api/analytics/gender
router.get('/gender', authenticate, requireRole('super_admin', 'politician', 'staff'), aggregateGroup('gender'));

// GET /api/analytics/candidate-share — who are voters saying they support
router.get(
  '/candidate-share',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  aggregateGroup('favouriteCandidate'),
);

// GET /api/analytics/voting-intention
router.get(
  '/voting-intention',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  aggregateGroup('votingIntention'),
);

// GET /api/analytics/age-distribution
router.get(
  '/age-distribution',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const scope = await buildScope(req);
      const rows = await Voter.aggregate([
        { $match: { ...scope, age: { $ne: null } } },
        {
          $bucket: {
            groupBy: '$age',
            boundaries: [18, 25, 35, 45, 60, 75, 130],
            default: 'Unknown',
            output: { count: { $sum: 1 } },
          },
        },
      ]);
      const labels: Record<string, string> = {
        '18': '18–24',
        '25': '25–34',
        '35': '35–44',
        '45': '45–59',
        '60': '60–74',
        '75': '75+',
      };
      res.json({
        success: true,
        data: rows.map((r) => ({
          key: labels[String(r._id)] || String(r._id),
          count: r.count,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/analytics/grievances — counts per grievance category (unwinds the array)
router.get(
  '/grievances',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const scope = await buildScope(req);
      const rows = await Voter.aggregate([
        { $match: { ...scope, grievances: { $exists: true, $ne: [] } } },
        { $unwind: '$grievances' },
        { $group: { _id: '$grievances', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      res.json({
        success: true,
        data: rows.map((r) => ({ key: r._id, count: r.count })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/analytics/booth-progress — per-booth verified / total
router.get(
  '/booth-progress',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const scope = await buildScope(req);
      const rows = await Voter.aggregate([
        { $match: scope },
        {
          $group: {
            _id: '$boothId',
            total: { $sum: 1 },
            verified: { $sum: { $cond: ['$verificationStatus', 1, 0] } },
          },
        },
        {
          $lookup: {
            from: 'booths',
            localField: '_id',
            foreignField: '_id',
            as: 'booth',
          },
        },
        { $unwind: { path: '$booth', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            total: 1,
            verified: 1,
            partNumber: '$booth.partNumber',
            name: '$booth.name',
            assemblyConstituency: '$booth.assemblyConstituency',
          },
        },
        { $sort: { partNumber: 1 } },
        { $limit: 200 },
      ]);
      res.json({ success: true, data: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * Role-scoped Booth match for hierarchy drill-downs.
 * Builds a $match stage applied to the Booth collection.
 */
async function buildBoothScope(req: AuthRequest): Promise<any> {
  const match: any = { state: (req.query.state as string) || 'Uttar Pradesh' };
  if (req.query.district) match.district = req.query.district;
  if (req.query.assemblyConstituency) match.assemblyConstituency = req.query.assemblyConstituency;

  // Politicians: narrow to their assigned booths (or AC if legacy).
  // Helper sets `_id: {$in: [...]}` for booth scoping or `_id: <bogus>`
  // when no scope is set, so the result is always closed by default.
  if (req.user?.role === 'politician') {
    const polScope = await getPoliticianScope(req);
    applyBoothScopeToMatch(match, polScope);
  }
  if (req.user?.role === 'staff') {
    const assignments = await VoterAssignment.find({ staffId: req.user.userId, isActive: true }).select('boothId');
    const boothIds = assignments.map((a) => a.boothId);
    match._id = boothIds.length > 0 ? { $in: boothIds } : new mongoose.Types.ObjectId();
  }
  return match;
}

// Reusable voter join + progress projection pipeline
const voterJoinStages: any[] = [
  {
    $lookup: {
      from: 'voters',
      localField: '_id',
      foreignField: 'boothId',
      as: 'voters',
    },
  },
  {
    $addFields: {
      voterCount: { $size: '$voters' },
      verifiedCount: {
        $size: {
          $filter: {
            input: '$voters',
            as: 'v',
            cond: { $eq: ['$$v.verificationStatus', true] },
          },
        },
      },
    },
  },
];

// Helpers used by every hierarchy endpoint that opts into `paginated=true`.
// Mobile clients still pass no pagination flags and get the flat array they
// were written against; the web /explore page opts in to get the paged
// envelope.  Keeping both shapes behind one flag avoids a breaking change.
function readPaginationQuery(req: AuthRequest) {
  const paginated = req.query.paginated === 'true';
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(
    200,
    Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20),
  );
  const search = ((req.query.search as string) || '').trim();
  const filter = ((req.query.filter as string) || 'all') as 'all' | 'pending' | 'done';
  return { paginated, page, limit, search, filter };
}

function isDone(verified: number, total: number): boolean {
  return total > 0 && verified >= total;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function paginate<T>(all: T[], page: number, limit: number) {
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * limit;
  const rows = all.slice(start, start + limit);
  return { rows, pagination: { page: safePage, limit, total, pages } };
}

// GET /api/analytics/hierarchy/districts — merges 75 official UP districts with live booth/voter counts
router.get(
  '/hierarchy/districts',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const match = await buildBoothScope(req);
      const rows = await Booth.aggregate([
        { $match: match },
        ...voterJoinStages,
        {
          $group: {
            _id: '$district',
            booths: { $sum: 1 },
            totalVoters: { $sum: '$voterCount' },
            verified: { $sum: '$verifiedCount' },
          },
        },
      ]);
      const byDistrict = new Map<string, any>();
      for (const r of rows) if (r._id) byDistrict.set(r._id, r);

      // For staff (scoped to assigned booths), only return districts they actually touch.
      const scopedToAssigned = req.user?.role === 'staff';
      const baseList = scopedToAssigned
        ? Array.from(byDistrict.keys()).map((name) => ({
            name,
            division: UP_DISTRICTS.find((d) => d.name === name)?.division || 'Other',
          }))
        : UP_DISTRICTS;

      const merged = baseList
        .map((d) => {
          const r = byDistrict.get(d.name);
          const totalAcs = UP_CONSTITUENCIES.filter((c) => c.district === d.name).length;
          return {
            district: d.name,
            districtHi: DISTRICT_HI[d.name],
            division: d.division,
            totalAcs,
            booths: r?.booths ?? 0,
            totalVoters: r?.totalVoters ?? 0,
            verified: r?.verified ?? 0,
          };
        })
        .sort((a, b) => a.district.localeCompare(b.district));

      const { paginated, page, limit, search, filter } = readPaginationQuery(req);
      if (!paginated) {
        res.json({ success: true, data: merged });
        return;
      }

      // Status counts + summary computed across the *unfiltered* list so the
      // filter pills ("All · Pending · Completed") and the header totals stay
      // stable while the user types in the search box.
      const counts = { all: merged.length, pending: 0, done: 0 };
      for (const m of merged) {
        if (isDone(m.verified, m.totalVoters)) counts.done++;
        else counts.pending++;
      }
      const summary = {
        totalVoters: merged.reduce((s, m) => s + m.totalVoters, 0),
        verified: merged.reduce((s, m) => s + m.verified, 0),
      };

      const q = search.toLowerCase();
      let working = q
        ? merged.filter((m) => m.district.toLowerCase().includes(q))
        : merged;
      if (filter === 'done') working = working.filter((m) => isDone(m.verified, m.totalVoters));
      else if (filter === 'pending') working = working.filter((m) => !isDone(m.verified, m.totalVoters));

      const { rows: pagedRows, pagination } = paginate(working, page, limit);
      res.json({
        success: true,
        data: { rows: pagedRows, pagination, counts, summary },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/analytics/hierarchy/constituencies?district=X — merges official AC list with live counts
router.get(
  '/hierarchy/constituencies',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const match = await buildBoothScope(req);
      const district = req.query.district as string | undefined;

      const rows = await Booth.aggregate([
        { $match: match },
        ...voterJoinStages,
        {
          $group: {
            _id: '$assemblyConstituency',
            district: { $first: '$district' },
            booths: { $sum: 1 },
            totalVoters: { $sum: '$voterCount' },
            verified: { $sum: '$verifiedCount' },
            sources: { $addToSet: '$source' },
            lastSyncedAt: { $max: '$lastSyncedAt' },
          },
        },
      ]);
      // Priority: most recent authoritative > older authoritative > seeded >
      // manual fallback.  The UI uses this to paint a single freshness pill
      // per AC even when booths in the same AC came from different sources.
      const SOURCE_PRIORITY: Record<string, number> = {
        voterlist_2026: 6,   // ECI 2026 SIR final-roll (via voterlist.co.in)
        ceo_up_2025: 5,
        deo_pdf: 4,
        user_upload: 3,
        manual: 2,
        harvard_2019: 1,
      };
      const freshestOf = (sources: string[] | undefined): string | undefined => {
        if (!sources || sources.length === 0) return undefined;
        return sources
          .filter(Boolean)
          .sort((a, b) => (SOURCE_PRIORITY[b] ?? 0) - (SOURCE_PRIORITY[a] ?? 0))[0];
      };
      const byAc = new Map<string, any>();
      for (const r of rows) if (r._id) byAc.set(r._id, r);

      const scopedToAssigned = req.user?.role === 'staff';
      const officialAcs = district
        ? UP_CONSTITUENCIES.filter((c) => c.district === district)
        : UP_CONSTITUENCIES;

      const baseList = scopedToAssigned
        ? Array.from(byAc.entries()).map(([name, r]) => {
            const official = UP_CONSTITUENCIES.find((c) => c.name === name);
            return {
              number: official?.number ?? 0,
              name,
              district: r.district ?? official?.district ?? 'Unknown',
              reserved: official?.reserved,
            };
          })
        : officialAcs;

      const merged = baseList
        .map((c) => {
          const r = byAc.get(c.name);
          return {
            number: c.number,
            assemblyConstituency: c.name,
            assemblyConstituencyHi:
              (c.number ? AC_HI_BY_NUMBER[c.number] : undefined) || AC_HI_BY_NAME[c.name],
            district: c.district,
            districtHi: DISTRICT_HI[c.district],
            reserved: c.reserved,
            booths: r?.booths ?? 0,
            totalVoters: r?.totalVoters ?? 0,
            verified: r?.verified ?? 0,
            source: freshestOf(r?.sources),
            lastSyncedAt: r?.lastSyncedAt ?? null,
          };
        })
        .sort((a, b) => (a.number || 9999) - (b.number || 9999));

      const { paginated, page, limit, search, filter } = readPaginationQuery(req);
      if (!paginated) {
        res.json({ success: true, data: merged });
        return;
      }

      const counts = { all: merged.length, pending: 0, done: 0 };
      for (const m of merged) {
        if (isDone(m.verified, m.totalVoters)) counts.done++;
        else counts.pending++;
      }
      const summary = {
        totalAcs: merged.length,
        coveredAcs: merged.filter((m) => m.booths > 0).length,
        totalVoters: merged.reduce((s, m) => s + m.totalVoters, 0),
        verified: merged.reduce((s, m) => s + m.verified, 0),
        districtHi: district ? DISTRICT_HI[district] : undefined,
      };

      const q = search.toLowerCase();
      let working = q
        ? merged.filter(
            (m) =>
              m.assemblyConstituency.toLowerCase().includes(q) ||
              String(m.number).includes(q),
          )
        : merged;
      if (filter === 'done') working = working.filter((m) => isDone(m.verified, m.totalVoters));
      else if (filter === 'pending') working = working.filter((m) => !isDone(m.verified, m.totalVoters));

      const { rows: pagedRows, pagination } = paginate(working, page, limit);
      res.json({
        success: true,
        data: { rows: pagedRows, pagination, counts, summary },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/analytics/hierarchy/voters?boothId=X — voter list with per-voter completion
router.get(
  '/hierarchy/voters',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const boothId = req.query.boothId as string;
      if (!boothId || !mongoose.isValidObjectId(boothId)) {
        res.status(400).json({ success: false, error: 'Valid boothId required' });
        return;
      }
      // Staff scope check
      if (req.user?.role === 'staff') {
        const assignments = await VoterAssignment.find({
          staffId: req.user.userId,
          boothId,
          isActive: true,
        });
        if (assignments.length === 0) {
          res.status(403).json({ success: false, error: 'Not assigned to this booth' });
          return;
        }
      }

      const { paginated, page, limit, search, filter } = readPaginationQuery(req);
      // Hindi copies (`fullNameHi`, `fatherOrHusbandNameHi`, `addressHi`) are
      // already stored on each voter document, so we ship them with the
      // English originals and let the client swap based on the language
      // toggle — no transliteration needed.
      const selectFields =
        '_id voterSerialNumber epicNumber fullName fullNameHi fatherOrHusbandName fatherOrHusbandNameHi address addressHi gender age verificationStatus visitDate staffRemarks votingIntention';

      // Legacy (non-paginated) shape kept for callers that don't opt in —
      // e.g. the mobile hierarchy screens still expect { voters, total, verified }.
      if (!paginated) {
        const legacyLimit = Math.min(
          parseInt((req.query.limit as string) || '200', 10),
          500,
        );
        const voters = await Voter.find({ boothId })
          .select(selectFields)
          .sort({ voterSerialNumber: 1 })
          .limit(legacyLimit);
        const total = await Voter.countDocuments({ boothId });
        const verified = await Voter.countDocuments({ boothId, verificationStatus: true });
        res.json({ success: true, data: { voters, total, verified } });
        return;
      }

      // Paginated shape: MongoDB-native skip/limit with regex search.
      const baseFilter: any = { boothId };
      const [allCount, doneCount] = await Promise.all([
        Voter.countDocuments(baseFilter),
        Voter.countDocuments({ ...baseFilter, verificationStatus: true }),
      ]);
      const counts = {
        all: allCount,
        done: doneCount,
        pending: allCount - doneCount,
      };

      const query: any = { ...baseFilter };
      if (search) {
        const rx = new RegExp(escapeRegex(search), 'i');
        const or: any[] = [{ fullName: rx }, { epicNumber: rx }];
        const asNum = parseInt(search, 10);
        if (!Number.isNaN(asNum)) or.push({ voterSerialNumber: asNum });
        query.$or = or;
      }
      if (filter === 'done') query.verificationStatus = true;
      else if (filter === 'pending') query.verificationStatus = { $ne: true };

      const total = await Voter.countDocuments(query);
      const pages = Math.max(1, Math.ceil(total / limit));
      const safePage = Math.min(Math.max(1, page), pages);
      const skip = (safePage - 1) * limit;
      const voters = await Voter.find(query)
        .select(selectFields)
        .sort({ voterSerialNumber: 1 })
        .skip(skip)
        .limit(limit);

      // Pull every active assignment for this booth once (usually 1–3 rows),
      // then map each voter to the assignments whose serial range covers it.
      // A missing `voterSerialFrom`/`voterSerialTo` means the whole booth.
      const boothAssignments = await VoterAssignment.find({
        boothId,
        isActive: true,
      })
        .populate('staffId', 'name phone')
        .select('staffId voterSerialFrom voterSerialTo totalVoters completedCount')
        .lean();
      type PopulatedStaff = { _id: mongoose.Types.ObjectId; name?: string; phone?: string };
      const shapedAssignments = boothAssignments.map((a: any) => {
        const staff: PopulatedStaff | undefined = a.staffId && typeof a.staffId === 'object' ? a.staffId : undefined;
        return {
          _id: String(a._id),
          staffId: String(staff?._id ?? a.staffId ?? ''),
          staffName: staff?.name,
          staffPhone: staff?.phone,
          voterSerialFrom: a.voterSerialFrom,
          voterSerialTo: a.voterSerialTo,
          totalVoters: a.totalVoters,
          completedCount: a.completedCount,
        };
      });
      const coversVoter = (
        a: { voterSerialFrom?: number; voterSerialTo?: number },
        serial: number,
      ): boolean => {
        const from = a.voterSerialFrom;
        const to = a.voterSerialTo;
        if (from == null && to == null) return true; // whole booth
        if (from != null && serial < from) return false;
        if (to != null && serial > to) return false;
        return true;
      };
      const votersWithStaff = voters.map((v) => {
        const obj: any = v.toObject();
        obj.assignedStaff = shapedAssignments.filter((a) =>
          coversVoter(a, v.voterSerialNumber),
        );
        return obj;
      });

      const booth = await Booth.findById(boothId).select(
        'name nameHi village villageHi district assemblyConstituency assemblyConstituencyNumber',
      );
      res.json({
        success: true,
        data: {
          rows: votersWithStaff,
          pagination: { page: safePage, limit, total, pages },
          counts,
          summary: {
            total: allCount,
            verified: doneCount,
            boothName: booth?.name,
            boothNameHi: booth?.nameHi,
            villageHi: booth?.villageHi,
            assemblyConstituency: booth?.assemblyConstituency,
            assemblyConstituencyHi: booth?.assemblyConstituency
              ? (booth.assemblyConstituencyNumber
                  ? AC_HI_BY_NUMBER[booth.assemblyConstituencyNumber]
                  : undefined) || AC_HI_BY_NAME[booth.assemblyConstituency]
              : undefined,
            district: booth?.district,
            districtHi: booth?.district ? DISTRICT_HI[booth.district] : undefined,
            assignedStaff: shapedAssignments,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/analytics/hierarchy/booths?assemblyConstituency=X — list booths with progress
router.get(
  '/hierarchy/booths',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const match = await buildBoothScope(req);
      const rows = await Booth.aggregate([
        { $match: match },
        ...voterJoinStages,
        // Pull active staff assignments so the UI can show "Assigned to X"
        // on each row.  Only active rows — revoked ones would be misleading.
        {
          $lookup: {
            from: 'voterassignments',
            let: { bid: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$boothId', '$$bid'] },
                      { $eq: ['$isActive', true] },
                    ],
                  },
                },
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'staffId',
                  foreignField: '_id',
                  as: 'staff',
                },
              },
              { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  _id: 1,
                  staffId: 1,
                  staffName: '$staff.name',
                  staffPhone: '$staff.phone',
                  voterSerialFrom: 1,
                  voterSerialTo: 1,
                  totalVoters: 1,
                  completedCount: 1,
                },
              },
            ],
            as: 'assignedStaff',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            nameHi: 1,
            partNumber: 1,
            district: 1,
            assemblyConstituency: 1,
            assemblyConstituencyNumber: 1,
            village: 1,
            villageHi: 1,
            address: 1,
            totalVoters: '$voterCount',
            registeredVoters: '$totalVoters',
            verified: '$verifiedCount',
            source: 1,
            sourceUrl: 1,
            lastSyncedAt: 1,
            assignedStaff: 1,
          },
        },
        { $sort: { partNumber: 1 } },
      ]);

      const { paginated, page, limit, search, filter } = readPaginationQuery(req);
      if (!paginated) {
        res.json({ success: true, data: rows });
        return;
      }

      const counts = { all: rows.length, pending: 0, done: 0 };
      for (const r of rows) {
        if (isDone(r.verified, r.totalVoters)) counts.done++;
        else counts.pending++;
      }
      const firstRow: any = rows[0];
      const parentAcName =
        (req.query.assemblyConstituency as string) || firstRow?.assemblyConstituency;
      const parentAcNumber = firstRow?.assemblyConstituencyNumber as number | undefined;
      const parentDistrict = (req.query.district as string) || firstRow?.district;
      const summary = {
        totalBooths: rows.length,
        totalVoters: rows.reduce((s, r) => s + (r.totalVoters || 0), 0),
        verified: rows.reduce((s, r) => s + (r.verified || 0), 0),
        assemblyConstituencyHi: parentAcName
          ? (parentAcNumber ? AC_HI_BY_NUMBER[parentAcNumber] : undefined) ||
            AC_HI_BY_NAME[parentAcName]
          : undefined,
        districtHi: parentDistrict ? DISTRICT_HI[parentDistrict] : undefined,
      };

      const q = search.toLowerCase();
      let working = q
        ? rows.filter(
            (r) =>
              (r.name || '').toLowerCase().includes(q) ||
              String(r.partNumber).includes(q) ||
              (r.village || '').toLowerCase().includes(q),
          )
        : rows;
      if (filter === 'done') working = working.filter((r) => isDone(r.verified, r.totalVoters));
      else if (filter === 'pending') working = working.filter((r) => !isDone(r.verified, r.totalVoters));

      const { rows: pagedRows, pagination } = paginate(working, page, limit);
      res.json({
        success: true,
        data: { rows: pagedRows, pagination, counts, summary },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/analytics/hierarchy/state — overall UP roll-up with official totals
router.get(
  '/hierarchy/state',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const match = await buildBoothScope(req);
      const [row] = await Booth.aggregate([
        { $match: match },
        ...voterJoinStages,
        {
          $group: {
            _id: '$state',
            booths: { $sum: 1 },
            districts: { $addToSet: '$district' },
            constituencies: { $addToSet: '$assemblyConstituency' },
            totalVoters: { $sum: '$voterCount' },
            verified: { $sum: '$verifiedCount' },
          },
        },
      ]);
      const scopedToAssigned = req.user?.role === 'staff';
      const stateName = row?._id || 'Uttar Pradesh';
      res.json({
        success: true,
        data: {
          state: stateName,
          stateHi: STATE_HI[stateName],
          booths: row?.booths ?? 0,
          districtsTotal: scopedToAssigned
            ? (row?.districts.filter(Boolean).length ?? 0)
            : UP_DISTRICTS.length,
          districtsCovered: row?.districts.filter(Boolean).length ?? 0,
          constituenciesTotal: scopedToAssigned
            ? (row?.constituencies.filter(Boolean).length ?? 0)
            : UP_CONSTITUENCIES.length,
          constituenciesCovered: row?.constituencies.filter(Boolean).length ?? 0,
          totalVoters: row?.totalVoters ?? 0,
          verified: row?.verified ?? 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/analytics/staff-progress — per-staff verified / total (super_admin + politician)
router.get(
  '/staff-progress',
  authenticate,
  requireRole('super_admin', 'politician'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const match: any = { isActive: true };
      if (req.query.assemblyConstituency) {
        const booths = await Booth.find({ assemblyConstituency: req.query.assemblyConstituency }).select('_id');
        match.boothId = { $in: booths.map((b) => b._id) };
      }
      if (req.user?.role === 'politician' && req.user.assemblyConstituency) {
        const booths = await Booth.find({ assemblyConstituency: req.user.assemblyConstituency }).select('_id');
        match.boothId = { $in: booths.map((b) => b._id) };
      }
      const rows = await VoterAssignment.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$staffId',
            assignments: { $sum: 1 },
            totalVoters: { $sum: '$totalVoters' },
            completedCount: { $sum: '$completedCount' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'staff',
          },
        },
        { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: '$staff.name',
            phone: '$staff.phone',
            assignments: 1,
            totalVoters: 1,
            completedCount: 1,
          },
        },
        { $sort: { completedCount: -1 } },
        { $limit: 100 },
      ]);
      res.json({ success: true, data: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
