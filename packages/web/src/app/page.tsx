'use client';

/**
 * Pollistics — public landing page.
 *
 * Editorial / newsroom design translated from the index.html prototype in
 * the design handoff.  Three themes are supported via CSS variables, all
 * scoped to the `.pollistics-landing` wrapper so the rest of the admin
 * surface stays untouched.  Default theme is `broadcast` (dark charcoal).
 *
 * Sections, in order:
 *   1. TopBar
 *   2. LiveTicker
 *   3. Hero (with live tally HeroTile)
 *   4. LokSabhaSnapshot (party board + SeatArc + Treemap)
 *   5. HexMap (India hex cartogram + state spotlight)
 *   6. HistoricalTrend (every Lok Sabha 1952 → 2024)
 *   7. BriefsAndBoard (editorial briefs + state-assembly board + signup)
 *   8. ToolsBento (Swing demo, Close contests, YouPredict, API, etc.)
 *   9. Coverage (data coverage + cited-by row)
 *  10. Footer (4-column links, "Try free" / "Talk to us" CTAs)
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageSkeleton, useHydrated } from '@/components/landing/PageSkeleton';
import IndiaGeoMap from '@/components/IndiaGeoMap';

type ThemeKey = 'broadcast' | 'studio' | 'signal';

/* ──────────────────────────────────────────────────────────────────── */
/* DATA                                                                  */
/* ──────────────────────────────────────────────────────────────────── */

interface Alliance {
  id: string;
  name: string;
  seats: number;
  change: number;
  color: string;
  lead: string;
}
interface Party {
  abbr: string;
  name: string;
  seats: number;
  voteShare: number;
  change: number;
  color: string;
}
interface HexState {
  code: string;
  name: string;
  seats: number;
  q: number;
  r: number;
  party: string;
}

const LS2024_ALLIANCES: Alliance[] = [
  { id: 'nda', name: 'NDA', seats: 293, change: -60, color: 'var(--saffron)', lead: 'BJP' },
  { id: 'india', name: 'I.N.D.I.A.', seats: 234, change: 92, color: 'var(--ink-blue)', lead: 'INC' },
  { id: 'oth', name: 'Others', seats: 16, change: -32, color: 'var(--muted-ink)', lead: '—' },
];

const LS2024_PARTIES: Party[] = [
  { abbr: 'BJP', name: 'Bharatiya Janata Party', seats: 240, voteShare: 36.56, change: -63, color: '#e8731c' },
  { abbr: 'INC', name: 'Indian National Congress', seats: 99, voteShare: 21.19, change: 47, color: '#1b66c9' },
  { abbr: 'SP', name: 'Samajwadi Party', seats: 37, voteShare: 4.58, change: 34, color: '#c8232c' },
  { abbr: 'TMC', name: 'All India Trinamool Congress', seats: 29, voteShare: 4.37, change: 7, color: '#1d8a5b' },
  { abbr: 'DMK', name: 'Dravida Munnetra Kazhagam', seats: 22, voteShare: 1.83, change: -2, color: '#1a1a1a' },
  { abbr: 'TDP', name: 'Telugu Desam Party', seats: 16, voteShare: 1.97, change: 13, color: '#e7b32a' },
  { abbr: 'JD(U)', name: 'Janata Dal (United)', seats: 12, voteShare: 0.92, change: -4, color: '#46a058' },
  { abbr: 'SHS(UBT)', name: 'Shiv Sena (UBT)', seats: 9, voteShare: 0.82, change: 9, color: '#d4641c' },
  { abbr: 'NCP(SP)', name: 'NCP (Sharadchandra Pawar)', seats: 8, voteShare: 1.55, change: 8, color: '#2d7d4e' },
  { abbr: 'SHS', name: 'Shiv Sena', seats: 7, voteShare: 0.74, change: 7, color: '#d4641c' },
  { abbr: 'LJP(RV)', name: 'LJP (Ram Vilas)', seats: 5, voteShare: 0.49, change: 5, color: '#6b3aa3' },
  { abbr: 'YSRCP', name: 'YSR Congress Party', seats: 4, voteShare: 2.04, change: -18, color: '#1b8a8a' },
];

const HEX_STATES: HexState[] = [
  { code: 'LA', name: 'Ladakh', seats: 1, q: 5, r: -5, party: 'BJP' },
  { code: 'JK', name: 'Jammu & Kashmir', seats: 5, q: 4, r: -5, party: 'MIX' },
  { code: 'PB', name: 'Punjab', seats: 13, q: 3, r: -4, party: 'INC' },
  { code: 'HP', name: 'Himachal Pradesh', seats: 4, q: 4, r: -4, party: 'BJP' },
  { code: 'UT', name: 'Uttarakhand', seats: 5, q: 5, r: -4, party: 'BJP' },
  { code: 'CH', name: 'Chandigarh', seats: 1, q: 3, r: -3, party: 'INC' },
  { code: 'HR', name: 'Haryana', seats: 10, q: 4, r: -3, party: 'MIX' },
  { code: 'DL', name: 'Delhi', seats: 7, q: 5, r: -3, party: 'BJP' },
  { code: 'UP', name: 'Uttar Pradesh', seats: 80, q: 6, r: -3, party: 'SP' },
  { code: 'SK', name: 'Sikkim', seats: 1, q: 8, r: -3, party: 'OTH' },
  { code: 'AR', name: 'Arunachal Pradesh', seats: 2, q: 9, r: -3, party: 'BJP' },
  { code: 'RJ', name: 'Rajasthan', seats: 25, q: 3, r: -2, party: 'MIX' },
  { code: 'MP', name: 'Madhya Pradesh', seats: 29, q: 5, r: -2, party: 'BJP' },
  { code: 'BR', name: 'Bihar', seats: 40, q: 7, r: -2, party: 'MIX' },
  { code: 'JH', name: 'Jharkhand', seats: 14, q: 8, r: -2, party: 'MIX' },
  { code: 'WB', name: 'West Bengal', seats: 42, q: 9, r: -2, party: 'TMC' },
  { code: 'AS', name: 'Assam', seats: 14, q: 10, r: -2, party: 'BJP' },
  { code: 'NG', name: 'Nagaland', seats: 1, q: 11, r: -3, party: 'INC' },
  { code: 'ML', name: 'Meghalaya', seats: 2, q: 10, r: -3, party: 'INC' },
  { code: 'MN', name: 'Manipur', seats: 2, q: 11, r: -2, party: 'INC' },
  { code: 'MZ', name: 'Mizoram', seats: 1, q: 11, r: -1, party: 'OTH' },
  { code: 'TR', name: 'Tripura', seats: 2, q: 10, r: -1, party: 'BJP' },
  { code: 'GJ', name: 'Gujarat', seats: 26, q: 3, r: -1, party: 'BJP' },
  { code: 'MH', name: 'Maharashtra', seats: 48, q: 4, r: 0, party: 'MIX' },
  { code: 'CG', name: 'Chhattisgarh', seats: 11, q: 6, r: -1, party: 'BJP' },
  { code: 'OD', name: 'Odisha', seats: 21, q: 8, r: -1, party: 'BJP' },
  { code: 'TG', name: 'Telangana', seats: 17, q: 5, r: 1, party: 'MIX' },
  { code: 'AP', name: 'Andhra Pradesh', seats: 25, q: 6, r: 1, party: 'TDP' },
  { code: 'GA', name: 'Goa', seats: 2, q: 3, r: 1, party: 'BJP' },
  { code: 'KA', name: 'Karnataka', seats: 28, q: 4, r: 2, party: 'MIX' },
  { code: 'PY', name: 'Puducherry', seats: 1, q: 5, r: 3, party: 'INC' },
  { code: 'KL', name: 'Kerala', seats: 20, q: 4, r: 3, party: 'INC' },
  { code: 'TN', name: 'Tamil Nadu', seats: 39, q: 5, r: 2, party: 'DMK' },
  { code: 'AN', name: 'A & N Islands', seats: 1, q: 9, r: 1, party: 'INC' },
  { code: 'LD', name: 'Lakshadweep', seats: 1, q: 3, r: 2, party: 'INC' },
];

const HISTORY = [
  { year: 1952, lead: 'INC', leadSeats: 364, total: 489 },
  { year: 1957, lead: 'INC', leadSeats: 371, total: 494 },
  { year: 1962, lead: 'INC', leadSeats: 361, total: 494 },
  { year: 1967, lead: 'INC', leadSeats: 283, total: 520 },
  { year: 1971, lead: 'INC', leadSeats: 352, total: 518 },
  { year: 1977, lead: 'JNP', leadSeats: 295, total: 542 },
  { year: 1980, lead: 'INC', leadSeats: 353, total: 529 },
  { year: 1984, lead: 'INC', leadSeats: 414, total: 514 },
  { year: 1989, lead: 'INC', leadSeats: 197, total: 529 },
  { year: 1991, lead: 'INC', leadSeats: 244, total: 521 },
  { year: 1996, lead: 'BJP', leadSeats: 161, total: 543 },
  { year: 1998, lead: 'BJP', leadSeats: 182, total: 543 },
  { year: 1999, lead: 'BJP', leadSeats: 182, total: 543 },
  { year: 2004, lead: 'INC', leadSeats: 145, total: 543 },
  { year: 2009, lead: 'INC', leadSeats: 206, total: 543 },
  { year: 2014, lead: 'BJP', leadSeats: 282, total: 543 },
  { year: 2019, lead: 'BJP', leadSeats: 303, total: 543 },
  { year: 2024, lead: 'BJP', leadSeats: 240, total: 543 },
];

const BRIEFS = [
  {
    kicker: 'Swing analysis',
    title: 'Uttar Pradesh: 37 seats flip on a 4-point swing',
    meta: 'Updated 12 hrs ago · Election Desk',
  },
  {
    kicker: 'Close contest',
    title: 'Mumbai North West decided by 48 votes — the narrowest margin of 2024',
    meta: 'Updated yesterday · Maharashtra Bureau',
  },
  {
    kicker: 'Alliance maths',
    title: "Inside NDA's coalition arithmetic: where TDP and JD(U) tip the balance",
    meta: 'Long read · 9 min',
  },
];

const STATE_BOARD = [
  { state: 'Maharashtra', date: 'Nov 2024', status: 'RESULT' as const, lead: 'Mahayuti', seats: '230 / 288' },
  { state: 'Jharkhand', date: 'Nov 2024', status: 'RESULT' as const, lead: 'JMM+', seats: '56 / 81' },
  { state: 'Haryana', date: 'Oct 2024', status: 'RESULT' as const, lead: 'BJP', seats: '48 / 90' },
  { state: 'J & K', date: 'Oct 2024', status: 'RESULT' as const, lead: 'NC+INC', seats: '48 / 90' },
  { state: 'Delhi', date: 'Feb 2025', status: 'UPCOMING' as const, lead: '—', seats: '70' },
  { state: 'Bihar', date: 'Oct 2025', status: 'UPCOMING' as const, lead: '—', seats: '243' },
];

const TICKER = [
  { tag: 'INDEX', text: 'Pollistics Mood Index 47.2', delta: '+0.6', up: false },
  { tag: 'BYE-POLL', text: 'Wayanad LS bypoll', delta: 'INC +4.1%', up: true },
  { tag: 'POLL', text: 'Bihar pre-poll wave 3', delta: 'NDA 42% · MGB 39%', up: null },
  { tag: 'ARCHIVE', text: '1977 Lok Sabha data added', delta: '+542 records', up: true },
  { tag: 'TURNOUT', text: 'Maharashtra 2024', delta: '66.05%', up: true },
  { tag: 'API', text: 'Constituency endpoint v2', delta: 'live', up: null },
  { tag: 'MAP', text: 'Delimitation 2026 preview', delta: 'beta', up: null },
] as const;

