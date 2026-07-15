'use client';

/**
 * Shared enquiry form for the public Pollistics site (Home + Contact).
 * Pure-client, submits to a local success state. Markup mirrors the handoff's
 * `.enq-card` form — icon-prefixed fields, a service <select>, and the
 * "Enquiry received" success panel. Styling lives in pollistics.css under `.pol`.
 */

import { useState } from 'react';

const SERVICES = [
  'Opinion Poll Surveys',
  'Door-to-Door Campaigns',
  'War Room Strategy',
  'Social Media Management',
  'Digital Media Management',
  'Software & Technology',
];

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.4" /><path d="M5 21c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5" /></svg>
);
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
);
const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.4 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0122 16.9z" /></svg>
);
const CaseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
);
const MsgIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 01-9 8.4L3 21l1.1-6A8.4 8.4 0 1121 11.5z" /></svg>
);

export function EnquiryForm() {
  const [sent, setSent] = useState(false);

  return (
    <div className="enq-card" style={{ textAlign: 'left' }}>
      {sent ? (
        <div className="enq-success show">
          <div className="ck">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
          </div>
          <h3 style={{ fontSize: 28 }}>Enquiry received.</h3>
          <p className="muted" style={{ maxWidth: 380, margin: '8px auto 0' }}>
            Thank you — our strategy desk will be in touch within one working day.
          </p>
          <button className="btn btn-ghost" style={{ marginTop: 22 }} onClick={() => setSent(false)}>Send another</button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
          <div className="f-row">
            <div className="field"><span className="fic"><UserIcon /></span><input required type="text" placeholder="Your Name *" /></div>
            <div className="field"><span className="fic"><MailIcon /></span><input required type="email" placeholder="Your Email *" /></div>
          </div>
          <div className="f-row">
            <div className="field"><span className="fic"><PhoneIcon /></span><input required type="tel" placeholder="Your Mobile No *" /></div>
            <div className="field sel">
              <span className="fic"><CaseIcon /></span>
              <span className="fic-caret"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></span>
              <select defaultValue="">
                <option value="" disabled>Service needed…</option>
                {SERVICES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="field"><span className="fic"><MsgIcon /></span><textarea placeholder="Your Message" /></div>
          <button type="submit" className="btn btn-coral" style={{ width: '100%', height: 56 }}>Send enquiry →</button>
        </form>
      )}
    </div>
  );
}
