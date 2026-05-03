/**
 * Diagnostic: dump every staff user alongside their active booth
 * assignments, so we can see at a glance who sees what in the mobile
 * app.  Run with:
 *
 *   cd packages/api
 *   npx ts-node src/scripts/whoHasAssignments.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import User from '../models/User';
import VoterAssignment from '../models/VoterAssignment';
import Booth from '../models/Booth';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set — aborting.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to', mongoose.connection.name, 'at', mongoose.connection.host);
  console.log('');

  const staff = await User.find({ role: 'staff' })
    .select('_id name email phone isActive')
    .sort({ name: 1 })
    .lean();

  console.log(`Found ${staff.length} staff user(s).`);
  console.log('');

  for (const s of staff) {
    const active = await VoterAssignment.find({ staffId: s._id, isActive: true })
      .populate('boothId', 'partNumber name assemblyConstituency district')
      .lean();
    const inactive = await VoterAssignment.countDocuments({
      staffId: s._id,
      isActive: false,
    });
    const activeTag = s.isActive === false ? ' [USER DEACTIVATED]' : '';
    console.log(
      `• ${s.name || '(no name)'}  ${s.email || ''}  ${s.phone || ''}${activeTag}`,
    );
    console.log(`   _id=${s._id.toString()}`);
    console.log(
      `   active assignments: ${active.length}   inactive: ${inactive}`,
    );
    for (const a of active) {
      const b: any = a.boothId;
      if (!b) {
        console.log(`     - assignment ${a._id} → BOOTH MISSING (orphan)`);
        continue;
      }
      const range =
        a.voterSerialFrom || a.voterSerialTo
          ? ` serials ${a.voterSerialFrom ?? '1'}–${a.voterSerialTo ?? '∞'}`
          : ' (whole booth)';
      console.log(
        `     - Part ${b.partNumber} · ${b.name} · ${b.assemblyConstituency}, ${b.district}${range}`,
      );
    }
    console.log('');
  }

  // Orphan assignments — no matching user.
  const allAssignments = await VoterAssignment.find({ isActive: true }).lean();
  const staffIds = new Set(staff.map((s) => s._id.toString()));
  const orphans = allAssignments.filter((a) => !staffIds.has(a.staffId.toString()));
  if (orphans.length > 0) {
    console.log(`⚠ ${orphans.length} active assignment(s) reference a staffId that is NOT a role=staff user:`);
    for (const a of orphans) {
      const referenced = await User.findById(a.staffId).select('name role').lean();
      const booth = await Booth.findById(a.boothId).select('partNumber name').lean();
      console.log(
        `   - assignment ${a._id}  staffId=${a.staffId}  →  user: ${
          referenced ? `${referenced.name} (role=${referenced.role})` : 'NOT FOUND'
        }  booth: ${booth ? `Part ${booth.partNumber} · ${booth.name}` : 'MISSING'}`,
      );
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
