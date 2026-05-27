'use client';

import { useState } from 'react';
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
  const [theme, setTheme] = useState<ThemeKey>('studio');
  const hydrated = useHydrated();

  if (!hydrated) return <PageSkeleton variant={skeleton} theme={theme} />;

  return (
    <div className={`ps-page theme-${theme}`}>
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
            <button
              type="button"
              className="ps-btn-ghost ps-btn-sm"
              onClick={() =>
                setTheme(theme === 'broadcast' ? 'studio' : theme === 'studio' ? 'signal' : 'broadcast')
              }
              title="Switch palette">
              <span className="ps-theme-dot" />
              <span style={{ marginLeft: 6, textTransform: 'capitalize' }}>{theme}</span>
            </button>
            <Link href="/login" className="ps-btn-ghost ps-btn-sm">Sign in</Link>
          </div>
        </div>
      </header>

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
      .ps-page .ps-theme-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--ps-accent)}
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
      @media(max-width:960px){.ps-page .ps-container{padding:0 16px}.ps-page .ps-nav{display:none}.ps-page .ps-section-h{font-size:28px}.ps-page .ps-footer-top{grid-template-columns:1fr 1fr}}
      @media(max-width:640px){.ps-page .ps-footer-top{grid-template-columns:1fr}}
    `}</style>
  );
}
