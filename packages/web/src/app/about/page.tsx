'use client';

import Link from 'next/link';
import { PublicShell } from '@/components/landing/PublicShell';

const TEAM = [
  { initials: 'SK', name: 'Satendra K. Nigam', role: 'Founder & CEO', desc: 'Former ECI observer, 15 years in election technology and public data.' },
  { initials: 'AP', name: 'Anita Prasad', role: 'Head of Data', desc: 'Led demographic modelling at CSDS. Built the 75-year ECI normalisation pipeline.' },
  { initials: 'RV', name: 'Rohit Verma', role: 'Engineering Lead', desc: 'Ex-Flipkart, architect of the offline-first mobile stack and real-time sync engine.' },
  { initials: 'NK', name: 'Nandini Kulkarni', role: 'Product Design', desc: 'Carnegie Mellon HCI. Designed the bilingual UI system across 3 platforms.' },
];

const VALUES = [
  { num: '01', h: 'ECI-first', p: 'Every number traces to an Election Commission source table. No aggregator scrapes, no modelled estimates without a cited method.' },
  { num: '02', h: 'Non-partisan', p: 'The platform is licensed to all parties equally. No preferential pricing, no exclusive data deals, no editorial influence.' },
  { num: '03', h: 'Privacy by default', p: 'Voter PII is encrypted at rest and in transit. Politician accounts see only admin-assigned booth slices — never the full roll.' },
  { num: '04', h: 'Built for India', p: 'Bilingual EN + हिन्दी UI, tested on sub-3 GB phones, offline-first for low-connectivity booths in rural constituencies.' },
];

const TIMELINE = [
  { year: '2024', event: 'Founded during Lok Sabha 2024. First 50 booths digitised in Lucknow Central.' },
  { year: '2025 Q1', event: 'Web dashboard launched. 12-state coverage. First campaign-room client.' },
  { year: '2025 Q3', event: 'Android apps shipped — Staff (free) + Insight Pro (₹49K/yr). 400+ booths live.' },
  { year: '2026', event: 'Full 75-year ECI archive normalised. 28+8 UT hex cartogram. Gemini Vision PDF parser.' },
];

export default function AboutPage() {
  return (
    <PublicShell activeNav="About">
      {/* Hero */}
      <section className="ps-hero-section">
        <div className="ps-container">
          <span className="ps-kicker">About Pollistics</span>
          <h1 className="ps-hero-title">
            India&apos;s election data,{' '}
            <em className="ps-serif-it ps-accent">read closely</em>.
          </h1>
          <p className="ps-hero-lede">
            Pollistics builds tools that turn raw Election Commission data into constituency-level intelligence — for newsrooms covering democracy, campaigns running outreach, and citizens watching their representatives.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">Mission</span>
              <h2 className="ps-section-h">Make ECI data legible, accessible, and accountable.</h2>
              <p className="ps-section-p">
                India&apos;s Election Commission publishes an extraordinary amount of data — but scattered across PDFs, regional formats, and legacy archives. Pollistics normalises, structures, and visualises that data so anyone from a first-time voter to a sitting MLA can understand what&apos;s happening in their constituency.
              </p>
            </div>
          </div>

          <div className="ps-cards-3">
            {[
              ['18', 'Lok Sabha elections', 'Full results 1952 → 2024'],
              ['312+', 'State elections', 'Vidhan Sabha archives normalised'],
              ['2.4M+', 'Candidates', 'Indexed with party, vote share, margin'],
            ].map(([num, label, sub]) => (
              <div key={label} className="ps-card">
                <div className="ps-serif" style={{ fontSize: 42, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1, color: 'var(--ps-accent)' }}>{num}</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginTop: 10 }}>{label}</div>
                <div className="ps-mono" style={{ fontSize: 11, color: 'var(--ps-muted)', marginTop: 4, letterSpacing: '.05em' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">Values</span>
              <h2 className="ps-section-h">Four commitments.</h2>
            </div>
          </div>
          <div className="ps-bordered-grid-4">
            {VALUES.map((v) => (
              <div key={v.num} style={{ background: 'var(--ps-paper)', padding: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="ps-mono" style={{ fontSize: 11, color: 'var(--ps-accent)', letterSpacing: '.15em', fontWeight: 700 }}>{v.num}</span>
                <h4 className="ps-serif" style={{ fontSize: 22, fontWeight: 420, letterSpacing: '-.015em', margin: '4px 0', lineHeight: 1.15 }}>{v.h}</h4>
                <p style={{ color: 'var(--ps-muted)', fontSize: 13, lineHeight: 1.55, margin: 0 }}>{v.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">Team</span>
              <h2 className="ps-section-h">The people behind the data.</h2>
            </div>
          </div>
          <div className="ps-cards-4">
            {TEAM.map((t) => (
              <div key={t.name} className="ps-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--ps-accent)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-newsreader), serif' }}>
                  {t.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{t.name}</div>
                  <div className="ps-mono" style={{ fontSize: 10.5, color: 'var(--ps-accent)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 2 }}>{t.role}</div>
                </div>
                <p style={{ color: 'var(--ps-muted)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">Timeline</span>
              <h2 className="ps-section-h">How we got here.</h2>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {TIMELINE.map((t, i) => (
              <div key={t.year} style={{ display: 'flex', gap: 28, padding: '24px 0', borderTop: i === 0 ? 'none' : '1px solid var(--ps-rule)' }}>
                <div className="ps-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ps-accent)', width: 80, flexShrink: 0, letterSpacing: '.05em' }}>{t.year}</div>
                <div className="ps-serif" style={{ fontSize: 17, color: 'var(--ps-ink-soft)', lineHeight: 1.5 }}>{t.event}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ps-section" style={{ textAlign: 'center', paddingBottom: 80 }}>
        <div className="ps-container">
          <span className="ps-kicker">Get started</span>
          <h2 className="ps-serif" style={{ fontSize: 36, fontWeight: 380, letterSpacing: '-.02em', margin: '14px 0 22px', lineHeight: 1.1 }}>
            Ready to see your constituency clearly?
          </h2>
          <div className="ps-hero-cta" style={{ justifyContent: 'center' }}>
            <Link href="/login" className="ps-btn-solid ps-btn-accent">Try Pollistics free</Link>
            <Link href="/download" className="ps-btn-ghost">Download the app</Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
