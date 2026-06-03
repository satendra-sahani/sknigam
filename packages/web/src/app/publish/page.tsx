'use client';

/**
 * Pollistics Press — Publish-your-book landing page.
 *
 * Translated from the design-handoff Publish.html prototype.  Uses the
 * PublicShell chrome (header + drawer + footer) for visual consistency
 * with /about, /search, /explore-public and /report, and reuses the
 * responsive .ps-* utility classes defined in PublicShell so this page
 * collapses to a single column on phones without any extra media-query
 * code.
 */
import { useState } from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/landing/PublicShell';

const STATS: Array<[string, string]> = [
  ['3,100+', 'Titles published'],
  ['70%', 'Max royalty'],
  ['15 days', 'To go live'],
  ['9', 'Retail channels'],
];

const STEPS = [
  {
    n: '01',
    h: 'Submit manuscript',
    p: 'Upload your draft as DOCX or PDF along with title, genre and a short synopsis. Our desk reviews within 48 hours.',
  },
  {
    n: '02',
    h: 'Design & format',
    p: 'We typeset the interior, design a cover, and build print-ready and e-book files — with charts and maps if your data needs them.',
  },
  {
    n: '03',
    h: 'Publish & list',
    p: 'Your book goes live on the Pollistics Bookstore plus Amazon, Flipkart and Kindle, with an ISBN registered in your name.',
  },
  {
    n: '04',
    h: 'Sell & earn',
    p: 'Track sales in a live dashboard and receive royalties monthly. Print-on-demand means zero inventory risk.',
  },
];

interface Pkg {
  name: string;
  price: string;
  royalty: string;
  features: string[];
  featured?: boolean;
}

const PACKAGES: Pkg[] = [
  {
    name: 'Essential',
    price: '₹0',
    royalty: '70% royalty',
    features: [
      'ISBN in your name',
      'Standard interior formatting',
      '1 cover template',
      'Listed on Pollistics Bookstore',
      'Print-on-demand fulfilment',
    ],
  },
  {
    name: 'Analyst',
    price: '₹14,999',
    royalty: '65% royalty',
    featured: true,
    features: [
      'Everything in Essential',
      'Custom cover + chart/map typesetting',
      'Amazon, Flipkart & Kindle listing',
      'Professional copy-edit (40k words)',
      'Author page on Pollistics',
      'Marketing kit + launch banner',
    ],
  },
  {
    name: 'Bureau',
    price: '₹39,999',
    royalty: '60% royalty',
    features: [
      'Everything in Analyst',
      'Dedicated editor + data designer',
      'Hardcover + audiobook edition',
      '9-channel global distribution',
      'PR push to newsroom partners',
      'Priority 7-day turnaround',
    ],
  },
];

const PROMISES = [
  {
    h: 'You keep the rights',
    p: 'Every contract is non-exclusive. Your manuscript, your ISBN, your name on the spine.',
  },
  {
    h: 'Monthly royalties',
    p: 'Up to 70% on every sale, paid out monthly to your bank with a transparent ledger.',
  },
  {
    h: 'Data-aware design',
    p: 'Tables, swing charts and hex maps typeset properly — we publish election books for a living.',
  },
];

