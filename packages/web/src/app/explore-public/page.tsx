'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/landing/PublicShell';

const STATES = [
  { code: 'UP', name: 'Uttar Pradesh', seats: 80, lsSeats: 80, vsSeats: 403, voters: '15.2 Cr', lean: 'BJP', color: '#e8731c' },
  { code: 'MH', name: 'Maharashtra', seats: 48, lsSeats: 48, vsSeats: 288, voters: '9.6 Cr', lean: 'MIX', color: '#85858d' },
  { code: 'WB', name: 'West Bengal', seats: 42, lsSeats: 42, vsSeats: 294, voters: '7.5 Cr', lean: 'TMC', color: '#1d8a5b' },
  { code: 'BR', name: 'Bihar', seats: 40, lsSeats: 40, vsSeats: 243, voters: '7.9 Cr', lean: 'MIX', color: '#85858d' },
  { code: 'TN', name: 'Tamil Nadu', seats: 39, lsSeats: 39, vsSeats: 234, voters: '6.2 Cr', lean: 'DMK', color: '#1a1a1a' },
  { code: 'MP', name: 'Madhya Pradesh', seats: 29, lsSeats: 29, vsSeats: 230, voters: '5.7 Cr', lean: 'BJP', color: '#e8731c' },
  { code: 'KA', name: 'Karnataka', seats: 28, lsSeats: 28, vsSeats: 224, voters: '5.3 Cr', lean: 'MIX', color: '#85858d' },
  { code: 'GJ', name: 'Gujarat', seats: 26, lsSeats: 26, vsSeats: 182, voters: '5.0 Cr', lean: 'BJP', color: '#e8731c' },
  { code: 'RJ', name: 'Rajasthan', seats: 25, lsSeats: 25, vsSeats: 200, voters: '5.4 Cr', lean: 'MIX', color: '#85858d' },
  { code: 'AP', name: 'Andhra Pradesh', seats: 25, lsSeats: 25, vsSeats: 175, voters: '3.9 Cr', lean: 'TDP', color: '#e7b32a' },
  { code: 'KL', name: 'Kerala', seats: 20, lsSeats: 20, vsSeats: 140, voters: '2.7 Cr', lean: 'INC', color: '#1b66c9' },
  { code: 'TG', name: 'Telangana', seats: 17, lsSeats: 17, vsSeats: 119, voters: '3.1 Cr', lean: 'MIX', color: '#85858d' },
];

const DRILL_LEVELS = [
  { num: '01', level: 'State', desc: '28 states + 8 Union Territories. Hex cartogram weighted by Lok Sabha seats.' },
  { num: '02', level: 'District', desc: '780+ districts with AC count, voter totals, and dominant-party lean.' },
  { num: '03', level: 'Assembly Constituency', desc: 'Vidhan Sabha segments with last-election margins, turnout %, and winner party.' },
  { num: '04', level: 'Polling Booth', desc: '10 lakh+ booths with sentiment heatmaps, demographic clusters, and contact rates.' },
  { num: '05', level: 'Voter', desc: 'Individual voter profiles — age, caste, sub-caste, religion, education, voting history.' },
];

