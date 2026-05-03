/**
 * CEO Uttar Pradesh — 2025 electoral roll PDF scraper.
 *
 * Target page: https://ceouttarpradesh.nic.in/rollpdf/rollpdf.aspx
 *
 * The page is classic ASP.NET WebForms.  The form has two dropdowns:
 *   1. ctl00$ContentPlaceHolder1$DDLDistrict  (district code)
 *   2. ctl00$ContentPlaceHolder1$DDL_AC       (AC number, populated via
 *                                              postback after district change)
 * and returns, for the selected AC, a PDF of the electoral roll (broken down
 * by polling station).  We then feed that PDF through the polling-station
 * parser to upsert booths tagged `source: 'ceo_up_2025'`.
 *
 * Because the CEO UP site changes form layouts from time to time and can
 * block bot user-agents, this scraper is defensive: it never crashes the
 * caller, it surfaces detailed errors (`ScrapeError`), and it never retries
 * silently.  The seed driver decides the retry/resume policy.
 *
 * NOTE: This scraper has been written against the live HTML structure
 * observed on 2026-04-19.  If CEO UP changes the field names or moves the
 * page, the constants at the top of this file are where to look first.
 *
 * KNOWN LIMITATION (2026-04-19): live testing showed the rollpdf.aspx POST
 * endpoint now redirects programmatic clients to an ASP.NET error handler
 * (`/MainIndex.aspx?aspxerrorpath=/rollpdf/rollpdf.aspx`) regardless of
 * whether a valid VIEWSTATE is presented — likely a new bot-mitigation
 * layer that requires client-side JS to finalise the postback.  If you hit
 * this, the practical paths forward are:
 *   (a) switch this module to a Playwright/Puppeteer driver (heavier, but
 *       executes the page's JS and clicks through like a real browser), or
 *   (b) obtain the per-AC draft roll PDFs directly from DEO sites (each
 *       district's DEO portal publishes the same PDFs) and import them
 *       through the existing Upload PDF flow in the /explore UI.
 * The parser + driver + schema are all production-ready for either path.
 */
import { setTimeout as sleep } from 'timers/promises';

const BASE = 'https://ceouttarpradesh.nic.in';
const ROLLPDF_PATH = '/rollpdf/rollpdf.aspx';
const ROLLPDF_URL = `${BASE}${ROLLPDF_PATH}`;

const FIELD_DISTRICT = 'ctl00$ContentPlaceHolder1$DDLDistrict';
const FIELD_AC = 'ctl00$ContentPlaceHolder1$DDL_AC';

// Courteous pacing — DDoS-protection kicks in around 30 req/min.
const REQUEST_DELAY_MS = 1200;

