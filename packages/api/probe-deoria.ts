import fs from 'fs';
import { parsePollingStationPdf } from './src/utils/pollingStationPdfParser';
(async () => {
  const buf = fs.readFileSync('C:/Users/saten/AppData/Local/Temp/deoria-polling.pdf');
  const r = await parsePollingStationPdf(buf);
  console.log('AC detected:', r.assemblyConstituencyNumber, r.assemblyConstituencyHi);
  console.log('Stations parsed:', r.stations.length);
  console.log('Warnings:', r.warnings);
  if (r.stations.length > 0) {
    console.log('First 5:', r.stations.slice(0, 5));
  }
})();
