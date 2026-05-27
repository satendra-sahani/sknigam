'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/landing/PublicShell';

const ERROR_TYPES = [
  { id: 'data', label: 'Data error', desc: 'Incorrect vote count, wrong candidate name, missing constituency, etc.' },
  { id: 'map', label: 'Map/geography', desc: 'Wrong state boundary, misplaced constituency, incorrect hex cartogram placement.' },
  { id: 'pdf', label: 'PDF parse error', desc: 'Voter roll PDF parsed incorrectly — wrong EPIC, garbled Hindi text, missing rows.' },
  { id: 'ui', label: 'UI/UX bug', desc: 'Broken layout, missing translation, chart rendering issue, accessibility problem.' },
  { id: 'security', label: 'Security concern', desc: 'PII exposure, access control issue, data leak. Handled with priority.' },
  { id: 'other', label: 'Other', desc: 'Feature request, general feedback, partnership inquiry.' },
];

const FAQ = [
  { q: 'Where does Pollistics source its data?', a: 'Directly from the Election Commission of India (ECI) — primary result tables, draft voter rolls, and gazette notifications. We never use aggregator scrapes.' },
  { q: 'How quickly are errors corrected?', a: 'Data errors are triaged within 24 hours. Critical corrections (wrong winner, seat count) ship same-day. Non-critical corrections (spelling, formatting) ship within the weekly data refresh.' },
  { q: 'Can I report errors anonymously?', a: 'Yes. The form below does not require sign-in. If you include an email, we\'ll send a confirmation when the correction ships.' },
  { q: 'What about PDF parse failures?', a: 'Our text-layer parser handles most ECI formats. For scanned/image PDFs, we use Gemini Vision (AI). If parsing fails, report the specific PDF and booth number — we\'ll investigate and update the parser.' },
];

export default function ReportPage() {
  const [selectedType, setSelectedType] = useState('data');
  const [submitted, setSubmitted] = useState(false);

  return (
    <PublicShell activeNav="Report">
      {/* Hero */}
      <section style={{ padding: '80px 0 40px' }}>
        <div className="ps-container">
          <span className="ps-kicker">Report an error</span>
          <h1 className="ps-serif" style={{ fontSize: 56, fontWeight: 360, letterSpacing: '-.025em', lineHeight: 1, marginTop: 18 }}>
            Help us keep the record{' '}
            <em className="ps-serif-it ps-accent">accurate</em>.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ps-ink-soft)', maxWidth: 620, marginTop: 18, lineHeight: 1.5, fontFamily: 'var(--font-newsreader), serif', fontWeight: 380 }}>
            Pollistics covers 75 years and 2.4 million candidates. If you spot an error — a wrong vote count, a misattributed seat, a garbled PDF parse — report it here. Corrections ship within 24 hours.
          </p>
        </div>
      </section>

      {/* Error type selector + form */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">Error report form</span>
              <h2 className="ps-section-h">What kind of issue?</h2>
            </div>
          </div>

          {submitted ? (
            <div className="ps-card" style={{ padding: 48, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
              <h3 className="ps-serif" style={{ fontSize: 28, fontWeight: 420, margin: '0 0 12px' }}>Report received.</h3>
              <p style={{ color: 'var(--ps-muted)', fontSize: 15, lineHeight: 1.5 }}>
                Our data team will triage this within 24 hours. If you included an email, we&apos;ll notify you when the correction ships.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="ps-btn-ghost"
                style={{ marginTop: 24 }}>
                Submit another report
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 32 }}>
              {/* Type selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ERROR_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedType(t.id)}
                    style={{
                      padding: '14px 16px', borderRadius: 6, textAlign: 'left',
                      background: selectedType === t.id ? 'var(--ps-paper)' : 'transparent',
                      border: `1px solid ${selectedType === t.id ? 'var(--ps-accent)' : 'var(--ps-rule)'}`,
                      cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ps-ink)',
                      transition: 'border-color .15s',
                    }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--ps-muted)', marginTop: 4, lineHeight: 1.4 }}>{t.desc}</div>
                  </button>
                ))}
              </div>

              {/* Form */}
              <div className="ps-card" style={{ padding: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label className="ps-mono" style={{ fontSize: 10.5, color: 'var(--ps-muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      Issue type
                    </label>
                    <div style={{ padding: '10px 14px', background: 'var(--ps-paper-2)', borderRadius: 4, border: '1px solid var(--ps-rule)', fontSize: 14, fontWeight: 600 }}>
                      {ERROR_TYPES.find((t) => t.id === selectedType)?.label}
                    </div>
                  </div>

                  <div>
                    <label className="ps-mono" style={{ fontSize: 10.5, color: 'var(--ps-muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      Constituency / election (if applicable)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lucknow Central, UP Vidhan Sabha 2022"
                      style={{ width: '100%', height: 44, padding: '0 14px', fontSize: 14, background: 'var(--ps-paper)', border: '1px solid var(--ps-rule)', borderRadius: 4, color: 'var(--ps-ink)', fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label className="ps-mono" style={{ fontSize: 10.5, color: 'var(--ps-muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      Description *
                    </label>
                    <textarea
                      rows={5}
                      placeholder="Describe the error in detail. Include the correct value if you know it, and a source link if possible."
                      style={{ width: '100%', padding: 14, fontSize: 14, background: 'var(--ps-paper)', border: '1px solid var(--ps-rule)', borderRadius: 4, color: 'var(--ps-ink)', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
                    />
                  </div>

                  <div>
                    <label className="ps-mono" style={{ fontSize: 10.5, color: 'var(--ps-muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      Source URL (optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://eci.gov.in/..."
                      style={{ width: '100%', height: 44, padding: '0 14px', fontSize: 14, background: 'var(--ps-paper)', border: '1px solid var(--ps-rule)', borderRadius: 4, color: 'var(--ps-ink)', fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label className="ps-mono" style={{ fontSize: 10.5, color: 'var(--ps-muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      Your email (optional — for correction notification)
                    </label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      style={{ width: '100%', height: 44, padding: '0 14px', fontSize: 14, background: 'var(--ps-paper)', border: '1px solid var(--ps-rule)', borderRadius: 4, color: 'var(--ps-ink)', fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>

                  <button
                    onClick={() => setSubmitted(true)}
                    className="ps-btn-solid ps-btn-accent"
                    style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                    Submit error report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">FAQ</span>
              <h2 className="ps-section-h">Common questions about data accuracy.</h2>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 740 }}>
            {FAQ.map((f, i) => (
              <div key={i} style={{ padding: '24px 0', borderTop: i === 0 ? 'none' : '1px solid var(--ps-rule)' }}>
                <div style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.35 }}>{f.q}</div>
                <div style={{ color: 'var(--ps-muted)', fontSize: 14, lineHeight: 1.55, marginTop: 8 }}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology CTA */}
      <section className="ps-section" style={{ textAlign: 'center', paddingBottom: 80 }}>
        <div className="ps-container">
          <span className="ps-kicker">Methodology</span>
          <h2 className="ps-serif" style={{ fontSize: 36, fontWeight: 380, letterSpacing: '-.02em', margin: '14px 0 12px', lineHeight: 1.1 }}>
            Curious how we verify the data?
          </h2>
          <p style={{ color: 'var(--ps-muted)', fontSize: 15, maxWidth: 500, margin: '0 auto 22px' }}>
            Every number in Pollistics traces to an ECI source table. Our methodology document explains the normalisation pipeline, error-correction process, and citation format.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/about" className="ps-btn-solid ps-btn-accent">Read our methodology</Link>
            <Link href="/search" className="ps-btn-ghost">Search the archive</Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
