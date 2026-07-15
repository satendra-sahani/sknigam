'use client';

/**
 * Shared Pollistics marketing header. Sticky bar with the round-logo brand
 * ("Poll" + coral "istics"), a flat desktop nav, a coral Login CTA and a
 * mobile hamburger drawer.
 *
 * IA follows the Claude Design handoff exactly:
 *   Home · Company · Publish · Bookstore · App · Contact   + Login
 * Services is reached from the homepage / footer, not the primary nav.
 */
import { useState } from 'react';
import Link from 'next/link';

export type SiteNavKey =
  | 'home'
  | 'about'
  | 'publish'
  | 'bookstore'
  | 'app'
  | 'contact'
  // Reachable pages that don't sit in the primary nav — the key stays valid so
  // the page compiles; it simply highlights nothing.
  | 'services';

const NAV: Array<[SiteNavKey, string, string]> = [
  ['home', 'Home', '/'],
  ['about', 'Company', '/about'],
  ['publish', 'Publish', '/publish'],
  ['bookstore', 'Bookstore', '/bookstore'],
  ['app', 'App', '/download'],
  ['contact', 'Contact', '/contact'],
];

export function SiteHeader({ active }: { active?: SiteNavKey }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="ph-hd">
        <div className="row">
          <Link href="/" className="brand">
            <img src="/assets/logo.png" alt="Pollistics" />
            <span className="bn">Poll<span>istics</span></span>
          </Link>

          <nav className="ph-nav">
            {NAV.map(([key, label, href]) => (
              <div className={`item${active === key ? ' act' : ''}`} key={key}>
                <Link href={href}>{label}</Link>
              </div>
            ))}
          </nav>

          <div className="ph-cta">
            <Link href="/login" className="req">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4 M10 17l5-5-5-5 M15 12H3" /></svg>
              Login
            </Link>
            <button className="ph-hamb" aria-label="Menu" onClick={() => setOpen(true)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B2330" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18 M3 12h18 M3 18h18" /></svg>
            </button>
          </div>
        </div>
      </header>

      <div
        className={`pol-drawer${open ? ' open' : ''}`}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
      >
        <div className="pnl" onClick={() => setOpen(false)}>
          {NAV.map(([key, label, href]) => (
            <Link key={key} href={href}>{label}</Link>
          ))}
          <Link href="/services">Services</Link>
          <Link href="/login">Login</Link>
        </div>
      </div>
    </>
  );
}
