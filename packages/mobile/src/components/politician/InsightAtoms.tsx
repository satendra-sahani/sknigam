// POLLSTICS · Insight — RN atoms for the politician role.
// Mirrors the prototype components in
//   claude-design/sknigam-handoff/sknigam/project/politician-app/
// (chrome.jsx + tokens.jsx) so the mobile politician surface reads
// identical to the design canvas.

import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, StyleProp, TextStyle } from 'react-native';
import { COLORS } from '../../utils/constants';
import { FONTS } from '../../utils/theme';

/* ── Palette extensions used only by the politician surface ────── */

export const SENT = {
  pos2: '#1F7A4E',
  pos1: '#5BA37E',
  neu: '#B7873A',
  neg1: '#D67E62',
  neg2: '#B8331F',
};

export const CASTE = {
  GEN: '#1F3A8A',
  OBC: '#B7873A',
  SC: '#1F7A4E',
  ST: '#205B9C',
  MIN: '#B8331F',
};

export const PARTY: Record<string, { fg: string; soft: string }> = {
  BJP: { fg: '#9A4D08', soft: '#FDE8D6' },
  INC: { fg: '#0E3A6E', soft: '#DCEAF7' },
  SP: { fg: '#7A2014', soft: '#F7DDDC' },
  TMC: { fg: '#0F4A2D', soft: '#DDF1E5' },
  DMK: { fg: '#1A1A1A', soft: '#E0DDDA' },
  TDP: { fg: '#7A5008', soft: '#F9EDC7' },
  MIX: { fg: COLORS.mutedDeep, soft: '#EEEAE0' },
};

/* ── Card ──────────────────────────────────────────────────────── */

export function Card({
  children,
  style,
  padding = 14,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: COLORS.paper,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: COLORS.hairlineSoft,
          padding,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

/* ── Section header (En + Hi + optional right slot) ─────────────── */

export function Section({
  title,
  hi,
  right,
}: {
  title: string;
  hi?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionRow}>
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {hi ? <Text style={styles.sectionHi}>{hi}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

/* ── KPI tile ──────────────────────────────────────────────────── */

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
  const bg = {
    indigoSoft: COLORS.indigoSoft,
    brassSoft: COLORS.brassSoft,
    successSoft: COLORS.successSoft,
    warningSoft: COLORS.warningSoft,
    dangerSoft: COLORS.dangerSoft,
  }[tone || 'indigoSoft'];
  return (
    <View
      style={[
        styles.kpi,
        {
          backgroundColor: tone ? bg : COLORS.paper,
          borderColor: tone ? 'transparent' : COLORS.hairlineSoft,
        },
      ]}>
      <Text style={styles.kpiLabel}>
        {label}
        {hi ? <Text style={styles.kpiLabelHi}> · {hi}</Text> : null}
      </Text>
      <Text style={[styles.kpiValue, accent ? { color: accent } : null]}>{value}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

/* ── Chip ──────────────────────────────────────────────────────── */

const CHIP_TONE: Record<string, { bg: string; fg: string }> = {
  neutral: { bg: '#EEEAE0', fg: COLORS.mutedDeep },
  indigo: { bg: COLORS.indigoSoft, fg: COLORS.indigoDeep },
  brass: { bg: COLORS.brassSoft, fg: '#7A5818' },
  success: { bg: COLORS.successSoft, fg: '#0F4A2D' },
  warning: { bg: COLORS.warningSoft, fg: '#7A5008' },
  danger: { bg: COLORS.dangerSoft, fg: '#7A2014' },
  info: { bg: COLORS.infoSoft, fg: '#143A66' },
};

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: keyof typeof CHIP_TONE;
}) {
  const m = CHIP_TONE[tone];
  return (
    <View style={[styles.chip, { backgroundColor: m.bg }]}>
      <Text style={[styles.chipText, { color: m.fg }]}>{children}</Text>
    </View>
  );
}

/* ── LeanBadge ─────────────────────────────────────────────────── */

export function LeanBadge({ lean, margin }: { lean: string; margin?: number }) {
  const palette = PARTY[lean] || PARTY.MIX;
  return (
    <View style={[styles.lean, { backgroundColor: palette.soft }]}>
      <Text style={[styles.leanText, { color: palette.fg }]}>
        {lean}
        {margin !== undefined ? ` ${margin > 0 ? '+' : ''}${margin.toLocaleString('en-IN')}` : ''}
      </Text>
    </View>
  );
}

/* ── Sentiment dot ─────────────────────────────────────────────── */

export function SentDot({ value }: { value: -2 | -1 | 0 | 1 | 2 }) {
  const map = { '-2': SENT.neg2, '-1': SENT.neg1, '0': SENT.neu, '1': SENT.pos1, '2': SENT.pos2 };
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: map[value.toString() as keyof typeof map],
      }}
    />
  );
}

/* ── Eyebrow (mono uppercase label) ─────────────────────────────── */

