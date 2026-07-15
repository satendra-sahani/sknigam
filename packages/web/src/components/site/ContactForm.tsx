'use client';

/**
 * Contact form (Contact page). Port of the handoff's `#cForm` — labelled icon
 * fields, a subject <select> and the "Message sent" success panel. Pure-client;
 * no backend wiring yet.
 */
import { useState } from 'react';

const SUBJECTS = ['Campaign strategy', 'Survey & research', 'Data & analytics', 'Publish a book', 'Bookstore / order', 'Other'];

const UserIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.4" /><path d="M5 21c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5" /></svg>;
const MailIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
const PhoneIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.4 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0122 16.9z" /></svg>;
const CaseIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>;
const MsgIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 01-9 8.4L3 21l1.1-6A8.4 8.4 0 1121 11.5z" /></svg>;
const Caret = () => <span className="caret"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></span>;

export function ContactForm() {
  const [sent, setSent] = useState(false);

  return (
    <div className="form-card">
      {sent ? (
        <div className="form-success show">
          <div className="ck"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg></div>
          <h3 style={{ fontSize: 28 }}>Message sent.</h3>
          <p className="muted" style={{ maxWidth: 380, margin: '8px auto 0' }}>Thank you — our team will get back to you within one working day.</p>
          <button className="btn btn-ghost" style={{ marginTop: 22 }} onClick={() => setSent(false)}>Send another</button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
          <div className="f-row">
            <div className="field"><label>Your name</label><div className="in"><span className="fic"><UserIcon /></span><input required type="text" placeholder="Your full name" /></div></div>
            <div className="field"><label>Email</label><div className="in"><span className="fic"><MailIcon /></span><input required type="email" placeholder="you@email.com" /></div></div>
          </div>
          <div className="f-row">
            <div className="field"><label>Phone</label><div className="in"><span className="fic"><PhoneIcon /></span><input required type="tel" placeholder="+91 —— —— ——" /></div></div>
            <div className="field"><label>Subject</label><div className="in"><span className="fic"><CaseIcon /></span><Caret /><select defaultValue="Campaign strategy">{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></div></div>
          </div>
          <div className="field"><label>Message</label><div className="in ta"><span className="fic"><MsgIcon /></span><textarea required placeholder="Tell us how we can help…" /></div></div>
          <button type="submit" className="btn btn-coral" style={{ width: '100%', height: 56 }}>Send message →</button>
          <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: '16px 0 0' }}>🛡️ 100% confidential · Response within 1 working day</p>
        </form>
      )}
    </div>
  );
}
