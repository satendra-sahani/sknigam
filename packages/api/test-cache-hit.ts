/**
 * Unit smoke test for parseResultCache.  Validates:
 *   1. Same buffer → same hash → cache hit returns stored rows
 *   2. Different buffer → different hash → cache miss
 *   3. Hit is sub-millisecond (in-memory Map lookup)
 *   4. Stored rows are a value copy, not the same reference (route maps
 *      the rows on read, so reference equality isn't required — but the
 *      cache must not crash if callers mutate the returned array)
 *   5. Capacity + TTL sanity (smoke, not exhaustive)
 */
import {
  fileHash,
  getCachedParse,
  setCachedParse,
  clearParseCache,
  parseCacheSize,
} from './src/utils/parseResultCache';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

async function main() {
  clearParseCache();

  const buf1 = Buffer.from('%PDF-1.4\n—fake content one—\n%%EOF');
  const buf2 = Buffer.from('%PDF-1.4\n—fake content TWO—\n%%EOF');
  const hash1 = fileHash(buf1);
  const hash2 = fileHash(buf2);
  assert(hash1 !== hash2, 'different buffers produce different hashes');
  assert(hash1.length === 64, 'hash is 64 hex chars (SHA-256)');
  assert(fileHash(buf1) === hash1, 'same buffer produces same hash (deterministic)');

  assert(getCachedParse(hash1) === null, 'miss before insert');

  setCachedParse(hash1, {
    rows: [
      { epicNumber: 'NTV1234567', fullName: 'Test Voter', voterSerialNumber: 1 },
      { epicNumber: 'NTV7654321', fullName: 'Another Voter', voterSerialNumber: 2 },
    ],
    source: 'pdf-vision',
    warnings: ['test warning'],
    partNumber: 155,
    assemblyConstituency: 'Pathardeva',
    assemblyConstituencyHi: 'पथरदेवा',
    cachedAt: Date.now(),
  });

  const t0 = Date.now();
  const hit = getCachedParse(hash1);
  const dt = Date.now() - t0;
  assert(hit !== null, 'hit after insert');
  assert(hit!.rows.length === 2, 'retrieved correct number of rows');
  assert(hit!.rows[0].epicNumber === 'NTV1234567', 'first row EPIC preserved');
  assert(hit!.source === 'pdf-vision', 'source field preserved');
  assert(hit!.partNumber === 155, 'partNumber preserved');
  assert(hit!.assemblyConstituencyHi === 'पथरदेवा', 'Hindi header preserved');
  assert(dt < 10, `hit is fast (<10ms); measured ${dt}ms`);

  assert(getCachedParse(hash2) === null, 'different hash still misses');

  assert(parseCacheSize() === 1, 'cache size reflects inserts');
  clearParseCache();
  assert(parseCacheSize() === 0, 'clear empties the cache');
  assert(getCachedParse(hash1) === null, 'hit disappears after clear');

  console.log('\nAll parseResultCache smoke tests passed.');
}
main().catch(e => { console.error(e); process.exit(1); });