export default function PublishPage() {
  const [pkg, setPkg] = useState('Analyst · ₹14,999');
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const scrollToForm = () => {
    document.getElementById('publish-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <PublicShell activeNav="Publish">
      {/* HERO */}
      <section className="ps-hero-section">
        <div className="ps-container">
          <span className="ps-kicker">Pollistics Press · Self-publishing</span>
          <h1 className="ps-hero-title">
            Turn your election research into a{' '}
            <em className="ps-serif-it ps-accent">published book</em>.
          </h1>
          <p className="ps-hero-lede">
            From a constituency handbook to a 75-year psephology treatise — we format, print, list
            and sell it. You keep the rights and up to 70% royalties. Listed on the Pollistics
            Bookstore and major retailers within 15 days.
          </p>
          <div className="ps-hero-cta">
            <button onClick={scrollToForm} className="ps-btn-solid ps-btn-accent">
              Publish your book →
            </button>
            <Link href="/bookstore" className="ps-btn-ghost">
              Browse the bookstore
            </Link>
            <span
              className="ps-mono"
              style={{ fontSize: 11, color: 'var(--ps-muted)', marginLeft: 8 }}>
              Free to start · No upfront fee
            </span>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="ps-section" style={{ padding: '0', borderTop: '1px solid var(--ps-rule)' }}>
        <div className="ps-container">
          <div className="pub-stats-grid">
            {STATS.map(([v, l]) => (
              <div key={l} className="pub-stat">
                <div className="ps-serif pub-stat-v">{v}</div>
                <div className="ps-mono pub-stat-l">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">How it works</span>
              <h2 className="ps-section-h">Four steps from manuscript to marketplace.</h2>
              <p className="ps-section-p">
                No agents, no waiting rooms. Upload your manuscript and our editorial desk takes it
                the rest of the way.
              </p>
            </div>
          </div>
          <div className="ps-bordered-grid-4">
            {STEPS.map((s) => (
              <div
                key={s.n}
                style={{
                  background: 'var(--ps-paper)',
                  padding: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}>
                <div
                  className="ps-serif"
                  style={{
                    fontSize: 40,
                    fontWeight: 400,
                    color: 'var(--ps-accent)',
                    lineHeight: 1,
                    letterSpacing: '-.02em',
                  }}>
                  {s.n}
                </div>
                <h4
                  className="ps-serif"
                  style={{ fontSize: 22, fontWeight: 460, letterSpacing: '-.015em', margin: 0 }}>
                  {s.h}
                </h4>
                <p style={{ color: 'var(--ps-muted)', fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                  {s.p}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">Publishing packages</span>
              <h2 className="ps-section-h">Pick the plan for your title.</h2>
            </div>
          </div>
          <div className="ps-cards-3">
            {PACKAGES.map((p) => (
              <div
                key={p.name}
                className="ps-card pub-pkg"
                style={{
                  position: 'relative',
                  borderColor: p.featured ? 'var(--ps-accent)' : undefined,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                }}>
                {p.featured && (
                  <span
                    className="ps-mono"
                    style={{
                      position: 'absolute',
                      top: -10,
                      left: 24,
                      background: 'var(--ps-accent)',
                      color: '#fff',
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: '.14em',
                      padding: '4px 8px',
                      borderRadius: 3,
                    }}>
                    MOST CHOSEN
                  </span>
                )}
                <div
                  className="ps-mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: 'var(--ps-muted)',
                  }}>
                  {p.name}
                </div>
                <div>
                  <div
                    className="ps-serif"
                    style={{
                      fontSize: 46,
                      fontWeight: 500,
                      letterSpacing: '-.03em',
                      lineHeight: 1,
                    }}>
                    {p.price}{' '}
                    <small
                      style={{
                        fontSize: 15,
                        color: 'var(--ps-muted)',
                        fontFamily: 'inherit',
                        fontWeight: 400,
                      }}>
                      / {p.royalty}
                    </small>
                  </div>
                </div>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 11,
                    flex: 1,
                  }}>
                  {p.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        fontSize: 13.5,
                        color: 'var(--ps-ink-soft)',
                      }}>
                      <span
                        aria-hidden
                        style={{
                          flexShrink: 0,
                          width: 14,
                          height: 14,
                          marginTop: 2,
                          borderRadius: '50%',
                          background: 'var(--ps-chip-bg)',
                          color: 'var(--ps-accent)',
                          display: 'inline-grid',
                          placeItems: 'center',
                          fontWeight: 700,
                          fontSize: 10,
                          lineHeight: 1,
                        }}>
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    setPkg(`${p.name} · ${p.price}`);
                    scrollToForm();
                  }}
                  className={p.featured ? 'ps-btn-solid ps-btn-accent' : 'ps-btn-ghost'}
                  style={{ width: '100%', justifyContent: 'center' }}>
                  Choose {p.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FORM */}
      <section className="ps-section" id="publish-form">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-thick-rule" />
            <div style={{ marginTop: 14 }}>
              <span className="ps-kicker">Submit your title</span>
              <h2 className="ps-section-h">Tell us about your book.</h2>
            </div>
          </div>

          <div className="ps-report-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {PROMISES.map((it) => (
                <div key={it.h} style={{ display: 'flex', gap: 14 }}>
                  <div
                    aria-hidden
                    style={{
                      flexShrink: 0,
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      background: 'var(--ps-chip-bg)',
                      color: 'var(--ps-accent)',
                      display: 'grid',
                      placeItems: 'center',
                    }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M4 19V5a2 2 0 012-2h9l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
                      <path d="M14 3v5h5" />
                    </svg>
                  </div>
                  <div>
                    <h5
                      className="ps-serif"
                      style={{
                        margin: '0 0 4px',
                        fontSize: 18,
                        fontWeight: 460,
                        letterSpacing: '-.01em',
                      }}>
                      {it.h}
                    </h5>
                    <p style={{ margin: 0, color: 'var(--ps-muted)', fontSize: 13, lineHeight: 1.5 }}>
                      {it.p}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="ps-card" style={{ padding: 28 }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '20px 6px' }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: 'var(--ps-accent)',
                      display: 'grid',
                      placeItems: 'center',
                      margin: '0 auto 18px',
                      color: '#fff',
                      fontSize: 28,
                      fontWeight: 700,
                    }}>
                    ✓
                  </div>
                  <h3
                    className="ps-serif"
                    style={{ fontSize: 28, margin: '0 0 8px', fontWeight: 460 }}>
                    Manuscript received.
                  </h3>
                  <p
                    style={{
                      color: 'var(--ps-ink-soft)',
                      maxWidth: 380,
                      margin: '0 auto',
                      fontSize: 14,
                    }}>
                    Thank you — our editorial desk will email you within 48 hours with next steps
                    and a publishing timeline.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFileName(null);
                    }}
                    className="ps-btn-ghost"
                    style={{ marginTop: 22 }}>
                    Submit another title
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSubmitted(true);
                  }}>
                  <div className="pub-frow">
                    <Field label="Author name" required type="text" placeholder="Your full name" />
                    <Field label="Email" required type="email" placeholder="you@email.com" />
                  </div>
                  <div className="pub-frow">
                    <Field label="Phone" required type="tel" placeholder="+91 ·········" />
                    <FieldSelect
                      label="Package"
                      value={pkg}
                      onChange={setPkg}
                      options={['Essential · ₹0', 'Analyst · ₹14,999', 'Bureau · ₹39,999']}
                    />
                  </div>
                  <Field label="Book title" required type="text" placeholder="e.g. The Verdict 2029" />
                  <div className="pub-frow">
                    <FieldSelect
                      label="Genre / category"
                      options={[
                        'Election Analysis',
                        'Psephology',
                        'Constituency Handbook',
                        'Political Biography',
                        'Field Manual',
                        'Data & Methods',
                        'Other',
                      ]}
                    />
                    <Field label="Approx. word count" type="text" placeholder="e.g. 45,000" />
                  </div>
                  <div className="pub-field">
                    <label className="ps-mono pub-label">Synopsis</label>
                    <textarea
                      placeholder="Two or three lines on what your book covers…"
                      className="pub-input"
                      style={{ minHeight: 90, resize: 'vertical' }}
                    />
                  </div>
                  <div className="pub-field">
                    <label className="ps-mono pub-label">Manuscript</label>
                    <label
                      htmlFor="ms"
                      style={{
                        display: 'block',
                        border: '1.5px dashed var(--ps-rule-2)',
                        borderRadius: 6,
                        padding: 22,
                        textAlign: 'center',
                        color: 'var(--ps-muted)',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}>
                      <span
                        className="ps-mono"
                        style={{ fontSize: 11, letterSpacing: '.08em' }}>
                        DROP DOCX / PDF · OR CLICK TO BROWSE
                      </span>
                      <input
                        id="ms"
                        type="file"
                        accept=".doc,.docx,.pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                      />
                      {fileName && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 12,
                            color: 'var(--ps-accent)',
                          }}>
                          ✓ {fileName}
                        </div>
                      )}
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="ps-btn-solid ps-btn-accent"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      height: 50,
                      marginTop: 6,
                    }}>
                    Submit for review →
                  </button>
                  <p
                    className="ps-mono"
                    style={{
                      fontSize: 10.5,
                      color: 'var(--ps-muted)',
                      textAlign: 'center',
                      margin: '14px 0 0',
                      letterSpacing: '.04em',
                    }}>
                    Editorial desk responds within 48 hours · No upfront fee for Essential
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <PublishStyles />
    </PublicShell>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="pub-field">
      <label className="ps-mono pub-label">{label}</label>
      <input className="pub-input" {...rest} />
    </div>
  );
}

function FieldSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="pub-field">
      <label className="ps-mono pub-label">{label}</label>
      <select
        className="pub-input"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function PublishStyles() {
  return (
    <style jsx global>{`
      .ps-page .pub-stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border-top: 0;
      }
      .ps-page .pub-stat {
        padding: 28px;
        border-left: 1px solid var(--ps-rule);
      }
      .ps-page .pub-stat:first-child {
        border-left: 0;
      }
      .ps-page .pub-stat-v {
        font-size: 42px;
        font-weight: 500;
        letter-spacing: -0.03em;
        line-height: 1;
      }
      .ps-page .pub-stat-l {
        font-size: 10.5px;
        color: var(--ps-muted);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-top: 10px;
      }
      .ps-page .pub-frow {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .ps-page .pub-field {
        display: flex;
        flex-direction: column;
        gap: 7px;
        margin-bottom: 16px;
      }
      .ps-page .pub-label {
        font-size: 10.5px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--ps-muted);
      }
      .ps-page .pub-input {
        background: var(--ps-bg-tint);
        border: 1px solid var(--ps-rule);
        border-radius: 5px;
        color: var(--ps-ink);
        font-family: inherit;
        font-size: 14px;
        padding: 12px 14px;
        outline: none;
        transition: border-color 0.15s;
        width: 100%;
      }
      .ps-page .pub-input:focus {
        border-color: var(--ps-accent);
      }
      @media (max-width: 960px) {
        .ps-page .pub-stats-grid {
          grid-template-columns: 1fr 1fr;
        }
        .ps-page .pub-stat:nth-child(3) {
          border-left: 0;
          border-top: 1px solid var(--ps-rule);
        }
        .ps-page .pub-stat:nth-child(4) {
          border-top: 1px solid var(--ps-rule);
        }
        .ps-page .pub-stat-v {
          font-size: 32px;
        }
      }
      @media (max-width: 640px) {
        .ps-page .pub-stats-grid {
          grid-template-columns: 1fr;
        }
        .ps-page .pub-stat {
          border-left: 0;
          border-top: 1px solid var(--ps-rule);
          padding: 22px 0;
        }
        .ps-page .pub-stat:first-child {
          border-top: 0;
        }
        .ps-page .pub-frow {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
