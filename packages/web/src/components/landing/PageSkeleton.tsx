'use client';

/**
 * Loading skeletons for the public landing + download pages.  Mirror the
 * editorial chrome (top bar → hero → content stack → footer) so the swap
 * to the real content feels seamless instead of janky.
 *
 * Each skeleton supports the same three palettes the pages do
 * (broadcast | studio | signal) via the `theme` prop — defaults to
 * `studio` so a hard refresh on either page matches the new
 * light-theme default.
 */

import React from 'react';

export type LandingTheme = 'broadcast' | 'studio' | 'signal';

interface SkeletonProps {
  theme?: LandingTheme;
  /**
   * `landing` mimics the homepage rhythm (hero + KPI cards + chart row +
   * tool bento). `download` mimics the /download rhythm (hero with phone
   * mockup + two app cards + feature grid).
   */
  variant?: 'landing' | 'download';
}

export function PageSkeleton({ theme = 'studio', variant = 'landing' }: SkeletonProps) {
  return (
    <div className={`pl-skel pl-skel-theme-${theme}`}>
      <SkelTopBar />
      <SkelTickerStrip />
      {variant === 'landing' ? <SkelLandingBody /> : <SkelDownloadBody />}
      <SkelFooter />
      <SkelStyles />
    </div>
  );
}

function Bar({ w = '100%', h = 14, r = 4, style }: { w?: number | string; h?: number; r?: number; style?: React.CSSProperties }) {
  return <span className="pl-skel-bar" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function Block({ w = '100%', h = 80, r = 8, style }: { w?: number | string; h?: number; r?: number; style?: React.CSSProperties }) {
  return <span className="pl-skel-block" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function SkelTopBar() {
  return (
    <div className="pl-skel-header">
      <div className="pl-skel-container pl-skel-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bar w={28} h={28} r={14} />
          <Bar w={96} h={16} />
          <Bar w={88} h={10} />
        </div>
        <div style={{ display: 'flex', gap: 22 }}>
          {[60, 48, 60, 52, 70, 56, 36].map((w, i) => (
            <Bar key={i} w={w} h={12} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Bar w={78} h={28} r={4} />
          <Bar w={70} h={28} r={4} />
        </div>
      </div>
    </div>
  );
}

function SkelTickerStrip() {
  return (
    <div className="pl-skel-ticker">
      <div className="pl-skel-container pl-skel-ticker-row">
        <Bar w={92} h={10} />
        <Bar w="60%" h={10} />
        <Bar w={90} h={10} />
      </div>
    </div>
  );
}

function SkelLandingBody() {
  return (
    <div className="pl-skel-container" style={{ paddingTop: 36 }}>
      {/* Hero meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
        <Bar w={240} h={11} />
        <Bar w={180} h={11} />
      </div>
      {/* Hero grid */}
      <div className="pl-skel-hero-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Bar w="92%" h={78} r={6} />
          <Bar w="78%" h={78} r={6} />
          <Bar w="70%" h={14} />
          <Bar w="62%" h={14} />
          <Bar w="50%" h={14} />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Bar w={210} h={44} r={4} />
            <Bar w={170} h={44} r={4} />
          </div>
        </div>
        <Block h={360} r={6} />
      </div>

      {/* Section rule + kicker */}
      <div className="pl-skel-rule" />
      <Bar w={220} h={11} style={{ marginTop: 14 }} />
      <Bar w="60%" h={28} style={{ marginTop: 10 }} />
      <Bar w="42%" h={12} style={{ marginTop: 12 }} />

      {/* KPI row */}
      <div className="pl-skel-kpi-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <Block key={i} h={104} r={8} />
        ))}
      </div>

      {/* Two-col content row */}
      <div className="pl-skel-twocol">
        <Block h={320} r={6} />
        <Block h={320} r={6} />
      </div>

      {/* Trio of charts */}
      <div className="pl-skel-trio">
        <Block h={260} r={6} />
        <Block h={260} r={6} />
        <Block h={260} r={6} />
      </div>
    </div>
  );
}

function SkelDownloadBody() {
  return (
    <div className="pl-skel-container" style={{ paddingTop: 80 }}>
      {/* Hero */}
      <div className="pl-skel-hero-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Bar w={190} h={11} />
          <Bar w="92%" h={64} r={6} />
          <Bar w="74%" h={64} r={6} />
          <Bar w="62%" h={14} />
          <Bar w="56%" h={14} />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Bar w={210} h={44} r={4} />
            <Bar w={180} h={44} r={4} />
          </div>
        </div>
        {/* Phone mockup placeholder */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="pl-skel-phone">
            <div className="pl-skel-phone-screen" />
          </div>
        </div>
      </div>

      {/* Section break */}
      <div className="pl-skel-rule" style={{ marginTop: 56 }} />
      <Bar w={210} h={11} style={{ marginTop: 14 }} />
      <Bar w="62%" h={34} style={{ marginTop: 10 }} />
      <Bar w="44%" h={12} style={{ marginTop: 12 }} />

      {/* Two app cards */}
      <div className="pl-skel-twocol">
        <Block h={520} r={6} />
        <Block h={520} r={6} />
      </div>

      {/* 8-feature grid */}
      <div className="pl-skel-rule" style={{ marginTop: 56 }} />
      <Bar w={150} h={11} style={{ marginTop: 14 }} />
      <Bar w="44%" h={32} style={{ marginTop: 10 }} />
      <div className="pl-skel-feature-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <Block key={i} h={130} r={4} />
        ))}
      </div>
    </div>
  );
}

