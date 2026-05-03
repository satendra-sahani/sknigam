/**
 * Harvard 2019 baseline seed for POLLSTICS booths.
 *
 * Source: Jensenius, F.R. et al., "Polling Station-Level Election Results for
 *         Uttar Pradesh (2019 Lok Sabha)", Harvard Dataverse.
 *         https://dataverse.harvard.edu/dataverse/india-polling-station
 *
 * Two files are involved:
 *   - UP_PSdata_2019.tab   authoritative list of 161,843 polling stations
 *                           across all 403 ACs (one row per PS, with the
 *                           votes tallied in 2019).  This is our PRIMARY
 *                           driver — every PS here becomes a Booth.
 *   - UP_mergefile_2019.tab a LEFT-JOIN of PSdata onto the 2011 Census
 *                           villages, giving district/block/village/
 *                           Electors for ~140k of those stations.  Urban
 *                           booths (wards without census-village codes)
 *                           are intentionally absent from this file.
 *
 * Our earlier seed used the mergefile as the primary driver, which silently
 * dropped ~13% of booths (21,667 system-wide; 7 for AC 338 alone).  We now
 * index the mergefile into memory, then stream PSdata as the PRIMARY source
 * and enrich from the mergefile where available.  Where the mergefile has
 * no match, the canonical UP_CONSTITUENCIES lookup still gives us the right
 * district, and the booth is still created — just without village info.
 *
 * When a 2025 data source (CEO UP scrape or DEO PDF upload) later targets
 * the same booth, it overwrites these records with fresher data tagged
 * `source: 'ceo_up_2025'` or `'deo_pdf'` and bumps `lastSyncedAt`.  This
 * script is idempotent — re-running it is safe.
 *
 * Run:  pnpm --filter @election/api run seed:booths-baseline
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import Booth from './models/Booth';
import { UP_CONSTITUENCIES } from './data/upReferenceData';

const BOOTH_SOURCES_DIR = path.join(__dirname, 'data', 'booth-sources');
const MERGEFILE_PATH = path.join(BOOTH_SOURCES_DIR, 'UP_mergefile_2019.tab');
const PSDATA_PATH = path.join(BOOTH_SOURCES_DIR, 'UP_PSdata_2019.tab');

const SOURCE_URL =
  'https://dataverse.harvard.edu/dataverse/india-polling-station';

const BATCH_SIZE = 2000;

interface MergeEnrichment {
  district: string;
  block: string;
  village: string;
  electors: number;
}

function stripQuotes(s: string): string {
  return s.replace(/^"+|"+$/g, '').trim();
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function buildAcIndex(): Map<number, { name: string; district: string }> {
  const ix = new Map<number, { name: string; district: string }>();
  for (const ac of UP_CONSTITUENCIES) {
    ix.set(ac.number, { name: ac.name, district: ac.district });
  }
  return ix;
}

interface MergeParsed {
  acNumber: number;
  partNumber: number;
  enrichment: MergeEnrichment;
}

function parseMergeRow(line: string): MergeParsed | null {
  // State_no2011  District_no2011  District_name2011  Block_no2011
  // Block_name2011  Vill_no2011  Vill_name2011  AC_no  AC_name  PS_id  Electors
  const parts = line.split('\t');
  if (parts.length < 11) return null;
  const acNumber = parseInt(parts[7], 10);
  const partNumber = parseInt(stripQuotes(parts[9]), 10);
  if (!acNumber || !partNumber) return null;
  return {
    acNumber,
    partNumber,
    enrichment: {
      district: stripQuotes(parts[2]),
      block: stripQuotes(parts[4]),
      village: stripQuotes(parts[6]),
      electors: parseInt(parts[10], 10) || 0,
    },
  };
}

interface PsRow {
  acNumber: number;
  acNameTsv: string;
  partNumber: number;
  votesTotal: number;
}

function parsePsRow(line: string): PsRow | null {
  // State_no2011  PC_no  PC_name  AC_no  AC_name  PS_id  Votes_total  ...
  const parts = line.split('\t');
  if (parts.length < 7) return null;
  const acNumber = parseInt(parts[3], 10);
  const acNameTsv = stripQuotes(parts[4]);
  const partNumber = parseInt(stripQuotes(parts[5]), 10);
  const votesTotal = parseInt(parts[6], 10) || 0;
  if (!acNumber || !partNumber) return null;
  return { acNumber, acNameTsv, partNumber, votesTotal };
}

/**
 * Pre-load the mergefile into memory as a hash keyed by `${AC}|${PS}`.  The
 * file is ~12 MB / ~162k rows, so the whole thing fits in under 40 MB of
 * heap — well within budget and drastically faster than re-scanning for
 * each PSdata row.
 */
