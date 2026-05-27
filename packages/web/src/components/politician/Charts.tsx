// Chart primitives for /politician/* — pure SVG, no chart.js dep so
// they render identically to the prototype.  All built around the Civic
// palette in tokens.ts.

'use client';

import React from 'react';
import { T, C_PALETTE, PARTY } from './tokens';

export interface DonutDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

/* ── Donut chart with center label ──────────────────────────────── */

export function Donut({
  data,
  size = 110,
  thickness = 18,
  center,
  centerSub,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  center?: string;
  centerSub?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - thickness / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={T.hairlineSoft}
          strokeWidth={thickness}
        />
        {data.map((d, i) => {
          const len = (d.value / total) * circ;
          const dashArr = `${len} ${circ - len}`;
          const dashOff = -acc;
          acc += len;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={dashArr}
              strokeDashoffset={dashOff}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      {center && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
          }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, lineHeight: 1 }}>
              {center}
            </div>
            {centerSub && (
              <div
                style={{
                  fontSize: 10,
                  color: T.muted,
                  fontFamily: T.fontMono,
                  marginTop: 2,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}>
                {centerSub}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DonutLegend({
  data,
  total,
}: {
  data: DonutDatum[];
  total?: number;
}) {
  const sum = total || data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d) => {
        const pct = ((d.value / sum) * 100).toFixed(1);
        return (
          <div
            key={d.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11.5,
              color: T.mutedDeep,
            }}>
            <span
              style={{
                width: 10,
                height: 10,
                background: d.color,
                borderRadius: 2,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, fontWeight: 600 }}>{d.label}</span>
            <span style={{ fontFamily: T.fontMono, color: T.muted }}>{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Mini line chart ────────────────────────────────────────────── */

export function MiniLine({
  data,
  width = 312,
  height = 88,
  yKey = 'value',
  xKey = 'label',
  yMin,
  yMax,
}: {
  data: Array<Record<string, any>>;
  width?: number;
  height?: number;
  yKey?: string;
  xKey?: string;
  yMin?: number;
  yMax?: number;
}) {
  if (data.length === 0) return null;
  const values = data.map((d) => Number(d[yKey]) || 0);
  const min = yMin ?? Math.min(...values) * 0.92;
  const max = yMax ?? Math.max(...values) * 1.05;
  const range = max - min || 1;
  const px = width / Math.max(data.length - 1, 1);
  const points = values.map((v, i) => [i * px, height - ((v - min) / range) * (height - 10) - 6]);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  const last = points[points.length - 1];
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="mini-line-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.indigo} stopOpacity="0.25" />
          <stop offset="100%" stopColor={T.indigo} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#mini-line-grad)" />
      <path d={path} fill="none" stroke={T.indigo} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={4} fill={T.brass} stroke={T.paper} strokeWidth={2} />
      {/* x-axis labels */}
      {data.map((d, i) =>
        i === 0 || i === data.length - 1 ? (
          <text
            key={i}
            x={i === 0 ? 4 : width - 4}
            y={height - 1}
            fontSize={9}
            fill={T.muted}
            fontFamily={T.fontMono}
            textAnchor={i === 0 ? 'start' : 'end'}>
            {d[xKey]}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/* ── Sentiment grid ─────────────────────────────────────────────── */

export interface SentimentCell {
  code: string;
  sent: -2 | -1 | 0 | 1 | 2;
  name?: string;
}

export function SentimentGrid({
  items,
  cell = 26,
  cols,
}: {
  items: SentimentCell[];
  cell?: number;
  cols?: number;
}) {
  const c = cols ?? Math.min(items.length, 6);
  const palette = [C_PALETTE.neg2, C_PALETTE.neg1, C_PALETTE.neu, C_PALETTE.pos1, C_PALETTE.pos2];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${c}, ${cell}px)`,
        gap: 4,
      }}>
      {items.map((it, i) => (
        <div
          key={i}
          title={`${it.code}${it.name ? ' · ' + it.name : ''}`}
          style={{
            width: cell,
            height: cell,
            borderRadius: 4,
            background: palette[(it.sent ?? 0) + 2],
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontSize: cell <= 22 ? 8.5 : 9.5,
            fontFamily: T.fontMono,
            fontWeight: 700,
            letterSpacing: 0.4,
          }}>
          {it.code.slice(-3)}
        </div>
      ))}
    </div>
  );
}

/* ── Bar list (horizontal stacked rows) ─────────────────────────── */

export interface BarRow {
  label: string;
  value: number;
  sub?: string;
}

export function BarList({
  rows,
  accent = T.indigo,
  max,
}: {
  rows: BarRow[];
  accent?: string;
  max?: number;
}) {
  const m = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r, i) => {
        const pct = (r.value / m) * 100;
        return (
          <div key={i}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                fontSize: 11.5,
                color: T.mutedDeep,
                marginBottom: 4,
              }}>
              <span style={{ fontWeight: 600 }}>{r.label}</span>
              <span style={{ fontFamily: T.fontMono, color: T.muted }}>
                {r.sub ?? r.value.toLocaleString('en-IN')}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: 8,
                background: '#F0EAD8',
                borderRadius: 999,
                overflow: 'hidden',
              }}>
              <div
                style={{ width: `${pct}%`, height: '100%', background: accent, borderRadius: 999 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Stack bar (single-row sentiment composition) ───────────────── */

export interface StackSegment {
  key: string;
  value: number;
  color: string;
  label?: string;
}

export function StackBar({
  segments,
  height = 14,
}: {
  segments: StackSegment[];
  height?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height,
        borderRadius: 999,
        overflow: 'hidden',
        background: '#F0EAD8',
      }}>
      {segments.map((s, i) => (
        <div
          key={i}
          title={`${s.key}: ${s.value}`}
          style={{
            width: `${(s.value / total) * 100}%`,
            background: s.color,
          }}
        />
      ))}
    </div>
  );
}

/* ── Age × gender pyramid ───────────────────────────────────────── */

export interface PyramidRow {
  bucket: string;
  male: number;
  female: number;
}

export function AgePyramid({ rows }: { rows: PyramidRow[] }) {
  const max = Math.max(...rows.map((r) => r.male + r.female), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((r, i) => {
        const mPct = (r.male / max) * 50;
        const fPct = (r.female / max) * 50;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end' }}>
              <div
                style={{
                  width: `${mPct}%`,
                  height: 14,
                  background: C_PALETTE.M,
                  borderRadius: '4px 0 0 4px',
                }}
              />
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: T.fontMono,
                color: T.muted,
                width: 48,
                textAlign: 'center',
                letterSpacing: 0.4,
              }}>
              {r.bucket}
            </div>
            <div style={{ display: 'flex', flex: 1 }}>
              <div
                style={{
                  width: `${fPct}%`,
                  height: 14,
                  background: C_PALETTE.F,
                  borderRadius: '0 4px 4px 0',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Hex India cartogram ────────────────────────────────────────── */
// Very compact stylised India — rows of hex tiles colored by ruling
// party.  Matches the prototype's `HexMapMini` proportions.

export interface HexState {
  code: string;
  name: string;
  party: string;
  row: number;
  col: number;
}

export function HexMapMini({
  states,
  active,
  height = 260,
}: {
  states: HexState[];
  active?: string;
  height?: number;
}) {
  const maxRow = Math.max(...states.map((s) => s.row), 1);
  const maxCol = Math.max(...states.map((s) => s.col), 1);
  // Each hex sits in a roughly square cell; we let the cell scale to fit.
  const cellW = 32;
  const cellH = 28;
  const w = (maxCol + 1) * cellW + cellW;
  const h = (maxRow + 1) * cellH + cellH;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height={height}
      style={{ display: 'block' }}>
      {states.map((s) => {
        const cx = s.col * cellW + (s.row % 2 ? cellW * 0.5 : 0) + cellW / 2;
        const cy = s.row * cellH + cellH / 2;
        const palette = PARTY[s.party] || PARTY.MIX;
        const isActive = active === s.code;
        const pts: string[] = [];
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          pts.push(`${cx + Math.cos(a) * 14},${cy + Math.sin(a) * 14}`);
        }
        return (
          <g key={s.code}>
            <polygon
              points={pts.join(' ')}
              fill={palette.fg}
              stroke={isActive ? T.ink : T.paper}
              strokeWidth={isActive ? 2 : 1}
            />
            <text
              x={cx}
              y={cy + 3}
              textAnchor="middle"
              fontSize={9}
              fill="#fff"
              fontWeight={700}
              fontFamily={T.fontMono}>
              {s.code}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
