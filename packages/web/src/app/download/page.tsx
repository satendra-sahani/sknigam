'use client';

/**
 * Pollistics — Android download page.  Faithful translation of
 * Download.html from the design handoff.  Inherits the same Broadcast
 * (dark charcoal) palette as the landing's default; the page is fully
 * standalone (no AuthGuard, no sidebar/header chrome).
 *
 * Sections, top to bottom:
 *   1. TopBar (mirrors landing)
 *   2. Hero — copy on the left, animated phone mockup on the right
 *   3. Dual app cards — Staff (free) + Insight Pro (₹49k/yr)
 *   4. Eight-feature grid
 *   5. Install details + QR strip
 *   6. Footer (dark slab, 4 columns)
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageSkeleton, useHydrated } from '@/components/landing/PageSkeleton';

type ThemeKey = 'broadcast' | 'studio' | 'signal';

// Theme is locked to the light "Studio" palette — the in-header
// switcher pill was removed per product feedback.
const THEME: ThemeKey = 'studio';

const FEATURES = [
  { num: '01', h: 'Offline-first', p: "Every write queues locally, syncs the moment you're back on signal. No spinner. No loss." },
  { num: '02', h: 'Bilingual UI', p: 'EN + हिन्दी across every screen. Devanagari rendered in IBM Plex — readable on entry-level Androids.' },
  { num: '03', h: 'ECI-verified data', p: "Numbers come from the Election Commission's primary tables, not aggregator scrapes." },
  { num: '04', h: 'End-to-end encrypted', p: 'Voter PII never leaves the device unencrypted. Keys rotate on every campaign cycle.' },
  { num: '05', h: 'Light on memory', p: 'Built for sub-3GB RAM phones. The full 75-year archive runs in 28 MB.' },
  { num: '06', h: 'Role-aware', p: 'One install, multiple roles — booth worker, AC coordinator, district lead, MLA — each sees only their scope.' },
  { num: '07', h: 'OTA updates', p: 'Patched silently overnight. New election? New data the same hour the ECI publishes.' },
  { num: '08', h: 'Audit trail', p: 'Every visit, every filter, every export — logged, signed, exportable as a verifiable PDF.' },
];

const DETAILS = [
  { k: 'Android version', v: '8.0+', sub: 'Oreo and above' },
  { k: 'RAM required', v: '2 GB', sub: 'Tested down to 1.5 GB' },
  { k: 'Disk', v: '90 MB', sub: 'Cache up to 400 MB' },
  { k: 'Architectures', v: 'arm64-v8a', sub: 'arm32 build on request' },
];

const NAV = [
  ['Home', '/'],
  ['About', '/about'],
  ['Search', '/search'],
  ['Explore', '/explore-public'],
  ['Summary', '/#summary'],
  ['Report', '/report'],
  ['App', '/download'],
] as const;

const FOOTER_COLS = [
  ['Apps', ['Pollistics Staff · Android', 'Pollistics Insight · Android', 'iOS — coming Q4 ’26', 'Web dashboard']],
  ['Elections', ['Lok Sabha 2024', 'Vidhan Sabha', 'Archive 1952–', 'Bypolls']],
  ['About', ['Pollistics Media', 'Methodology', 'Press', 'Contact']],
] as const;

export default function DownloadPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Skeleton during initial mount → real page after hydration.  Keeps
  // the refresh experience identical between the landing and download
  // pages (no blank flash, no FOUC).
  const hydrated = useHydrated();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    if (drawerOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Build a 21×21 pseudo-QR grid with seeded random + the three corner
  // finder rings — purely decorative, never a real scan target.
  const qrCells = useMemo(() => {
    const N = 21;
    let s = 173047;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const inBox = (x: number, y: number, cx: number, cy: number) =>
      x >= cx && x < cx + 7 && y >= cy && y < cy + 7;
    const isFinder = (x: number, y: number) =>
      inBox(x, y, 0, 0) || inBox(x, y, 14, 0) || inBox(x, y, 0, 14);
    const ring = (x: number, y: number, cx: number, cy: number) => {
      if (x < cx || x > cx + 6 || y < cy || y > cy + 6) return false;
      const outer = x === cx || x === cx + 6 || y === cy || y === cy + 6;
      const inner = x >= cx + 2 && x <= cx + 4 && y >= cy + 2 && y <= cy + 4;
      return outer || inner;
    };
    const isFinderRing = (x: number, y: number) => ring(x, y, 0, 0) || ring(x, y, 14, 0) || ring(x, y, 0, 14);

    const out: boolean[] = [];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const v = rnd();
        out.push(isFinder(x, y) ? isFinderRing(x, y) : v < 0.48);
      }
    }
    return out;
  }, []);

  if (!hydrated) return <PageSkeleton variant="download" theme={THEME} />;

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className={`dl-page theme-${THEME}`}>
      {/* ── HEADER ───────────────────────────────────────────────── */}
      <header className="dl-header">
        <div className="dl-container dl-header-row">
          <Link href="/" className="dl-brand">
            <img src="/pollistics-logo.png" alt="" width={28} height={28} className="dl-brand-img" />
            <span className="dl-brand-name">Pollistics</span>
            <span className="dl-brand-tag">India · est. 2024</span>
          </Link>
          <nav className="dl-nav">
            {NAV.map(([label, href], i) => {
              const isActive = href === '/download';
              return (
                <Link
                  key={i}
                  href={href}
                  className={`dl-nav-item ${isActive ? 'dl-nav-active' : ''}`}>
                  {label}
                </Link>
              );
            })}
          </nav>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/login" className="dl-btn-ghost dl-btn-sm dl-header-signin">
              Sign in
            </Link>
            <button
              type="button"
              className="dl-burger"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}>
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={`dl-drawer-overlay ${drawerOpen ? 'dl-drawer-open' : ''}`}
        onClick={closeDrawer}
        aria-hidden={!drawerOpen}
      />
      <aside
        className={`dl-drawer ${drawerOpen ? 'dl-drawer-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!drawerOpen}>
        <div className="dl-drawer-head">
          <Link href="/" className="dl-brand" onClick={closeDrawer}>
            <img src="/pollistics-logo.png" alt="" width={26} height={26} className="dl-brand-img" />
            <span className="dl-brand-name" style={{ fontSize: 18 }}>Pollistics</span>
          </Link>
          <button
            type="button"
            className="dl-drawer-close"
            aria-label="Close menu"
            onClick={closeDrawer}>
            ×
          </button>
        </div>
        <nav className="dl-drawer-nav">
          {NAV.map(([label, href], i) => {
            const isActive = href === '/download';
            return (
              <Link
                key={i}
                href={href}
                className={`dl-drawer-item ${isActive ? 'dl-drawer-item-active' : ''}`}
                onClick={closeDrawer}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="dl-drawer-foot">
          <Link href="/login" className="dl-btn-solid" style={{ width: '100%', justifyContent: 'center' }} onClick={closeDrawer}>
            Sign in
          </Link>
        </div>
      </aside>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="dl-hero">
        <div className="dl-container dl-hero-grid">
          <div>
            <span className="dl-kicker">Pollistics · Android · v2.1</span>
            <h1 className="dl-serif dl-hero-h">
              The newsroom, the campaign room, and the booth —{' '}
              <em className="dl-serif-it dl-accent">in your pocket</em>.
            </h1>
            <p className="dl-serif dl-hero-p">
              Two Android apps built on the same election infrastructure: a free, offline-first
              field tool for kāryakartās and a premium intelligence suite for politicians and
              party rooms.
            </p>
            <div className="dl-cta-row">
              <a href="#apps" className="dl-btn-solid dl-btn-accent">
                <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor">
                  <path d="M2 0l10 8L2 16V0z" />
                </svg>
                Download for Android
              </a>
              <a href="#spec" className="dl-btn-ghost">
                Read the system spec →
              </a>
              <span className="dl-mono dl-hero-meta">APK · 31 MB · Android 8.0+</span>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <HeroPhoneMock />
          </div>
        </div>
      </section>

      {/* ── DUAL APP CARDS ───────────────────────────────────────── */}
      <section id="apps" className="dl-section">
        <div className="dl-container">
          <div className="dl-section-head">
            <div className="dl-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="dl-kicker">Two apps · one infrastructure</span>
              <h2 className="dl-serif dl-section-h">Pick the app for your seat at the table.</h2>
              <p className="dl-section-p">
                Both run on the same ECI-verified data layer, share encryption keys, and stay in
                sync across web and mobile.
              </p>
            </div>
          </div>
          <div className="dl-app-grid">
            <AppCard
              variant="staff"
              sub="App 01 · Field workforce"
              title="Pollistics Staff"
              desc="A free, offline-first companion for kāryakartās, BLOs, and ground co-ordinators. Log voter visits, claim booths, and queue work when the signal drops — sync resumes automatically."
              bullets={[
                'Offline queue with auto-sync — never lose a visit log',
                'Bilingual UI · English + हिन्दी throughout',
                'Camera-verified address & EPIC capture',
                'Encrypted local cache · BLE-tethered team mode',
              ]}
              meta={[
                ['APK', '28.4 MB', undefined],
                ['Min OS', 'Android 8.0', undefined],
                ['Pricing', 'Free', '#43c089'],
              ]}
              cta="Download Staff APK"
            />
            <AppCard
              variant="insight"
              featured
              sub="App 02 · Decision tier"
              title="Pollistics Insight"
              titleSuffix="Pro"
              desc="The full ECI archive, drill-down from state → district → vidhan sabha → booth → voter, with live demographic filters, sentiment heatmaps and saved segments. Built for MLAs, MPs and campaign rooms."
              bullets={[
                'Drill: state → district → AC → polling booth → voter list',
                'Live filters across 9 facets — age, caste, sub-caste, religion, education, employment, history, sentiment',
                'Server-side compute · results update as you tap',
                'Beautiful chart suite: donuts, age pyramids, sentiment heatmaps, turnout trends',
                'Saved segments tracked with weekly deltas',
              ]}
              meta={[
                ['APK', '31.2 MB', undefined],
                ['Min OS', 'Android 8.0', undefined],
                ['Pricing', '₹49,000/yr', '#ef2233'],
              ]}
              cta="Download Insight APK"
            />
          </div>
        </div>
      </section>

      {/* ── 8-FEATURE GRID ───────────────────────────────────────── */}
      <section className="dl-section">
        <div className="dl-container">
          <div className="dl-section-head">
            <div className="dl-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="dl-kicker">Built for India</span>
              <h2 className="dl-serif dl-section-h">Eight things both apps do right.</h2>
            </div>
          </div>
          <div className="dl-feature-grid">
            {FEATURES.map((f) => (
              <div key={f.num} className="dl-feature">
                <span className="dl-feature-num">{f.num}</span>
                <h4 className="dl-serif dl-feature-h">{f.h}</h4>
                <p className="dl-feature-p">{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSTALL DETAILS + QR ─────────────────────────────────── */}
      <section className="dl-section" id="spec">
        <div className="dl-container">
          <div className="dl-section-head">
            <div className="dl-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="dl-kicker">Install details</span>
              <h2 className="dl-serif dl-section-h">What you need on the phone.</h2>
            </div>
          </div>
          <div className="dl-details-grid">
            {DETAILS.map((d) => (
              <div key={d.k}>
                <div className="dl-mono dl-detail-k">{d.k}</div>
                <div className="dl-serif dl-detail-v">{d.v}</div>
                <div className="dl-detail-sub">{d.sub}</div>
              </div>
            ))}
          </div>
          <div className="dl-strip">
            <div>
              <span className="dl-kicker">Direct APK download</span>
              <h2 className="dl-serif" style={{ fontSize: 38, margin: '14px 0 12px', lineHeight: 1.05, fontWeight: 380, letterSpacing: '-0.02em' }}>
                Scan, install, sign in.
              </h2>
              <p style={{ color: 'var(--dl-ink-soft)', fontSize: 15, maxWidth: 460, margin: '0 0 22px' }}>
                Camera-scan this QR with the phone you want to install on. The APK is signed by
                Pollistics Media Pvt. Ltd. and verified by Play Protect on first launch.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a className="dl-btn-solid dl-btn-accent" href="#staff-apk">
                  Download Staff · 28 MB
                </a>
                <a className="dl-btn-solid" href="#insight-apk">
                  Download Insight · 31 MB
                </a>
              </div>
              <div className="dl-mono" style={{ fontSize: 11, color: 'var(--dl-muted)', marginTop: 16 }}>
                SHA-256 · 8f31…c4a2 · signed 14 May 2026
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="dl-qr" aria-label="Install QR code">
                <div className="dl-qr-grid">
                  {qrCells.map((on, i) => (
                    <span key={i} style={{ background: on ? '#0a0a0c' : 'transparent' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="dl-footer">
        <div className="dl-container">
          <div className="dl-footer-top">
            <div>
              <div className="dl-footer-brand">
                <img src="/pollistics-logo.png" alt="" width={34} height={34} style={{ borderRadius: '50%' }} />
                <span style={{ fontFamily: 'var(--font-newsreader), serif', fontSize: 24, fontWeight: 600 }}>
                  Pollistics
                </span>
              </div>
              <p className="dl-footer-tag">
                The world&apos;s largest democracy deserves the world&apos;s clearest election record — on
                the desk and in the pocket.
              </p>
              <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
                <a className="dl-btn-solid dl-btn-accent" href="#sales">
                  Talk to sales
                </a>
                <a
                  className="dl-btn-ghost"
                  href="#spec"
                  style={{ borderColor: 'rgba(255,255,255,.2)', color: '#f5f3ef' }}>
                  Read the spec
                </a>
              </div>
            </div>
            {FOOTER_COLS.map(([title, items]) => (
              <div key={title} className="dl-footer-col">
                <h5 className="dl-mono">{title.toUpperCase()}</h5>
                <ul>
                  {items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="dl-footer-bottom dl-mono">
            <span>© 2026 Pollistics Media Pvt. Ltd. · ECI-verified election archive</span>
            <span>v2.1 · build 247 · APK signed 14 May 2026</span>
          </div>
        </div>
      </footer>

      <PageStyles />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* HERO PHONE MOCKUP                                                    */
/* ──────────────────────────────────────────────────────────────────── */

function HeroPhoneMock() {
  // Sentiment booth grid colours from the design
  const sentBooths = [
    '#5BA37E', '#1F7A4E', '#5BA37E', '#B7873A', '#1F7A4E', '#B7873A',
    '#5BA37E', '#D67E62', '#5BA37E', '#D67E62', '#B7873A', '#1F7A4E',
  ];
  return (
    <div className="dl-phone-hero">
      <div className="dl-phone-screen">
        <div className="dl-phone-status">
          {/* Phone interior is pinned to a dark scheme regardless of the
           * page theme — use literal colours so studio (light) doesn't
           * collapse the contrast inside the mockup. */}
          <span className="dl-mono dl-tnum" style={{ fontSize: 12, color: '#f5f5f7' }}>
            9:41
          </span>
          <span className="dl-phone-punch" />
          <span className="dl-phone-battery">
            <span />
          </span>
        </div>
        <div className="dl-phone-content">
          <img src="/pollistics-logo.png" alt="" width={44} height={44} style={{ borderRadius: '50%' }} />
          <div className="dl-serif" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.4px' }}>
            POLLSTICS
          </div>
          <div
            className="dl-mono"
            style={{
              fontSize: 9.5,
              color: '#ef2233',
              letterSpacing: '.18em',
              fontWeight: 700,
            }}>
            INSIGHT · PRO · 2024
          </div>

          <div className="dl-phone-card">
            <div className="dl-mono" style={{ fontSize: 9, color: '#85858d', letterSpacing: '.12em' }}>
              VOTERS IN AC
            </div>
            <div className="dl-serif" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.5px', marginTop: 4 }}>
              368K
            </div>
            <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 10 }}>
              <span style={{ flex: 41, background: '#B7873A' }} />
              <span style={{ flex: 22, background: '#1F3A8A' }} />
              <span style={{ flex: 21, background: '#1F7A4E' }} />
              <span style={{ flex: 13, background: '#ef2233' }} />
              <span style={{ flex: 3, background: '#205B9C' }} />
            </div>
            <div
              className="dl-mono"
              style={{ fontSize: 9, color: '#85858d', marginTop: 8, letterSpacing: '.05em' }}>
              OBC 41 · GEN 22 · SC 21 · MIN 13 · ST 3
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div className="dl-phone-kpi">
              <div className="dl-mono" style={{ fontSize: 8.5, color: '#85858d', letterSpacing: '.1em' }}>
                PRED.
              </div>
              <div className="dl-serif" style={{ fontSize: 16, fontWeight: 600 }}>
                38.4%
              </div>
            </div>
            <div className="dl-phone-kpi">
              <div className="dl-mono" style={{ fontSize: 8.5, color: '#85858d', letterSpacing: '.1em' }}>
                SENT.
              </div>
              <div className="dl-serif" style={{ fontSize: 16, fontWeight: 600, color: '#43c089' }}>
                +0.42
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
            {sentBooths.map((c, i) => (
              <span key={i} style={{ width: 22, height: 22, background: c, borderRadius: 3 }} />
            ))}
          </div>
        </div>
        <div className="dl-phone-pill">
          <span />
        </div>
      </div>
      <span className="dl-phone-side" style={{ left: -2, top: 130, width: 3, height: 32 }} />
      <span className="dl-phone-side" style={{ left: -2, top: 178, width: 3, height: 52 }} />
      <span className="dl-phone-side" style={{ right: -2, top: 152, width: 3, height: 72 }} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* APP CARDS                                                            */
/* ──────────────────────────────────────────────────────────────────── */

interface AppCardProps {
  variant: 'staff' | 'insight';
  featured?: boolean;
  sub: string;
  title: string;
  titleSuffix?: string;
  desc: string;
  bullets: string[];
  meta: ReadonlyArray<readonly [string, string, string | undefined]>;
  cta: string;
}

function AppCard(props: AppCardProps) {
  return (
    <div className={`dl-app-card ${props.featured ? 'dl-app-featured' : ''}`}>
      <span className="dl-app-sub">{props.sub}</span>
      <h3 className="dl-serif dl-app-h">
        {props.title}{' '}
        {props.titleSuffix && (
          <span style={{ color: 'var(--dl-accent)', fontSize: 18, fontStyle: 'italic' }}>
            {props.titleSuffix}
          </span>
        )}
      </h3>
      <p className="dl-app-desc">{props.desc}</p>

      <div className="dl-app-preview">
        <div className="dl-app-preview-screen">
          {props.variant === 'staff' ? <StaffPreview /> : <InsightPreview />}
        </div>
      </div>

      <ul className="dl-app-bullets">
        {props.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      <div className="dl-app-meta">
        {props.meta.map(([k, v, c]) => (
          <div key={k}>
            <span>{k}</span>
            <b style={c ? { color: c } : undefined}>{v}</b>
          </div>
        ))}
      </div>

      <button className="dl-btn-solid dl-btn-accent">{props.cta}</button>
    </div>
  );
}

function StaffPreview() {
  return (
    <div className="dl-mini-screen">
      <div className="dl-mini-status">
        <span>9:41</span>
        <span className="dl-mini-punch" />
        <span className="dl-mini-battery" />
      </div>
      <div className="dl-mini-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/pollistics-logo.png" alt="" width={22} height={22} style={{ borderRadius: '50%' }} />
          <div className="dl-serif" style={{ fontSize: 14, fontWeight: 700 }}>
            POLLSTICS
          </div>
        </div>
        <div className="dl-serif" style={{ fontSize: 11, color: '#6B7383' }}>
          कार्यकर्ता · ASHA D.
        </div>
        <div className="dl-mini-card">
          <div className="dl-mono" style={{ fontSize: 8, color: '#6B7383', letterSpacing: '.1em' }}>
            TODAY · 12 BOOTHS
          </div>
          <div className="dl-serif" style={{ fontSize: 20, fontWeight: 700, color: '#1F3A8A', marginTop: 4 }}>
            184{' '}
            <span style={{ fontSize: 11, color: '#6B7383', fontWeight: 500 }}>visits logged</span>
          </div>
          <div style={{ height: 4, background: '#EFEAE0', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
            <span style={{ display: 'block', width: '62%', height: '100%', background: '#1F3A8A' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="dl-mini-kpi">
            <div className="dl-mono" style={{ fontSize: 8, color: '#6B7383' }}>
              QUEUE
            </div>
            <div className="dl-serif" style={{ fontSize: 16, fontWeight: 700 }}>
              7
            </div>
          </div>
          <div className="dl-mini-kpi">
            <div className="dl-mono" style={{ fontSize: 8, color: '#B7873A', fontWeight: 700 }}>
              OFFLINE
            </div>
            <div className="dl-serif" style={{ fontSize: 16, fontWeight: 700 }}>
              3
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="dl-mini-nav">
          <span style={{ color: '#1F3A8A', fontWeight: 700 }}>HOME</span>
          <span>BOOTHS</span>
          <span>EXPLORE</span>
          <span>QUEUE</span>
        </div>
      </div>
    </div>
  );
}

function InsightPreview() {
  return (
    <div className="dl-mini-screen">
      <div className="dl-mini-status">
        <span>9:41</span>
        <span className="dl-mini-punch" />
        <span className="dl-mini-battery" />
      </div>
      <div className="dl-mini-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/pollistics-logo.png" alt="" width={22} height={22} style={{ borderRadius: '50%' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span className="dl-serif" style={{ fontSize: 12, fontWeight: 700 }}>
              POLLSTICS
            </span>
            <span className="dl-mono" style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1.5, color: '#B8331F', marginTop: 2 }}>
              INSIGHT · PRO
            </span>
          </div>
        </div>
        <div className="dl-serif" style={{ fontSize: 14, fontWeight: 700 }}>
          Hon. Aman Verma
        </div>
        <div className="dl-mono" style={{ fontSize: 8.5, color: '#6B7383', letterSpacing: '.05em' }}>
          UP-173 · LUCKNOW CENTRAL
        </div>
        <div style={{ padding: 10, background: '#1F3A8A', color: '#fff', borderRadius: 8, marginTop: 2 }}>
          <div className="dl-mono" style={{ fontSize: 8, opacity: 0.65, letterSpacing: '.1em' }}>
            LIVE FILTER
          </div>
          <div className="dl-serif" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            1,847{' '}
            <span style={{ fontSize: 11, opacity: 0.5, fontWeight: 400 }}>/ 60</span>
          </div>
          <div style={{ fontSize: 9, opacity: 0.85, marginTop: 4 }}>F · 26–50 · OBC · Lean+</div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
          <span style={{ flex: 41, height: 6, background: '#B7873A', borderRadius: 2 }} />
          <span style={{ flex: 22, height: 6, background: '#1F3A8A', borderRadius: 2 }} />
          <span style={{ flex: 21, height: 6, background: '#1F7A4E', borderRadius: 2 }} />
          <span style={{ flex: 13, height: 6, background: '#B8331F', borderRadius: 2 }} />
        </div>
        <div style={{ flex: 1 }} />
        <div className="dl-mini-nav">
          <span>HOME</span>
          <span style={{ color: '#1F3A8A', fontWeight: 700 }}>EXPLORE</span>
          <span>INSIGHTS</span>
          <span>SAVED</span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* STYLES                                                               */
/* ──────────────────────────────────────────────────────────────────── */

function PageStyles() {
  return (
    <style jsx global>{`
      /* BROADCAST — deep charcoal field, vivid red, off-white */
      .dl-page.theme-broadcast {
        --dl-bg: #111114;
        --dl-bg-tint: #17171b;
        --dl-paper: #1a1a1e;
        --dl-paper-2: #222228;
        --dl-ink: #f5f5f7;
        --dl-ink-soft: #d4d4d8;
        --dl-muted: #85858d;
        --dl-rule: #2a2a30;
        --dl-rule-2: #3d3d45;
        --dl-accent: #ef2233;
        --dl-chip-bg: rgba(245, 245, 247, 0.07);
      }
      /* STUDIO (default) — cool white, jet-black ink, logo red */
      .dl-page.theme-studio {
        --dl-bg: #f3f4f6;
        --dl-bg-tint: #e8eaee;
        --dl-paper: #ffffff;
        --dl-paper-2: #f7f8fa;
        --dl-ink: #0d0d10;
        --dl-ink-soft: #1f1f24;
        --dl-muted: #65686e;
        --dl-rule: #d8dbe0;
        --dl-rule-2: #b4b8c0;
        --dl-accent: #e11e2c;
        --dl-chip-bg: rgba(13, 13, 16, 0.05);
      }
      /* SIGNAL — red-on-black poster */
      .dl-page.theme-signal {
        --dl-bg: #0e0e10;
        --dl-bg-tint: #16161a;
        --dl-paper: #14141a;
        --dl-paper-2: #1e1e25;
        --dl-ink: #f5efe6;
        --dl-ink-soft: #d8d2c8;
        --dl-muted: #8a8088;
        --dl-rule: #2c2530;
        --dl-rule-2: #443a48;
        --dl-accent: #ff2a3a;
        --dl-chip-bg: rgba(255, 42, 58, 0.1);
      }
      .dl-page {
        background: var(--dl-bg);
        color: var(--dl-ink);
        font-family: var(--font-instrument), 'Instrument Sans', system-ui, sans-serif;
        font-size: 15px;
        line-height: 1.45;
        min-height: 100vh;
        -webkit-font-smoothing: antialiased;
      }
      .dl-page .dl-serif {
        font-family: var(--font-newsreader), 'Newsreader', Georgia, serif;
        font-weight: 420;
        letter-spacing: -0.01em;
      }
      .dl-page .dl-serif-it {
        font-family: var(--font-newsreader), 'Newsreader', Georgia, serif;
        font-style: italic;
        font-weight: 360;
      }
      .dl-page .dl-mono {
        font-family: var(--font-jetbrains), 'JetBrains Mono', ui-monospace, Menlo, monospace;
      }
      .dl-page .dl-tnum {
        font-variant-numeric: tabular-nums;
      }
      .dl-page .dl-accent {
        color: var(--dl-accent);
      }
      .dl-page .dl-container {
        max-width: 1360px;
        margin: 0 auto;
        padding: 0 28px;
      }
      .dl-page .dl-section {
        padding: 60px 0;
        border-top: 1px solid var(--dl-rule);
      }
      .dl-page .dl-thick-rule {
        height: 1px;
        background: var(--dl-ink);
        opacity: 0.65;
      }
      .dl-page .dl-kicker {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-jetbrains), monospace;
        font-size: 10.5px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--dl-accent);
      }
      .dl-page .dl-kicker::before {
        content: '';
        width: 6px;
        height: 6px;
        background: var(--dl-accent);
        display: inline-block;
        border-radius: 50%;
      }

      /* Buttons */
      .dl-page .dl-btn-solid {
        height: 44px;
        padding: 0 22px;
        font-size: 14px;
        font-weight: 600;
        background: var(--dl-ink);
        /* Use --dl-paper so the label inverts with the theme — black text
         * on white ink in broadcast, white text on black ink in studio. */
        color: var(--dl-paper);
        border: 0;
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
      }
      .dl-page .dl-btn-ghost {
        height: 44px;
        padding: 0 18px;
        font-size: 14px;
        font-weight: 500;
        background: transparent;
        color: var(--dl-ink);
        border: 1px solid var(--dl-rule-2);
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
      }
      .dl-page .dl-btn-accent {
        background: var(--dl-accent);
        color: #fff;
        border-color: var(--dl-accent);
      }
      .dl-page .dl-btn-sm {
        height: 34px;
        padding: 0 14px;
        font-size: 13px;
      }
      /* Hamburger + drawer (mobile only) */
      .dl-page .dl-burger {
        display: none;
        flex-direction: column;
        justify-content: center;
        gap: 4px;
        width: 38px;
        height: 38px;
        padding: 8px;
        background: var(--dl-paper);
        border: 1px solid var(--dl-rule);
        border-radius: 4px;
        cursor: pointer;
      }
      .dl-page .dl-burger > span {
        display: block;
        width: 100%;
        height: 2px;
        background: var(--dl-ink);
        border-radius: 1px;
      }
      .dl-drawer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease;
        z-index: 90;
      }
      .dl-drawer-overlay.dl-drawer-open {
        opacity: 1;
        pointer-events: auto;
      }
      .dl-page .dl-drawer {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(82vw, 320px);
        background: var(--dl-paper);
        border-left: 1px solid var(--dl-rule);
        z-index: 100;
        transform: translateX(100%);
        transition: transform 0.28s cubic-bezier(0.2, 0.7, 0.2, 1);
        display: flex;
        flex-direction: column;
        box-shadow: -20px 0 40px -20px rgba(0, 0, 0, 0.35);
        visibility: hidden;
      }
      .dl-page .dl-drawer.dl-drawer-open {
        transform: translateX(0);
        visibility: visible;
      }
      .dl-page .dl-drawer-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        border-bottom: 1px solid var(--dl-rule);
      }
      .dl-page .dl-drawer-close {
        width: 36px;
        height: 36px;
        background: transparent;
        border: 1px solid var(--dl-rule);
        border-radius: 4px;
        font-size: 22px;
        line-height: 1;
        color: var(--dl-ink);
        cursor: pointer;
        font-family: inherit;
      }
      .dl-page .dl-drawer-nav {
        display: flex;
        flex-direction: column;
        padding: 8px 0;
        flex: 1;
        overflow-y: auto;
      }
      .dl-page .dl-drawer-item {
        display: block;
        padding: 14px 22px;
        font-size: 15px;
        font-weight: 500;
        color: var(--dl-ink-soft);
        text-decoration: none;
        border-left: 3px solid transparent;
      }
      .dl-page .dl-drawer-item-active {
        color: var(--dl-ink);
        border-left-color: var(--dl-accent);
        background: var(--dl-paper-2);
      }
      .dl-page .dl-drawer-foot {
        padding: 16px 18px;
        border-top: 1px solid var(--dl-rule);
      }

      /* HEADER */
      .dl-page .dl-header {
        position: sticky;
        top: 0;
        z-index: 50;
        background: var(--dl-bg);
        border-bottom: 1px solid var(--dl-rule);
      }
      .dl-page .dl-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 60px;
      }
      .dl-page .dl-brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
      }
      .dl-page .dl-brand-img {
        border-radius: 50%;
        display: block;
      }
      .dl-page .dl-brand-name {
        font-family: var(--font-newsreader), serif;
        font-size: 22px;
        font-weight: 600;
        letter-spacing: -0.015em;
        color: var(--dl-ink);
      }
      .dl-page .dl-brand-tag {
        font-family: var(--font-jetbrains), monospace;
        font-size: 9.5px;
        color: var(--dl-muted);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        border-left: 1px solid var(--dl-rule);
        padding-left: 10px;
        margin-left: 2px;
      }
      .dl-page .dl-nav {
        display: flex;
        align-items: center;
        gap: 22px;
        font-size: 13.5px;
      }
      .dl-page .dl-nav-item {
        color: var(--dl-ink-soft);
        font-weight: 500;
        padding: 18px 0;
        border-bottom: 1.5px solid transparent;
        text-decoration: none;
      }
      .dl-page .dl-nav-active {
        color: var(--dl-ink);
        font-weight: 600;
        border-bottom-color: var(--dl-accent);
      }

      /* HERO */
      .dl-page .dl-hero {
        padding: 80px 0 60px;
      }
      .dl-page .dl-hero-grid {
        display: grid;
        grid-template-columns: 1.15fr 1fr;
        gap: 56px;
        align-items: center;
      }
      .dl-page .dl-hero-h {
        font-size: 84px;
        line-height: 0.96;
        margin: 18px 0 0;
        font-weight: 360;
        letter-spacing: -0.025em;
      }
      .dl-page .dl-hero-p {
        font-weight: 380;
        font-size: 18px;
        line-height: 1.5;
        color: var(--dl-ink-soft);
        max-width: 540px;
        margin-top: 22px;
      }
      .dl-page .dl-cta-row {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
        margin-top: 28px;
      }
      .dl-page .dl-hero-meta {
        font-size: 11px;
        color: var(--dl-muted);
        margin-left: 8px;
      }

      /* Phone mockup hero — interior always dark with light text so the
       * mockup reads identically across all three themes. */
      .dl-page .dl-phone-hero {
        position: relative;
        width: 340px;
        aspect-ratio: 380 / 824;
        margin: 0 auto;
        border-radius: 44px;
        padding: 8px;
        background: #1f1c1a;
        box-shadow: 0 30px 80px -10px rgba(0, 0, 0, 0.6),
          inset 0 0 0 1px rgba(255, 255, 255, 0.04), inset 0 0 0 2px #0e0c0b;
        color: #f5f5f7;
      }
      .dl-page .dl-phone-screen {
        width: 100%;
        height: 100%;
        border-radius: 36px;
        background: linear-gradient(170deg, #1a1a1e 0%, #232228 100%);
        overflow: hidden;
        position: relative;
        display: flex;
        flex-direction: column;
        color: #f5f5f7;
      }
      .dl-page .dl-phone-status {
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 18px;
        flex-shrink: 0;
        position: relative;
      }
      .dl-page .dl-phone-punch {
        position: absolute;
        left: 50%;
        top: 8px;
        transform: translateX(-50%);
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #0a0907;
      }
      .dl-page .dl-phone-battery {
        display: inline-block;
        width: 18px;
        height: 9px;
        border: 1.2px solid #f5f5f7;
        border-radius: 2px;
        position: relative;
      }
      .dl-page .dl-phone-battery > span {
        position: absolute;
        left: 1px;
        top: 1px;
        bottom: 1px;
        width: 11px;
        background: #f5f5f7;
        border-radius: 1px;
      }
      .dl-page .dl-phone-content {
        flex: 1;
        padding: 20px 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .dl-page .dl-phone-card {
        margin-top: 10px;
        padding: 14px;
        background: rgba(245, 245, 247, 0.04);
        border-radius: 10px;
      }
      .dl-page .dl-phone-kpi {
        flex: 1;
        padding: 10px;
        background: rgba(245, 245, 247, 0.04);
        border-radius: 8px;
      }
      .dl-page .dl-phone-pill {
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .dl-page .dl-phone-pill > span {
        width: 108px;
        height: 4px;
        background: #f5f5f7;
        opacity: 0.45;
        border-radius: 2px;
      }
      .dl-page .dl-phone-side {
        position: absolute;
        background: #0e0c0b;
        border-radius: 1.5px;
      }

      /* SECTION HEAD */
      .dl-page .dl-section-head {
        margin-bottom: 36px;
      }
      .dl-page .dl-section-h {
        font-size: 44px;
        font-weight: 380;
        letter-spacing: -0.02em;
        margin: 10px 0 0;
        line-height: 1.05;
      }
      .dl-page .dl-section-p {
        color: var(--dl-muted);
        max-width: 640px;
        font-size: 15px;
        margin-top: 12px;
      }

      /* DUAL APP CARDS */
      .dl-page .dl-app-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }
      .dl-page .dl-app-card {
        background: var(--dl-paper);
        border: 1px solid var(--dl-rule);
        border-radius: 6px;
        padding: 28px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .dl-page .dl-app-featured {
        border-color: var(--dl-accent);
        position: relative;
      }
      .dl-page .dl-app-featured::before {
        content: 'PREMIUM';
        position: absolute;
        top: -10px;
        left: 28px;
        background: var(--dl-accent);
        color: #fff;
        font-family: var(--font-jetbrains), monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.15em;
        padding: 4px 8px;
        border-radius: 3px;
      }
      .dl-page .dl-app-h {
        font-weight: 420;
        font-size: 30px;
        letter-spacing: -0.015em;
        margin: 0;
      }
      .dl-page .dl-app-sub {
        font-family: var(--font-jetbrains), monospace;
        font-size: 11px;
        color: var(--dl-muted);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .dl-page .dl-app-desc {
        color: var(--dl-ink-soft);
        font-size: 14px;
        line-height: 1.5;
      }
      .dl-page .dl-app-bullets {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .dl-page .dl-app-bullets li {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        font-size: 13.5px;
        color: var(--dl-ink-soft);
      }
      .dl-page .dl-app-bullets li::before {
        content: '';
        flex-shrink: 0;
        width: 6px;
        height: 6px;
        background: var(--dl-accent);
        border-radius: 50%;
        margin-top: 7px;
      }
      .dl-page .dl-app-meta {
        display: flex;
        gap: 18px;
        padding-top: 16px;
        border-top: 1px solid var(--dl-rule);
        font-family: var(--font-jetbrains), monospace;
        font-size: 11px;
        color: var(--dl-muted);
      }
      .dl-page .dl-app-meta b {
        color: var(--dl-ink);
        font-weight: 600;
        font-family: var(--font-newsreader), serif;
        font-size: 16px;
        display: block;
        margin-top: 4px;
      }

      /* App preview phone (smaller) */
      .dl-page .dl-app-preview {
        width: 220px;
        aspect-ratio: 380 / 824;
        border-radius: 32px;
        padding: 6px;
        background: #1f1c1a;
        margin: 0 auto;
        box-shadow: 0 18px 40px -10px rgba(0, 0, 0, 0.5),
          inset 0 0 0 1px rgba(255, 255, 255, 0.04), inset 0 0 0 2px #0e0c0b;
      }
      .dl-page .dl-app-preview-screen {
        width: 100%;
        height: 100%;
        border-radius: 26px;
        overflow: hidden;
        position: relative;
        display: flex;
        flex-direction: column;
      }
      .dl-page .dl-mini-screen {
        background: #f8f6f1;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .dl-page .dl-mini-status {
        height: 22px;
        padding: 0 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-family: var(--font-jetbrains), monospace;
        font-size: 9.5px;
        font-weight: 600;
        color: #0f1b2d;
        position: relative;
      }
      .dl-page .dl-mini-punch {
        position: absolute;
        left: 50%;
        top: 5px;
        transform: translateX(-50%);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #0a0907;
      }
      .dl-page .dl-mini-battery {
        display: inline-block;
        width: 12px;
        height: 7px;
        border: 1px solid #0f1b2d;
        border-radius: 1.5px;
      }
      .dl-page .dl-mini-body {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
        color: #0f1b2d;
      }
      .dl-page .dl-mini-card {
        margin-top: 4px;
        padding: 10px;
        background: #fff;
        border: 1px solid #e6e1d6;
        border-radius: 8px;
      }
      .dl-page .dl-mini-kpi {
        flex: 1;
        padding: 8px;
        background: #fff;
        border: 1px solid #e6e1d6;
        border-radius: 6px;
      }
      .dl-page .dl-mini-nav {
        display: flex;
        padding-top: 6px;
        border-top: 1px solid #e6e1d6;
        gap: 4px;
        font-size: 8px;
        color: #6b7383;
      }
      .dl-page .dl-mini-nav > span {
        flex: 1;
        text-align: center;
      }

      /* 8-feature grid */
      .dl-page .dl-feature-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1px;
        background: var(--dl-rule);
        border: 1px solid var(--dl-rule);
        margin-top: 28px;
      }
      .dl-page .dl-feature {
        background: var(--dl-paper);
        padding: 28px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .dl-page .dl-feature-num {
        font-family: var(--font-jetbrains), monospace;
        font-size: 11px;
        color: var(--dl-accent);
        letter-spacing: 0.15em;
        font-weight: 700;
      }
      .dl-page .dl-feature-h {
        font-size: 22px;
        font-weight: 420;
        letter-spacing: -0.015em;
        margin: 4px 0;
        line-height: 1.15;
      }
      .dl-page .dl-feature-p {
        color: var(--dl-muted);
        font-size: 13px;
        line-height: 1.55;
        margin: 0;
      }

      /* Details + QR */
      .dl-page .dl-details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        gap: 32px;
      }
      .dl-page .dl-detail-k {
        font-size: 11px;
        color: var(--dl-muted);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .dl-page .dl-detail-v {
        font-size: 26px;
        font-weight: 500;
        letter-spacing: -0.02em;
      }
      .dl-page .dl-detail-sub {
        font-size: 12.5px;
        color: var(--dl-muted);
        margin-top: 4px;
      }
      .dl-page .dl-strip {
        padding: 56px;
        margin: 60px 0 0;
        background: var(--dl-paper-2);
        border: 1px solid var(--dl-rule);
        border-radius: 8px;
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 36px;
        align-items: center;
      }
      .dl-page .dl-qr {
        width: 200px;
        height: 200px;
        border-radius: 8px;
        background: #fff;
        padding: 14px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
      }
      .dl-page .dl-qr-grid {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-columns: repeat(21, 1fr);
        grid-template-rows: repeat(21, 1fr);
        gap: 0;
      }

      /* Footer */
      .dl-page .dl-footer {
        background: #0e0e10;
        color: #f5f3ef;
        margin-top: 56px;
      }
      .dl-page .dl-footer .dl-container {
        padding-top: 56px;
        padding-bottom: 32px;
      }
      .dl-page .dl-footer-top {
        display: grid;
        grid-template-columns: 1.6fr 1fr 1fr 1fr;
        gap: 36px;
        align-items: flex-start;
      }
      .dl-page .dl-footer-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .dl-page .dl-footer-tag {
        font-family: var(--font-newsreader), serif;
        font-size: 17px;
        line-height: 1.4;
        color: rgba(243, 236, 225, 0.7);
        max-width: 320px;
        margin-top: 14px;
      }
      .dl-page .dl-footer-col h5 {
        font-family: var(--font-jetbrains), monospace;
        font-size: 10.5px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: rgba(243, 236, 225, 0.55);
        margin: 0 0 14px;
        font-weight: 600;
      }
      .dl-page .dl-footer-col ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
      .dl-page .dl-footer-col li {
        font-size: 13px;
        color: rgba(243, 236, 225, 0.82);
      }
      .dl-page .dl-footer-bottom {
        margin-top: 48px;
        padding-top: 20px;
        border-top: 1px solid rgba(243, 236, 225, 0.12);
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 11px;
        color: rgba(243, 236, 225, 0.5);
      }

      /* Mobile */
      @media (max-width: 960px) {
        .dl-page .dl-container {
          padding: 0 16px;
        }
        .dl-page .dl-nav {
          display: none;
        }
        .dl-page .dl-burger {
          display: inline-flex;
        }
        .dl-page .dl-header-signin {
          display: none;
        }
        .dl-page .dl-brand-tag {
          display: none;
        }
        .dl-page .dl-hero {
          padding: 40px 0;
        }
        .dl-page .dl-hero-grid {
          grid-template-columns: 1fr;
          gap: 36px;
        }
        .dl-page .dl-hero-h {
          font-size: 46px;
          line-height: 1.02;
        }
        .dl-page .dl-phone-hero {
          width: 260px;
        }
        .dl-page .dl-section-h {
          font-size: 28px;
        }
        .dl-page .dl-app-grid {
          grid-template-columns: 1fr;
        }
        .dl-page .dl-feature-grid {
          grid-template-columns: 1fr 1fr;
        }
        .dl-page .dl-details-grid {
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        .dl-page .dl-strip {
          grid-template-columns: 1fr;
          padding: 28px;
          gap: 22px;
          text-align: center;
        }
        .dl-page .dl-qr {
          margin: 0 auto;
          width: 160px;
          height: 160px;
        }
        .dl-page .dl-footer-top {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 640px) {
        .dl-page .dl-hero {
          padding: 28px 0;
        }
        .dl-page .dl-hero-h {
          font-size: 36px;
        }
        .dl-page .dl-hero-p {
          font-size: 15px;
        }
        .dl-page .dl-cta-row {
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
        }
        .dl-page .dl-cta-row > .dl-btn-solid,
        .dl-page .dl-cta-row > .dl-btn-ghost {
          width: 100%;
          justify-content: center;
        }
        .dl-page .dl-cta-row > .dl-hero-meta {
          text-align: center;
        }
        .dl-page .dl-feature-grid {
          grid-template-columns: 1fr;
        }
        .dl-page .dl-details-grid {
          grid-template-columns: 1fr 1fr;
        }
        .dl-page .dl-footer-top {
          grid-template-columns: 1fr;
          gap: 28px;
        }
        .dl-page .dl-footer-bottom {
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }
      }
    `}</style>
  );
}
