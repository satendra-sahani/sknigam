/**
 * One-off maintenance script: clears the `voters` collection only.
 * Every other collection (booths, staff, assignments, discrepancies,
 * subscriptions, users, audit logs) is left untouched.  Run with:
 *
 *   npx ts-node src/scripts/clearVoters.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import Voter from '../models/Voter';
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

  const before = await Voter.countDocuments({});
  const boothsBefore = await Booth.countDocuments({});
  console.log(`Before: voters=${before}  booths=${boothsBefore}`);

  const res = await Voter.deleteMany({});
  console.log(`Deleted ${res.deletedCount} voter documents.`);

  const after = await Voter.countDocuments({});
  const boothsAfter = await Booth.countDocuments({});
  console.log(`After:  voters=${after}  booths=${boothsAfter}  (booths unchanged)`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