function SkelFooter() {
  return (
    <div className="pl-skel-footer">
      <div className="pl-skel-container">
        <div className="pl-skel-footer-row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Bar w={140} h={20} />
            <Bar w={280} h={12} />
            <Bar w={260} h={12} />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Bar w={80} h={11} />
              <Bar w={120} h={12} />
              <Bar w={100} h={12} />
              <Bar w={110} h={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SkelStyles() {
  return (
    <style jsx global>{`
      /* BROADCAST */
      .pl-skel.pl-skel-theme-broadcast {
        --sk-bg: #111114;
        --sk-bg-2: #17171b;
        --sk-paper: #1a1a1e;
        --sk-rule: #2a2a30;
        --sk-shimmer-1: rgba(245, 245, 247, 0.06);
        --sk-shimmer-2: rgba(245, 245, 247, 0.14);
        --sk-footer-bg: #0e0e10;
      }
      /* STUDIO (default) */
      .pl-skel.pl-skel-theme-studio {
        --sk-bg: #f3f4f6;
        --sk-bg-2: #e8eaee;
        --sk-paper: #ffffff;
        --sk-rule: #d8dbe0;
        --sk-shimmer-1: #e3e5ea;
        --sk-shimmer-2: #f0f1f4;
        --sk-footer-bg: #0e0e10;
      }
      /* SIGNAL */
      .pl-skel.pl-skel-theme-signal {
        --sk-bg: #0e0e10;
        --sk-bg-2: #16161a;
        --sk-paper: #14141a;
        --sk-rule: #2c2530;
        --sk-shimmer-1: rgba(255, 42, 58, 0.08);
        --sk-shimmer-2: rgba(255, 42, 58, 0.18);
        --sk-footer-bg: #0e0e10;
      }
      .pl-skel {
        background: var(--sk-bg);
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        font-family: var(--font-instrument), 'Instrument Sans', system-ui, sans-serif;
      }
      .pl-skel-container {
        max-width: 1360px;
        margin: 0 auto;
        padding: 0 28px;
        width: 100%;
      }
      .pl-skel-bar,
      .pl-skel-block {
        display: inline-block;
        background: linear-gradient(90deg, var(--sk-shimmer-1) 0%, var(--sk-shimmer-2) 50%, var(--sk-shimmer-1) 100%);
        background-size: 200% 100%;
        animation: pl-skel-shimmer 1.4s linear infinite;
      }
      .pl-skel-block {
        display: block;
        width: 100%;
      }
      @keyframes pl-skel-shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
      .pl-skel-header {
        height: 60px;
        background: var(--sk-bg);
        border-bottom: 1px solid var(--sk-rule);
      }
      .pl-skel-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 60px;
      }
      .pl-skel-ticker {
        height: 36px;
        background: var(--sk-bg-2);
        border-bottom: 1px solid var(--sk-rule);
      }
      .pl-skel-ticker-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 36px;
        gap: 24px;
      }
      .pl-skel-rule {
        height: 1px;
        background: var(--sk-rule);
        width: 100%;
        margin-top: 56px;
      }
      .pl-skel-hero-grid {
        display: grid;
        grid-template-columns: 1.35fr 1fr;
        gap: 36px;
        align-items: start;
        padding: 12px 0 36px;
      }
      .pl-skel-kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin-top: 24px;
      }
      .pl-skel-twocol {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin-top: 24px;
      }
      .pl-skel-trio {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 16px;
        margin-top: 16px;
        margin-bottom: 56px;
      }
      .pl-skel-feature-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1px;
        background: var(--sk-rule);
        border: 1px solid var(--sk-rule);
        margin-top: 28px;
        margin-bottom: 56px;
      }
      .pl-skel-phone {
        width: 280px;
        aspect-ratio: 380 / 824;
        border-radius: 36px;
        padding: 6px;
        background: #1f1c1a;
      }
      .pl-skel-phone-screen {
        width: 100%;
        height: 100%;
        border-radius: 30px;
        background: linear-gradient(170deg, #1a1a1e 0%, #232228 100%);
      }
      .pl-skel-footer {
        margin-top: auto;
        background: var(--sk-footer-bg);
        padding: 56px 0 32px;
      }
      .pl-skel-footer-row {
        display: grid;
        grid-template-columns: 1.4fr 1fr 1fr 1fr;
        gap: 36px;
      }
      @media (max-width: 960px) {
        .pl-skel-container {
          padding: 0 16px;
        }
        .pl-skel-hero-grid,
        .pl-skel-twocol {
          grid-template-columns: 1fr;
          gap: 24px;
        }
        .pl-skel-kpi-grid {
          grid-template-columns: 1fr 1fr;
        }
        .pl-skel-trio,
        .pl-skel-feature-grid {
          grid-template-columns: 1fr 1fr;
        }
        .pl-skel-footer-row {
          grid-template-columns: 1fr 1fr;
        }
      }
    `}</style>
  );
}

/**
 * Tiny hook: returns `false` on the very first server→client render so a
 * skeleton can show during initial hydration, then flips to `true`.
 *
 * A module-level flag (`hasEverHydrated`) ensures that subsequent
 * client-side navigations (via Next.js <Link>) start with `true`
 * immediately — no skeleton flash between pages.
 */
let hasEverHydrated = false;

export function useHydrated(): boolean {
  const [ready, setReady] = React.useState(hasEverHydrated);
  React.useEffect(() => {
    hasEverHydrated = true;
    if (!ready) setReady(true);
  }, []);
  return ready;
}