const NAV = [
  ['Home', '/', true],
  ['About', '/about', false],
  ['Search', '/search', false],
  ['Explore', '/explore-public', false],
  ['Summary', '#summary', false],
  ['Report', '/report', false],
  ['App', '/download', false],
] as const;

const partyColor = (p: string) =>
  ({
    BJP: 'var(--saffron)',
    INC: 'var(--ink-blue)',
    SP: '#c8232c',
    TMC: 'var(--grass)',
    DMK: 'var(--ink)',
    TDP: 'var(--gold)',
    MIX: 'var(--accent)',
    OTH: 'var(--muted-ink)',
  })[p] || 'var(--muted-ink)';

/* ──────────────────────────────────────────────────────────────────── */
/* PAGE                                                                  */
/* ──────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  // Locked to the light "Studio" palette — the in-header theme switcher
  // was removed per product feedback (kept as a constant so the
  // theme-scoped CSS variables still resolve).
  const theme: ThemeKey = 'studio';
  // Show a shimmer skeleton on first render (server HTML + initial
  // hydration) and only paint the heavy editorial page once the client
  // has mounted.  Stops the brief flash of unstyled content people see
  // on a hard refresh.
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton variant="landing" theme={theme} />;

  return (
    <div className={`pollistics-landing theme-${theme}`}>
      <TopBar />
      <LiveTicker />
      <Hero />
      <LokSabhaSnapshot />
      <InteractiveIndiaMap />
      <HistoricalTrend />
      <BriefsAndBoard />
      <ToolsBento />
      <Coverage />
      <Footer />
      <ThemeStyles />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* TOP BAR                                                              */
/* ──────────────────────────────────────────────────────────────────── */

