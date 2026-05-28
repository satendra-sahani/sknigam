'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageSkeleton, useHydrated } from './PageSkeleton';

type ThemeKey = 'broadcast' | 'studio' | 'signal';

const NAV = [
  ['Home', '/'],
  ['About', '/about'],
  ['Search', '/search'],
  ['Explore', '/explore-public'],
  ['Report', '/report'],
  ['App', '/download'],
] as const;

// Theme is locked to the light "Studio" palette — the in-header theme
// switcher pill was removed per product feedback. Kept as a constant so
// the theme-scoped CSS variables still resolve.
const THEME: ThemeKey = 'studio';

const FOOTER_COLS = [
  ['Product', ['Staff App', 'Insight Pro', 'Web Dashboard', 'API Access']],
  ['Elections', ['Lok Sabha 2024', 'Vidhan Sabha', 'Archive 1952–', 'Bypolls']],
  ['Company', ['About', 'Methodology', 'Press', 'Careers', 'Contact']],
] as const;

export function PublicShell({
  children,
  activeNav,
  skeleton = 'landing',
}: {
  children: React.ReactNode;
  activeNav: string;
  skeleton?: 'landing' | 'download';
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hydrated = useHydrated();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    if (drawerOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  if (!hydrated) return <PageSkeleton variant={skeleton} theme={THEME} />;

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className={`ps-page theme-${THEME}`}>
      <header className="ps-header">
        <div className="ps-container ps-header-row">
          <Link href="/" className="ps-brand">
            <img src="/pollistics-logo.png" alt="" width={28} height={28} className="ps-brand-img" />
            <span className="ps-brand-name">Pollistics</span>
            <span className="ps-brand-tag">India · est. 2024</span>
          </Link>
          <nav className="ps-nav">
            {NAV.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className={`ps-nav-item ${activeNav === label ? 'ps-nav-active' : ''}`}>
                {label}
              </Link>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/login" className="ps-btn-ghost ps-btn-sm ps-header-signin">Sign in</Link>
            <button
              type="button"
              className="ps-burger"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}>
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={`ps-drawer-overlay ${drawerOpen ? 'ps-drawer-open' : ''}`}
        onClick={closeDrawer}
        aria-hidden={!drawerOpen}
      />
      <aside
        className={`ps-drawer ${drawerOpen ? 'ps-drawer-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!drawerOpen}>
        <div className="ps-drawer-head">
          <Link href="/" className="ps-brand" onClick={closeDrawer}>
            <img src="/pollistics-logo.png" alt="" width={26} height={26} className="ps-brand-img" />
            <span className="ps-brand-name" style={{ fontSize: 18 }}>Pollistics</span>
          </Link>
          <button
            type="button"
            className="ps-drawer-close"
            aria-label="Close menu"
            onClick={closeDrawer}>
            ×
          </button>
        </div>
        <nav className="ps-drawer-nav">
          {NAV.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className={`ps-drawer-item ${activeNav === label ? 'ps-drawer-item-active' : ''}`}
              onClick={closeDrawer}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="ps-drawer-foot">
          <Link href="/login" className="ps-btn-solid ps-drawer-signin" onClick={closeDrawer}>
            Sign in
          </Link>
        </div>
      </aside>

      {children}

      <footer className="ps-footer">
        <div className="ps-container">
          <div className="ps-footer-top">
            <div>
              <div className="ps-footer-brand">
                <img src="/pollistics-logo.png" alt="" width={34} height={34} style={{ borderRadius: '50%' }} />
                <span style={{ fontFamily: 'var(--font-newsreader), serif', fontSize: 24, fontWeight: 600 }}>
                  Pollistics
                </span>
              </div>
              <p className="ps-footer-tag">
                The world&apos;s largest democracy deserves the world&apos;s clearest election record.
              </p>
              <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
                <Link href="/login" className="ps-btn-solid ps-btn-accent">Try free</Link>
                <Link href="/about" className="ps-btn-ghost" style={{ borderColor: 'rgba(255,255,255,.2)', color: '#f5f3ef' }}>
                  About us
                </Link>
              </div>
            </div>
            {FOOTER_COLS.map(([title, items]) => (
              <div key={title} className="ps-footer-col">
                <h5 className="ps-mono">{(title as string).toUpperCase()}</h5>
                <ul>{(items as readonly string[]).map((it) => <li key={it}>{it}</li>)}</ul>
              </div>
            ))}
          </div>
          <div className="ps-footer-bottom ps-mono">
            <span>© 2026 Pollistics Media Pvt. Ltd. · ECI-verified election archive</span>
            <span>Methodology · Disclaimer · Privacy · Terms</span>
          </div>
        </div>
      </footer>

      <ShellStyles />
    </div>
  );
}

function ShellStyles() {
  return (
    <style jsx global>{`
      .ps-page.theme-broadcast {
        --ps-bg:#111114;--ps-bg-tint:#17171b;--ps-paper:#1a1a1e;--ps-paper-2:#222228;
        --ps-ink:#f5f5f7;--ps-ink-soft:#d4d4d8;--ps-muted:#85858d;
        --ps-rule:#2a2a30;--ps-rule-2:#3d3d45;--ps-accent:#ef2233;
        --ps-chip-bg:rgba(245,245,247,.07);
      }
      .ps-page.theme-studio {
        --ps-bg:#f3f4f6;--ps-bg-tint:#e8eaee;--ps-paper:#ffffff;--ps-paper-2:#f7f8fa;
        --ps-ink:#0d0d10;--ps-ink-soft:#1f1f24;--ps-muted:#65686e;
        --ps-rule:#d8dbe0;--ps-rule-2:#b4b8c0;--ps-accent:#e11e2c;
        --ps-chip-bg:rgba(13,13,16,.05);
      }
      .ps-page.theme-signal {
        --ps-bg:#0e0e10;--ps-bg-tint:#16161a;--ps-paper:#14141a;--ps-paper-2:#1e1e25;
        --ps-ink:#f5efe6;--ps-ink-soft:#d8d2c8;--ps-muted:#8a8088;
        --ps-rule:#2c2530;--ps-rule-2:#443a48;--ps-accent:#ff2a3a;
        --ps-chip-bg:rgba(255,42,58,.1);
      }
      .ps-page{background:var(--ps-bg);color:var(--ps-ink);font-family:var(--font-instrument),'Instrument Sans',system-ui,sans-serif;font-size:15px;line-height:1.45;min-height:100vh;-webkit-font-smoothing:antialiased}
      .ps-page .ps-serif{font-family:var(--font-newsreader),'Newsreader',Georgia,serif;font-weight:420;letter-spacing:-.01em}
      .ps-page .ps-serif-it{font-family:var(--font-newsreader),'Newsreader',Georgia,serif;font-style:italic;font-weight:360}
      .ps-page .ps-mono{font-family:var(--font-jetbrains),'JetBrains Mono',ui-monospace,Menlo,monospace}
      .ps-page .ps-accent{color:var(--ps-accent)}
      .ps-page .ps-container{max-width:1360px;margin:0 auto;padding:0 28px}
      .ps-page .ps-section{padding:60px 0;border-top:1px solid var(--ps-rule)}
      .ps-page .ps-thick-rule{height:1px;background:var(--ps-ink);opacity:.65;width:100%}
      .ps-page .ps-kicker{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-jetbrains),monospace;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--ps-accent)}
      .ps-page .ps-kicker::before{content:'';width:6px;height:6px;background:var(--ps-accent);display:inline-block;border-radius:50%}
      .ps-page .ps-card{background:var(--ps-paper);border:1px solid var(--ps-rule);border-radius:6px;padding:28px}
      .ps-page .ps-section-head{margin-bottom:36px}
      .ps-page .ps-section-h{font-family:var(--font-newsreader),serif;font-size:44px;font-weight:380;letter-spacing:-.02em;margin:10px 0 0;line-height:1.05}
      .ps-page .ps-section-p{color:var(--ps-muted);max-width:640px;font-size:15px;margin-top:12px}
      .ps-page .ps-btn-solid{height:44px;padding:0 22px;font-size:14px;font-weight:600;background:var(--ps-ink);color:var(--ps-paper);border:0;border-radius:4px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:10px;text-decoration:none}
      .ps-page .ps-btn-ghost{height:44px;padding:0 18px;font-size:14px;font-weight:500;background:transparent;color:var(--ps-ink);border:1px solid var(--ps-rule-2);border-radius:4px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:10px;text-decoration:none}
      .ps-page .ps-btn-accent{background:var(--ps-accent);color:#fff;border-color:var(--ps-accent)}
      .ps-page .ps-btn-sm{height:34px;padding:0 14px;font-size:13px}
      .ps-page .ps-header{position:sticky;top:0;z-index:50;background:var(--ps-bg);border-bottom:1px solid var(--ps-rule)}
      .ps-page .ps-header-row{display:flex;align-items:center;justify-content:space-between;height:60px}
      .ps-page .ps-brand{display:inline-flex;align-items:center;gap:10px;text-decoration:none}
      .ps-page .ps-brand-img{border-radius:50%;display:block}
      .ps-page .ps-brand-name{font-family:var(--font-newsreader),serif;font-size:22px;font-weight:600;letter-spacing:-.015em;color:var(--ps-ink)}
      .ps-page .ps-brand-tag{font-family:var(--font-jetbrains),monospace;font-size:9.5px;color:var(--ps-muted);letter-spacing:.12em;text-transform:uppercase;border-left:1px solid var(--ps-rule);padding-left:10px;margin-left:2px}
      .ps-page .ps-nav{display:flex;align-items:center;gap:22px;font-size:13.5px}
      .ps-page .ps-nav-item{color:var(--ps-ink-soft);font-weight:500;padding:18px 0;border-bottom:1.5px solid transparent;text-decoration:none}
      .ps-page .ps-nav-active{color:var(--ps-ink);font-weight:600;border-bottom-color:var(--ps-accent)}
      .ps-page .ps-footer{background:#0e0e10;color:#f5f3ef;margin-top:56px}
      .ps-page .ps-footer .ps-container{padding-top:56px;padding-bottom:32px}
      .ps-page .ps-footer-top{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:36px;align-items:flex-start}
      .ps-page .ps-footer-brand{display:flex;align-items:center;gap:10px}
      .ps-page .ps-footer-tag{font-family:var(--font-newsreader),serif;font-size:17px;line-height:1.4;color:rgba(243,236,225,.7);max-width:320px;margin-top:14px}
      .ps-page .ps-footer-col h5{font-family:var(--font-jetbrains),monospace;font-size:10.5px;letter-spacing:.15em;text-transform:uppercase;color:rgba(243,236,225,.55);margin:0 0 14px;font-weight:600}
      .ps-page .ps-footer-col ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:9px}
      .ps-page .ps-footer-col li{font-size:13px;color:rgba(243,236,225,.82)}
      .ps-page .ps-footer-bottom{margin-top:48px;padding-top:20px;border-top:1px solid rgba(243,236,225,.12);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:11px;color:rgba(243,236,225,.5)}
      /* HAMBURGER + DRAWER */
      .ps-page .ps-burger{display:none;flex-direction:column;justify-content:center;gap:4px;width:38px;height:38px;padding:8px;background:var(--ps-paper);border:1px solid var(--ps-rule);border-radius:4px;cursor:pointer}
      .ps-page .ps-burger>span{display:block;width:100%;height:2px;background:var(--ps-ink);border-radius:1px}
      .ps-drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);opacity:0;pointer-events:none;transition:opacity .25s ease;z-index:90}
      .ps-drawer-overlay.ps-drawer-open{opacity:1;pointer-events:auto}
      .ps-page .ps-drawer{position:fixed;top:0;right:0;bottom:0;width:min(82vw,320px);background:var(--ps-paper);border-left:1px solid var(--ps-rule);z-index:100;transform:translateX(100%);transition:transform .28s cubic-bezier(.2,.7,.2,1);display:flex;flex-direction:column;box-shadow:-20px 0 40px -20px rgba(0,0,0,.35);visibility:hidden}
      .ps-page .ps-drawer.ps-drawer-open{transform:translateX(0);visibility:visible}
      .ps-page .ps-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--ps-rule)}
      .ps-page .ps-drawer-close{width:36px;height:36px;background:transparent;border:1px solid var(--ps-rule);border-radius:4px;font-size:22px;line-height:1;color:var(--ps-ink);cursor:pointer;font-family:inherit}
      .ps-page .ps-drawer-nav{display:flex;flex-direction:column;padding:8px 0;flex:1;overflow-y:auto}
      .ps-page .ps-drawer-item{display:block;padding:14px 22px;font-size:15px;font-weight:500;color:var(--ps-ink-soft);text-decoration:none;border-left:3px solid transparent}
      .ps-page .ps-drawer-item-active{color:var(--ps-ink);border-left-color:var(--ps-accent);background:var(--ps-paper-2)}
      .ps-page .ps-drawer-foot{padding:16px 18px;border-top:1px solid var(--ps-rule)}
      .ps-page .ps-drawer-signin{width:100%;justify-content:center}

      @media(max-width:960px){
        .ps-page .ps-container{padding:0 16px}
        .ps-page .ps-nav{display:none}
        .ps-page .ps-burger{display:inline-flex}
        .ps-page .ps-header-signin{display:none}
        .ps-page .ps-brand-tag{display:none}
        .ps-page .ps-section{padding:40px 0}
        .ps-page .ps-section-head{margin-bottom:24px}
        .ps-page .ps-section-h{font-size:28px}
        .ps-page .ps-card{padding:20px}
        .ps-page .ps-footer-top{grid-template-columns:1fr 1fr}
      }
      @media(max-width:640px){
        .ps-page .ps-section-h{font-size:24px}
        .ps-page .ps-section-p{font-size:14px}
        .ps-page .ps-btn-solid,.ps-page .ps-btn-ghost{height:40px;padding:0 16px;font-size:13px}
        .ps-page .ps-footer-top{grid-template-columns:1fr;gap:28px}
        .ps-page .ps-footer-bottom{flex-direction:column;align-items:flex-start;gap:6px}
      }
    `}</style>
  );
}
