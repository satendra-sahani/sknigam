import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import { parseEciRollPdfWithGemini } from './src/utils/geminiVisionPdfParser';

async function main() {
  const path = process.argv[2];
  if (!path) { console.error('Usage: npx ts-node test-gemini-parse.ts <pdf>'); process.exit(2); }
  console.log(`[test] model: ${process.env.GEMINI_MODEL}`);
  const buf = fs.readFileSync(path);
  console.log(`[test] file: ${path} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`[test] calling Gemini... (this can take 30-90s on a 10MB PDF)`);
  const t0 = Date.now();
  try {
    const res = await parseEciRollPdfWithGemini(buf);
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
    console.log(`\n  Last record:`);
    const last = res.rows[res.rows.length - 1];
    console.log(`  [${res.rows.length}] serial=${last.voterSerialNumber ?? '-'} epic=${last.epicNumber}`);
    console.log(`       name:   ${last.fullNameHi ?? '-'}  /  ${last.fullName ?? '-'}`);
  } catch (e: any) {
    console.log(`\n=== FAILED in ${((Date.now() - t0) / 1000).toFixed(1)}s ===`);
    console.log(`  ${e.name}: ${e.message}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