// Some districts on the live page use historical names; we alias them to our
// canonical UP_DISTRICTS entries so callers can look up by canonical name.
// Data observed from rollpdf.aspx district dropdown.
export const CEO_DISTRICT_CODES: Array<{ code: number; ceoName: string; canonical: string }> = [
  { code: 1, ceoName: 'Saharanpur', canonical: 'Saharanpur' },
  { code: 2, ceoName: 'Muzaffarnagar', canonical: 'Muzaffarnagar' },
  { code: 3, ceoName: 'Meerut', canonical: 'Meerut' },
  { code: 4, ceoName: 'Ghaziabad', canonical: 'Ghaziabad' },
  { code: 5, ceoName: 'Bulandshahr', canonical: 'Bulandshahr' },
  { code: 6, ceoName: 'Gautam Budh Nagar', canonical: 'Gautam Buddha Nagar' },
  { code: 7, ceoName: 'Baghpat', canonical: 'Baghpat' },
  { code: 8, ceoName: 'Agra', canonical: 'Agra' },
  { code: 9, ceoName: 'Aligarh', canonical: 'Aligarh' },
  { code: 10, ceoName: 'Mathura', canonical: 'Mathura' },
  { code: 11, ceoName: 'Firozabad', canonical: 'Firozabad' },
  { code: 12, ceoName: 'Mainpuri', canonical: 'Mainpuri' },
  { code: 13, ceoName: 'Etah', canonical: 'Etah' },
  { code: 14, ceoName: 'Mahamayanagar', canonical: 'Hathras' },
  { code: 15, ceoName: 'Bareilly', canonical: 'Bareilly' },
  { code: 16, ceoName: 'Budaun', canonical: 'Budaun' },
  { code: 17, ceoName: 'Shahjahanpur', canonical: 'Shahjahanpur' },
  { code: 18, ceoName: 'Pilibhit', canonical: 'Pilibhit' },
  { code: 19, ceoName: 'Moradabad', canonical: 'Moradabad' },
  { code: 20, ceoName: 'Rampur', canonical: 'Rampur' },
  { code: 21, ceoName: 'Bijnor', canonical: 'Bijnor' },
  { code: 22, ceoName: 'Jyoti Ba Phole Nagar', canonical: 'Amroha' },
  { code: 23, ceoName: 'Kanpur Nagar', canonical: 'Kanpur Nagar' },
  { code: 24, ceoName: 'Ramabai Nagar', canonical: 'Kanpur Dehat' },
  { code: 25, ceoName: 'Etawah', canonical: 'Etawah' },
  { code: 26, ceoName: 'Farrukhabad', canonical: 'Farrukhabad' },
  { code: 27, ceoName: 'Kannauj', canonical: 'Kannauj' },
  { code: 28, ceoName: 'Auraiya', canonical: 'Auraiya' },
  { code: 29, ceoName: 'Allahabad', canonical: 'Prayagraj' },
  { code: 30, ceoName: 'Fatehpur', canonical: 'Fatehpur' },
  { code: 31, ceoName: 'Pratapgarh', canonical: 'Pratapgarh' },
  { code: 32, ceoName: 'Kaushambi', canonical: 'Kaushambi' },
  { code: 33, ceoName: 'Jhansi', canonical: 'Jhansi' },
  { code: 34, ceoName: 'Lalitpur', canonical: 'Lalitpur' },
  { code: 35, ceoName: 'Jalaun', canonical: 'Jalaun' },
  { code: 36, ceoName: 'Hamirpur', canonical: 'Hamirpur' },
  { code: 37, ceoName: 'Mahoba', canonical: 'Mahoba' },
  { code: 38, ceoName: 'Banda', canonical: 'Banda' },
  { code: 39, ceoName: 'Chitrakoot', canonical: 'Chitrakoot' },
  { code: 40, ceoName: 'Varanasi', canonical: 'Varanasi' },
  { code: 41, ceoName: 'Jaunpur', canonical: 'Jaunpur' },
  { code: 42, ceoName: 'Ghazipur', canonical: 'Ghazipur' },
  { code: 43, ceoName: 'Chandauli', canonical: 'Chandauli' },
  { code: 44, ceoName: 'Mirzapur', canonical: 'Mirzapur' },
  { code: 45, ceoName: 'Sonbhadra', canonical: 'Sonbhadra' },
  { code: 46, ceoName: 'Sant Ravidas Nagar', canonical: 'Sant Ravidas Nagar Bhadohi' },
  { code: 47, ceoName: 'Azamgarh', canonical: 'Azamgarh' },
  { code: 48, ceoName: 'Mau', canonical: 'Mau' },
  { code: 49, ceoName: 'Ballia', canonical: 'Ballia' },
  { code: 50, ceoName: 'Gorakhpur', canonical: 'Gorakhpur' },
  { code: 51, ceoName: 'Maharajganj', canonical: 'Maharajganj' },
  { code: 52, ceoName: 'Deoria', canonical: 'Deoria' },
  { code: 53, ceoName: 'Kushinagar', canonical: 'Kushinagar' },
  { code: 54, ceoName: 'Basti', canonical: 'Basti' },
  { code: 55, ceoName: 'Siddharthnagar', canonical: 'Siddharthnagar' },
  { code: 56, ceoName: 'Sant Kabirnagar', canonical: 'Sant Kabir Nagar' },
  { code: 57, ceoName: 'Lucknow', canonical: 'Lucknow' },
  { code: 58, ceoName: 'Unnao', canonical: 'Unnao' },
  { code: 59, ceoName: 'Rae Bareli', canonical: 'Raebareli' },
  { code: 60, ceoName: 'Sitapur', canonical: 'Sitapur' },
  { code: 61, ceoName: 'Hardoi', canonical: 'Hardoi' },
  { code: 62, ceoName: 'Kheri', canonical: 'Lakhimpur Kheri' },
  { code: 63, ceoName: 'Gonda', canonical: 'Gonda' },
  { code: 64, ceoName: 'Bahraich', canonical: 'Bahraich' },
  { code: 65, ceoName: 'Balrampur', canonical: 'Balrampur' },
  { code: 66, ceoName: 'Shrawasti', canonical: 'Shrawasti' },
  { code: 67, ceoName: 'Faizabad', canonical: 'Ayodhya' },
  { code: 68, ceoName: 'Sultanpur', canonical: 'Sultanpur' },
  { code: 69, ceoName: 'Barabanki', canonical: 'Barabanki' },
  { code: 70, ceoName: 'AmbedkarNagar', canonical: 'Ambedkar Nagar' },
];

