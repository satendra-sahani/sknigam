'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/landing/PublicShell';

const QUICK_LINKS = [
  { label: 'Lok Sabha 2024', sub: '543 seats · 18th general election', href: '#' },
  { label: 'Uttar Pradesh 2022', sub: '403 seats · vidhan sabha', href: '#' },
  { label: 'Maharashtra 2024', sub: '288 seats · vidhan sabha', href: '#' },
  { label: 'Karnataka 2023', sub: '224 seats · vidhan sabha', href: '#' },
  { label: 'West Bengal 2021', sub: '294 seats · vidhan sabha', href: '#' },
  { label: 'Tamil Nadu 2021', sub: '234 seats · vidhan sabha', href: '#' },
];

const RECENT_RESULTS = [
  { constituency: 'Lucknow Central', state: 'UP', type: 'Vidhan Sabha', year: 2022, winner: 'INC', margin: '8,640', color: '#1b66c9' },
  { constituency: 'Varanasi', state: 'UP', type: 'Lok Sabha', year: 2024, winner: 'BJP', margin: '1,52,513', color: '#e8731c' },
  { constituency: 'Amethi', state: 'UP', type: 'Lok Sabha', year: 2024, winner: 'SP', margin: '1,67,196', color: '#c8232c' },
  { constituency: 'Indore', state: 'MP', type: 'Lok Sabha', year: 2024, winner: 'BJP', margin: '11,75,092', color: '#e8731c' },
  { constituency: 'Thiruvananthapuram', state: 'KL', type: 'Lok Sabha', year: 2024, winner: 'INC', margin: '16,077', color: '#1b66c9' },
  { constituency: 'Kolkata Dakshin', state: 'WB', type: 'Lok Sabha', year: 2024, winner: 'TMC', margin: '2,89,095', color: '#1d8a5b' },
];

const SEARCH_CATEGORIES = [
  { icon: '🗳️', title: 'Constituencies', desc: 'Search any Lok Sabha or Vidhan Sabha seat — results, candidates, demographics, turnout.' },
  { icon: '👤', title: 'Candidates', desc: 'Find any candidate by name across 75 years of elections. Vote share, party history, win/loss record.' },
  { icon: '🏛️', title: 'Parties', desc: 'Party-level analytics: seats won, vote share trends, alliance history, state strongholds.' },
  { icon: '📊', title: 'Elections', desc: 'Browse any election — general or state — from 1952 to the latest bypoll.' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');

  return (
    <PublicShell activeNav="Search">
      {/* Hero + Search bar */}
      <section style={{ padding: '80px 0 40px' }}>
        <div className="ps-container">
          <span className="ps-kicker">Search the archive</span>
          <h1 className="ps-serif" style={{ fontSize: 56, fontWeight: 360, letterSpacing: '-.025em', lineHeight: 1, marginTop: 18 }}>
            Every seat, every candidate,{' '}
            <em className="ps-serif-it ps-accent">every election</em>.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ps-ink-soft)', maxWidth: 600, marginTop: 18, lineHeight: 1.5, fontFamily: 'var(--font-newsreader), serif', fontWeight: 380 }}>
            Search across 18 Lok Sabha elections, 312+ state elections, and 2.4 million candidate records — all sourced from the Election Commission of India.
          </p>

          {/* Search input */}
          <div style={{ marginTop: 36, maxWidth: 680, position: 'relative' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search constituencies, candidates, parties, elections…"
              style={{
                width: '100%', height: 56, padding: '0 56px 0 20',
                fontSize: 16, fontFamily: 'inherit',
                background: 'var(--ps-paper)', border: '1px solid var(--ps-rule)',
                borderRadius: 6, color: 'var(--ps-ink)', outline: 'none',
              }}
            />
            <div style={{
              position: 'absolute', right: 8, top: 8, width: 40, height: 40,
              borderRadius: 4, background: 'var(--ps-accent)', display: 'grid', placeItems: 'center',
              cursor: 'pointer',
            }}>
              <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />
              </svg>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {['Lucknow Central', 'Narendra Modi', 'BJP 2024', 'Tamil Nadu turnout'].map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                style={{
                  padding: '6px 12px', borderRadius: 4, fontSize: 12.5, fontWeight: 500,
                  background: 'var(--ps-chip-bg)', border: '1px solid var(--ps-rule)',
                  color: 'var(--ps-ink-soft)', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Search categories */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">Browse by category</span>
              <h2 className="ps-section-h">Four ways into the archive.</h2>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--ps-rule)', border: '1px solid var(--ps-rule)' }}>
            {SEARCH_CATEGORIES.map((c) => (
              <div key={c.title} style={{ background: 'var(--ps-paper)', padding: 28, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer' }}>
                <span style={{ fontSize: 28 }}>{c.icon}</span>
                <h4 className="ps-serif" style={{ fontSize: 22, fontWeight: 420, letterSpacing: '-.015em', margin: 0, lineHeight: 1.15 }}>{c.title}</h4>
                <p style={{ color: 'var(--ps-muted)', fontSize: 13, lineHeight: 1.55, margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">Popular elections</span>
              <h2 className="ps-section-h">Jump straight in.</h2>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {QUICK_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="ps-card" style={{ padding: 24, textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 6, transition: 'transform .2s, box-shadow .2s' }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{l.label}</div>
                <div className="ps-mono" style={{ fontSize: 11, color: 'var(--ps-muted)', letterSpacing: '.05em' }}>{l.sub}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Recent notable results */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">Notable results</span>
              <h2 className="ps-section-h">From the archive.</h2>
            </div>
          </div>
          <div style={{ border: '1px solid var(--ps-rule)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '10px 20px', background: 'var(--ps-paper-2)', borderBottom: '1px solid var(--ps-rule)' }}>
              {['Constituency', 'Type', 'Year', 'Winner', 'Margin'].map((h) => (
                <span key={h} className="ps-mono" style={{ fontSize: 10, color: 'var(--ps-muted)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600 }}>{h}</span>
              ))}
            </div>
            {RECENT_RESULTS.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '14px 20px', borderBottom: i < RECENT_RESULTS.length - 1 ? '1px solid var(--ps-rule)' : 'none', background: 'var(--ps-paper)', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{r.constituency}</span>
                  <span className="ps-mono" style={{ fontSize: 11, color: 'var(--ps-muted)', marginLeft: 8 }}>{r.state}</span>
                </div>
                <span style={{ fontSize: 13, color: 'var(--ps-ink-soft)' }}>{r.type}</span>
                <span className="ps-mono" style={{ fontSize: 13, fontWeight: 600 }}>{r.year}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color }} />
                  <span className="ps-mono" style={{ fontSize: 12, fontWeight: 700 }}>{r.winner}</span>
                </span>
                <span className="ps-mono" style={{ fontSize: 12, color: 'var(--ps-ink-soft)' }}>±{r.margin}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ps-section" style={{ textAlign: 'center', paddingBottom: 80 }}>
        <div className="ps-container">
          <span className="ps-kicker">Go deeper</span>
          <h2 className="ps-serif" style={{ fontSize: 36, fontWeight: 380, letterSpacing: '-.02em', margin: '14px 0 22px', lineHeight: 1.1 }}>
            Sign in for full drill-down access.
          </h2>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/login" className="ps-btn-solid ps-btn-accent">Sign in free</Link>
            <Link href="/download" className="ps-btn-ghost">Get the mobile app</Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
