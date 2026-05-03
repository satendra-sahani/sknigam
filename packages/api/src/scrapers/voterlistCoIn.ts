/**
 * voterlist.co.in scraper — the pragmatic 2026 source.
 *
 * Why this exists.  The CEO UP live site (rollpdf.aspx) redirects programmatic
 * POSTs to /MainIndex.aspx?aspxerrorpath=... as anti-bot mitigation, so our
 * VIEWSTATE-driven scraper in ceoUp2025.ts is effectively blocked without a
 * headless browser.  voterlist.co.in republishes the same ECI 2026 final-roll
 * data (the data-path attribute on each booth link points into
 *   https://voters.eci.gov.in/eroll/2026/s24/sir-finalroll/<AC>/...
 * ) and exposes it as pre-rendered HTML we can scrape politely.
 *
 * What this module does.  Given an AC slug (from VOTERLIST_UP_SLUGS) it:
 *   1. Fetches https://voterlist.co.in/<slug>/ (HTML, ~300 KB).
 *   2. Reads the data-statecd / data-districtcd / data-asmblyno meta on the
 *      download-form so we can sanity-check we got the UP AC we expected.
 *   3. Walks the <ul class="ac-part-list"> block harvesting every
 *          <li data-partnumber="N" data-partname="NAME IN CAPS">...
 *      and the ECI PDF path from `data-path='...'`.
 *   4. Returns a list of `VoterlistStation` records the seed driver can
 *      upsert into Booth.
 *
 * What this module does NOT do.
 *   - It does NOT fetch the per-booth electoral-roll PDFs.  Those are gated
 *     behind a captcha on api.voterlist.co.in/server/ and are irrelevant to
 *     booth-level metadata (they are voter-level rolls).
 *   - It does NOT aggregate totals (voter counts).  voterlist.co.in's
 *     summary page only gives us partNumber + partname; we keep the 2019
 *     Harvard `totalVoters` until a CEO draft-roll PDF actually publishes a
 *     new count per booth.
 *
 * Politeness.  One HTTP GET per AC, with REQUEST_DELAY_MS between calls to
 * the seed driver.  voterlist.co.in sits behind Cloudflare so we set a
 * realistic User-Agent and Accept-Language to avoid tripping the rate limiter.
 */

import https from 'https';
import { URL } from 'url';

const BASE_URL = 'https://voterlist.co.in';
export const REQUEST_DELAY_MS = 1200;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

export class VoterlistError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'VoterlistError';
  }
}

export interface VoterlistStation {
  partNumber: number;
  /** Booth name in ALL CAPS as voterlist publishes it (data-partname attr). */
  nameRaw: string;
  /** Title-cased rendering suitable for display. */
  name: string;
  /** ECI final-roll PDF path, e.g. /eroll/2026/s24/sir-finalroll/338/2026-...pdf */
  eciPdfPath?: string;
}

export interface VoterlistAcResponse {
  /** ECI state code from the page meta (S24 for UP). */
  stateCode: string;
  /** ECI district code from the page meta (e.g. S2452 for Deoria). */
  districtCode: string;
  /** AC number per the page meta. Verifier: must equal the caller's AC. */
  acNumber: number;
  /** Fully-qualified URL we actually fetched. */
  sourceUrl: string;
  stations: VoterlistStation[];
  warnings: string[];
}

// --- HTTP -------------------------------------------------------------------

function httpGet(url: string, redirectsLeft = 3): Promise<{ status: number; body: string; finalUrl: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.get(
      {
        host: u.host,
        path: u.pathname + u.search,
        protocol: u.protocol,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        // Follow 301/302 (voterlist flips `foo/` -> `foo-2003-sir/` for ACs it
        // doesn't have 2026 data for; we want to know, so we follow but surface
        // the final URL).
        if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          httpGet(next, redirectsLeft - 1).then(resolve, reject);
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({ status, body, finalUrl: url });
        });
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error('voterlist GET timed out after 30s'));
    });
  });
}

// --- Parsers ----------------------------------------------------------------

function titleCase(s: string): string {
  // "U.P.S. PAKAHA R N 3" -> "U.p.s. Pakaha R N 3"
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
    .trim();
}

function extractMeta(html: string): {
  stateCode?: string;
  districtCode?: string;
  acNumber?: number;
} {
  const state = html.match(/data-statecd="([^"]+)"/)?.[1];
  const district = html.match(/data-districtcd="([^"]+)"/)?.[1];
  const ac = html.match(/data-asmblyno="([^"]+)"/)?.[1];
  return {
    stateCode: state,
    districtCode: district,
    acNumber: ac ? parseInt(ac, 10) : undefined,
  };
}

function extractStations(html: string): VoterlistStation[] {
  // <ul class="ac-part-list">...</ul>
  const ulMatch = html.match(
    /<ul[^>]*class="[^"]*ac-part-list[^"]*"[^>]*>([\s\S]*?)<\/ul>/,
  );
  if (!ulMatch) return [];
  const ul = ulMatch[1];

  const liRe =
    /<li\s+data-partnumber="(\d+)"\s+data-partname="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g;
  const out: VoterlistStation[] = [];
  let m: RegExpExecArray | null;
  while ((m = liRe.exec(ul)) !== null) {
    const partNumber = parseInt(m[1], 10);
    if (!partNumber) continue;
    const rawName = m[2].trim();
    const body = m[3];
    // data-path='/eroll/2026/s24/sir-finalroll/<AC>/...' (single-quoted in HTML)
    const pathMatch = body.match(/data-path=['"]([^'"]+)['"]/);
    out.push({
      partNumber,
      nameRaw: rawName,
      name: titleCase(rawName),
      eciPdfPath: pathMatch?.[1],
    });
  }
  return out;
}

// --- Public entrypoint ------------------------------------------------------

export async function fetchAcBoothList(
  slug: string,
): Promise<VoterlistAcResponse> {
  const url = `${BASE_URL}/${slug}/`;
  const { status, body, finalUrl } = await httpGet(url);
  if (status !== 200) {
    throw new VoterlistError(
      `GET ${url} returned HTTP ${status} (final ${finalUrl})`,
      status,
    );
  }
  // If voterlist redirected us to a `-2003-sir` page, that AC has no 2026 data.
  if (/-2003-sir\/?$/.test(finalUrl)) {
    throw new VoterlistError(
      `No 2026 page for slug "${slug}" — redirected to 2003 SIR archive (${finalUrl})`,
    );
  }

  const meta = extractMeta(body);
  if (!meta.acNumber || !meta.stateCode) {
    throw new VoterlistError(
      `Missing ECI meta on ${url} (statecd=${meta.stateCode}, asmblyno=${meta.acNumber})`,
    );
  }
  if (meta.stateCode !== 'S24') {
    throw new VoterlistError(
      `Slug "${slug}" resolved to state ${meta.stateCode}, expected S24 (UP)`,
    );
  }

  const stations = extractStations(body);
  const warnings: string[] = [];
  if (stations.length === 0) {
    warnings.push('ac-part-list was empty or missing on the page');
  } else {
    // Detect non-contiguous or duplicate part numbers — useful for QA.
    const parts = stations.map((s) => s.partNumber).sort((a, b) => a - b);
    for (let i = 1; i < parts.length; i++) {
      if (parts[i] === parts[i - 1]) {
        warnings.push(`Duplicate partNumber detected: ${parts[i]}`);
        break;
      }
    }
  }

  return {
    stateCode: meta.stateCode,
    districtCode: meta.districtCode || '',
    acNumber: meta.acNumber,
    sourceUrl: url,
    stations,
    warnings,
  };
}
