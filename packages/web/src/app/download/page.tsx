'use client';

/**
 * Pollistics — Android apps download page.
 * Faithful translation of the handoff's Download.html (coral / navy / cream).
 */

import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';

const FEATURES = [
  { num: '01', h: 'Offline-first', p: "Every write queues locally, syncs the moment you're back on signal." },
  { num: '02', h: 'Bilingual UI', p: 'EN + हिन्दी across every screen, readable on entry-level Androids.' },
  { num: '03', h: 'ECI-verified data', p: "Numbers from the Election Commission's primary tables." },
  { num: '04', h: 'End-to-end encrypted', p: 'Voter PII never leaves the device unencrypted.' },
  { num: '05', h: 'Light on memory', p: 'Built for sub-3GB phones; 75-year archive in 28 MB.' },
  { num: '06', h: 'Role-aware', p: 'One install, scoped views for worker, coordinator and MLA.' },
  { num: '07', h: 'OTA updates', p: 'Patched overnight; new election data the same hour ECI publishes.' },
  { num: '08', h: 'Audit trail', p: 'Every visit, filter and export logged and exportable.' },
];

// Deterministic QR mosaic — ported verbatim from Download.html so the
// pattern is identical on server and client (no hydration mismatch).
function buildQR(): boolean[] {
  let s = 173047;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const finder = (x: number, y: number) => {
    const box = (cx: number, cy: number) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7;
    return box(0, 0) || box(14, 0) || box(0, 14);
  };
  const ring = (x: number, y: number) => {
    const rg = (cx: number, cy: number) => {
      if (x < cx || x > cx + 6 || y < cy || y > cy + 6) return false;
      const o = x === cx || x === cx + 6 || y === cy || y === cy + 6;
      const i = x >= cx + 2 && x <= cx + 4 && y >= cy + 2 && y <= cy + 4;
      return o || i;
    };
    return rg(0, 0) || rg(14, 0) || rg(0, 14);
  };
  const cells: boolean[] = [];
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      cells.push(finder(x, y) ? ring(x, y) : r() < 0.48);
    }
  }
  return cells;
}

const QR_CELLS = buildQR();

export default function DownloadPage() {
  return (
    <SiteShell active="app" footer="app">
      {/* HERO */}
      <section className="phero apphero" style={{ background: '#0b0b0d' }}>
        <div className="page apphero-grid">
          <div className="apphero-copy">
            <span className="tag">Pollistics Android apps</span>
            <h1>The campaign room, <span className="o">in your pocket.</span></h1>
            <p className="sub">Booth-level intelligence and field workflows on the same ECI-verified data layer — offline-first, bilingual, and built for entry-level Androids. Two apps, one command center.</p>
            <div className="cta-row">
              <a href="#apps" className="btn btn-coral">Download for Android →</a>
              <a href="#features" className="btn btn-ghost app-ghost">See features</a>
            </div>
            <div className="apphero-stats">
              <div className="s"><b>2</b><span>Android apps</span></div>
              <div className="s"><b>28 MB</b><span>Lightweight APK</span></div>
              <div className="s"><b>8.0+</b><span>Android</span></div>
              <div className="s"><b>EN · हिन्दी</b><span>Bilingual</span></div>
            </div>
          </div>
          <div className="apphero-img">
            <img src="/assets/app-hero.png" alt="The campaign room, in your pocket — Pollistics Android apps" />
          </div>
        </div>
      </section>

      {/* APPS */}
      <section className="section apps-sec" id="apps">
        <div className="page">
          <div className="section-head center">
            <span className="tag soft">Two apps · one infrastructure</span>
            <h2>Pick the app for your seat at the table.</h2>
            <p style={{ marginInline: 'auto' }}>Both run on the same ECI-verified data layer and stay in sync across web and mobile.</p>
          </div>
          <div className="app-grid">
            <div className="app-card">
              <span className="sub">App 01 · Field workforce</span>
              <h3>Pollistics Staff</h3>
              <p className="desc">A free, offline-first companion for karyakartas and booth coordinators. Log voter visits, claim booths and queue work when the signal drops.</p>
              <div className="app-shot" style={{ height: 'auto' }}><img src="/assets/staff-app.png" alt="Pollistics Staff app" style={{ objectFit: 'contain', height: 'auto', aspectRatio: '1920 / 849' }} /></div>
              <ul>
                <li>Offline queue with auto-sync</li>
                <li>Bilingual UI · English + हिन्दी</li>
                <li>Camera-verified address &amp; EPIC capture</li>
                <li>Encrypted local cache</li>
              </ul>
              <div className="meta"><div>APK<b>28.4 MB</b></div><div>Min OS<b>Android 8.0</b></div><div>Price<b style={{ color: '#157048' }}>Free</b></div></div>
              <button className="btn btn-coral" style={{ width: '100%' }}>Download Staff APK</button>
            </div>
            <div className="app-card featured">
              <span className="sub">App 02 · Decision tier</span>
              <h3>Pollistics Insight <span style={{ color: 'var(--coral)', fontStyle: 'italic' }}>Pro</span></h3>
              <p className="desc">The full ECI archive — drill from state → district → vidhan sabha → booth → voter, with live demographic filters, sentiment heatmaps and saved segments.</p>
              <div className="app-shot" style={{ height: 'auto' }}><img src="/assets/insight-pro.png" alt="Pollistics Insight Pro dashboard" style={{ objectFit: 'contain', height: 'auto', aspectRatio: '1983 / 793' }} /></div>
              <ul>
                <li>Drill: state → district → AC → booth → voter</li>
                <li>Live filters across 9 demographic facets</li>
                <li>Donuts, age pyramids, sentiment heatmaps</li>
                <li>Saved segments tracked with weekly deltas</li>
              </ul>
              <div className="meta"><div>APK<b>31.2 MB</b></div><div>Min OS<b>Android 8.0</b></div><div>Price<b style={{ color: 'var(--coral)' }}>₹49,000/yr</b></div></div>
              <button className="btn btn-coral" style={{ width: '100%' }}>Download Insight APK</button>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="features">
        <div className="page">
          <div className="rule-thick" style={{ marginBottom: 14 }} />
          <span className="tag soft">Built for India</span>
          <h2 style={{ fontSize: 40, fontWeight: 800, marginTop: 12 }}>Eight things both apps do right.</h2>
          <div className="feat-grid">
            {FEATURES.map((f) => (
              <div className="feat" key={f.num}>
                <span className="num">{f.num}</span>
                <h4>{f.h}</h4>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOWNLOAD STRIP */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="page">
          <div className="dl-strip">
            <div>
              <span className="tag">Direct APK download</span>
              <h2 style={{ marginTop: 14 }}>Scan, install, sign in.</h2>
              <p>Camera-scan this QR with the phone you want to install on. The APK is signed by Pollistics Media Pvt. Ltd. and verified by Play Protect on first launch.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-coral">Staff · 28 MB</button>
                <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>Insight · 31 MB</button>
              </div>
            </div>
            <div className="qr">
              <div className="g">
                {QR_CELLS.map((on, i) => (
                  <span key={i} style={on ? undefined : { background: 'transparent' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
