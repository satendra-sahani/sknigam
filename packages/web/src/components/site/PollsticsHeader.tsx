'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

const NAV = [
  ['home', 'होम', 'Home', '/'],
  ['accountability', 'जवाबदेही', 'Accountability', '/cat/accountability'],
  ['discourse', 'विमर्श', 'Discourse', '/cat/discourse'],
  ['politics', 'राजनीति', 'Politics', '/cat/politics'],
  ['world', 'दुनिया', 'World', '/cat/world'],
  ['investigation', 'पड़ताल', 'Investigation', '/cat/investigation'],
  ['art', 'कला-साहित्य', 'Art-Literature', '/cat/art'],
  ['cinema', 'सिनेमा', 'Cinema', '/cat/cinema'],
  ['interview', 'साक्षात्कार', 'Interview', '/cat/interview'],
  ['special', 'पोलस्टिक्स विशेष', 'Pollstics Special', '/cat/special'],
  ['video', 'शॉर्ट वीडियो/वीडियो/पॉडकास्ट', 'Shorts/Video/Podcast', '/video'],
] as const;

export function PollsticsHeader({
  activeNav,
  lang,
  setLang,
}: {
  activeNav?: string;
  lang: string;
  setLang: (l: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hi = lang === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  return (
    <>
      <header className="pn-hd">
        <div className="pn-hd-top">
          <div className="pn-hd-row">
            <Link href="/" className="pn-brand">
              <img src="/assets/pollstics/logo.png" alt="Pollstics" />
              <span className="pn-brand-name">POLLSTICS</span>
            </Link>

            <div className="pn-lang">
              <button
                className={hi ? 'active' : 'inactive'}
                onClick={() => setLang('hi')}
              >
                हिंदी
              </button>
              <button
                className={!hi ? 'active' : 'inactive'}
                onClick={() => setLang('en')}
              >
                English
              </button>
            </div>

            <div style={{ flex: 1 }} />

            <label className="pn-search" id="pn-search-desktop">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input placeholder={L('ख़बरें खोजें...', 'Search news...')} />
            </label>

            <button
              aria-label="Menu"
              className="pn-hamb"
              onClick={() => setMenuOpen(true)}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="pn-nav">
          <div className="pn-nav-inner">
            {NAV.map(([key, hi_label, en_label, href], i) => (
              <span key={key} style={{ display: 'contents' }}>
                <Link
                  href={href}
                  className={`pn-nav-link${activeNav === key ? ' active' : ''}`}
                >
                  {L(hi_label, en_label)}
                </Link>
                {i < NAV.length - 1 && <span className="pn-nav-sep" />}
              </span>
            ))}
          </div>
        </nav>
      </header>

      {/* Full-screen menu overlay */}
      <div className={`pn-menu${menuOpen ? ' open' : ''}`}>
        <div className="pn-menu-head">
          <button aria-label="Close" onClick={() => setMenuOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <img src="/assets/pollstics/logo.png" alt="" />
          <span>POLLSTICS</span>
        </div>
        <div className="pn-menu-body">
          <div className="pn-menu-search">
            <input placeholder={L('टाइप करें और एंटर दबाएं', 'Type and press enter')} />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          </div>
          <div className="pn-menu-links">
            {NAV.map(([key, hi_label, en_label, href]) => (
              <Link key={key} href={href} onClick={() => setMenuOpen(false)}>
                {L(hi_label, en_label)} <span style={{ color: '#7a0f1a' }}>›</span>
              </Link>
            ))}
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#7a0f1a', marginTop: 22 }}>
            {L('हमारे बारे में', 'About Us')}
          </span>
          <Link href="/about" onClick={() => setMenuOpen(false)} style={{ fontSize: 18, padding: '8px 0' }}>
            {L('परिचय', 'Introduction')}
          </Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)} style={{ fontSize: 18, padding: '8px 0' }}>
            {L('कांटैक्ट', 'Contact')}
          </Link>
        </div>
      </div>
    </>
  );
}
