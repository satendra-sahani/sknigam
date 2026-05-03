/**
 * UP 2026 booth refresh driver — powered by voterlist.co.in, which
 * republishes the ECI 2026 SIR Final-Roll polling-station list (the
 * `data-path` attribute on every booth link resolves into
 *   https://voters.eci.gov.in/eroll/2026/s24/sir-finalroll/<AC>/...
 * so we know the source is authoritative ECI metadata, not user-entered).
 *
 *   pnpm --filter @election/api run seed:booths-latest                 # all 403 ACs
 *   pnpm --filter @election/api run seed:booths-latest -- --ac=338     # just Pathardeva
 *   pnpm --filter @election/api run seed:booths-latest -- --ac=338,339  # several
 *   pnpm --filter @election/api run seed:booths-latest -- --fresh      # ignore progress
 *   pnpm --filter @election/api run seed:booths-latest -- --stop-after=5  # canary run
 *
 * What it does per AC:
 *   1. Look up the voterlist.co.in slug from VOTERLIST_UP_SLUGS.  If null
 *      (3 ACs have no 2026 page on voterlist: Hamirpur, Rath, Domariyaganj),
 *      skip — those keep their harvard_2019 fallback.
 *   2. GET https://voterlist.co.in/<slug>/ (one polite HTTP call, ~300 KB HTML).
 *   3. Parse the <ul class="ac-part-list">: one <li> per polling station, with
 *      partNumber, raw ALL-CAPS name, and the ECI PDF path.
 *   4. Sanity-check data-statecd="S24" + data-asmblyno matches expected AC.
 *   5. Upsert each station into Booth with source="voterlist_2026".  Where
 *      Harvard 2019 had the same (partNumber, AC), this bumps the record
 *      (name + freshness) without losing totalVoters — we preserve the old
 *      count via $setOnInsert's complement, see below.
 *
 * Previous implementation used rollpdf.aspx via VIEWSTATE scraping; that is
 * blocked by CEO UP's anti-bot redirect.  See scrapers/ceoUp2025.ts for the
 * historical attempt (retained for when we wire up a Playwright driver).
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import Booth from './models/Booth';
import { UP_CONSTITUENCIES } from './data/upReferenceData';
import {
  VOTERLIST_UP_SLUGS,
  voterlistSlugFor,
} from './data/voterlistUpSlugs';
import {
  fetchAcBoothList,
  VoterlistError,
  REQUEST_DELAY_MS,
} from './scrapers/voterlistCoIn';

const PROGRESS_DIR = path.join(__dirname, 'data', 'booth-sources');
const PROGRESS_FILE = path.join(PROGRESS_DIR, '.voterlist-progress.json');

interface Args {
  onlyAcs?: number[];
  resume: boolean;
  fresh: boolean;
  stopAfter?: number;
}

interface ProgressEntry {
  acNumber: number;
  status: 'ok' | 'error' | 'empty' | 'skipped';
  slug: string | null;
  boothsUpserted?: number;
  expectedParts?: number;
  warnings?: string[];
  error?: string;
  at: string;
}

interface Progress {
  startedAt: string;
  batchId: string;
  entries: Record<string, ProgressEntry>;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { resume: true, fresh: false };
  for (const a of argv) {
    if (a.startsWith('--ac=')) {
      args.onlyAcs = a
        .slice(5)
        .split(',')
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !isNaN(n));
    } else if (a === '--resume') {
      args.resume = true;
    } else if (a === '--fresh') {
      args.fresh = true;
      args.resume = false;
    } else if (a.startsWith('--stop-after=')) {
      args.stopAfter = parseInt(a.split('=')[1], 10);
    }
  }
  return args;
}

function loadProgress(): Progress {
  if (!fs.existsSync(PROGRESS_FILE)) {
    return {
      startedAt: new Date().toISOString(),
      batchId: randomUUID(),
      entries: {},
    };
  }
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  } catch {
    return {
      startedAt: new Date().toISOString(),
      batchId: randomUUID(),
      entries: {},
    };
  }
}

function saveProgress(p: Progress): void {
  fs.mkdirSync(PROGRESS_DIR, { recursive: true });
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function runOne(
  acNumber: number,
  acName: string,
  district: string,
  slug: string,
  batchId: string,
): Promise<ProgressEntry> {
  const syncedAt = new Date();
  try {
    const res = await fetchAcBoothList(slug);
    // Sanity: does the page's asmblyno match what we expected?
    if (res.acNumber !== acNumber) {
      return {
        acNumber,
        status: 'error',
        slug,
        error: `slug "${slug}" page has asmblyno=${res.acNumber}, expected ${acNumber}`,
        at: syncedAt.toISOString(),
      };
    }
    if (res.stations.length === 0) {
      return {
        acNumber,
        status: 'empty',
        slug,
        warnings: res.warnings,
        at: syncedAt.toISOString(),
      };
    }

    // Build bulk upsert.  We $set the fresh fields but deliberately preserve
    // totalVoters via $setOnInsert — voterlist doesn't publish new voter counts,
    // and clobbering the harvard_2019 count with 0 would be a regression.
    const ops = res.stations.map((s) => ({
      updateOne: {
        filter: { partNumber: s.partNumber, assemblyConstituency: acName },
        update: {
          $set: {
            partNumber: s.partNumber,
            name: `Polling Station ${s.partNumber} — ${s.name}`,
            assemblyConstituency: acName,
            assemblyConstituencyNumber: acNumber,
            district,
            state: 'Uttar Pradesh',
            source: 'voterlist_2026',
            sourceUrl: res.sourceUrl,
            lastSyncedAt: syncedAt,
            sourceBatchId: batchId,
            ...(s.eciPdfPath
              ? { address: `ECI PDF: ${s.eciPdfPath}` }
              : {}),
          },
          $setOnInsert: {
            totalVoters: 0,
          },
        },
        upsert: true,
      },
    }));
    await Booth.bulkWrite(ops, { ordered: false });

    return {
      acNumber,
      status: 'ok',
      slug,
      boothsUpserted: ops.length,
      expectedParts: res.stations.length,
      warnings: res.warnings,
      at: syncedAt.toISOString(),
    };
  } catch (err) {
    const msg = err instanceof VoterlistError ? err.message : String(err);
    return {
      acNumber,
      status: 'error',
      slug,
      error: msg,
      at: syncedAt.toISOString(),
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mongoURI =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/pollstics';
  await mongoose.connect(mongoURI);
  console.log(`[seed:booths-latest] Connected to ${mongoURI}`);
  console.log(
    `[seed:booths-latest] args: resume=${args.resume} fresh=${args.fresh} onlyAcs=${args.onlyAcs?.join(',') || 'ALL'} stopAfter=${args.stopAfter ?? '-'}`,
  );

  const progress = args.fresh
    ? {
        startedAt: new Date().toISOString(),
        batchId: randomUUID(),
        entries: {},
      }
    : loadProgress();
  console.log(`[seed:booths-latest] batchId=${progress.batchId}`);

  const target = args.onlyAcs
    ? UP_CONSTITUENCIES.filter((c) => args.onlyAcs!.includes(c.number))
    : UP_CONSTITUENCIES;

  let ok = 0;
  let empty = 0;
  let errors = 0;
  let skipped = 0;
  let unavailable = 0;
  let done = 0;

  for (const ac of target) {
    done++;
    const key = String(ac.number);
    const prior = progress.entries[key];
    if (args.resume && prior && prior.status === 'ok') {
      skipped++;
      continue;
    }

    const slug = voterlistSlugFor(ac.number);
    if (!slug) {
      const entry: ProgressEntry = {
        acNumber: ac.number,
        status: 'skipped',
        slug: null,
        error: 'voterlist.co.in has no 2026 page for this AC; keeping harvard_2019 baseline',
        at: new Date().toISOString(),
      };
      progress.entries[key] = entry;
      unavailable++;
      saveProgress(progress);
      continue;
    }

    console.log(
      `[${done}/${target.length}] AC ${ac.number} — ${ac.name} (${ac.district}) → ${slug}`,
    );
    const entry = await runOne(
      ac.number,
      ac.name,
      ac.district,
      slug,
      progress.batchId,
    );
    progress.entries[key] = entry;
    if (entry.status === 'ok') {
      ok++;
      console.log(`  ✓ ${entry.boothsUpserted} booths upserted`);
    } else if (entry.status === 'empty') {
      empty++;
      console.log(`  ∅ empty (${entry.warnings?.join('; ') || 'no stations parsed'})`);
    } else {
      errors++;
      console.log(`  ✗ ${entry.error}`);
    }
    saveProgress(progress);

    if (args.stopAfter && done - skipped - unavailable >= args.stopAfter) {
      console.log(`[seed:booths-latest] --stop-after=${args.stopAfter} reached.`);
      break;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`\n[seed:booths-latest] Summary`);
  console.log(`  ACs visited       : ${done}`);
  console.log(`  resumed-skipped   : ${skipped}`);
  console.log(`  no-2026-page skipped: ${unavailable}`);
  console.log(`  ok                : ${ok}`);
  console.log(`  empty             : ${empty}`);
  console.log(`  error             : ${errors}`);
  console.log(`  progress file     : ${PROGRESS_FILE}`);

  // Post-seed spot checks
  const pathardeva = await Booth.countDocuments({
    assemblyConstituencyNumber: 338,
  });
  const pathardeva2026 = await Booth.countDocuments({
    assemblyConstituencyNumber: 338,
    source: 'voterlist_2026',
  });
  console.log(`  Pathardeva total booths : ${pathardeva}`);
  console.log(`  Pathardeva @ voterlist_2026 : ${pathardeva2026}`);

  const total2026 = await Booth.countDocuments({ source: 'voterlist_2026' });
  const totalAll = await Booth.countDocuments();
  console.log(`  booths @ voterlist_2026 : ${total2026}`);
  console.log(`  booths total            : ${totalAll}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[seed:booths-latest] fatal:', err);
  process.exit(1);
});
