'use client';

/**
 * Pollistics Press manuscript-submission form (Publish page). Port of the
 * handoff's `#pubForm` — labelled icon fields, a synopsis char-counter, a file
 * picker that echoes the chosen filename, and the "Manuscript received" success
 * panel. Submits to POST /api/published-books (same contract as the previous
 * PublicShell publish page).
 */
import { useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9003/api';

function parsePackageLabel(label: string): 'Essential' | 'Analyst' | 'Bureau' {
  if (label.startsWith('Essential')) return 'Essential';
  if (label.startsWith('Bureau')) return 'Bureau';
  return 'Analyst';
}

const GENRES = ['Election Analysis', 'Psephology', 'Constituency Handbook', 'Political Biography', 'Field Manual'];
const PACKAGES = ['Essential · Free', 'Analyst · ₹14,999', 'Bureau · ₹39,999'];

const UserIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.4" /><path d="M5 21c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5" /></svg>;
const MailIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
const PhoneIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.4 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0122 16.9z" /></svg>;
const CaseIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>;
const BookIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5C10 5 7 4.5 3 5v14c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z M12 6.5v14" /></svg>;
const TagIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12v18l-6-4-6 4z" /></svg>;
const HashIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5h14 M12 5v14" /></svg>;
const MsgIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 01-9 8.4L3 21l1.1-6A8.4 8.4 0 1121 11.5z" /></svg>;
const Caret = () => <span className="caret"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></span>;

interface Form {
  authorName: string; email: string; phone: string; pkg: string;
  title: string; genre: string; wordCount: string; synopsis: string;
}
const EMPTY: Form = { authorName: '', email: '', phone: '', pkg: 'Analyst · ₹14,999', title: '', genre: 'Election Analysis', wordCount: '', synopsis: '' };

export function PublishForm() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const reset = () => { setForm(EMPTY); setFileName(''); setError(null); setSent(false); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/published-books`, {
        authorName: form.authorName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        title: form.title.trim(),
        genre: form.genre,
        wordCount: form.wordCount.trim() || undefined,
        synopsis: form.synopsis.trim() || undefined,
        package: parsePackageLabel(form.pkg),
        manuscriptName: fileName || undefined,
      });
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Submission failed. Please try again or email us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="form-card">
        <div className="form-success show">
          <div className="ck"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg></div>
          <h3 style={{ fontSize: 28 }}>Manuscript received.</h3>
          <p className="muted" style={{ maxWidth: 380, margin: '8px auto 0' }}>Thank you — our editorial desk will email you within 48 hours with next steps.</p>
          <button className="btn btn-ghost" style={{ marginTop: 22 }} onClick={reset}>Submit another title</button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-card">
      <form onSubmit={submit}>
        <div className="f-row">
          <div className="field"><label>Author name</label><div className="in"><span className="fic"><UserIcon /></span><input required type="text" placeholder="Your full name" value={form.authorName} onChange={(e) => set('authorName', e.target.value)} /></div></div>
          <div className="field"><label>Email</label><div className="in"><span className="fic"><MailIcon /></span><input required type="email" placeholder="you@email.com" value={form.email} onChange={(e) => set('email', e.target.value)} /></div></div>
        </div>
        <div className="f-row">
          <div className="field"><label>Phone</label><div className="in"><span className="fic"><PhoneIcon /></span><input required type="tel" placeholder="+91 — —— —— ——" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div></div>
          <div className="field"><label>Package</label><div className="in"><span className="fic"><CaseIcon /></span><Caret /><select value={form.pkg} onChange={(e) => set('pkg', e.target.value)}>{PACKAGES.map((p) => <option key={p}>{p}</option>)}</select></div></div>
        </div>
        <div className="field"><label>Book title</label><div className="in"><span className="fic"><BookIcon /></span><input required type="text" placeholder="e.g. The Verdict 2029" value={form.title} onChange={(e) => set('title', e.target.value)} /></div></div>
        <div className="f-row">
          <div className="field"><label>Genre</label><div className="in"><span className="fic"><TagIcon /></span><Caret /><select value={form.genre} onChange={(e) => set('genre', e.target.value)}>{GENRES.map((g) => <option key={g}>{g}</option>)}</select></div></div>
          <div className="field"><label>Word count</label><div className="in"><span className="fic"><HashIcon /></span><input type="text" placeholder="e.g. 45,000" value={form.wordCount} onChange={(e) => set('wordCount', e.target.value)} /></div></div>
        </div>
        <div className="field"><label>Synopsis</label><div className="in ta"><span className="fic"><MsgIcon /></span><textarea maxLength={500} placeholder="Two or three lines on what your book covers…" value={form.synopsis} onChange={(e) => set('synopsis', e.target.value)} /></div><div className="cc"><span>{form.synopsis.length}</span>/500</div></div>
        <div className="field">
          <label>Manuscript</label>
          <label className="upload" htmlFor="ms">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4 M7 9l5-5 5 5 M4 20h16" /></svg>
            <span><span style={{ fontWeight: 700, color: 'var(--ink)' }}>Drop DOCX / PDF here or click to browse</span><br /><span style={{ fontSize: 12 }}>Max file size: 20MB</span></span>
            <input id="ms" type="file" accept=".doc,.docx,.pdf" style={{ display: 'none' }} onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
            {fileName && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--coral)' }}>{fileName}</div>}
          </label>
        </div>
        {error && <p style={{ color: 'var(--coral-deep)', fontSize: 13, textAlign: 'center', margin: '0 0 14px' }}>{error}</p>}
        <button type="submit" className="btn btn-coral" style={{ width: '100%', height: 56 }} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit for review →'}</button>
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: '16px 0 0' }}>🛡️ Editorial desk responds within 48 hours · No upfront fee for Essentials!</p>
      </form>
    </div>
  );
}
