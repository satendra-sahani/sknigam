/**
 * In-memory cache for parsed voter-roll results.
 *
 * Problem this solves: the Preview + Import flow originally sent the PDF
 * twice — once for preview (3+ minutes through Gemini), then again when
 * the user clicked "Import <N> voters" to actually insert.  That doubled
 * Gemini quota usage and user wait time on scanned PDFs.
 *
 * Solution: cache the *parsed rows* (not the PDF bytes) keyed by SHA-256
 * of the uploaded buffer.  Preview populates the cache, Import hits it
 * and skips straight to validation + insertMany.  Same file bytes → same
 * hash → cache hit, so this is transparent to the client.
 *
 * Design constraints:
 *   - Process-local.  No Redis.  A restart flushes the cache; worst case
 *     the user re-parses once.  Campaign-management server is single-
 *     instance in our current deploy.
 *   - TTL-bounded.  30 min is long enough to cover "preview → review →
 *     import" but short enough that a forgotten upload doesn't pin RAM.
 *   - Size-bounded.  50 entries × ~1000 rows × ~500 B/row ≈ 25 MB ceiling,
 *     which is negligible on a modern Node process.  When we hit the cap
 *     we evict whichever entry expires first.
 *   - Stores parser output ONLY — booth lookup and duplicate-EPIC checks
 *     still run fresh on every request because they depend on the current
 *     DB state, not on the file.
 */
import { createHash } from 'crypto';
import type { ParsedVoterRow } from './eciRollPdfParser';

export type ParseSource = 'pdf-text' | 'pdf-vision' | 'excel';

export interface CachedParse {
  rows: ParsedVoterRow[];
  source: ParseSource;
  warnings: string[];
  partNumber?: number;
  assemblyConstituency?: string;
  assemblyConstituencyHi?: string;
  cachedAt: number;  // epoch ms — shown to the UI as "cached 12s ago"
}

interface StoredEntry extends CachedParse {
  expiresAt: number;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ENTRIES = 50;
const store = new Map<string, StoredEntry>();

/** Compute the cache key for a file buffer.  SHA-256 is overkill for
 *  collision avoidance but fast enough (a 10 MB PDF hashes in ~50 ms on
 *  modest server hardware) and makes the key printable in logs. */
export function fileHash(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

/** Look up a cached parse.  Returns null if absent, expired, or evicted.
 *  Expired entries are cleaned up lazily — we don't run a background
 *  sweeper because the cache is small enough that amortised cleanup on
 *  get/set is fine. */
export function getCachedParse(hash: string): CachedParse | null {
  const e = store.get(hash);
  if (!e) return null;
  if (e.expiresAt < Date.now()) {
    store.delete(hash);
    return null;
  }
  // Copy out the non-expiresAt fields so callers can't accidentally
  // mutate our stored entry.
  const { expiresAt, ...view } = e;
  return view;
}

/** Insert or replace a parse result.  If the cache is full, evict the
 *  entry closest to expiry (usually oldest by insertion time). */
export function setCachedParse(hash: string, entry: CachedParse): void {
  if (store.size >= MAX_ENTRIES && !store.has(hash)) {
    let evictKey: string | null = null;
    let evictExpiry = Infinity;
    for (const [k, v] of store.entries()) {
      if (v.expiresAt < evictExpiry) {
        evictExpiry = v.expiresAt;
        evictKey = k;
      }
    }
    if (evictKey) store.delete(evictKey);
  }
  store.set(hash, { ...entry, expiresAt: Date.now() + TTL_MS });
}

/** For tests / ops — not wired to a route, but handy if you need to flush
 *  without restarting.  Left exported for future /internal admin use. */
export function clearParseCache(): void {
  store.clear();
}

/** Debug helper: number of currently-alive cached entries. */
export function parseCacheSize(): number {
  return store.size;
}
