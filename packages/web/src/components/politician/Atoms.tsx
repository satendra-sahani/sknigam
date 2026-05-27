// Shared atoms for /politician/* pages — translated from the Insight
// prototype to typed React.  Every visual decision (font, color, radius)
// matches tokens.ts; layout is grid/flex Tailwind-free so we don't have
// to wire bespoke Tailwind colors for this one branded surface.

'use client';

import React from 'react';
import { T, CHIP_TONE, PARTY } from './tokens';

/* ── Card ────────────────────────────────────────────────────────── */

export function Card({
  children,
  p = 14,
  style,
}: {
  children: React.ReactNode;
  p?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: T.paper,
        borderRadius: 14,
        border: `1px solid ${T.hairlineSoft}`,
        padding: p,
        ...style,
      }}>
      {children}
    </div>
  );
}

/* ── Section header ─────────────────────────────────────────────── */

export function Section({
  title,
  hi,
  right,
  style,
}: {
  title: string;
  hi?: string;
  right?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8,
        ...style,
      }}>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: T.ink,
            lineHeight: 1.2,
            fontFamily: T.fontUI,
          }}>
          {title}
        </div>
        {hi && (
          <div
            style={{
              fontSize: 11,
              fontFamily: T.fontHi,
              color: T.muted,
              opacity: 0.85,
              marginTop: 1,
            }}>
            {hi}
          </div>
        )}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

/* ── KPI tile ───────────────────────────────────────────────────── */

export function KPI({
  label,
  hi,
  value,
  sub,
  accent,
  tone,
}: {
  label: string;
  hi?: string;
  value: string;
  sub?: string;
  accent?: string;
  tone?: 'indigoSoft' | 'brassSoft' | 'successSoft' | 'warningSoft' | 'dangerSoft';
}) {
  const bgMap: Record<string, string> = {
    indigoSoft: T.indigoSoft,
    brassSoft: T.brassSoft,
    successSoft: T.successSoft,
    warningSoft: T.warningSoft,
    dangerSoft: T.dangerSoft,
  };
  const bg = tone ? bgMap[tone] : T.paper;
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${T.hairlineSoft}`,
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
      <div
        style={{
          fontSize: 9.5,
          fontFamily: T.fontMono,
          color: T.muted,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          fontWeight: 600,
        }}>
        {label}
        {hi && (
          <span
            style={{
              fontFamily: T.fontHi,
              marginLeft: 6,
              opacity: 0.7,
              letterSpacing: 0,
              textTransform: 'none',
            }}>
            · {hi}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: accent || T.ink,
          letterSpacing: -0.4,
          lineHeight: 1.1,
        }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>{sub}</div>
      )}
    </div>
  );
}

/* ── Chip ───────────────────────────────────────────────────────── */

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: keyof typeof CHIP_TONE;
}) {
  const map = CHIP_TONE[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 999,
        background: map.bg,
        color: map.fg,
        letterSpacing: 0.2,
        fontFamily: T.fontUI,
      }}>
      {children}
    </span>
  );
}

/* ── LeanBadge ───────────────────────────────────────────────────── */

export function LeanBadge({ lean }: { lean: string }) {
  const palette = PARTY[lean] || PARTY.MIX;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        fontSize: 10.5,
        fontWeight: 700,
        borderRadius: 999,
        background: palette.soft,
        color: palette.fg,
        letterSpacing: 0.6,
        fontFamily: T.fontUI,
      }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: palette.fg,
        }}
      />
      {lean}
    </span>
  );
}

/* ── Sentiment dot ──────────────────────────────────────────────── */

export function SentDot({ tone }: { tone: 'pos2' | 'pos1' | 'neu' | 'neg1' | 'neg2' }) {
  const map = {
    pos2: '#1F7A4E',
    pos1: '#5BA37E',
    neu: '#B7873A',
    neg1: '#D67E62',
    neg2: '#B8331F',
  };
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        background: map[tone],
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  );
}

/* ── Scope crumb (STATE › DISTRICT › AC › BOOTH) ─────────────────── */

export function ScopeCrumb({
  trail,
}: {
  trail: { lvl: string; label: string; active?: boolean }[];
}) {
  return (
    <div
      style={{
        background: '#FBF8F1',
        borderBottom: `1px solid ${T.hairlineSoft}`,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}>
      {trail.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span style={{ color: T.muted, fontSize: 10 }}>›</span>
          )}
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              lineHeight: 1.05,
            }}>
            <span
              style={{
                fontSize: 8.5,
                fontFamily: T.fontMono,
                color: T.muted,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                fontWeight: 600,
              }}>
              {s.lvl}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: s.active ? 700 : 600,
                color: s.active ? T.indigo : T.mutedDeep,
              }}>
              {s.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── Eyebrow (mono uppercase label) ──────────────────────────────── */

export function Eyebrow({
  children,
  color,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: T.fontMono,
        color: color || T.muted,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        fontWeight: 700,
        ...style,
      }}>
      {children}
    </span>
  );
}

/* ── Avatar ──────────────────────────────────────────────────────── */

export function Avatar({
  name,
  size = 40,
  tone = 'indigo',
}: {
  name: string;
  size?: number;
  tone?: 'indigo' | 'brass' | 'success' | 'muted';
}) {
  const map: Record<string, [string, string]> = {
    indigo: [T.indigoSoft, T.indigoDeep],
    brass: [T.brassSoft, '#7A5818'],
    success: [T.successSoft, '#0F4A2D'],
    muted: ['#EEEAE0', T.mutedDeep],
  };
  const [bg, fg] = map[tone];
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: bg,
        color: fg,
        display: 'grid',
        placeItems: 'center',
        fontWeight: 700,
        fontSize: size * 0.38,
        flexShrink: 0,
        fontFamily: T.fontUI,
      }}>
      {initials}
    </div>
  );
}

/* ── Progress bar ───────────────────────────────────────────────── */

export function Progress({
  value,
  tone = 'indigo',
  height = 6,
}: {
  value: number;
  tone?: 'indigo' | 'brass' | 'success' | 'warning';
  height?: number;
}) {
  const colors = {
    indigo: T.indigo,
    brass: T.brass,
    success: T.success,
    warning: T.warning,
  };
  return (
    <div
      style={{
        width: '100%',
        height,
        background: '#E9E3D4',
        borderRadius: 999,
        overflow: 'hidden',
      }}>
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: '100%',
          background: colors[tone],
          borderRadius: 999,
        }}
      />
    </div>
  );
}
