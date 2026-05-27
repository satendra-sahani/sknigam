// POLLSTICS · Insight — RN-friendly chart primitives.
//
// No react-native-svg, so every chart is built from Views.
// DonutChart uses the rotated-half-circle mask technique for arcs.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../utils/constants';
import { FONTS } from '../../utils/theme';
import { SENT } from './InsightAtoms';

/* ── Sentiment grid (View grid of colored cells) ─────────────────── */

export interface SentimentCell {
  code: string;
  sent: -2 | -1 | 0 | 1 | 2;
  name?: string;
}

export function SentimentGrid({
  items,
  cell = 26,
}: {
  items: SentimentCell[];
  cell?: number;
}) {
  const palette = [SENT.neg2, SENT.neg1, SENT.neu, SENT.pos1, SENT.pos2];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {items.map((it, i) => (
        <View
          key={i}
          style={{
            width: cell,
            height: cell,
            borderRadius: 4,
            backgroundColor: palette[(it.sent ?? 0) + 2],
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text
            style={{
              fontFamily: FONTS.monoBold,
              fontSize: cell <= 22 ? 8.5 : 9.5,
              color: '#fff',
              letterSpacing: 0.4,
            }}>
            {it.code.slice(-3)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ── BarList (horizontal bars with mono % label) ─────────────────── */

export interface BarRow {
  label: string;
  value: number;
  sub?: string;
  color?: string;
}

export function BarList({
  rows,
  accent = COLORS.indigo,
  max,
}: {
  rows: BarRow[];
  accent?: string;
  max?: number;
}) {
  const m = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => {
        const pct = (r.value / m) * 100;
        return (
          <View key={i}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>{r.label}</Text>
              <Text style={styles.barValue}>
                {r.sub ?? r.value.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: r.color || accent,
                  borderRadius: 999,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ── StackBar (single-row composition bar) ────────────────────────── */

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
    <View
      style={{
        flexDirection: 'row',
        width: '100%',
        height,
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: '#E9E3D4',
      }}>
      {segments.map((s, i) => (
        <View
          key={i}
          style={{
            flex: s.value / total,
            backgroundColor: s.color,
          }}
        />
      ))}
    </View>
  );
}

/* ── DonutChart — View-based ring using rotated half-circle masks ── */

export interface DonutDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

function DonutArc({
  size,
  half,
  thickness,
  color,
  startDeg,
  sweepDeg,
}: {
  size: number;
  half: number;
  thickness: number;
  color: string;
  startDeg: number;
  sweepDeg: number;
}) {
  if (sweepDeg <= 0.5) return null;

  const rightHalf = (deg: number) => (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: half,
        width: half,
        height: size,
        overflow: 'hidden',
      }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: -half,
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: thickness,
          borderColor: 'transparent',
          borderTopColor: color,
          borderRightColor: color,
          transform: [{ rotate: `${Math.min(deg, 180) - 180}deg` }],
        }}
      />
    </View>
  );

  const leftHalf = (deg: number) => (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: half,
        height: size,
        overflow: 'hidden',
      }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: thickness,
          borderColor: 'transparent',
          borderBottomColor: color,
          borderLeftColor: color,
          transform: [{ rotate: `${deg - 180}deg` }],
        }}
      />
    </View>
  );

  return (
    <View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        transform: [{ rotate: `${startDeg - 90}deg` }],
      }}>
      {sweepDeg <= 180 ? (
        rightHalf(sweepDeg)
      ) : (
        <>
          {rightHalf(180)}
          {leftHalf(sweepDeg)}
        </>
      )}
    </View>
  );
}

export function DonutChart({
  data,
  size = 120,
  thickness = 20,
  center,
  centerSub,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  center?: string | number;
  centerSub?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const half = size / 2;

  const arcs: { color: string; startDeg: number; sweepDeg: number }[] = [];
  let cum = 0;
  for (const d of data) {
    const sweep = (d.value / total) * 360;
    arcs.push({ color: d.color, startDeg: cum, sweepDeg: sweep });
    cum += sweep;
  }

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: thickness,
          borderColor: '#EFEAE0',
        }}
      />
      {arcs.map((arc, i) => (
        <DonutArc key={i} size={size} half={half} thickness={thickness} {...arc} />
      ))}
      <View
        style={{
          position: 'absolute',
          top: thickness,
          left: thickness,
          width: size - thickness * 2,
          height: size - thickness * 2,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        {center != null && (
          <Text style={styles.donutCenter}>{center}</Text>
        )}
        {centerSub ? (
          <Text style={styles.donutCenterSub}>{centerSub}</Text>
        ) : null}
      </View>
    </View>
  );
}

/* ── DonutLegend ─────────────────────────────────────────────────── */

export function DonutLegend({ data, total }: { data: DonutDatum[]; total?: number }) {
  const sum = total || data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <View style={{ gap: 6 }}>
      {data.map((d) => {
        const pct = Math.round((d.value / sum) * 100);
        return (
          <View key={d.key} style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: d.color }]} />
            <Text style={styles.legendLabel}>{d.label}</Text>
            <Text style={styles.legendValue}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ── TrendBars — turnout/progress over time ──────────────────────── */

export interface TrendPoint {
  label: string;
  value: number;
}

export function TrendBars({
  data,
  height = 80,
  color = COLORS.indigo,
  accentColor = COLORS.gold,
}: {
  data: TrendPoint[];
  height?: number;
  color?: string;
  accentColor?: string;
}) {
  if (!data.length) return null;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals) - 5;
  const max = Math.max(...vals) + 2;
  const range = max - min || 1;

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 6 }}>
        {data.map((d, i) => {
          const barH = ((d.value - min) / range) * height;
          const isLast = i === data.length - 1;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.trendValue}>{d.value.toFixed(1)}%</Text>
              <View
                style={{
                  width: '100%',
                  height: barH,
                  backgroundColor: isLast ? accentColor : color,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  marginTop: 4,
                  opacity: isLast ? 1 : 0.7,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.trendLabel, { flex: 1 }]}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/* ── Age × gender pyramid ─────────────────────────────────────────── */

export interface PyramidRow {
  bucket: string;
  male: number;
  female: number;
}

export function AgePyramid({ rows }: { rows: PyramidRow[] }) {
  const max = Math.max(...rows.map((r) => Math.max(r.male, r.female)), 1);
  return (
    <View style={{ gap: 6 }}>
      {rows.map((r, i) => {
        const mPct = (r.male / max) * 100;
        const fPct = (r.female / max) * 100;
        return (
          <View key={i} style={styles.pyramidRow}>
            <View style={styles.pyramidSideRight}>
              <View
                style={{
                  width: `${mPct}%`,
                  height: 16,
                  backgroundColor: COLORS.indigo,
                  borderTopLeftRadius: 3,
                  borderBottomLeftRadius: 3,
                }}
              />
            </View>
            <Text style={styles.pyramidBucket}>{r.bucket}</Text>
            <View style={styles.pyramidSideLeft}>
              <View
                style={{
                  width: `${fPct}%`,
                  height: 16,
                  backgroundColor: COLORS.brass,
                  borderTopRightRadius: 3,
                  borderBottomRightRadius: 3,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  barLabel: {
    fontFamily: FONTS.uiSemiBold,
    fontSize: 11.5,
    color: COLORS.mutedDeep,
  },
  barValue: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.muted,
  },
  barTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#E9E3D4',
    borderRadius: 999,
    overflow: 'hidden',
  },
  donutCenter: {
    fontFamily: FONTS.uiBold,
    fontSize: 20,
    color: COLORS.ink,
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  donutCenterSub: {
    fontFamily: FONTS.monoBold,
    fontSize: 8,
    color: COLORS.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    flex: 1,
    fontFamily: FONTS.uiSemiBold,
    fontSize: 11.5,
    color: COLORS.mutedDeep,
  },
  legendValue: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.muted,
  },
  trendValue: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.mutedDeep,
    letterSpacing: 0.2,
  },
  trendLabel: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.muted,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  pyramidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pyramidSideRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  pyramidSideLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  pyramidBucket: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.muted,
    width: 40,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
});