export function Eyebrow({
  children,
  color,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[styles.eyebrow, color ? { color } : null, style]}>{children}</Text>
  );
}

/* ── Scope crumb (STATE › DISTRICT › AC › BOOTH) ─────────────────── */

export function ScopeCrumb({
  trail,
}: {
  trail: { lvl: string; label: string }[];
}) {
  return (
    <View style={styles.crumb}>
      {trail.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <Text style={styles.crumbSep}>›</Text> : null}
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.crumbLvl}>{s.lvl}</Text>
            <Text style={[styles.crumbLabel, i === trail.length - 1 ? styles.crumbLabelActive : null]}>
              {s.label}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

/* ── InsightMark (logo image + label stack) ────────────────────── */

const pollsticsLogo = require('../../assets/logo.png');

export function InsightMark({ size = 30 }: { size?: number }) {
  return (
    <View style={styles.markRow}>
      <View style={styles.markLogoWrap}>
        <Image
          source={pollsticsLogo}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="contain"
        />
      </View>
      <View>
        <Text style={styles.markBrand}>POLLSTICS</Text>
        <Text style={styles.markTag}>INSIGHT · PRO</Text>
      </View>
    </View>
  );
}

/* ── AlertRow (design's alert cards with left accent bar) ─────── */

export function AlertRow({
  tone,
  kicker,
  en,
  hi,
}: {
  tone: 'danger' | 'warning' | 'success';
  kicker: string;
  en: string;
  hi?: string;
}) {
  const toneMap = {
    danger:  { fg: COLORS.danger,  bg: COLORS.dangerSoft },
    warning: { fg: COLORS.warning, bg: COLORS.warningSoft },
    success: { fg: COLORS.success, bg: COLORS.successSoft },
  };
  const c = toneMap[tone];
  return (
    <View style={styles.alertRow}>
      <View style={[styles.alertAccent, { backgroundColor: c.fg }]} />
      <View style={[styles.alertIcon, { backgroundColor: c.bg }]}>
        <Text style={[styles.alertIconGlyph, { color: c.fg }]}>
          {tone === 'danger' ? '▲' : tone === 'warning' ? '●' : '✓'}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.alertKicker, { color: c.fg }]}>{kicker}</Text>
        <Text style={styles.alertEn}>{en}</Text>
        {hi ? <Text style={styles.alertHi}>{hi}</Text> : null}
      </View>
    </View>
  );
}

/* ── HeroStat (the mini KPI inside dark hero cards) ───────────── */

export function HeroStat({
  label,
  value,
  color = '#fff',
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View>
      <Text style={styles.heroStatLabel}>{label}</Text>
      <Text style={[styles.heroStatValue, { color }]}>{value}</Text>
    </View>
  );
}

/* ── styles ────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 11,
    color: COLORS.ink,
    letterSpacing: -0.1,
  },
  sectionHi: {
    fontFamily: FONTS.hi,
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  kpi: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  kpiLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    color: COLORS.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  kpiLabelHi: {
    fontFamily: FONTS.hi,
    letterSpacing: 0,
  },
  kpiValue: {
    fontFamily: FONTS.uiBold,
    fontSize: 22,
    color: COLORS.ink,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  kpiSub: {
    fontFamily: FONTS.ui,
    fontSize: 11,
    color: COLORS.mutedDeep,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontFamily: FONTS.uiSemiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  lean: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  leanText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
  eyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  crumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FBF8F1',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.hairlineSoft,
    flexWrap: 'wrap',
  },
  crumbLvl: {
    fontFamily: FONTS.monoBold,
    fontSize: 8.5,
    color: COLORS.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  crumbLabel: {
    fontFamily: FONTS.uiSemiBold,
    fontSize: 11.5,
    color: COLORS.mutedDeep,
    marginTop: 1,
  },
  crumbLabelActive: {
    color: COLORS.indigo,
    fontFamily: FONTS.uiBold,
  },
  crumbSep: {
    color: COLORS.muted,
    fontSize: 10,
  },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  markLogoWrap: {
    shadowColor: '#0B1426',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  markBrand: {
    fontFamily: FONTS.uiBold,
    fontSize: 15.5,
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  markTag: {
    fontFamily: FONTS.monoBold,
    fontSize: 8,
    color: '#C2241F',
    letterSpacing: 1.8,
    marginTop: 3,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    paddingLeft: 12,
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.hairlineSoft,
    overflow: 'hidden',
  },
  alertAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  alertIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconGlyph: {
    fontSize: 12,
    fontWeight: '700',
  },
  alertKicker: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  alertEn: {
    fontFamily: FONTS.uiSemiBold,
    fontSize: 13,
    color: COLORS.ink,
    marginTop: 4,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  alertHi: {
    fontFamily: FONTS.hi,
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  heroStatLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroStatValue: {
    fontFamily: FONTS.uiBold,
    fontSize: 22,
    letterSpacing: -0.4,
    marginTop: 4,
    lineHeight: 24,
  },
});
