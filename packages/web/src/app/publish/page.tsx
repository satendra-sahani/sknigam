/**
 * Publish — Pollistics Press.
 * Port of the handoff Publish.html: publishing hero, four-step "how it works",
 * three package tiers, and the manuscript-submission form. Styling via
 * <SiteShell> (press footer variant).
 */
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { PublishForm } from '@/components/site/PublishForm';

export const metadata = {
  title: 'Pollistics Press — Publish Your Election Book',
};

const CHIPS = [
  { t: <>You keep<br />the rights</>, d: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /> },
  { t: <>Earn up to<br />70% royalties</>, d: <path d="M7 5h10 M7 9h10 M7 9c5 0 5 6 0 6l6 5 M7 15h4" /> },
  { t: <>Global<br />distribution</>, d: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18 M12 3c3 3.5 3 14.5 0 18 M12 3c-3 3.5-3 14.5 0 18" /></> },
  { t: <>Data-driven<br />impact</>, d: <><path d="M4 20V10 M9 20V4 M14 20v-6 M19 20V8 M14 8l5-4" /><path d="M17 4h2v2" /></> },
];

const STEPS = [
  { n: '01', h: 'Submit manuscript', p: 'Upload your draft as DOCX or PDF with a title and synopsis. We review within 48 hours.' },
  { n: '02', h: 'Design & format', p: 'We typeset the interior, design a cover and build print + e-book files — charts and maps included.' },
  { n: '03', h: 'Publish & list', p: 'Live on the Pollistics Bookstore plus Amazon, Flipkart and Kindle, with an ISBN in your name.' },
  { n: '04', h: 'Sell & earn', p: 'Track sales in a live dashboard and receive royalties monthly. Zero inventory risk.' },
];

const PKGS = [
  { name: 'Essential', price: '₹0', royalty: '/ 70% royalty', featured: false, items: ['ISBN in your name', 'Standard interior formatting', '1 cover template', 'Listed on Pollistics Bookstore', 'Print-on-demand fulfilment'] },
  { name: 'Analyst', price: '₹14,999', royalty: '/ 65% royalty', featured: true, items: ['Everything in Essential', 'Custom cover + chart typesetting', 'Amazon, Flipkart & Kindle', 'Professional copy-edit (40k words)', 'Author page + marketing kit'] },
  { name: 'Bureau', price: '₹39,999', royalty: '/ 60% royalty', featured: false, items: ['Everything in Analyst', 'Dedicated editor + data designer', 'Hardcover + audiobook edition', '9-channel global distribution', 'PR push + 7-day turnaround'] },
];

const SIDE = [
  { h: 'You keep the rights', p: 'Every contract is non-exclusive. Your manuscript, your ISBN, your name on the spine.', d: <><path d="M4 19V5a2 2 0 012-2h9l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2z" /><path d="M14 3v5h5" /></> },
  { h: 'Monthly royalties', p: 'Up to 70% on every sale, paid out monthly with a transparent ledger.', d: <path d="M12 1v22 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /> },
  { h: 'Data-aware design', p: 'Tables, swing charts and hex maps typeset properly — we publish election books for a living.', d: <path d="M4 20V10 M9 20V4 M14 20v-8 M19 20V8 M14 12l5-4" /> },
];

export default function PublishPage() {
  return (
    <SiteShell active="publish" footer="press">
      {/* HERO */}
      <section className="phero">
        <div className="page phero-grid">
          <div>
            <span className="tag">Pollistics Press · Self-publishing</span>
            <h1 style={{ marginTop: 18 }}>Turn your research into a <span className="o">published book.</span></h1>
            <p className="sub">From a constituency handbook to a 75-year psephology treatise — we format, print, list and sell it. You keep the rights and up to 70% royalties.</p>
            <div className="cta-row">
              <a href="#publish-form" className="btn btn-coral">Publish your book →</a>
              <Link href="/bookstore" className="btn btn-ghost">Browse the bookstore</Link>
            </div>
            <div className="pub-chips">
              {CHIPS.map((c, i) => (
                <div className="c" key={i}>
                  <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{c.d}</svg></span>
                  <span className="t">{c.t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="phero-img" style={{ height: 'auto', borderRadius: 0, boxShadow: 'none' }}>
            <span className="arch" />
            <img src="/assets/hero-podium.png" alt="Pollistics Press — books, dashboards & app" style={{ objectFit: 'contain', height: 'auto', width: '100%', aspectRatio: '1165 / 1008', background: 'transparent' }} />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <div className="page">
          <div className="section-head">
            <span className="tag soft">How it works</span>
            <h2>Four steps from manuscript to marketplace.</h2>
            <p>No agents, no waiting rooms. Upload your manuscript and our editorial desk takes it the rest of the way.</p>
          </div>
          <div className="steps">
            {STEPS.map((s) => (
              <div className="step" key={s.n}><div className="n">{s.n}</div><h4>{s.h}</h4><p>{s.p}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section className="section pkg-sec">
        <div className="page">
          <div className="section-head">
            <span className="tag soft">Publishing packages</span>
            <h2>Pick the plan for your title.</h2>
          </div>
          <div className="pkg-grid">
            {PKGS.map((p) => (
              <div className={`pkg${p.featured ? ' featured' : ''}`} key={p.name}>
                <div className="pname">{p.name}</div>
                <div className="price">{p.price} <small>{p.royalty}</small></div>
                <ul>{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
                <a href="#publish-form" className={`btn ${p.featured ? 'btn-coral' : 'btn-ghost'}`} style={{ width: '100%' }}>Choose {p.name}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FORM */}
      <section className="section" id="publish-form">
        <div className="page">
          <div className="form-wrap">
            <div className="pub-side">
              <div className="pub-divider"><span className="dash"><i className="d3" /><i className="d2" /><i className="d1" /></span><span className="pill-label">Submit your title</span></div>
              <h2>Tell us about<br />your <span className="o">book.</span></h2>
              <div className="hr" />
              <p className="lead2">Share your manuscript details with us. Our editorial team will review and get back to you within 48 hours.</p>
              {SIDE.map((s) => (
                <div className="side-item" key={s.h}>
                  <div className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{s.d}</svg></div>
                  <div><h5>{s.h}</h5><p>{s.p}</p></div>
                </div>
              ))}
              <img className="pub-books" src="/assets/publish-books.png" alt="" />
            </div>
            <PublishForm />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