export default function ExplorePublicPage() {
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  return (
    <PublicShell activeNav="Explore">
      {/* Hero */}
      <section style={{ padding: '80px 0 40px' }}>
        <div className="ps-container">
          <span className="ps-kicker">Explore India</span>
          <h1 className="ps-serif" style={{ fontSize: 56, fontWeight: 360, letterSpacing: '-.025em', lineHeight: 1, marginTop: 18 }}>
            Drill from state to voter{' '}
            <em className="ps-serif-it ps-accent">in five clicks</em>.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ps-ink-soft)', maxWidth: 620, marginTop: 18, lineHeight: 1.5, fontFamily: 'var(--font-newsreader), serif', fontWeight: 380 }}>
            Pollistics structures India&apos;s election geography into a five-level drill-down: State → District → AC → Booth → Voter. Every level has charts, filters, and bilingual labels.
          </p>
          <div style={{ marginTop: 28, display: 'flex', gap: 12 }}>
            <Link href="/login" className="ps-btn-solid ps-btn-accent">Sign in to explore</Link>
            <Link href="/download" className="ps-btn-ghost">Mobile app →</Link>
          </div>
        </div>
      </section>

      {/* Drill levels */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">Five-level hierarchy</span>
              <h2 className="ps-section-h">From 28 states down to 97 crore voters.</h2>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {DRILL_LEVELS.map((d, i) => (
              <div key={d.num} style={{ display: 'grid', gridTemplateColumns: '80px 160px 1fr', gap: 24, padding: '28px 0', borderTop: i === 0 ? 'none' : '1px solid var(--ps-rule)', alignItems: 'center' }}>
                <span className="ps-mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--ps-accent)', letterSpacing: '.05em' }}>{d.num}</span>
                <span className="ps-serif" style={{ fontSize: 22, fontWeight: 500 }}>{d.level}</span>
                <span style={{ fontSize: 14, color: 'var(--ps-muted)', lineHeight: 1.5 }}>{d.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* State grid */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">States & UTs</span>
              <h2 className="ps-section-h">Start with the big 12.</h2>
              <p className="ps-section-p">
                These 12 states account for 77% of Lok Sabha seats. Sign in to drill into any of them.
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--ps-rule)', border: '1px solid var(--ps-rule)', borderRadius: 6, overflow: 'hidden' }}>
            {STATES.map((s) => (
              <div
                key={s.code}
                onMouseEnter={() => setHoveredState(s.code)}
                onMouseLeave={() => setHoveredState(null)}
                style={{
                  background: hoveredState === s.code ? 'var(--ps-paper-2)' : 'var(--ps-paper)',
                  padding: 24,
                  cursor: 'pointer',
                  transition: 'background .15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span className="ps-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ps-muted)', letterSpacing: '.1em', background: 'var(--ps-chip-bg)', padding: '2px 6px', borderRadius: 2 }}>{s.code}</span>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                  <span className="ps-mono" style={{ fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: '.08em' }}>{s.lean}</span>
                </div>
                <div className="ps-serif" style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-.01em' }}>{s.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                  <div>
                    <div className="ps-mono" style={{ fontSize: 9, color: 'var(--ps-muted)', letterSpacing: '.1em', textTransform: 'uppercase' }}>LS SEATS</div>
                    <div className="ps-serif" style={{ fontSize: 20, fontWeight: 600, marginTop: 2 }}>{s.lsSeats}</div>
                  </div>
                  <div>
                    <div className="ps-mono" style={{ fontSize: 9, color: 'var(--ps-muted)', letterSpacing: '.1em', textTransform: 'uppercase' }}>VS SEATS</div>
                    <div className="ps-serif" style={{ fontSize: 20, fontWeight: 600, marginTop: 2 }}>{s.vsSeats}</div>
                  </div>
                </div>
                <div className="ps-mono" style={{ fontSize: 11, color: 'var(--ps-muted)', marginTop: 10, letterSpacing: '.04em' }}>{s.voters} voters</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">What you see at each level</span>
              <h2 className="ps-section-h">Charts, filters, and bilingual context.</h2>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { h: 'Demographic filters', p: 'Filter by age, gender, caste, sub-caste, religion, education, employment, voting history, and sentiment — live counts update as you tap.', kicker: '9 FACETS' },
              { h: 'Sentiment heatmaps', p: 'Booth-level sentiment grid coloured from strong support (green) through undecided (brass) to opposed (red). Spot trouble before it reaches the press.', kicker: 'LIVE SIGNAL' },
              { h: 'Saved segments', p: 'Bookmark any filter combination as a named segment. Track weekly deltas and drill into the voter list at any time.', kicker: 'TRACK WEEKLY' },
            ].map((f) => (
              <div key={f.h} className="ps-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="ps-kicker">{f.kicker}</span>
                <h4 className="ps-serif" style={{ fontSize: 22, fontWeight: 420, letterSpacing: '-.015em', margin: 0, lineHeight: 1.15 }}>{f.h}</h4>
                <p style={{ color: 'var(--ps-muted)', fontSize: 13, lineHeight: 1.55, margin: 0 }}>{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ps-section" style={{ textAlign: 'center', paddingBottom: 80 }}>
        <div className="ps-container">
          <span className="ps-kicker">Start exploring</span>
          <h2 className="ps-serif" style={{ fontSize: 36, fontWeight: 380, letterSpacing: '-.02em', margin: '14px 0 22px', lineHeight: 1.1 }}>
            Your constituency, five levels deep.
          </h2>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/login" className="ps-btn-solid ps-btn-accent">Sign in to explore</Link>
            <Link href="/about" className="ps-btn-ghost">Learn more about us</Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