function TopBar() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Lock body scroll while the drawer is open so the underlying page
  // doesn't jiggle behind the overlay on mobile Safari.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    if (drawerOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <header className="pl-header">
      <div className="pl-page pl-header-inner">
        <PollisticsMark />
        <nav className="pl-nav">
          {NAV.map(([label, href, active], i) => {
            const isInternal = (href as string).startsWith('/');
            const cls = `pl-nav-item ${active ? 'pl-nav-active' : ''}`;
            return isInternal ? (
              <Link key={i} href={href as string} className={cls}>{label as string}</Link>
            ) : (
              <a key={i} href={href as string} className={cls}>{label as string}</a>
            );
          })}
        </nav>
        <div className="pl-header-cta">
          <Link href="/login" className="pl-btn-solid pl-header-signin">
            Sign in
          </Link>
          <button
            type="button"
            className="pl-burger"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}>
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`pl-drawer-overlay ${drawerOpen ? 'pl-drawer-open' : ''}`}
        onClick={closeDrawer}
        aria-hidden={!drawerOpen}
      />
      <aside
        className={`pl-drawer ${drawerOpen ? 'pl-drawer-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!drawerOpen}>
        <div className="pl-drawer-head">
          <PollisticsMark size={26} />
          <button
            type="button"
            className="pl-drawer-close"
            aria-label="Close menu"
            onClick={closeDrawer}>
            ×
          </button>
        </div>
        <nav className="pl-drawer-nav">
          {NAV.map(([label, href, active], i) => {
            const isInternal = (href as string).startsWith('/');
            const cls = `pl-drawer-item ${active ? 'pl-drawer-item-active' : ''}`;
            return isInternal ? (
              <Link key={i} href={href as string} className={cls} onClick={closeDrawer}>
                {label as string}
              </Link>
            ) : (
              <a key={i} href={href as string} className={cls} onClick={closeDrawer}>
                {label as string}
              </a>
            );
          })}
        </nav>
        <div className="pl-drawer-foot">
          <Link href="/login" className="pl-btn-solid pl-btn-lg" onClick={closeDrawer}>
            Sign in
          </Link>
        </div>
      </aside>
    </header>
  );
}

function PollisticsMark({ size = 28 }: { size?: number }) {
  return (
    <span className="pl-mark">
      {/* Real brand PNG instead of a synthetic "P" — file lives in
          packages/web/public/pollistics-logo.png so Next serves it at
          /pollistics-logo.png. */}
      <img
        src="/pollistics-logo.png"
        alt="Pollistics"
        width={size}
        height={size}
        className="pl-mark-img"
        style={{ width: size, height: size }}
      />
      <span className="pl-mark-name">Pollistics</span>
      <span className="pl-mark-meta">India · est. 2024</span>
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* LIVE TICKER                                                          */
/* ──────────────────────────────────────────────────────────────────── */

function LiveTicker() {
  const loop = useMemo(() => [...TICKER, ...TICKER, ...TICKER], []);
  return (
    <div className="pl-ticker">
      <div className="pl-page pl-ticker-inner">
        <div className="pl-ticker-label">
          <span className="pl-live-dot" />
          <span className="pl-mono pl-ticker-text">LIVE WIRE</span>
        </div>
        <div className="pl-ticker-track-mask">
          <div className="pl-ticker-track">
            {loop.map((t, i) => (
              <span key={i} className="pl-ticker-item">
                <span className="pl-chip">{t.tag}</span>
                <span>{t.text}</span>
                <span
                  className="pl-mono pl-ticker-delta"
                  style={{
                    color:
                      t.up === true
                        ? 'var(--grass)'
                        : t.up === false
                          ? 'var(--accent)'
                          : 'var(--muted-ink)',
                  }}>
                  {t.up === true ? '▲ ' : t.up === false ? '▼ ' : '· '}
                  {t.delta}
                </span>
              </span>
            ))}
          </div>
        </div>
        <span className="pl-mono pl-ticker-date">
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · IST
        </span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* HERO                                                                 */
/* ──────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="pl-page pl-hero">
      <div className="pl-hero-meta">
        <span className="pl-kicker">Election Intelligence · Vol. III · No. 11</span>
        <span className="pl-mono pl-hero-cities">New Delhi · Mumbai · Bengaluru</span>
      </div>
      <div className="pl-hero-grid">
        <div className="pl-hero-text">
          <h1 className="pl-serif pl-hero-headline">
            India&apos;s election
            <br />
            data, <em className="pl-serif-it pl-accent">read closely</em>.
          </h1>
          <p className="pl-serif pl-hero-lede">
            Seventeen general elections. Three hundred state polls. Eighty-four crore voters.
            Pollistics is the most complete, queryable record of how India votes — built for
            journalists, analysts and campaign rooms who need the answer before the press conference.
          </p>
          <div className="pl-hero-cta">
            <Link href="/dashboard" className="pl-btn-solid pl-btn-lg">
              Open the 2024 dashboard →
            </Link>
            <a href="#archive" className="pl-btn-ghost pl-btn-lg">
              Browse the archive
            </a>
            <span className="pl-mono pl-hero-cta-meta">Free · No paywall on raw data</span>
          </div>
        </div>
        <HeroTile />
      </div>
    </section>
  );
}

function HeroTile() {
  const total = 543;
  const majorityX = (272 / total) * 100;
  return (
    <div className="pl-card pl-hero-tile">
      <div className="pl-tile-header">
        <div>
          <div className="pl-kicker">LIVE · Lok Sabha 18 · final</div>
          <div className="pl-serif pl-tile-title">General Election 2024</div>
          <div className="pl-tile-sub">All {total} seats declared · 7 phases · Apr 19 – Jun 1</div>
        </div>
        <div className="pl-tile-voters">
          <div className="pl-mono pl-tnum pl-tile-voters-label">VOTERS</div>
          <div className="pl-serif pl-tnum pl-tile-voters-value">64.2cr</div>
          <div className="pl-mono pl-tnum pl-tile-turnout">▲ 65.79% turnout</div>
        </div>
      </div>
      <div className="pl-seat-strip-wrap">
        <div className="pl-seat-strip">
          {LS2024_ALLIANCES.map((s, i) => (
            <div
              key={s.id}
              className="pl-seat-seg"
              style={{
                flex: s.seats,
                background: s.color,
                color: i === 2 ? 'var(--ink)' : '#fff',
                borderRight:
                  i < LS2024_ALLIANCES.length - 1 ? '1px solid rgba(255,255,255,.35)' : '0',
              }}>
              <div style={{ textAlign: 'center', padding: '0 6px' }}>
                <div className="pl-mono pl-seat-name">{s.name}</div>
                <div className="pl-serif pl-tnum pl-seat-count">{s.seats}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="pl-majority-line" style={{ left: `${majorityX}%` }} />
        <div className="pl-majority-label" style={{ left: `${majorityX}%` }}>
          ▼ Majority · 272
        </div>
      </div>
      <div className="pl-tile-kpis">
        {[
          { k: 'Largest party', v: 'BJP', s: '240 seats · 36.6% vote', t: 'var(--saffron)' },
          { k: 'Largest gain', v: 'INC', s: '+47 seats · 21.2% vote', t: 'var(--ink-blue)' },
          { k: 'Govt. formation', v: 'NDA', s: 'Modi 3.0 · 9 Jun 2024', t: 'var(--accent)' },
        ].map((k, i) => (
          <div
            key={i}
            className="pl-tile-kpi"
            style={{ paddingLeft: i ? 14 : 0, borderLeft: i ? '1px solid var(--rule)' : '0' }}>
            <div className="pl-mono pl-tile-kpi-label">{k.k}</div>
            <div className="pl-tile-kpi-row">
              <span className="pl-serif pl-tile-kpi-value" style={{ color: k.t }}>
                {k.v}
              </span>
              <span className="pl-tile-kpi-sub">{k.s}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="pl-mono pl-tile-watermark">SRC: ECI · POLLISTICS DATA DESK</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* SECTION HEADER                                                       */
/* ──────────────────────────────────────────────────────────────────── */

function SectionHead({
  kicker,
  title,
  subtitle,
  link = 'View all →',
}: {
  kicker: string;
  title: string;
  subtitle?: string | null;
  link?: string | null;
}) {
  return (
    <div className="pl-section-head">
      <div className="pl-thick-rule" />
      <div className="pl-section-head-row">
        <div>
          <div className="pl-kicker">{kicker}</div>
          <h2 className="pl-serif pl-section-title">{title}</h2>
          {subtitle && <p className="pl-section-sub">{subtitle}</p>}
        </div>
        {link && (
          <a href="#" className="pl-section-link">
            {link}
          </a>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* LOK SABHA SNAPSHOT                                                   */
/* ──────────────────────────────────────────────────────────────────── */

function LokSabhaSnapshot() {
  return (
    <section className="pl-page pl-section">
      <SectionHead
        kicker="Lok Sabha 2024 · the result, broken down"
        title="A two-act verdict: a coalition returns, an opposition reanimates."
        subtitle="The full distribution of seats and vote share by party, with change from 2019. Tap any row to open the party page."
      />
      <div className="pl-snapshot-grid">
        {/* Party board */}
        <div className="pl-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="pl-party-row pl-party-head">
            {['', 'Party', 'Seats', 'Vote share', 'Δ vs ’19', ''].map((h, i) => (
              <div key={i} className="pl-mono pl-party-head-cell">
                {h}
              </div>
            ))}
          </div>
          {LS2024_PARTIES.map((p, i) => (
            <div
              key={p.abbr}
              className="pl-party-row"
              style={{
                borderBottom: i === LS2024_PARTIES.length - 1 ? 0 : '1px solid var(--rule)',
              }}>
              <div style={{ width: 14, height: 14, background: p.color, borderRadius: 2 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.abbr}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted-ink)' }}>{p.name}</div>
              </div>
              <div className="pl-serif pl-tnum" style={{ fontSize: 22, lineHeight: 1 }}>
                {p.seats}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="pl-vote-bar">
                  <div
                    style={{ width: `${(p.voteShare / 40) * 100}%`, height: '100%', background: p.color }}
                  />
                </div>
                <span
                  className="pl-mono pl-tnum"
                  style={{ fontSize: 11.5, color: 'var(--ink-soft)', width: 44, textAlign: 'right' }}>
                  {p.voteShare.toFixed(2)}%
                </span>
              </div>
              <div
                className="pl-mono pl-tnum"
                style={{
                  fontSize: 12,
                  color: p.change >= 0 ? 'var(--grass)' : 'var(--accent)',
                  fontWeight: 600,
                }}>
                {p.change >= 0 ? '+' : ''}
                {p.change}
              </div>
              <div style={{ textAlign: 'right' }}>
                <a
                  className="pl-mono"
                  href="#"
                  style={{ fontSize: 10, color: 'var(--muted-ink)', letterSpacing: '.1em' }}>
                  OPEN →
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Right: arc + treemap */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="pl-card pl-hoverlift" style={{ padding: 22 }}>
            <div className="pl-kicker pl-kicker-muted">Composition of the 18th Lok Sabha</div>
            <div className="pl-serif" style={{ fontSize: 22, fontWeight: 420, marginTop: 4 }}>
              NDA returns, INC doubles.
            </div>
            <SeatArc />
            <div className="pl-arc-legend">
              {LS2024_ALLIANCES.map((a) => (
                <div key={a.id} style={{ flex: 1, paddingLeft: 10, borderLeft: `3px solid ${a.color}` }}>
                  <div className="pl-mono" style={{ fontSize: 10, color: 'var(--muted-ink)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                    {a.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                    <span className="pl-serif pl-tnum" style={{ fontSize: 28, lineHeight: 1, fontWeight: 500 }}>
                      {a.seats}
                    </span>
                    <span
                      className="pl-mono pl-tnum"
                      style={{ fontSize: 11, color: a.change >= 0 ? 'var(--grass)' : 'var(--accent)' }}>
                      {a.change >= 0 ? '+' : ''}
                      {a.change}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted-ink)', marginTop: 2 }}>led by {a.lead}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="pl-card pl-hoverlift" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="pl-kicker pl-kicker-muted">National vote share — 2024</div>
              <span className="pl-mono" style={{ fontSize: 10.5, color: 'var(--muted-ink)' }}>
                top 12 parties · 76.96% of total
              </span>
            </div>
            <Treemap />
          </div>
        </div>
      </div>
    </section>
  );
}

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function SeatArc() {
  const data = LS2024_ALLIANCES;
  const total = data.reduce((s, d) => s + d.seats, 0);
  const W = 380, H = 150, cx = W / 2, cy = H - 12, R = 130, r = 78;
  let a0 = Math.PI;
  const arcs = data.map((d) => {
    const span = (d.seats / total) * Math.PI;
    const a1 = a0 + span;
    const p0 = polar(cx, cy, R, a0), p1 = polar(cx, cy, R, a1);
    const p2 = polar(cx, cy, r, a1), p3 = polar(cx, cy, r, a0);
    const large = span > Math.PI ? 1 : 0;
    const d_ = `M${p0.x} ${p0.y} A${R} ${R} 0 ${large} 1 ${p1.x} ${p1.y} L${p2.x} ${p2.y} A${r} ${r} 0 ${large} 0 ${p3.x} ${p3.y} Z`;
    a0 = a1;
    return { d: d_, fill: d.color, id: d.id };
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', marginTop: 8 }}>
      {arcs.map((a) => (
        <path key={a.id} d={a.d} fill={a.fill} stroke="var(--paper)" strokeWidth="1.5" />
      ))}
      <text
        x={cx}
        y={cy - 56}
        textAnchor="middle"
        style={{ fontSize: 36, fill: 'var(--ink)', fontWeight: 500, fontFamily: 'var(--font-newsreader)' }}>
        {total}
      </text>
      <text
        x={cx}
        y={cy - 36}
        textAnchor="middle"
        style={{ fontSize: 10, fill: 'var(--muted-ink)', letterSpacing: '.15em', fontFamily: 'var(--font-jetbrains)' }}>
        SEATS · MAJ 272
      </text>
      <line x1={cx} y1={cy - r - 6} x2={cx} y2={cy - R - 6} stroke="var(--ink)" strokeWidth="1" strokeDasharray="3 3" />
    </svg>
  );
}

function Treemap() {
  const parties = LS2024_PARTIES;
  const total = parties.reduce((s, p) => s + p.voteShare, 0);
  const rows: Party[][] = [[], []];
  let rIdx = 0, rTot = 0;
  parties.forEach((p) => {
    rows[rIdx].push(p);
    rTot += p.voteShare;
    if (rTot > total * 0.55 && rIdx === 0) {
      rIdx = 1;
      rTot = 0;
    }
  });
  return (
    <div className="pl-treemap">
      {rows.map((row, i) => (
        <div key={i} className="pl-treemap-row">
          {row.map((p) => (
            <div
              key={p.abbr}
              className="pl-treemap-cell"
              style={{ flex: p.voteShare, background: p.color }}>
              <div className="pl-mono pl-treemap-abbr">{p.abbr}</div>
              <div className="pl-serif pl-tnum pl-treemap-share">
                {p.voteShare.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* HEX MAP                                                              */
/* ──────────────────────────────────────────────────────────────────── */

const HEX_TOGGLES = [
  ['LS24', 'Lok Sabha 2024'],
  ['LS19', 'Lok Sabha 2019'],
  ['VS', 'State assemblies'],
  ['SWING', 'Swing map'],
] as const;

function HexMap() {
  const states = HEX_STATES;
  const [hover, setHover] = useState<HexState | null>(null);
  const [active, setActive] = useState<string>('LS24');

  const size = 30;
  const W = Math.sqrt(3) * size;
  const H = 2 * size;
  const rowH = H * 0.75;
  const cells = states.map((s) => {
    const x = (s.q - 3) * W + (s.r % 2 ? W / 2 : 0);
    const y = s.r * rowH;
    return { ...s, x, y };
  });
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  const minX = Math.min(...xs) - W, maxX = Math.max(...xs) + W;
  const minY = Math.min(...ys) - H / 1.5, maxY = Math.max(...ys) + H / 1.5;

  const hexPath = (cx: number, cy: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      pts.push(`${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`);
    }
    return `M${pts.join(' L')} Z`;
  };

  return (
    <section className="pl-page pl-section">
      <SectionHead
        kicker="Geography of the vote"
        title="One nation, twenty-eight verdicts — mapped."
        subtitle="A hex cartogram weighting each state by seat count rather than land area, so Uttar Pradesh isn't lost in the deserts of Rajasthan. Toggle elections to compare."
        link={null}
      />
      <div className="pl-card pl-hex-card">
        <div>
          <div className="pl-hex-toggles">
            {HEX_TOGGLES.map(([k, l]) => (
              <button
                key={k}
                onClick={() => setActive(k)}
                className={`pl-hex-toggle ${active === k ? 'pl-hex-toggle-active' : ''}`}>
                {l}
              </button>
            ))}
          </div>
          <svg
            viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
            width="100%"
            style={{ display: 'block', maxHeight: 540 }}>
            <defs>
              <pattern id="dot" width="6" height="6" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="0.6" fill="var(--rule)" />
              </pattern>
            </defs>
            <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="url(#dot)" opacity="0.5" />
            {cells.map((c) => {
              const fill = partyColor(c.party);
              const isHover = hover?.code === c.code;
              return (
                <g
                  key={c.code}
                  onMouseEnter={() => setHover(c)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'pointer' }}>
                  <path
                    d={hexPath(c.x, c.y)}
                    fill={fill}
                    stroke={isHover ? 'var(--ink)' : 'var(--paper)'}
                    strokeWidth={isHover ? 2 : 1.2}
                    opacity={hover && !isHover ? 0.6 : 1}
                  />
                  <text
                    x={c.x}
                    y={c.y - 2}
                    textAnchor="middle"
                    style={{
                      fontSize: 9.5,
                      fill: '#fff',
                      fontWeight: 700,
                      letterSpacing: '.04em',
                      pointerEvents: 'none',
                      fontFamily: 'var(--font-jetbrains)',
                    }}>
                    {c.code}
                  </text>
                  <text
                    x={c.x}
                    y={c.y + 9}
                    textAnchor="middle"
                    style={{
                      fontSize: 11,
                      fill: '#fff',
                      fontWeight: 600,
                      pointerEvents: 'none',
                      fontFamily: 'var(--font-newsreader)',
                    }}>
                    {c.seats}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="pl-hex-legend">
            {[
              ['BJP', 'BJP'],
              ['INC', 'Congress'],
              ['SP', 'SP'],
              ['TMC', 'TMC'],
              ['DMK', 'DMK'],
              ['TDP', 'TDP'],
              ['MIX', 'Split / Coalition'],
              ['OTH', 'Regional / Other'],
            ].map(([k, l]) => (
              <span key={k} className="pl-hex-legend-item">
                <span className="pl-dot" style={{ background: partyColor(k) }} /> {l}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="pl-kicker pl-kicker-muted">{hover ? 'State spotlight' : 'Hover the map'}</div>
          {hover ? (
            <StateCard s={hover} />
          ) : (
            <div className="pl-card-tight" style={{ padding: 22 }}>
              <div className="pl-serif" style={{ fontSize: 22, lineHeight: 1.15 }}>
                Move the cursor over a hex to read a state&apos;s verdict, turnout and the three closest contests.
              </div>
              <div style={{ marginTop: 14, color: 'var(--muted-ink)', fontSize: 13 }}>
                Every hex is sized by seats, not square kilometres. The colour shows the leading party — split
                colours where no party crossed 40% of seats.
              </div>
            </div>
          )}
          <div className="pl-hex-stats">
            {[
              ['States polled', '28 + 8 UTs'],
              ['Constituencies', '543'],
              ['Voters', '64.2 cr'],
              ['Turnout', '65.79 %'],
              ['Women voters', '31.2 cr'],
              ['NOTA', '0.99 %'],
            ].map(([k, v]) => (
              <div key={k} className="pl-hex-stat">
                <div className="pl-mono pl-hex-stat-k">{k}</div>
                <div className="pl-serif pl-tnum pl-hex-stat-v">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* INTERACTIVE INDIA MAP                                                */
/* Self-contained replacement for the old HexMap section.  The previous */
/* HexMap on the landing had hover wired but its dataset toggles        */
/* (LS 2024 / LS 2019 / State assemblies / Swing map) didn't actually   */
/* swap the data — they just changed an `active` button class. The new  */
/* `IndiaHexMap` keeps the same Hover-the-map UX the screenshot showed  */
/* and additionally re-paints the hexes when you click a tab.           */
/* ──────────────────────────────────────────────────────────────────── */
function InteractiveIndiaMap() {
  return (
    <section className="pl-page pl-section">
      <SectionHead
        kicker="Geography of the vote"
        title="One nation, twenty-eight verdicts — mapped."
        subtitle="A real territorial map, every state coloured by its leading party. Hover any state to read its verdict, turnout and the three closest contests."
        link={null}
      />
      <IndiaGeoMap />
    </section>
  );
}

function StateCard({ s }: { s: HexState }) {
  const turnout = (58 + (s.seats % 17)).toFixed(2);
  const closest = [
    { c: s.code + '-12 · Capital North', m: '1,284 votes', w: s.party === 'MIX' ? 'INC' : s.party },
    { c: s.code + '-08 · East Plains', m: '3,109 votes', w: 'Opposition' },
    { c: s.code + '-21 · River Belt', m: '5,402 votes', w: s.party === 'MIX' ? 'BJP' : s.party },
  ];
  return (
    <div className="pl-card-tight" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="pl-serif" style={{ fontSize: 24, fontWeight: 500 }}>
          {s.name}
        </div>
        <div className="pl-mono" style={{ fontSize: 10, color: 'var(--muted-ink)', letterSpacing: '.1em' }}>
          STATE · {s.code}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 12, marginBottom: 14 }}>
        {[
          ['Seats', String(s.seats), 'var(--ink)'],
          ['Leading', s.party, partyColor(s.party)],
          ['Turnout', `${turnout}%`, 'var(--ink)'],
        ].map(([k, v, c]) => (
          <div key={k}>
            <div className="pl-mono pl-state-k">{k}</div>
            <div className="pl-serif pl-tnum pl-state-v" style={{ color: c as string }}>
              {v}
            </div>
          </div>
        ))}
      </div>
      <div className="pl-mono pl-state-closest-h">Closest contests</div>
      {closest.map((c, i) => (
        <div key={i} className="pl-state-closest-row">
          <span>{c.c}</span>
          <span style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <span className="pl-mono pl-tnum" style={{ color: 'var(--muted-ink)' }}>
              {c.m}
            </span>
            <span style={{ fontWeight: 600 }}>{c.w}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* HISTORICAL TREND                                                     */
/* ──────────────────────────────────────────────────────────────────── */

function HistoricalTrend() {
  const hist = HISTORY;
  const W = 1100, H = 320;
  const pad = { l: 56, r: 24, t: 28, b: 36 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const maxSeats = 543;
  const xs = hist.map((_, i) => pad.l + (i / (hist.length - 1)) * innerW);
  const y = (v: number) => pad.t + (1 - v / maxSeats) * innerH;
  const histColor = (p: string) =>
    ({ INC: 'var(--ink-blue)', BJP: 'var(--saffron)', JNP: 'var(--gold)' })[p] || 'var(--muted-ink)';
  const bw = (innerW / (hist.length - 1)) * 0.55;

  return (
    <section className="pl-page pl-section">
      <SectionHead
        kicker="Seventeen elections, one chart"
        title="The biggest seat-share of every Lok Sabha, since 1952."
        subtitle="Each bar is the largest single party. Read the rhythm: Congress dominance, the 1977 break, coalition decades, and the BJP rebound."
        link="Download CSV →"
      />
      <div className="pl-card" style={{ padding: 24 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
          {[100, 200, 272, 350, 450].map((v) => (
            <g key={v}>
              <line
                x1={pad.l}
                x2={W - pad.r}
                y1={y(v)}
                y2={y(v)}
                stroke={v === 272 ? 'var(--ink)' : 'var(--rule)'}
                strokeDasharray={v === 272 ? '4 4' : '0'}
                strokeWidth="1"
                opacity={v === 272 ? 0.55 : 1}
              />
              <text
                x={pad.l - 8}
                y={y(v) + 3}
                textAnchor="end"
                style={{ fontSize: 10, fill: 'var(--muted-ink)', fontFamily: 'var(--font-jetbrains)' }}>
                {v}
                {v === 272 ? '  ⟵ majority' : ''}
              </text>
            </g>
          ))}
          {hist.map((h, i) => (
            <g key={h.year}>
              <rect
                x={xs[i] - bw / 2}
                y={y(h.leadSeats)}
                width={bw}
                height={H - pad.b - y(h.leadSeats)}
                fill={histColor(h.lead)}
                rx="1"
              />
              <rect
                x={xs[i] - bw / 2}
                y={y(h.total)}
                width={bw}
                height={H - pad.b - y(h.total)}
                fill="none"
                stroke="var(--rule-2)"
                strokeWidth="1"
                strokeDasharray="2 3"
                opacity=".5"
              />
              <text
                x={xs[i]}
                y={y(h.leadSeats) - 6}
                textAnchor="middle"
                style={{
                  fontSize: 9.5,
                  fill: 'var(--ink-soft)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-jetbrains)',
                }}>
                {h.leadSeats}
              </text>
              <text
                x={xs[i]}
                y={H - 14}
                textAnchor="middle"
                style={{
                  fontSize: 10,
                  fill: 'var(--muted-ink)',
                  letterSpacing: '.05em',
                  fontFamily: 'var(--font-jetbrains)',
                }}>
                ’{String(h.year).slice(-2)}
              </text>
              <text
                x={xs[i]}
                y={H - 2}
                textAnchor="middle"
                style={{
                  fontSize: 8.5,
                  fill: histColor(h.lead),
                  fontWeight: 700,
                  letterSpacing: '.08em',
                  fontFamily: 'var(--font-jetbrains)',
                }}>
                {h.lead}
              </text>
            </g>
          ))}
          <EraBracket x1={xs[0] - bw} x2={xs[4] + bw} y={pad.t + 4} label="Congress era · 1952–71" />
          <EraBracket x1={xs[5] - bw} x2={xs[10] - bw} y={pad.t + 4} label="Coalition decade · 1977–96" />
          <EraBracket x1={xs[10] - bw} x2={xs[xs.length - 1] + bw} y={pad.t + 4} label="BJP rise · 1996–2024" />
        </svg>
      </div>
    </section>
  );
}

function EraBracket({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g>
      <line x1={x1} x2={x2} y1={y} y2={y} stroke="var(--ink-soft)" strokeWidth="0.7" />
      <line x1={x1} y1={y} x2={x1} y2={y + 5} stroke="var(--ink-soft)" strokeWidth="0.7" />
      <line x1={x2} y1={y} x2={x2} y2={y + 5} stroke="var(--ink-soft)" strokeWidth="0.7" />
      <text
        x={(x1 + x2) / 2}
        y={y - 5}
        textAnchor="middle"
        style={{
          fontSize: 9.5,
          fill: 'var(--ink-soft)',
          letterSpacing: '.08em',
          fontFamily: 'var(--font-jetbrains)',
        }}>
        {label}
      </text>
    </g>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* BRIEFS + STATE BOARD                                                 */
/* ──────────────────────────────────────────────────────────────────── */

function BriefsAndBoard() {
  return (
    <section className="pl-page pl-section">
      <div className="pl-briefs-grid">
        <div>
          <SectionHead
            kicker="From the data desk"
            title="Sharp briefs on the numbers behind the news."
            subtitle={null}
            link="All analyses →"
          />
          <div>
            {BRIEFS.map((b, i) => (
              <a
                key={i}
                href="#"
                className="pl-brief-row pl-hoverlift"
                style={{
                  borderTop: '1px solid var(--rule)',
                  borderBottom: i === BRIEFS.length - 1 ? '1px solid var(--rule)' : '0',
                }}>
                <div className="pl-mono pl-brief-kicker">{b.kicker}</div>
                <div>
                  <div className="pl-serif pl-brief-title">{b.title}</div>
                  <div className="pl-brief-meta">{b.meta}</div>
                </div>
                <div className="pl-brief-arrow">→</div>
              </a>
            ))}
          </div>
          <div className="pl-card-tight pl-quote">
            <div className="pl-quote-avatar">P</div>
            <div>
              <p className="pl-serif pl-quote-body">
                <span className="pl-serif-it pl-accent">“</span>
                We finally have an answer machine for the question every newsroom has been guessing at:
                how the same vote share produces wildly different seat counts. Pollistics is the closest
                India has to a proper terminal for politics.
                <span className="pl-serif-it pl-accent">”</span>
              </p>
              <div className="pl-quote-attr">
                <b style={{ color: 'var(--ink)' }}>Yamini Aiyar</b> · psephologist, columnist
              </div>
            </div>
          </div>
        </div>

        <div>
          <SectionHead
            kicker="State assembly board"
            title="Six contests in twelve months."
            subtitle={null}
            link="Full calendar →"
          />
          <div className="pl-card" style={{ padding: 0 }}>
            <div className="pl-board-row pl-board-head">
              {['State', 'Date', 'Lead', 'Seats', 'Status'].map((h, i) => (
                <div key={i} className="pl-mono" style={{ textAlign: i >= 3 ? 'right' : 'left' }}>
                  {h}
                </div>
              ))}
            </div>
            {STATE_BOARD.map((b, i) => (
              <div
                key={i}
                className="pl-board-row"
                style={{ borderBottom: i === STATE_BOARD.length - 1 ? 0 : '1px solid var(--rule)' }}>
                <div>
                  <div className="pl-serif" style={{ fontSize: 16, lineHeight: 1.1 }}>
                    {b.state}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted-ink)' }}>Vidhan Sabha</div>
                </div>
                <div className="pl-mono pl-tnum" style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                  {b.date}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: b.lead === '—' ? 400 : 600,
                    color: b.lead === '—' ? 'var(--muted-ink)' : 'var(--ink)',
                  }}>
                  {b.lead}
                </div>
                <div className="pl-mono pl-tnum" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-soft)' }}>
                  {b.seats}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    className="pl-mono pl-board-status"
                    style={{
                      background: b.status === 'RESULT' ? 'var(--ink)' : 'var(--accent)',
                      color: 'var(--paper)',
                    }}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pl-card-tight pl-signup">
            <div>
              <div className="pl-kicker">Morning Tally · weekly</div>
              <div className="pl-serif pl-signup-title">
                One chart, one constituency, one number — every Monday at 7am IST.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="pl-signup-input" placeholder="you@newsroom.in" />
              <button className="pl-btn-solid" style={{ height: 40, padding: '0 18px', fontSize: 13 }}>
                Subscribe
              </button>
            </div>
            <div className="pl-signup-foot">
              Read by editors at The Hindu, Mint, Print, Reuters, Bloomberg.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* TOOLS BENTO                                                          */
/* ──────────────────────────────────────────────────────────────────── */

function ToolsBento() {
  return (
    <section className="pl-page pl-section">
      <SectionHead
        kicker="The toolkit"
        title="Built for people who argue with data."
        subtitle="Six instruments that turn raw ECI numbers into answers — for the desk on deadline and the room on a war footing."
        link={null}
      />
      <div className="pl-tools-grid">
        <div className="pl-card pl-hoverlift pl-tool-big">
          <div>
            <div className="pl-kicker">Tool · 01</div>
            <h3 className="pl-serif pl-tool-h">Swing Impact</h3>
            <p className="pl-tool-p" style={{ maxWidth: 360 }}>
              Move a slider, see seat outcomes. Apply a uniform or differential swing to any prior election
              and watch the seat map re-colour in real time.
            </p>
          </div>
          <SwingDemo />
        </div>

        <div className="pl-card pl-hoverlift" style={{ padding: 22 }}>
          <div>
            <div className="pl-kicker">Tool · 02</div>
            <h3 className="pl-serif pl-tool-h-sm">Close Contest finder</h3>
            <p className="pl-tool-p-sm">Top margins under 5,000 votes, sortable by phase, state and alliance.</p>
          </div>
          <div style={{ marginTop: 12 }}>
            {[
              ['Mumbai NW', '48'],
              ['Attingal', '684'],
              ['Salem', '953'],
              ['Kaiserganj', '1,288'],
            ].map(([c, m]) => (
              <div key={c} className="pl-close-row">
                <span>{c}</span>
                <span className="pl-mono pl-tnum" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  {m} v
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pl-tool-youpredict">
          <div>
            <div className="pl-mono pl-youpredict-kick">● TOOL · 03 · LIVE</div>
            <h3 className="pl-serif pl-tool-h-md">YouPredict</h3>
            <p className="pl-youpredict-p">
              The prediction game where your seat call is scored against the actual count.
            </p>
          </div>
          <div className="pl-youpredict-foot">
            <div>
              <div className="pl-serif pl-tnum pl-youpredict-num">12,408</div>
              <div className="pl-mono pl-youpredict-sub">ACTIVE PLAYERS</div>
            </div>
            <span className="pl-mono pl-youpredict-cta">PLAY →</span>
          </div>
        </div>

        <div className="pl-card pl-hoverlift" style={{ padding: 22 }}>
          <div className="pl-kicker">Tool · 04</div>
          <h3 className="pl-serif pl-tool-h-sm">Constituency finder</h3>
          <p className="pl-tool-p-sm" style={{ marginBottom: 12 }}>
            Every PC and AC across 75 years, with every candidate.
          </p>
          <div className="pl-search-mock">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <span style={{ fontSize: 13, color: 'var(--muted-ink)' }}>
              e.g. &quot;Varanasi 1991&quot;, &quot;Wayanad&quot;, PIN 110001…
            </span>
          </div>
          <div className="pl-search-chips">
            {['Varanasi', 'Amethi', 'Hyderabad', 'Diamond Harbour', 'Mandya'].map((c) => (
              <span key={c} className="pl-search-chip">
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="pl-card pl-hoverlift" style={{ padding: 22 }}>
          <div className="pl-kicker">Tool · 05</div>
          <h3 className="pl-serif pl-tool-h-sm">Compare anything</h3>
          <p className="pl-tool-p-sm">Two states, two parties, two decades — side by side, share-by-share.</p>
          <div className="pl-compare-grid">
            <div className="pl-card-tight" style={{ padding: 10 }}>
              <div className="pl-mono pl-compare-k">BJP · 2014</div>
              <div className="pl-serif pl-tnum pl-compare-v">282</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted-ink)' }}>seats</div>
            </div>
            <div className="pl-card-tight" style={{ padding: 10 }}>
              <div className="pl-mono pl-compare-k">BJP · 2024</div>
              <div className="pl-serif pl-tnum pl-compare-v">240</div>
              <div style={{ fontSize: 10.5, color: 'var(--accent)' }}>−42</div>
            </div>
          </div>
        </div>

        <div className="pl-card pl-hoverlift pl-tool-api">
          <div className="pl-tool-api-inner">
            <div>
              <div className="pl-kicker">Tool · 06 · DEV</div>
              <h3 className="pl-serif pl-tool-h-md">Pollistics API</h3>
              <p className="pl-tool-p-sm">
                Every ECI primary in one schema. Cited by Bloomberg, Reuters, Nikkei.
              </p>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button className="pl-btn-solid" style={{ height: 34, padding: '0 14px', fontSize: 12 }}>
                  Get a key
                </button>
                <button className="pl-btn-ghost" style={{ height: 34, padding: '0 14px', fontSize: 12 }}>
                  Read docs
                </button>
              </div>
            </div>
            <pre className="pl-mono pl-tool-api-code">
{`$ curl https://api.pollistics.in/v2/constituency/varanasi \\
       -H "Authorization: Bearer pk_live_…"

{
  "id":  "uttar-pradesh/varanasi",
  "winner": { "candidate": "Narendra Modi",
              "party": "BJP", "votes": 612970 },
  "margin": 152513,
  "turnout": 56.35
}`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function SwingDemo() {
  const [s, setS] = useState(3);
  const k = 18;
  const bjp = Math.round(240 - s * k * 0.7);
  const inc = Math.round(99 + s * k * 0.55);
  const oth = 543 - bjp - inc;
  const seg = [
    { l: 'BJP', v: bjp, c: 'var(--saffron)' },
    { l: 'INC', v: inc, c: 'var(--ink-blue)' },
    { l: 'OTH', v: oth, c: 'var(--muted-ink)' },
  ];
  return (
    <div style={{ marginTop: 14 }}>
      <div className="pl-swing-bar">
        {seg.map((x) => (
          <div key={x.l} style={{ flex: x.v, background: x.c }}>
            {x.l} {x.v}
          </div>
        ))}
      </div>
      <div className="pl-swing-controls">
        <span className="pl-mono" style={{ fontSize: 11, color: 'var(--muted-ink)', whiteSpace: 'nowrap' }}>
          swing →
        </span>
        <input
          type="range"
          min="-6"
          max="6"
          step="0.5"
          value={s}
          onChange={(e) => setS(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: 'var(--accent)' }}
        />
        <span
          className="pl-serif pl-tnum"
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: s > 0 ? 'var(--ink-blue)' : 'var(--saffron)',
            minWidth: 56,
            textAlign: 'right',
          }}>
          {s > 0 ? '+' : ''}
          {s.toFixed(1)} pts
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted-ink)', marginTop: 6 }}>
        Anti-incumbency swing to opposition · uniform across states
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* COVERAGE STRIP                                                       */
/* ──────────────────────────────────────────────────────────────────── */

function Coverage() {
  return (
    <section className="pl-page pl-section">
      <div className="pl-card pl-coverage">
        <div className="pl-coverage-row">
          <div>
            <div className="pl-kicker pl-kicker-muted">Data coverage</div>
            <div className="pl-serif pl-coverage-h">The largest open archive of Indian election data.</div>
          </div>
          {[
            ['18', 'Lok Sabhas', '1952 → 2024'],
            ['312', 'State elections', '1977 onwards'],
            ['2.4M+', 'Candidate rows', 'with affidavits'],
            ['75yr', 'Continuous record', 'since the first vote'],
          ].map(([n, l, sub]) => (
            <div key={l} className="pl-coverage-stat">
              <div className="pl-serif pl-tnum pl-coverage-num">{n}</div>
              <div className="pl-mono pl-coverage-label">{l}</div>
              <div className="pl-coverage-sub">{sub}</div>
            </div>
          ))}
        </div>
        <div className="pl-coverage-cited">
          <div className="pl-mono pl-coverage-cited-label">Cited by</div>
          {[
            'The Hindu',
            'Mint',
            'Reuters',
            'Bloomberg',
            'Nikkei Asia',
            'The Print',
            'Hindustan Times',
            'India Today',
          ].map((n) => (
            <span key={n} className="pl-serif pl-coverage-cited-name">
              {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* FOOTER                                                               */
/* ──────────────────────────────────────────────────────────────────── */

const FOOTER_COLS: ReadonlyArray<readonly [string, ReadonlyArray<string>]> = [
  ['Elections', ['Lok Sabha 2024', 'Lok Sabha 2019', 'All general elections', 'Vidhan Sabha — by state', 'Bypolls', 'Presidential 2022']],
  ['Tools', ['Swing Impact', 'Close Contest', 'Compare', 'YouPredict', 'API & exports', 'Embeds']],
  ['Analysis', ['Editorials', 'Methods', 'Glossary', 'Constituency profiles', 'Demographic models']],
  ['About', ['Pollistics', 'Newsroom partnerships', 'Careers', 'Press kit', 'Contact']],
];

function Footer() {
  return (
    <footer className="pl-footer">
      <div className="pl-page pl-footer-inner">
        <div className="pl-footer-cols">
          <div className="pl-footer-brand">
            <PollisticsMark size={34} />
            <p className="pl-serif pl-footer-tag">
              The world&apos;s largest democracy deserves the world&apos;s clearest election record.
            </p>
            <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
              <Link href="/login" className="pl-btn-solid" style={{ background: 'var(--accent)', color: '#fff' }}>
                Try Pollistics free
              </Link>
              <a
                href="#contact"
                className="pl-btn-ghost"
                style={{ background: 'transparent', color: '#f5f3ef', borderColor: 'rgba(255,255,255,.2)' }}>
                Talk to us
              </a>
            </div>
          </div>
          {FOOTER_COLS.map(([title, items]) => (
            <div key={title} className="pl-footer-col">
              <div className="pl-mono pl-footer-col-h">{title.toUpperCase()}</div>
              <ul>
                {items.map((it) => (
                  <li key={it}>
                    <a href="#" className="pl-footer-link">
                      {it}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pl-footer-bottom">
          <div className="pl-mono pl-footer-copyright">
            © 2026 Pollistics Media Pvt. Ltd. · Data sourced from the Election Commission of India and verified independently.
          </div>
          <div className="pl-footer-links">
            <span>Methodology</span>
            <span>Disclaimer</span>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* THEME + COMPONENT STYLES                                              */
/* ──────────────────────────────────────────────────────────────────── */

function ThemeStyles() {
  return (
    <style jsx global>{`
      /* BROADCAST (default) — deep charcoal field, vivid red, off-white */
      .pollistics-landing.theme-broadcast {
        --bg: #111114;
        --bg-tint: #17171b;
        --paper: #1a1a1e;
        --paper-2: #222228;
        --ink: #f5f5f7;
        --ink-soft: #d4d4d8;
        --muted-ink: #85858d;
        --rule: #2a2a30;
        --rule-2: #3d3d45;
        --accent: #ef2233;
        --accent-2: #ff5663;
        --saffron: #f59440;
        --ink-blue: #6e9eff;
        --grass: #34c98a;
        --gold: #e3b85a;
        --chip-bg: rgba(245, 245, 247, 0.07);
      }
      /* STUDIO — cool white, jet-black ink */
      .pollistics-landing.theme-studio {
        --bg: #f3f4f6;
        --bg-tint: #e8eaee;
        --paper: #ffffff;
        --paper-2: #f7f8fa;
        --ink: #0d0d10;
        --ink-soft: #1f1f24;
        --muted-ink: #65686e;
        --rule: #d8dbe0;
        --rule-2: #b4b8c0;
        --accent: #e11e2c;
        --accent-2: #a8131e;
        --saffron: #ea7314;
        --ink-blue: #1b4ed8;
        --grass: #15803d;
        --gold: #b8881c;
        --chip-bg: rgba(13, 13, 16, 0.05);
      }
      /* SIGNAL — red-on-black poster */
      .pollistics-landing.theme-signal {
        --bg: #0e0e10;
        --bg-tint: #16161a;
        --paper: #14141a;
        --paper-2: #1e1e25;
        --ink: #f5efe6;
        --ink-soft: #d8d2c8;
        --muted-ink: #8a8088;
        --rule: #2c2530;
        --rule-2: #443a48;
        --accent: #ff2a3a;
        --accent-2: #ffffff;
        --saffron: #ffae57;
        --ink-blue: #8aa8ff;
        --grass: #43c089;
        --gold: #e3b85a;
        --chip-bg: rgba(255, 42, 58, 0.1);
      }

      .pollistics-landing {
        background: var(--bg);
        color: var(--ink);
        font-family: var(--font-instrument), 'Instrument Sans', system-ui, sans-serif;
        font-size: 15px;
        line-height: 1.45;
        min-height: 100vh;
      }
      .pollistics-landing .pl-serif {
        font-family: var(--font-newsreader), 'Newsreader', Georgia, serif;
        font-weight: 420;
        letter-spacing: -0.01em;
      }
      .pollistics-landing .pl-serif-it {
        font-family: var(--font-newsreader), 'Newsreader', Georgia, serif;
        font-style: italic;
        font-weight: 360;
      }
      .pollistics-landing .pl-mono {
        font-family: var(--font-jetbrains), 'JetBrains Mono', ui-monospace, Menlo, monospace;
      }
      .pollistics-landing .pl-tnum {
        font-variant-numeric: tabular-nums;
      }
      .pollistics-landing .pl-accent {
        color: var(--accent);
      }
      .pollistics-landing .pl-page {
        max-width: 1360px;
        margin: 0 auto;
        padding: 0 28px;
      }
      .pollistics-landing .pl-section {
        padding-top: 56px;
        padding-bottom: 24px;
      }
      .pollistics-landing .pl-thick-rule {
        height: 1px;
        background: var(--ink);
        width: 100%;
        opacity: 0.65;
      }

      /* Atoms */
      .pollistics-landing .pl-kicker {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-jetbrains), monospace;
        font-size: 10.5px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--accent);
      }
      .pollistics-landing .pl-kicker::before {
        content: '';
        width: 6px;
        height: 6px;
        background: var(--accent);
        display: inline-block;
        border-radius: 50%;
      }
      .pollistics-landing .pl-kicker-muted {
        color: var(--muted-ink);
      }
      .pollistics-landing .pl-kicker-muted::before {
        background: var(--muted-ink);
      }
      .pollistics-landing .pl-card {
        background: var(--paper);
        border: 1px solid var(--rule);
        border-radius: 4px;
      }
      .pollistics-landing .pl-card-tight {
        background: var(--paper-2);
        border: 1px solid var(--rule);
        border-radius: 3px;
      }
      .pollistics-landing .pl-hoverlift {
        transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1), box-shadow 0.35s;
      }
      .pollistics-landing .pl-hoverlift:hover {
        transform: translateY(-2px);
        box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.8);
      }
      .pollistics-landing .pl-chip {
        font-family: var(--font-jetbrains), monospace;
        font-size: 9.5px;
        font-weight: 600;
        letter-spacing: 0.1em;
        padding: 2px 6px;
        border-radius: 2px;
        background: var(--chip-bg);
        color: var(--muted-ink);
      }
      .pollistics-landing .pl-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      /* HEADER */
      .pollistics-landing .pl-header {
        position: sticky;
        top: 0;
        z-index: 50;
        background: var(--bg);
        border-bottom: 1px solid var(--rule);
      }
      .pollistics-landing .pl-header-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 60px;
      }
      .pollistics-landing .pl-mark {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }
      .pollistics-landing .pl-mark-img {
        border-radius: 50%;
        display: block;
        flex-shrink: 0;
        object-fit: contain;
        filter: drop-shadow(0 4px 12px rgba(13, 13, 16, 0.18));
      }
      .pollistics-landing .pl-mark-name {
        font-family: var(--font-newsreader), serif;
        font-size: 22px;
        font-weight: 600;
        letter-spacing: -0.015em;
      }
      .pollistics-landing .pl-mark-meta {
        font-family: var(--font-jetbrains), monospace;
        font-size: 9.5px;
        color: var(--muted-ink);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        border-left: 1px solid var(--rule);
        padding-left: 10px;
        margin-left: 2px;
      }
      .pollistics-landing .pl-nav {
        display: flex;
        align-items: center;
        gap: 22px;
        font-size: 13.5px;
      }
      .pollistics-landing .pl-nav-item {
        color: var(--ink-soft);
        font-weight: 500;
        padding: 18px 0;
        border-bottom: 1.5px solid transparent;
        text-decoration: none;
        cursor: pointer;
      }
      .pollistics-landing .pl-nav-active {
        color: var(--ink);
        font-weight: 600;
        border-bottom-color: var(--accent);
      }
      .pollistics-landing .pl-header-cta {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .pollistics-landing .pl-btn-ghost {
        display: inline-flex;
        align-items: center;
        height: 34px;
        padding: 0 12px;
        font-size: 13px;
        background: var(--paper);
        border: 1px solid var(--rule);
        color: var(--ink-soft);
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
        text-decoration: none;
      }
      .pollistics-landing .pl-btn-solid {
        display: inline-flex;
        align-items: center;
        height: 34px;
        padding: 0 16px;
        font-size: 13px;
        font-weight: 600;
        background: var(--ink);
        color: var(--paper);
        border: 0;
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
        text-decoration: none;
      }
      .pollistics-landing .pl-btn-lg {
        height: 44px;
        padding: 0 22px;
        font-size: 14px;
      }
      .pollistics-landing .pl-theme-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--accent);
        display: inline-block;
      }

      /* HAMBURGER + DRAWER (mobile only) */
      .pollistics-landing .pl-burger {
        display: none;
        flex-direction: column;
        justify-content: center;
        gap: 4px;
        width: 38px;
        height: 38px;
        padding: 8px;
        background: var(--paper);
        border: 1px solid var(--rule);
        border-radius: 4px;
        cursor: pointer;
      }
      .pollistics-landing .pl-burger > span {
        display: block;
        width: 100%;
        height: 2px;
        background: var(--ink);
        border-radius: 1px;
      }
      .pollistics-landing .pl-drawer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease;
        z-index: 90;
      }
      .pollistics-landing .pl-drawer-overlay.pl-drawer-open {
        opacity: 1;
        pointer-events: auto;
      }
      .pollistics-landing .pl-drawer {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(82vw, 320px);
        background: var(--paper);
        border-left: 1px solid var(--rule);
        z-index: 100;
        transform: translateX(100%);
        transition: transform 0.28s cubic-bezier(0.2, 0.7, 0.2, 1);
        display: flex;
        flex-direction: column;
        box-shadow: -20px 0 40px -20px rgba(0, 0, 0, 0.35);
        visibility: hidden;
      }
      .pollistics-landing .pl-drawer.pl-drawer-open {
        transform: translateX(0);
        visibility: visible;
      }
      .pollistics-landing .pl-drawer-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        border-bottom: 1px solid var(--rule);
      }
      .pollistics-landing .pl-drawer-close {
        width: 36px;
        height: 36px;
        background: transparent;
        border: 1px solid var(--rule);
        border-radius: 4px;
        font-size: 22px;
        line-height: 1;
        color: var(--ink);
        cursor: pointer;
        font-family: inherit;
      }
      .pollistics-landing .pl-drawer-nav {
        display: flex;
        flex-direction: column;
        padding: 8px 0;
        flex: 1;
        overflow-y: auto;
      }
      .pollistics-landing .pl-drawer-item {
        display: block;
        padding: 14px 22px;
        font-size: 15px;
        font-weight: 500;
        color: var(--ink-soft);
        text-decoration: none;
        border-left: 3px solid transparent;
      }
      .pollistics-landing .pl-drawer-item-active {
        color: var(--ink);
        border-left-color: var(--accent);
        background: var(--paper-2);
      }
      .pollistics-landing .pl-drawer-foot {
        padding: 16px 18px;
        border-top: 1px solid var(--rule);
      }
      .pollistics-landing .pl-drawer-foot .pl-btn-solid {
        width: 100%;
        justify-content: center;
      }

      /* TICKER */
      .pollistics-landing .pl-ticker {
        border-bottom: 1px solid var(--rule);
        background: var(--bg-tint);
        overflow: hidden;
      }
      .pollistics-landing .pl-ticker-inner {
        display: flex;
        align-items: center;
        height: 36px;
        gap: 14px;
      }
      .pollistics-landing .pl-ticker-label {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
        padding-right: 14px;
        border-right: 1px solid var(--rule);
      }
      .pollistics-landing .pl-ticker-text {
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.15em;
        color: var(--accent);
      }
      .pollistics-landing .pl-live-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--accent);
        animation: pollPulse 1.6s ease-out infinite;
      }
      @keyframes pollPulse {
        0% {
          box-shadow: 0 0 0 0 var(--accent);
        }
        70% {
          box-shadow: 0 0 0 8px transparent;
        }
        100% {
          box-shadow: 0 0 0 0 transparent;
        }
      }
      .pollistics-landing .pl-ticker-track-mask {
        flex: 1;
        overflow: hidden;
        mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent);
        -webkit-mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent);
      }
      .pollistics-landing .pl-ticker-track {
        display: flex;
        gap: 32px;
        white-space: nowrap;
        width: max-content;
        animation: pollTicker 60s linear infinite;
      }
      @keyframes pollTicker {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(-33.333%);
        }
      }
      .pollistics-landing .pl-ticker-item {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12.5px;
        color: var(--ink-soft);
      }
      .pollistics-landing .pl-ticker-delta {
        font-size: 11.5px;
        font-weight: 600;
      }
      .pollistics-landing .pl-ticker-date {
        font-size: 10.5px;
        color: var(--muted-ink);
        flex-shrink: 0;
      }

      /* HERO */
      .pollistics-landing .pl-hero {
        padding-top: 36px;
        padding-bottom: 24px;
      }
      .pollistics-landing .pl-hero-meta {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 22px;
      }
      .pollistics-landing .pl-hero-cities {
        font-size: 11px;
        color: var(--muted-ink);
      }
      .pollistics-landing .pl-hero-grid {
        display: grid;
        grid-template-columns: 1.35fr 1fr;
        gap: 36px;
        align-items: stretch;
      }
      .pollistics-landing .pl-hero-text {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .pollistics-landing .pl-hero-headline {
        font-size: 86px;
        line-height: 0.96;
        margin: 0;
        font-weight: 360;
        letter-spacing: -0.025em;
        color: var(--ink);
      }
      .pollistics-landing .pl-hero-lede {
        margin-top: 26px;
        font-size: 18px;
        line-height: 1.5;
        max-width: 540px;
        color: var(--ink-soft);
        font-weight: 380;
      }
      .pollistics-landing .pl-hero-cta {
        margin-top: 32px;
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }
      .pollistics-landing .pl-hero-cta-meta {
        font-size: 11px;
        color: var(--muted-ink);
        margin-left: 8px;
      }

      /* HERO TILE */
      .pollistics-landing .pl-hero-tile {
        padding: 22px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: relative;
        overflow: hidden;
      }
      .pollistics-landing .pl-tile-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .pollistics-landing .pl-tile-title {
        font-size: 24px;
        margin-top: 6px;
        line-height: 1.1;
      }
      .pollistics-landing .pl-tile-sub {
        font-size: 12px;
        color: var(--muted-ink);
        margin-top: 2px;
      }
      .pollistics-landing .pl-tile-voters {
        text-align: right;
      }
      .pollistics-landing .pl-tile-voters-label {
        font-size: 11px;
        color: var(--muted-ink);
      }
      .pollistics-landing .pl-tile-voters-value {
        font-size: 26px;
        line-height: 1;
        margin-top: 2px;
      }
      .pollistics-landing .pl-tile-turnout {
        font-size: 11px;
        color: var(--grass);
        margin-top: 2px;
      }
      .pollistics-landing .pl-seat-strip-wrap {
        position: relative;
        margin-top: 4px;
      }
      .pollistics-landing .pl-seat-strip {
        display: flex;
        align-items: center;
        height: 56px;
        border: 1px solid var(--rule);
        border-radius: 3px;
        overflow: hidden;
      }
      .pollistics-landing .pl-seat-seg {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pollistics-landing .pl-seat-name {
        font-size: 9.5px;
        letter-spacing: 0.15em;
        opacity: 0.85;
      }
      .pollistics-landing .pl-seat-count {
        font-size: 22px;
        line-height: 1;
        font-weight: 500;
      }
      .pollistics-landing .pl-majority-line {
        position: absolute;
        top: -8px;
        bottom: -8px;
        border-left: 1.5px dashed var(--ink);
        opacity: 0.7;
      }
      .pollistics-landing .pl-majority-label {
        position: absolute;
        top: -22px;
        transform: translateX(-50%);
        font-family: var(--font-jetbrains), monospace;
        font-size: 10px;
        color: var(--ink);
        white-space: nowrap;
      }
      .pollistics-landing .pl-tile-kpis {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        margin-top: 6px;
        border-top: 1px solid var(--rule);
        padding-top: 14px;
      }
      .pollistics-landing .pl-tile-kpi-label {
        font-size: 10px;
        color: var(--muted-ink);
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .pollistics-landing .pl-tile-kpi-row {
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin-top: 4px;
      }
      .pollistics-landing .pl-tile-kpi-value {
        font-size: 20px;
        font-weight: 600;
      }
      .pollistics-landing .pl-tile-kpi-sub {
        font-size: 11.5px;
        color: var(--muted-ink);
      }
      .pollistics-landing .pl-tile-watermark {
        position: absolute;
        right: 14px;
        bottom: 10px;
        font-size: 9.5px;
        color: var(--muted-ink);
        letter-spacing: 0.1em;
      }

      /* SECTION HEAD */
      .pollistics-landing .pl-section-head {
        margin-bottom: 18px;
      }
      .pollistics-landing .pl-section-head-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 24px;
        margin-top: 14px;
      }
      .pollistics-landing .pl-section-title {
        font-size: 36px;
        font-weight: 380;
        letter-spacing: -0.02em;
        margin: 6px 0 0;
        line-height: 1.05;
      }
      .pollistics-landing .pl-section-sub {
        margin: 8px 0 0;
        color: var(--muted-ink);
        max-width: 560px;
        font-size: 14px;
      }
      .pollistics-landing .pl-section-link {
        font-size: 13px;
        color: var(--ink-soft);
        border-bottom: 1px solid var(--rule-2);
        padding-bottom: 2px;
        text-decoration: none;
      }

      /* LOK SABHA SNAPSHOT */
      .pollistics-landing .pl-snapshot-grid {
        display: grid;
        grid-template-columns: 1.05fr 1fr;
        gap: 28px;
      }
      .pollistics-landing .pl-party-row {
        display: grid;
        grid-template-columns: 32px 1fr 70px 1fr 64px 60px;
        gap: 0;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--rule);
      }
      .pollistics-landing .pl-party-head {
        background: var(--paper-2);
        padding: 10px 16px;
      }
      .pollistics-landing .pl-party-head-cell {
        font-size: 10px;
        color: var(--muted-ink);
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .pollistics-landing .pl-vote-bar {
        flex: 1;
        height: 6px;
        background: var(--chip-bg);
        border-radius: 1px;
        overflow: hidden;
      }
      .pollistics-landing .pl-arc-legend {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        margin-top: 6px;
      }

      /* TREEMAP */
      .pollistics-landing .pl-treemap {
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .pollistics-landing .pl-treemap-row {
        display: flex;
        gap: 4px;
        height: 64px;
      }
      .pollistics-landing .pl-treemap-cell {
        color: #fff;
        padding: 8px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border-radius: 2px;
        overflow: hidden;
        min-width: 0;
      }
      .pollistics-landing .pl-treemap-abbr {
        font-size: 10px;
        opacity: 0.9;
        letter-spacing: 0.05em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: clip;
      }
      .pollistics-landing .pl-treemap-share {
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
      }

      /* INDIA GEO MAP card — full-width inside .pl-page */
      .pollistics-landing .india-geo-card {
        width: 100%;
        display: block;
      }

      /* HEX MAP */
      .pollistics-landing .pl-hex-card {
        padding: 24px;
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 32px;
        align-items: stretch;
      }
      .pollistics-landing .pl-hex-toggles {
        display: flex;
        margin-bottom: 14px;
        border: 1px solid var(--rule);
        border-radius: 4px;
        width: fit-content;
        overflow: hidden;
      }
      .pollistics-landing .pl-hex-toggle {
        font-family: inherit;
        border: 0;
        cursor: pointer;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 600;
        background: transparent;
        color: var(--ink-soft);
        border-right: 1px solid var(--rule);
      }
      .pollistics-landing .pl-hex-toggle-active {
        background: var(--ink);
        color: var(--paper);
      }
      .pollistics-landing .pl-hex-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-top: 8px;
        align-items: center;
      }
      .pollistics-landing .pl-hex-legend-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11.5px;
        color: var(--muted-ink);
      }
      .pollistics-landing .pl-hex-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1px;
        background: var(--rule);
      }
      .pollistics-landing .pl-hex-stat {
        background: var(--paper);
        padding: 14px 16px;
      }
      .pollistics-landing .pl-hex-stat-k {
        font-size: 10px;
        color: var(--muted-ink);
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .pollistics-landing .pl-hex-stat-v {
        font-size: 20px;
        margin-top: 2px;
        font-weight: 500;
      }
      .pollistics-landing .pl-state-k {
        font-size: 10px;
        color: var(--muted-ink);
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .pollistics-landing .pl-state-v {
        font-size: 30px;
        line-height: 1;
        font-weight: 500;
      }
      .pollistics-landing .pl-state-closest-h {
        font-size: 10px;
        color: var(--muted-ink);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .pollistics-landing .pl-state-closest-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-top: 1px solid var(--rule);
        font-size: 12.5px;
      }

      /* BRIEFS + STATE BOARD */
      .pollistics-landing .pl-briefs-grid {
        display: grid;
        grid-template-columns: 1.05fr 1fr;
        gap: 36px;
      }
      .pollistics-landing .pl-brief-row {
        display: grid;
        grid-template-columns: 112px 1fr 28px;
        gap: 18px;
        align-items: center;
        padding: 20px 0;
        text-decoration: none;
        color: inherit;
      }
      .pollistics-landing .pl-brief-kicker {
        font-size: 11px;
        color: var(--accent);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-weight: 600;
      }
      .pollistics-landing .pl-brief-title {
        font-size: 22px;
        line-height: 1.2;
        font-weight: 420;
        letter-spacing: -0.01em;
      }
      .pollistics-landing .pl-brief-meta {
        font-size: 12px;
        color: var(--muted-ink);
        margin-top: 6px;
      }
      .pollistics-landing .pl-brief-arrow {
        text-align: right;
        color: var(--ink-soft);
        font-size: 18px;
      }
      .pollistics-landing .pl-quote {
        padding: 24px;
        margin-top: 24px;
        display: grid;
        grid-template-columns: 60px 1fr;
        gap: 18px;
      }
      .pollistics-landing .pl-quote-avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: var(--ink);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--paper);
        font-family: var(--font-newsreader), serif;
        font-style: italic;
        font-size: 28px;
      }
      .pollistics-landing .pl-quote-body {
        font-size: 19px;
        line-height: 1.35;
        margin: 0;
        font-weight: 400;
      }
      .pollistics-landing .pl-quote-attr {
        margin-top: 10px;
        font-size: 12.5px;
        color: var(--muted-ink);
      }
      .pollistics-landing .pl-board-row {
        display: grid;
        grid-template-columns: 1.4fr 80px 1fr 90px 70px;
        padding: 14px 16px;
        align-items: center;
      }
      .pollistics-landing .pl-board-head {
        padding: 10px 16px;
        background: var(--paper-2);
        border-bottom: 1px solid var(--rule);
        font-size: 10px;
        color: var(--muted-ink);
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .pollistics-landing .pl-board-status {
        font-size: 9.5px;
        letter-spacing: 0.12em;
        padding: 2px 6px;
        border-radius: 2px;
      }
      .pollistics-landing .pl-signup {
        margin-top: 20px;
        padding: 22px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .pollistics-landing .pl-signup-title {
        font-size: 24px;
        margin-top: 6px;
        line-height: 1.15;
        font-weight: 420;
      }
      .pollistics-landing .pl-signup-input {
        flex: 1;
        height: 40px;
        padding: 0 14px;
        border: 1px solid var(--rule);
        background: var(--paper);
        color: var(--ink);
        border-radius: 3px;
        font-size: 13px;
        font-family: inherit;
      }
      .pollistics-landing .pl-signup-foot {
        font-size: 11px;
        color: var(--muted-ink);
      }

      /* TOOLS BENTO */
      .pollistics-landing .pl-tools-grid {
        display: grid;
        grid-template-columns: 1.4fr 1fr 1fr;
        grid-auto-rows: minmax(180px, auto);
        gap: 16px;
      }
      .pollistics-landing .pl-tool-big {
        padding: 24px;
        grid-row: span 2;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .pollistics-landing .pl-tool-h {
        font-size: 30px;
        font-weight: 420;
        letter-spacing: -0.015em;
        margin: 10px 0 8px;
        line-height: 1.1;
      }
      .pollistics-landing .pl-tool-h-md {
        font-size: 26px;
        font-weight: 420;
        margin: 10px 0 6px;
        line-height: 1.1;
      }
      .pollistics-landing .pl-tool-h-sm {
        font-size: 22px;
        font-weight: 420;
        margin: 8px 0 6px;
        line-height: 1.1;
      }
      .pollistics-landing .pl-tool-p {
        color: var(--muted-ink);
        font-size: 14px;
      }
      .pollistics-landing .pl-tool-p-sm {
        font-size: 12.5px;
        color: var(--muted-ink);
      }
      .pollistics-landing .pl-close-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-top: 1px solid var(--rule);
        font-size: 12.5px;
      }
      .pollistics-landing .pl-tool-youpredict {
        padding: 22px;
        background: #0e0e10;
        color: #f5f3ef;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 220px;
      }
      .pollistics-landing .pl-youpredict-kick {
        font-size: 10.5px;
        letter-spacing: 0.15em;
        color: var(--accent-2);
        font-weight: 700;
      }
      .pollistics-landing .pl-youpredict-p {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
      }
      .pollistics-landing .pl-youpredict-foot {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
      }
      .pollistics-landing .pl-youpredict-num {
        font-size: 36px;
        line-height: 1;
        font-weight: 500;
      }
      .pollistics-landing .pl-youpredict-sub {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        letter-spacing: 0.1em;
      }
      .pollistics-landing .pl-youpredict-cta {
        font-size: 11px;
        color: var(--paper);
        padding: 6px 12px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 2px;
      }
      .pollistics-landing .pl-search-mock {
        border: 1px solid var(--rule);
        border-radius: 3px;
        padding: 0 12px;
        height: 38px;
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--paper-2);
        color: var(--muted-ink);
      }
      .pollistics-landing .pl-search-chips {
        margin-top: 12px;
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .pollistics-landing .pl-search-chip {
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 2px;
        background: var(--chip-bg);
        color: var(--ink-soft);
      }
      .pollistics-landing .pl-compare-grid {
        margin-top: 14px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .pollistics-landing .pl-compare-k {
        font-size: 10px;
        color: var(--muted-ink);
      }
      .pollistics-landing .pl-compare-v {
        font-size: 22px;
        font-weight: 500;
      }
      .pollistics-landing .pl-tool-api {
        padding: 22px;
        grid-column: span 2;
        background: var(--paper-2);
      }
      .pollistics-landing .pl-tool-api-inner {
        display: grid;
        grid-template-columns: 1fr 1.2fr;
        gap: 22px;
        align-items: center;
      }
      .pollistics-landing .pl-tool-api-code {
        margin: 0;
        padding: 14px;
        background: #0e0e10;
        color: #f5f3ef;
        border-radius: 4px;
        font-size: 11.5px;
        line-height: 1.5;
        overflow: auto;
      }
      .pollistics-landing .pl-swing-bar {
        display: flex;
        height: 38px;
        border: 1px solid var(--rule);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 10px;
      }
      .pollistics-landing .pl-swing-bar > div {
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-jetbrains), monospace;
        font-size: 10.5px;
      }
      .pollistics-landing .pl-swing-controls {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      /* COVERAGE */
      .pollistics-landing .pl-coverage {
        padding: 28px;
        background: var(--paper-2);
      }
      .pollistics-landing .pl-coverage-row {
        display: grid;
        grid-template-columns: 0.9fr 1fr 1fr 1fr 1fr;
        gap: 24px;
        align-items: center;
      }
      .pollistics-landing .pl-coverage-h {
        font-size: 22px;
        margin-top: 6px;
        font-weight: 420;
        line-height: 1.1;
      }
      .pollistics-landing .pl-coverage-stat {
        border-left: 1px solid var(--rule);
        padding-left: 18px;
      }
      .pollistics-landing .pl-coverage-num {
        font-size: 36px;
        line-height: 1;
        font-weight: 500;
        letter-spacing: -0.02em;
      }
      .pollistics-landing .pl-coverage-label {
        font-size: 10.5px;
        color: var(--ink-soft);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-top: 6px;
      }
      .pollistics-landing .pl-coverage-sub {
        font-size: 11.5px;
        color: var(--muted-ink);
        margin-top: 2px;
      }
      .pollistics-landing .pl-coverage-cited {
        margin-top: 22px;
        padding-top: 22px;
        border-top: 1px solid var(--rule);
        display: flex;
        align-items: center;
        gap: 36px;
        flex-wrap: wrap;
      }
      .pollistics-landing .pl-coverage-cited-label {
        font-size: 10.5px;
        color: var(--muted-ink);
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .pollistics-landing .pl-coverage-cited-name {
        font-size: 19px;
        color: var(--ink-soft);
        font-weight: 480;
        letter-spacing: -0.01em;
        opacity: 0.75;
      }

      /* FOOTER */
      .pollistics-landing .pl-footer {
        background: #0e0e10;
        color: #f5f3ef;
        margin-top: 56px;
      }
      .pollistics-landing .pl-footer-inner {
        padding-top: 64px;
        padding-bottom: 36px;
      }
      .pollistics-landing .pl-footer-cols {
        display: grid;
        grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr;
        gap: 36px;
        align-items: flex-start;
      }
      .pollistics-landing .pl-footer-brand .pl-mark-name {
        color: #f5f3ef;
      }
      .pollistics-landing .pl-footer-brand .pl-mark-meta {
        color: rgba(243, 236, 225, 0.45);
        border-left-color: rgba(243, 236, 225, 0.15);
      }
      .pollistics-landing .pl-footer-tag {
        font-size: 18px;
        line-height: 1.4;
        color: rgba(243, 236, 225, 0.7);
        max-width: 320px;
        margin-top: 14px;
      }
      .pollistics-landing .pl-footer-col-h {
        font-size: 10.5px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: rgba(243, 236, 225, 0.55);
        margin-bottom: 12px;
      }
      .pollistics-landing .pl-footer-col ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .pollistics-landing .pl-footer-link {
        font-size: 13px;
        color: rgba(243, 236, 225, 0.82);
        text-decoration: none;
      }
      .pollistics-landing .pl-footer-link:hover {
        color: #f5f3ef;
      }
      .pollistics-landing .pl-footer-bottom {
        margin-top: 56px;
        padding-top: 22px;
        border-top: 1px solid rgba(243, 236, 225, 0.12);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
      }
      .pollistics-landing .pl-footer-copyright {
        font-size: 11px;
        color: rgba(243, 236, 225, 0.5);
        letter-spacing: 0.05em;
      }
      .pollistics-landing .pl-footer-links {
        display: flex;
        gap: 18px;
        font-size: 12px;
        color: rgba(243, 236, 225, 0.6);
      }

      /* Mobile */
      @media (max-width: 960px) {
        .pollistics-landing .pl-page {
          padding-left: 16px;
          padding-right: 16px;
        }
        .pollistics-landing .pl-nav {
          display: none;
        }
        .pollistics-landing .pl-burger {
          display: inline-flex;
        }
        .pollistics-landing .pl-header-signin {
          display: none;
        }
        .pollistics-landing .pl-mark-meta {
          display: none;
        }
        .pollistics-landing .pl-hero-headline {
          font-size: 46px !important;
          line-height: 1.02 !important;
        }
        .pollistics-landing .pl-hero-grid,
        .pollistics-landing .pl-snapshot-grid,
        .pollistics-landing .pl-hex-card,
        .pollistics-landing .pl-briefs-grid,
        .pollistics-landing .pl-tool-api-inner {
          grid-template-columns: 1fr !important;
          gap: 24px !important;
        }
        .pollistics-landing .pl-tools-grid {
          grid-template-columns: 1fr !important;
        }
        .pollistics-landing .pl-tool-big {
          grid-row: auto !important;
        }
        .pollistics-landing .pl-tool-api {
          grid-column: auto !important;
        }
        .pollistics-landing .pl-coverage-row,
        .pollistics-landing .pl-footer-cols {
          grid-template-columns: 1fr 1fr !important;
        }
        .pollistics-landing .pl-party-row {
          grid-template-columns: 22px 1fr 56px 50px !important;
        }
        .pollistics-landing .pl-party-row > :nth-child(4),
        .pollistics-landing .pl-party-row > :nth-child(6) {
          display: none !important;
        }
        .pollistics-landing .pl-board-row {
          grid-template-columns: 1fr 70px !important;
        }
        .pollistics-landing .pl-board-row > :nth-child(2),
        .pollistics-landing .pl-board-row > :nth-child(3),
        .pollistics-landing .pl-board-row > :nth-child(4) {
          display: none !important;
        }
        .pollistics-landing .pl-section-title {
          font-size: 26px;
        }
        .pollistics-landing .pl-ticker-date {
          display: none;
        }
      }
      @media (max-width: 640px) {
        .pollistics-landing .pl-section {
          padding-top: 36px;
        }
        .pollistics-landing .pl-hero {
          padding-top: 24px;
        }
        .pollistics-landing .pl-hero-meta {
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          margin-bottom: 16px;
        }
        .pollistics-landing .pl-hero-headline {
          font-size: 36px !important;
        }
        .pollistics-landing .pl-hero-lede {
          font-size: 15px;
          margin-top: 18px;
        }
        .pollistics-landing .pl-hero-cta {
          margin-top: 22px;
          gap: 8px;
        }
        .pollistics-landing .pl-hero-cta .pl-btn-lg {
          width: 100%;
          justify-content: center;
        }
        .pollistics-landing .pl-hero-cta-meta {
          margin-left: 0;
        }
        .pollistics-landing .pl-hero-tile {
          padding: 16px;
        }
        .pollistics-landing .pl-tile-header {
          flex-direction: column;
          gap: 8px;
        }
        .pollistics-landing .pl-tile-voters {
          text-align: left;
        }
        .pollistics-landing .pl-tile-title {
          font-size: 20px;
        }
        .pollistics-landing .pl-seat-strip {
          height: 48px;
        }
        .pollistics-landing .pl-seat-count {
          font-size: 18px;
        }
        .pollistics-landing .pl-tile-kpis {
          grid-template-columns: 1fr !important;
          gap: 10px;
        }
        .pollistics-landing .pl-tile-kpi {
          padding-left: 0 !important;
          border-left: 0 !important;
          border-top: 1px solid var(--rule);
          padding-top: 10px;
        }
        .pollistics-landing .pl-tile-kpi:first-child {
          border-top: 0;
          padding-top: 0;
        }
        .pollistics-landing .pl-coverage {
          padding: 20px;
        }
        .pollistics-landing .pl-coverage-row,
        .pollistics-landing .pl-footer-cols {
          grid-template-columns: 1fr !important;
        }
        .pollistics-landing .pl-coverage-stat {
          border-left: 0;
          border-top: 1px solid var(--rule);
          padding-left: 0;
          padding-top: 14px;
        }
        .pollistics-landing .pl-coverage-cited {
          gap: 14px 22px;
        }
        .pollistics-landing .pl-coverage-cited-name {
          font-size: 16px;
        }
        .pollistics-landing .pl-section-head-row {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }
        .pollistics-landing .pl-section-title {
          font-size: 22px;
        }
        .pollistics-landing .pl-section-sub {
          font-size: 13px;
        }
        .pollistics-landing .pl-brief-row {
          grid-template-columns: 1fr;
          gap: 6px;
          padding: 16px 0;
        }
        .pollistics-landing .pl-brief-arrow {
          display: none;
        }
        .pollistics-landing .pl-brief-title {
          font-size: 18px;
        }
        .pollistics-landing .pl-quote {
          grid-template-columns: 1fr;
          padding: 18px;
        }
        .pollistics-landing .pl-quote-avatar {
          width: 44px;
          height: 44px;
          font-size: 22px;
        }
        .pollistics-landing .pl-quote-body {
          font-size: 16px;
        }
        .pollistics-landing .pl-signup {
          padding: 18px;
        }
        .pollistics-landing .pl-signup > div:last-child {
          flex-direction: column;
        }
        .pollistics-landing .pl-signup-input {
          width: 100%;
        }
        .pollistics-landing .pl-signup .pl-btn-solid {
          width: 100%;
          justify-content: center;
        }
        .pollistics-landing .pl-footer-inner {
          padding-top: 40px;
        }
        .pollistics-landing .pl-footer-bottom {
          flex-direction: column;
          align-items: flex-start;
        }
        .pollistics-landing .pl-tool-h {
          font-size: 24px;
        }
        .pollistics-landing .pl-tool-h-md {
          font-size: 22px;
        }
        .pollistics-landing .pl-tool-h-sm {
          font-size: 18px;
        }
        .pollistics-landing .pl-tool-api-code {
          font-size: 10.5px;
        }
        .pollistics-landing .pl-mark-name {
          font-size: 18px;
        }
        .pollistics-landing .pl-ticker-label {
          padding-right: 10px;
        }
        .pollistics-landing .pl-hex-toggles {
          width: 100%;
          overflow-x: auto;
          flex-wrap: nowrap;
        }
        .pollistics-landing .pl-hex-toggle {
          flex: 1 0 auto;
          padding: 8px 10px;
          font-size: 11px;
        }
        .pollistics-landing .pl-hex-stats {
          grid-template-columns: 1fr 1fr;
        }

        /* Treemap: tighter padding for tiny cells, and drop the %
           share in the narrow (second) row so the abbreviation has
           room without clipping mid-character. */
        .pollistics-landing .pl-treemap-row {
          height: 48px;
        }
        .pollistics-landing .pl-treemap-cell {
          padding: 6px 3px;
          align-items: flex-start;
        }
        .pollistics-landing .pl-treemap-abbr {
          font-size: 9px;
          letter-spacing: 0;
        }
        .pollistics-landing .pl-treemap-share {
          font-size: 11px;
        }
        .pollistics-landing .pl-treemap-row:nth-child(2) .pl-treemap-share {
          display: none;
        }
      }
    `}</style>
  );
}
