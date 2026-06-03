/**
 * Real-PDF smoke test for the offline vision parser.
 *
 *   On the VPS:
 *     cd /var/www/sknigam/packages/api
 *     npx ts-node test-local-parse.ts /tmp/some-eci-roll.pdf
 *
 * Streams per-page progress events so you can watch the bar move in
 * real time (each page takes ~2-3 minutes on CPU).  At the end prints
 * the first 3 voter records + the last record so you can spot-check
 * EPICs, Devanagari names, and transliterations against the source PDF.
 *
 *   --max=N    cap how many voters we extract (useful for a quick
 *              sanity check — stops after roughly N voters' worth of
 *              pages rather than processing the whole roll)
 *   --bg       just dump the raw progress NDJSON (no formatted record
 *              preview) — useful for log capture
 */
import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import { parseEciRollPdfWithLocalVision } from './src/utils/localVisionPdfParser';

function arg(flag: string): string | undefined {
  const ix = process.argv.findIndex((a) => a === flag || a.startsWith(flag + '='));
  if (ix === -1) return undefined;
  const a = process.argv[ix];
  if (a.includes('=')) return a.split('=')[1];
  return process.argv[ix + 1];
}

async function main() {
  const path = process.argv[2];
  if (!path || path.startsWith('--')) {
    console.error('Usage: npx ts-node test-local-parse.ts <pdf> [--max=N] [--bg]');
    process.exit(2);
  }
  const maxVoters = Number(arg('--max')) || undefined;
  const bgOnly = process.argv.includes('--bg');

  console.log(`[test] model:  ${process.env.OLLAMA_VISION_MODEL || 'qwen2.5vl:7b (default)'}`);
  console.log(`[test] host:   ${process.env.OLLAMA_HOST || 'http://127.0.0.1:11434 (default)'}`);
  console.log(`[test] file:   ${path}`);
  const buf = fs.readFileSync(path);
  console.log(`[test] bytes:  ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
  if (maxVoters) console.log(`[test] maxVoters: ${maxVoters}`);
  console.log(`[test] calling local vision parser... (CPU inference is slow — ~2-3 min/page)`);

  const t0 = Date.now();
  let pageDoneCount = 0;
  let totalPages = 0;
  try {
    const res = await parseEciRollPdfWithLocalVision(buf, {
      maxVoters,
      onProgress: (e) => {
        if (bgOnly) {
          console.log(JSON.stringify(e));
          return;
        }
        if (e.type === 'start') {
          totalPages = e.totalChunks;
          console.log(`[test] starting: ${e.totalPages} pages, ${e.totalChunks} chunks`);
        } else if (e.type === 'chunk_started') {
          process.stdout.write(`  · chunk ${e.index + 1}/${e.total} (attempt ${e.attempt})…\n`);
        } else if (e.type === 'chunk_done') {
          pageDoneCount++;
          const pct = totalPages ? Math.round((pageDoneCount / totalPages) * 100) : 0;
          console.log(
            `  ✓ chunk ${e.index + 1}/${e.total} → ${e.rowsInChunk.length} rows (running ${e.runningTotal}) — ${pct}%`,
          );
        } else if (e.type === 'chunk_error') {
          console.log(`  ✗ chunk ${e.index + 1}/${e.total} FAILED: ${e.message.slice(0, 200)}`);
        }
      },
    });
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n=== SUCCESS in ${dt}s ===`);
    console.log(`  AC (Hi):  ${res.assemblyConstituencyHi ?? '-'}`);
    console.log(`  AC (En):  ${res.assemblyConstituency ?? '-'}`);
    console.log(`  Part:     ${res.partNumber ?? '-'}`);
    console.log(`  Voters:   ${res.rows.length}`);
    console.log(`  Model:    ${res.modelUsed}`);
    if (res.warnings.length) console.log(`  Warnings: ${res.warnings.join(' | ')}`);
    console.log(`\n  First 3 records:`);
    res.rows.slice(0, 3).forEach((r, i) => {
      console.log(`  [${i + 1}] serial=${r.voterSerialNumber ?? '-'} epic=${r.epicNumber}`);
      console.log(`       name:   ${r.fullNameHi ?? '-'}  /  ${r.fullName ?? '-'}`);
      console.log(`       rel:    ${r.fatherOrHusbandNameHi ?? '-'}  /  ${r.fatherOrHusbandName ?? '-'}`);
      console.log(`       gender=${r.gender ?? '-'} age=${r.age ?? '-'}`);
      console.log(`       addr:   ${r.addressHi ?? '-'}  /  ${r.address ?? '-'}`);
    });
    if (res.rows.length > 0) {
      const last = res.rows[res.rows.length - 1];
      console.log(`\n  Last record:`);
      console.log(`  [${res.rows.length}] serial=${last.voterSerialNumber ?? '-'} epic=${last.epicNumber}`);
      console.log(`       name:   ${last.fullNameHi ?? '-'}  /  ${last.fullName ?? '-'}`);
    }
  } catch (e: any) {
    console.log(`\n=== FAILED in ${((Date.now() - t0) / 1000).toFixed(1)}s ===`);
    console.log(`  ${e?.name || 'Error'}: ${e?.message || e}`);
    process.exit(1);
  }
}

main();