async function loadMergeIndex(): Promise<Map<string, MergeEnrichment>> {
  const index = new Map<string, MergeEnrichment>();
  if (!fs.existsSync(MERGEFILE_PATH)) return index;

  const stream = fs.createReadStream(MERGEFILE_PATH, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNo = 0;
  for await (const line of rl) {
    lineNo++;
    if (lineNo === 1 || !line.trim()) continue;
    const parsed = parseMergeRow(line);
    if (!parsed) continue;
    // One PS can appear on multiple rows (one per village served); we keep
    // the first one seen to avoid thrash, which matches the authoritative
    // "primary village" convention used by the 2011 Census merge.
    const key = `${parsed.acNumber}|${parsed.partNumber}`;
    if (!index.has(key)) index.set(key, parsed.enrichment);
  }
  return index;
}

async function main() {
  const mongoURI =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/pollstics';
  await mongoose.connect(mongoURI);
  console.log(`[seed:booths-baseline] Connected to ${mongoURI}`);

  // --- Reconcile indexes ----------------------------------------------------
  // Older deployments had a single-field unique index on `partNumber`, which
  // conflicts with our multi-AC baseline where the same part number recurs
  // across different constituencies.  We drop any such legacy index before
  // seeding and let Mongoose recreate the current (partNumber+AC) compound
  // unique index on next sync.
  try {
    const existing = await Booth.collection.indexes();
    for (const ix of existing) {
      const keys = Object.keys(ix.key || {});
      if (
        ix.unique &&
        keys.length === 1 &&
        keys[0] === 'partNumber' &&
        ix.name
      ) {
        console.log(`[seed:booths-baseline] dropping stale index: ${ix.name}`);
        await Booth.collection.dropIndex(ix.name);
      }
    }
    await Booth.syncIndexes();
  } catch (e) {
    console.warn('[seed:booths-baseline] index reconciliation warning:', e);
  }

  if (!fs.existsSync(PSDATA_PATH)) {
    console.error(`PSdata not found at ${PSDATA_PATH}`);
    process.exit(1);
  }

  const acIndex = buildAcIndex();
  const batchId = randomUUID();
  const syncedAt = new Date();

  console.log('[seed:booths-baseline] loading mergefile enrichment index…');
  const mergeIndex = await loadMergeIndex();
  console.log(
    `[seed:booths-baseline] mergefile index: ${mergeIndex.size} (AC,PS) keys`,
  );

  const stream = fs.createReadStream(PSDATA_PATH, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lineNo = 0;
  let batch: any[] = [];
  let processed = 0;
  let written = 0;
  let skipped = 0;
  let enrichedCount = 0;
  let unenrichedCount = 0;
  const seenKeys = new Set<string>();
  const acCoverage = new Map<number, number>();

  async function flush() {
    if (batch.length === 0) return;
    await Booth.bulkWrite(batch, { ordered: false });
    written += batch.length;
    batch = [];
  }

  for await (const rawLine of rl) {
    lineNo++;
    if (lineNo === 1) continue; // header
    if (!rawLine.trim()) continue;

    const row = parsePsRow(rawLine);
    if (!row) {
      skipped++;
      continue;
    }

    // Deduplicate — PSdata has one row per (AC, PS) but paranoia is cheap.
    const key = `${row.acNumber}|${row.partNumber}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const canonical = acIndex.get(row.acNumber);
    if (!canonical) {
      // AC number that UP_CONSTITUENCIES doesn't know — skip defensively.
      skipped++;
      continue;
    }
    const acName = canonical.name;
    const acDistrict = canonical.district;

    const enrich = mergeIndex.get(key);
    if (enrich) enrichedCount++;
    else unenrichedCount++;

    const villageTC = enrich ? titleCase(enrich.village) : '';
    const boothName = villageTC
      ? `Polling Station ${row.partNumber} — ${villageTC}`
      : `Polling Station ${row.partNumber} — ${acName}`;

    batch.push({
      updateOne: {
        filter: {
          partNumber: row.partNumber,
          assemblyConstituency: acName,
        },
        update: {
          $set: {
            partNumber: row.partNumber,
            name: boothName,
            assemblyConstituency: acName,
            assemblyConstituencyNumber: row.acNumber,
            district: acDistrict,
            state: 'Uttar Pradesh',
            village: villageTC || undefined,
            address: enrich?.block ? titleCase(enrich.block) : undefined,
            // Prefer Electors (eligible voters) from mergefile; fall back to
            // 2019 Votes_total as a rough signal so the UI isn't empty for
            // unenriched booths.
            totalVoters: enrich?.electors || row.votesTotal || 0,
            source: 'harvard_2019',
            sourceUrl: SOURCE_URL,
            lastSyncedAt: syncedAt,
            sourceBatchId: batchId,
          },
        },
        upsert: true,
      },
    });

    processed++;
    acCoverage.set(row.acNumber, (acCoverage.get(row.acNumber) ?? 0) + 1);

    if (batch.length >= BATCH_SIZE) {
      await flush();
      process.stdout.write(
        `\r[seed:booths-baseline] upserted ${written} / processed ${processed}…`,
      );
    }
  }

  await flush();
  process.stdout.write('\n');

  console.log(`[seed:booths-baseline] Done.`);
  console.log(`  processed rows : ${processed}`);
  console.log(`  upsert writes  : ${written}`);
  console.log(`  skipped lines  : ${skipped}`);
  console.log(`  enriched (mergefile hit) : ${enrichedCount}`);
  console.log(`  unenriched (no village)  : ${unenrichedCount}`);
  console.log(`  AC coverage    : ${acCoverage.size} / 403`);
  console.log(`  batchId        : ${batchId}`);

  // Quick sanity — total booth count post-seed
  const total = await Booth.countDocuments({ source: 'harvard_2019' });
  console.log(`  booths tagged harvard_2019: ${total}`);

  // Spot-check Pathardeva (AC 338) — the user's reference AC.
  const pathardeva = await Booth.countDocuments({
    assemblyConstituencyNumber: 338,
  });
  console.log(`  Pathardeva (AC 338) booth count: ${pathardeva}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[seed:booths-baseline] fatal:', err);
  process.exit(1);
});