export class ScrapeError extends Error {
  readonly stage: string;
  readonly details?: string;
  constructor(stage: string, message: string, details?: string) {
    super(`[ceoUp2025:${stage}] ${message}`);
    this.name = 'ScrapeError';
    this.stage = stage;
    this.details = details;
  }
}

interface Session {
  cookies: Record<string, string>;
  viewState: string;
  viewStateGenerator: string;
  eventValidation: string;
}

/**
 * Tiny HTML helper — we extract the narrow set of fields we need using
 * regex rather than pulling in a full HTML parser dependency.  The CEO UP
 * page is plain server-rendered WebForms so these regexes are stable.
 */
function extractHiddenField(html: string, id: string): string | null {
  const re = new RegExp(
    `<input[^>]+(?:name|id)="${id}"[^>]*value="([^"]*)"`,
    'i',
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

function parseCookies(setCookieHeaders: string[]): Record<string, string> {
  const jar: Record<string, string> = {};
  for (const h of setCookieHeaders) {
    const [pair] = h.split(';');
    const [k, v] = pair.split('=');
    if (k && v !== undefined) jar[k.trim()] = v.trim();
  }
  return jar;
}

function cookieHeader(jar: Record<string, string>): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function doFetch(
  url: string,
  init: RequestInit & { cookies?: Record<string, string> },
): Promise<{ status: number; body: string; bodyBuffer: Buffer; cookies: Record<string, string> }> {
  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (POLLSTICS bulk seed; contact admin@pollstics.com)',
    Accept:
      'text/html,application/xhtml+xml,application/xml,application/pdf;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
    ...((init.headers as Record<string, string>) || {}),
  };
  if (init.cookies && Object.keys(init.cookies).length) {
    headers.Cookie = cookieHeader(init.cookies);
  }
  const res = await fetch(url, { ...init, headers, redirect: 'follow' });
  const buf = Buffer.from(await res.arrayBuffer());
  // Node 20's fetch exposes set-cookie via Headers.getSetCookie()
  const setCookies =
    (res.headers as any).getSetCookie?.() ??
    [res.headers.get('set-cookie')].filter(Boolean) ??
    [];
  const cookies = { ...(init.cookies || {}), ...parseCookies(setCookies) };
  return {
    status: res.status,
    body: buf.toString('utf-8'),
    bodyBuffer: buf,
    cookies,
  };
}

async function openSession(): Promise<Session> {
  const r = await doFetch(ROLLPDF_URL, { method: 'GET' });
  if (r.status !== 200) {
    throw new ScrapeError('openSession', `HTTP ${r.status} fetching rollpdf.aspx`);
  }
  const vs = extractHiddenField(r.body, '__VIEWSTATE');
  const vsGen = extractHiddenField(r.body, '__VIEWSTATEGENERATOR');
  const ev = extractHiddenField(r.body, '__EVENTVALIDATION');
  if (!vs || !vsGen || !ev) {
    throw new ScrapeError(
      'openSession',
      'Could not find VIEWSTATE/EVENTVALIDATION — the page layout may have changed.',
    );
  }
  return {
    cookies: r.cookies,
    viewState: vs,
    viewStateGenerator: vsGen,
    eventValidation: ev,
  };
}

async function selectDistrict(
  session: Session,
  districtCode: number,
): Promise<Session & { raw: string }> {
  const form = new URLSearchParams();
  form.set('__EVENTTARGET', FIELD_DISTRICT);
  form.set('__EVENTARGUMENT', '');
  form.set('__LASTFOCUS', '');
  form.set('__VIEWSTATE', session.viewState);
  form.set('__VIEWSTATEGENERATOR', session.viewStateGenerator);
  form.set('__EVENTVALIDATION', session.eventValidation);
  form.set(FIELD_DISTRICT, String(districtCode));
  form.set(FIELD_AC, 'Select Vidhan Sabha');

  const r = await doFetch(ROLLPDF_URL, {
    method: 'POST',
    body: form.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    cookies: session.cookies,
  });
  if (r.status !== 200) {
    throw new ScrapeError('selectDistrict', `HTTP ${r.status} on district postback`);
  }
  const vs = extractHiddenField(r.body, '__VIEWSTATE');
  const vsGen = extractHiddenField(r.body, '__VIEWSTATEGENERATOR');
  const ev = extractHiddenField(r.body, '__EVENTVALIDATION');
  if (!vs || !vsGen || !ev) {
    throw new ScrapeError(
      'selectDistrict',
      'Missing hidden fields after district postback.',
    );
  }
  return {
    cookies: r.cookies,
    viewState: vs,
    viewStateGenerator: vsGen,
    eventValidation: ev,
    raw: r.body,
  };
}

async function selectAcAndDownload(
  session: Session,
  acNumber: number,
): Promise<Buffer> {
  const form = new URLSearchParams();
  form.set('__EVENTTARGET', FIELD_AC);
  form.set('__EVENTARGUMENT', '');
  form.set('__VIEWSTATE', session.viewState);
  form.set('__VIEWSTATEGENERATOR', session.viewStateGenerator);
  form.set('__EVENTVALIDATION', session.eventValidation);
  form.set(FIELD_AC, String(acNumber));

  const r = await doFetch(ROLLPDF_URL, {
    method: 'POST',
    body: form.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    cookies: session.cookies,
  });
  if (r.status !== 200) {
    throw new ScrapeError('selectAc', `HTTP ${r.status} on AC postback`);
  }

  // The response either (a) streams a PDF directly, or (b) renders a page
  // that contains an iframe/link pointing at the actual PDF URL.  We detect
  // (a) by checking the buffer's magic number.
  if (r.bodyBuffer.subarray(0, 4).toString('ascii') === '%PDF') {
    return r.bodyBuffer;
  }

  // Fall back to (b): look for a PDF URL in the rendered HTML.
  const pdfMatch =
    r.body.match(/href="([^"]+\.pdf[^"]*)"/i) ||
    r.body.match(/src="([^"]+\.pdf[^"]*)"/i);
  if (!pdfMatch) {
    throw new ScrapeError(
      'downloadPdf',
      'No PDF in response. Likely the AC has no draft roll published yet, or the page layout changed.',
      r.body.slice(0, 800),
    );
  }
  const pdfUrl = new URL(pdfMatch[1], BASE).toString();
  const pdfRes = await doFetch(pdfUrl, { method: 'GET', cookies: r.cookies });
  if (pdfRes.status !== 200) {
    throw new ScrapeError('downloadPdf', `HTTP ${pdfRes.status} fetching ${pdfUrl}`);
  }
  if (pdfRes.bodyBuffer.subarray(0, 4).toString('ascii') !== '%PDF') {
    throw new ScrapeError(
      'downloadPdf',
      'Response was not a PDF (content-type mismatch or login wall).',
    );
  }
  return pdfRes.bodyBuffer;
}

export interface FetchAcPdfResult {
  pdf: Buffer;
  pdfUrl: string; // the rollpdf page URL (for provenance)
  bytes: number;
}

/**
 * High-level: given a CEO UP district code and AC number, return the raw
 * PDF bytes for that AC's current draft electoral roll.  The caller is
 * responsible for parsing the PDF and upserting polling stations.
 */
export async function fetchAcRollPdf(
  districtCode: number,
  acNumber: number,
): Promise<FetchAcPdfResult> {
  const s1 = await openSession();
  await sleep(REQUEST_DELAY_MS);
  const s2 = await selectDistrict(s1, districtCode);
  await sleep(REQUEST_DELAY_MS);
  const pdf = await selectAcAndDownload(s2, acNumber);
  return { pdf, pdfUrl: ROLLPDF_URL, bytes: pdf.length };
}

/** Canonical-name → CEO code helper for seed drivers. */
export function ceoCodeForCanonicalDistrict(canonical: string): number | null {
  const hit = CEO_DISTRICT_CODES.find((d) => d.canonical === canonical);
  return hit ? hit.code : null;
}
