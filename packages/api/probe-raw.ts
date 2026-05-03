import fs from 'fs';
import { PDFParse } from 'pdf-parse';
(async () => {
  const buf = fs.readFileSync('C:/Users/saten/AppData/Local/Temp/deoria-polling.pdf');
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const r = await parser.getText();
  console.log('Total chars:', r.text?.length);
  const lines = (r.text || '').split(/\r?\n/).filter(l => l.trim().length > 0);
  console.log('Non-empty lines:', lines.length);
  console.log('--- first 40 ---');
  for (let i = 0; i < Math.min(40, lines.length); i++) console.log(`[${i}]`, lines[i]);
  console.log('--- sample middle (300-330) ---');
  for (let i = 300; i < Math.min(330, lines.length); i++) console.log(`[${i}]`, lines[i]);
  await parser.destroy();
})();
