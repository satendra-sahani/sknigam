// Politician chrome — faithful to `Politician App.html` (the design
// canvas at claude-design/sknigam-handoff/sknigam/project/politician-app).
//
// The prototype is a mobile-first phone app: ~420px wide centered column
// with a top AppBar (InsightMark · bell · avatar), scrollable body, and
// a 4-tab bottom nav (Home · Explore · Insights · Saved).  We reproduce
// that on the web by centering the same column on a cream backdrop on
// desktop and letting it fill the viewport on mobile.

'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { T } from './tokens';
import { Avatar } from './Atoms';

interface TabDef {
  label: string;
  hi: string;
  href: string;
  icon: (m: React.SVGProps<SVGPathElement>) => React.ReactElement;
}

const TABS: TabDef[] = [
  {
    label: 'Home',
    hi: 'मुख्य',
    href: '/politician',
    icon: (m) => <path d="M3 10l9-7 9 7v11h-6v-7H9v7H3z" {...m} />,
  },
  {
    label: 'Explore',
    hi: 'खोज',
    href: '/politician/explore',
    icon: (m) => (
      <path
        d="M12 3a9 9 0 100 18 9 9 0 000-18z M3 12h18 M12 3c2.5 3 2.5 15 0 18 M12 3c-2.5 3-2.5 15 0 18"
        {...m}
      />
    ),
  },
  {
    label: 'Insights',
    hi: 'विश्लेषण',
    href: '/politician/insights',
    icon: (m) => <path d="M4 20V10 M10 20V4 M16 20v-9 M22 20V7" {...m} />,
  },
  {
    label: 'Saved',
    hi: 'सेव',
    href: '/politician/saved',
    icon: (m) => <path d="M6 3h12v18l-6-4-6 4z" {...m} />,
  },
];

const COLUMN_WIDTH = 420;

export default function PoliticianShell({
  children,
  title,
  hi,
  back,
  topRight,
  appBarTone = 'cream',
}: {
  children: React.ReactNode;
  /** Optional title.  When omitted we paint the InsightMark instead — used on Home. */
  title?: string;
  hi?: string;
  back?: boolean;
  topRight?: React.ReactNode;
  appBarTone?: 'cream' | 'ink';
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const activeIdx = useMemo(() => {
    return TABS.findIndex(
      (t) => pathname === t.href || pathname?.startsWith(t.href + '/'),
    );
  }, [pathname]);

  const userName = user?.name || 'Politician';
  const isHome = pathname === '/politician';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1A1816',
        // Plenty of room on desktop to show the phone column on the cream
        // backdrop the prototype uses.
        padding: '24px 16px',
        display: 'flex',
        justifyContent: 'center',
        fontFamily: T.fontUI,
      }}>
      <div
        style={{
          width: '100%',
          maxWidth: COLUMN_WIDTH,
          minHeight: 'calc(100vh - 48px)',
          background: appBarTone === 'ink' ? T.ink : T.cream,
          borderRadius: 28,
          boxShadow:
            '0 30px 60px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: T.ink,
          position: 'relative',
        }}>
        {/* AppBar */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            background: appBarTone === 'ink' ? T.ink : T.cream,
            borderBottom:
              appBarTone === 'ink' ? 'none' : `1px solid ${T.hairlineSoft}`,
            color: appBarTone === 'ink' ? '#fff' : T.ink,
            flexShrink: 0,
          }}>
          {back ? (
            <button
              onClick={() => router.back()}
              aria-label="Back"
              style={{
                width: 32,
                height: 32,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 16,
                background:
                  appBarTone === 'ink' ? 'rgba(255,255,255,.06)' : 'transparent',
                border: 'none',
                color: 'currentColor',
                cursor: 'pointer',
              }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round">
                <path d="M11 3.5L5.5 9 11 14.5" />
              </svg>
            </button>
          ) : isHome ? (
            <InsightMark />
          ) : null}

          {title && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  letterSpacing: -0.1,
                }}>
                {title}
              </div>
              {hi && (
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: T.fontHi,
                    opacity: 0.65,
                    marginTop: 1,
                  }}>
                  {hi}
                </div>
              )}
            </div>
          )}

          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
            {topRight}
            {/* Bell */}
            <div
              title="Alerts"
              style={{
                position: 'relative',
                width: 32,
                height: 32,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 16,
                background: T.paper,
                border: `1px solid ${T.hairline}`,
              }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={T.ink}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10 21a2 2 0 004 0" />
              </svg>
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 7,
                  height: 7,
                  background: '#B8331F',
                  borderRadius: 4,
                  border: `1.5px solid ${T.paper}`,
                }}
              />
            </div>
            {/* Avatar — click to sign out */}
            <button
              onClick={() => logout()}
              title="Sign out"
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}>
              <Avatar name={userName} size={32} tone="indigo" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            paddingBottom: 80, // leave room for the fixed bottom tab bar
            background: appBarTone === 'ink' ? T.ink : T.cream,
          }}>
          {children}
        </div>

        {/* Bottom tab bar */}
        <div
          style={{
            height: 64,
            background: T.paper,
            borderTop: `1px solid ${T.hairlineSoft}`,
            display: 'flex',
            alignItems: 'stretch',
            flexShrink: 0,
            position: 'sticky',
            bottom: 0,
          }}>
          {TABS.map((t, i) => {
            const on = i === activeIdx;
            const fg = on ? T.indigo : T.muted;
            return (
              <Link
                key={t.href}
                href={t.href}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  color: fg,
                  position: 'relative',
                  textDecoration: 'none',
                }}>
                {on && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      width: 32,
                      height: 3,
                      background: T.indigo,
                      borderRadius: 2,
                    }}
                  />
                )}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  {t.icon({
                    stroke: 'currentColor',
                    strokeWidth: 1.7,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    fill: on ? T.indigoSoft : 'none',
                  })}
                </svg>
                <div style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── InsightMark — POLLSTICS · INSIGHT · PRO ──────────────────── */

function InsightMark() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: T.indigo,
          color: '#fff',
          fontWeight: 800,
          letterSpacing: -0.4,
          display: 'grid',
          placeItems: 'center',
          fontSize: 14,
          flexShrink: 0,
        }}>
        P
      </span>
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          lineHeight: 1,
        }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: -0.2,
            color: T.ink,
          }}>
          POLLSTICS
        </span>
        <span
          style={{
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: '#B8331F',
            marginTop: 2,
            fontFamily: T.fontMono,
          }}>
          INSIGHT · PRO
        </span>
      </span>
    </span>
  );
}
