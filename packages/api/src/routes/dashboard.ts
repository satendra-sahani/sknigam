import { Router, Response } from 'express';
import Booth from '../models/Booth';
import User from '../models/User';
import VoterCount from '../models/VoterCount';
import CheckIn from '../models/CheckIn';
import Incident from '../models/Incident';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/kpis
router.get('/kpis', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const electionDate = (req.query.electionDate as string) || today;

    // Zone filter for zone_incharge
    const zoneFilter: any = {};
    if (req.user?.role === 'zone_incharge' && req.user.zone) {
      zoneFilter.zone = req.user.zone;
    }

    // Total booths
    const totalBooths = await Booth.countDocuments(zoneFilter);

    // Booths reporting (have at least one approved count today)
    const boothsWithCounts = await VoterCount.distinct('boothId', {
      electionDate,
      status: 'approved',
    });

    let boothsReporting = boothsWithCounts.length;
    if (Object.keys(zoneFilter).length > 0) {
      const zoneBooths = await Booth.find(zoneFilter).select('_id');
      const zoneBoothIds = new Set(zoneBooths.map((b) => b._id.toString()));
      boothsReporting = boothsWithCounts.filter((id) => zoneBoothIds.has(id.toString())).length;
    }

    // Overall turnout
    const turnoutPipeline: any[] = [
      { $match: { electionDate, status: 'approved' } },
      {
        $group: {
          _id: '$boothId',
          maxVoters: { $max: '$totalVoters' },
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
      { $unwind: '$booth' },
    ];

    if (Object.keys(zoneFilter).length > 0) {
      turnoutPipeline.push({ $match: { 'booth.zone': zoneFilter.zone } });
    }

    turnoutPipeline.push({
      $group: {
        _id: null,
        totalVoters: { $sum: '$maxVoters' },
        totalRegistered: { $sum: '$booth.totalRegisteredVoters' },
      },
    });

    const turnoutResult = await VoterCount.aggregate(turnoutPipeline);
    let overallTurnoutPercent = 0;
    if (turnoutResult.length > 0 && turnoutResult[0].totalRegistered > 0) {
      overallTurnoutPercent = Math.round(
        (turnoutResult[0].totalVoters / turnoutResult[0].totalRegistered) * 100 * 100
      ) / 100;
    }

    // Staff checked in today
    const todayStart = new Date(`${today}T00:00:00Z`);
    const todayEnd = new Date(`${today}T23:59:59Z`);

    const staffCheckedIn = await CheckIn.distinct('staffId', {
      checkedInAt: { $gte: todayStart, $lte: todayEnd },
    });

    // Total staff (active field staff)
    const staffFilter: any = {
      isActive: true,
      role: { $in: ['booth_supervisor', 'data_entry_operator'] },
      ...zoneFilter,
    };
    const totalStaff = await User.countDocuments(staffFilter);

    // Open incidents
    const incidentFilter: any = { status: 'open' };
    const openIncidents = await Incident.countDocuments(incidentFilter);

    // Pending approvals
    const pendingApprovals = await VoterCount.countDocuments({
      status: 'pending',
      electionDate,
    });

    res.json({
      success: true,
      data: {
        overallTurnoutPercent,
        boothsReporting,
        totalBooths,
        staffCheckedIn: staffCheckedIn.length,
        totalStaff,
        openIncidents,
        pendingApprovals,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dashboard/hourly-turnout
router.get('/hourly-turnout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const electionDate = (req.query.electionDate as string) || today;

    // Get total registered voters
    const zoneFilter: any = {};
    if (req.user?.role === 'zone_incharge' && req.user.zone) {
      zoneFilter.zone = req.user.zone;
    }

    const totalRegisteredResult = await Booth.aggregate([
      { $match: zoneFilter },
      { $group: { _id: null, total: { $sum: '$totalRegisteredVoters' } } },
    ]);
    const totalRegistered = totalRegisteredResult.length > 0 ? totalRegisteredResult[0].total : 1;

    const slots = [
      { slot: '09:00', hour: '09:00 AM' },
      { slot: '11:00', hour: '11:00 AM' },
      { slot: '13:00', hour: '01:00 PM' },
      { slot: '15:00', hour: '03:00 PM' },
      { slot: '17:00', hour: '05:00 PM' },
    ];

    const hourlyTurnout = [];

    for (const slotInfo of slots) {
      const pipeline: any[] = [
        { $match: { electionDate, slot: slotInfo.slot, status: 'approved' } },
        {
          $group: {
            _id: '$boothId',
            totalVoters: { $max: '$totalVoters' },
          },
        },
      ];

      if (Object.keys(zoneFilter).length > 0) {
        pipeline.push(
          {
            $lookup: {
              from: 'booths',
              localField: '_id',
              foreignField: '_id',
              as: 'booth',
            },
          },
          { $unwind: '$booth' },
          { $match: { 'booth.zone': zoneFilter.zone } }
        );
      }

      pipeline.push({
        $group: {
          _id: null,
          cumulativeVoters: { $sum: '$totalVoters' },
        },
      });

      const result = await VoterCount.aggregate(pipeline);
      const cumulativeVoters = result.length > 0 ? result[0].cumulativeVoters : 0;

      hourlyTurnout.push({
        hour: slotInfo.hour,
        cumulativeVoters,
        cumulativePercent: Math.round((cumulativeVoters / totalRegistered) * 100 * 100) / 100,
      });
    }

    res.json({ success: true, data: hourlyTurnout });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
