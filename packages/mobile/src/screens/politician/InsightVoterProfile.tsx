// /politician → Voter profile (09 of the Insight canvas).
// Matches Claude design's premium voter profile card with dark identity
// hero, demographics grid, and touchpoint timeline.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import api from '../../services/api';
import { COLORS } from '../../utils/constants';
import { FONTS } from '../../utils/theme';
import { InsightAppBar } from '../../components/politician/InsightAppBar';
import { Card, Section, Eyebrow, SENT } from '../../components/politician/InsightAtoms';
import type { RootStackParamList, VoterData } from '../../types';

type Nav = StackNavigationProp<RootStackParamList, 'InsightVoterProfile'>;
type Rt = RouteProp<RootStackParamList, 'InsightVoterProfile'>;

interface Props {
  navigation: Nav;
  route: Rt;
}

type VoterDetail = Omit<VoterData, 'boothId' | 'visitedBy'> & {
  boothId?: any;
  email?: string;
  visitDate?: string;
  staffRemarks?: string;
  educationLevel?: string;
  occupation?: string;
  votingHistory?: string;
  visitedBy?: { name?: string; phone?: string } | string;
};

const InsightVoterProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { voterId } = route.params;
  const [voter, setVoter] = useState<VoterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/voters/${voterId}`);
        setVoter(res.data?.data || null);
      } catch (err: any) {
        setVoter(null);
        setErrorMsg(
          err?.response?.data?.error ||
          err?.message ||
          'Failed to fetch voter'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [voterId]);

  if (loading) {
    return (
      <View style={s.root}>
        <InsightAppBar title="Voter" hi="मतदाता" back={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.indigo} />
        </View>
      </View>
    );
  }

  if (!voter) {
    return (
      <View style={s.root}>
        <InsightAppBar title="Voter" hi="मतदाता" back={() => navigation.goBack()} />
        <Card padding={18} style={{ margin: 14 }}>
          <Eyebrow color={COLORS.warning}>Not found · नहीं मिला</Eyebrow>
          <Text style={s.emptyTitle}>Could not load voter profile.</Text>
          <Text style={s.emptyBody}>
            {errorMsg || "Either the voter doesn't exist, or they belong to a booth your admin hasn't assigned to you."}
          </Text>
          <Text style={s.errorId}>ID: {voterId}</Text>
        </Card>
      </View>
    );
  }

  const initials = (voter.fullName || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sentMap: Record<string, { label: string; color: string }> = {
    'Strong support': { label: 'Strong support', color: SENT.pos2 },
    'Strong Support': { label: 'Strong support', color: SENT.pos2 },
    'Lean support': { label: 'Lean support', color: SENT.pos1 },
    'Lean Support': { label: 'Lean support', color: SENT.pos1 },
    Undecided: { label: 'Undecided', color: SENT.neu },
    'Lean opposed': { label: 'Lean opposed', color: SENT.neg1 },
    'Lean Opposed': { label: 'Lean opposed', color: SENT.neg1 },
    'Strong opposed': { label: 'Opposed', color: SENT.neg2 },
    'Strong Opposed': { label: 'Opposed', color: SENT.neg2 },
    Supportive: { label: 'Supportive', color: SENT.pos1 },
    Neutral: { label: 'Neutral', color: SENT.neu },
    Opposed: { label: 'Opposed', color: SENT.neg2 },
  };
  const sent = sentMap[(voter as any).votingIntention || ''] || {
    label: voter.verificationStatus ? 'Verified · contacted' : 'No sentiment captured',
    color: voter.verificationStatus ? SENT.pos1 : COLORS.muted,
  };

  const visitedBy =
    typeof voter.visitedBy === 'object' && voter.visitedBy
      ? voter.visitedBy.name || 'Field staff'
      : voter.visitedBy
      ? 'Field staff'
      : null;

  const demoPairs: Array<[string, string, string]> = [
    ['Age', voter.age ? `${voter.age} yr` : '—', 'आयु'],
    ['Gender', voter.gender === 'F' ? 'Female' : voter.gender === 'M' ? 'Male' : voter.gender || '—', 'लिंग'],
    ['Caste', voter.caste || '—', 'जाति'],
    ['Sub-caste', voter.subCaste || '—', 'उपजाति'],
    ['Religion', voter.religion || '—', 'धर्म'],
    ['Education', (voter as any).educationLevel || '—', 'शिक्षा'],
    ['Employment', (voter as any).occupation || '—', 'व्यवसाय'],
    ['Verification', voter.verificationStatus ? 'Verified' : 'Pending', 'सत्यापन'],
  ];

  const touchpoints: Array<{ d: string; a: string; who: string; tone: string; dot: string }> = [];
  if (voter.visitDate) {
    const d = new Date(voter.visitDate);
    const dd = isNaN(d.getTime())
      ? voter.visitDate
      : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    touchpoints.push({
      d: dd,
      a: voter.staffRemarks ? `House visit · ${voter.staffRemarks}` : 'House visit',
      who: visitedBy || 'Field staff',
      tone: COLORS.success,
      dot: COLORS.success,
    });
  }
  if (voter.grievances && voter.grievances.length > 0) {
    touchpoints.push({
      d: 'Logged',
      a: `Grievances · ${voter.grievances.join(', ')}`,
      who: 'Survey',
      tone: COLORS.brass,
      dot: COLORS.brass,
    });
  }

  return (
    <View style={s.root}>
      <InsightAppBar
        title={voter.fullName}
        hi={voter.fatherOrHusbandName ? `पिता/पति · ${voter.fatherOrHusbandName}` : 'मतदाता'}
        back={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={s.scroll}>
        {/* ─── Identity hero card (dark indigo) ─── */}
        <View style={s.hero}>
          <View style={s.heroGoldRibbon} />
          <View style={s.heroInner}>
            <View style={s.heroRow}>
              <View style={s.heroAvatar}>
                <Text style={s.heroAvatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                <Text style={s.heroName} numberOfLines={2}>{voter.fullName}</Text>
                {voter.fatherOrHusbandName ? (
                  <Text style={s.heroFather}>s/o · w/o {voter.fatherOrHusbandName}</Text>
                ) : null}
                <Text style={s.heroMeta}>
                  {voter.epicNumber} · #{voter.voterSerialNumber}
                  {voter.mobileNumber ? ` · ●●●● ${voter.mobileNumber.slice(-4)}` : ''}
                </Text>
              </View>
            </View>
            {/* Sentiment strip inside hero */}
            <View style={s.heroSentStrip}>
              <View style={[s.sentDot, { backgroundColor: sent.color }]} />
              <Text style={s.heroSentLabel}>{sent.label}</Text>
              <Text style={s.heroSentTime}>
                {voter.visitDate
                  ? new Date(voter.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()
                  : 'NOT VISITED'}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Demographics grid ─── */}
        <Card padding={16}>
          <Section title="Demographics" hi="जनसांख्यिकी" />
          <View style={s.demoGrid}>
            {demoPairs.map(([k, val, hi], i) => (
              <View key={k} style={s.demoCell}>
                <Text style={s.demoKey}>{k}</Text>
                <Text style={s.demoVal} numberOfLines={1}>{val}</Text>
                <Text style={s.demoHi}>{hi}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* ─── Address ─── */}
        {voter.address ? (
          <Card padding={16}>
            <Section title="Address" hi="पता" />
            <Text style={s.address}>{voter.address}</Text>
          </Card>
        ) : null}

        {/* ─── Touchpoints timeline ─── */}
        <Card padding={16}>
          <Section
            title={`Touchpoints · ${touchpoints.length}`}
            hi="संपर्क"
            right={
              touchpoints.length > 0 ? (
                <View style={s.activeBadge}>
                  <Text style={s.activeBadgeText}>ACTIVE</Text>
                </View>
              ) : null
            }
          />
          {touchpoints.length > 0 ? (
            <View style={{ marginTop: 10 }}>
              {touchpoints.map((t, i) => (
                <View
                  key={i}
                  style={[s.touchRow, i < touchpoints.length - 1 ? s.touchRowDivider : null]}>
                  {/* Timeline dot + line */}
                  <View style={s.touchDotCol}>
                    <View style={[s.touchDot, { backgroundColor: t.dot }]} />
                    {i < touchpoints.length - 1 ? (
                      <View style={s.touchLine} />
                    ) : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.touchAction}>{t.a}</Text>
                    <Text style={s.touchMeta}>{t.d.toUpperCase()} · {t.who}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.touchEmpty}>
              No visits or surveys logged for this voter yet.
            </Text>
          )}
        </Card>

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { padding: 14, gap: 12, paddingBottom: 24 },

  // ── Hero identity card ──
  hero: {
    borderRadius: 16,
    backgroundColor: COLORS.indigoDeep,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#0B1426',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  heroGoldRibbon: {
    height: 3,
    backgroundColor: COLORS.gold,
  },
  heroInner: {
    padding: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    fontFamily: FONTS.uiBold,
    fontSize: 22,
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroName: {
    fontFamily: FONTS.uiBold,
    fontSize: 19,
    color: '#fff',
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  heroFather: {
    fontFamily: FONTS.hi,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  heroMeta: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 5,
    letterSpacing: 0.5,
  },
  heroSentStrip: {
    marginTop: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sentDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  heroSentLabel: {
    flex: 1,
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    color: '#fff',
    letterSpacing: -0.1,
  },
  heroSentTime: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.6,
  },

  // ── Demographics grid ──
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    backgroundColor: COLORS.hairlineSoft,
    borderRadius: 10,
    overflow: 'hidden',
    gap: 1,
  },
  demoCell: {
    width: '49.5%',
    backgroundColor: COLORS.paper,
    padding: 12,
  },
  demoKey: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  demoVal: {
    fontFamily: FONTS.uiSemiBold,
    fontSize: 14,
    color: COLORS.ink,
    marginTop: 4,
    letterSpacing: -0.2,
  },
  demoHi: {
    fontFamily: FONTS.hi,
    fontSize: 10.5,
    color: COLORS.muted,
    marginTop: 1,
  },

  // ── Address ──
  address: {
    marginTop: 10,
    fontFamily: FONTS.ui,
    fontSize: 12.5,
    color: COLORS.mutedDeep,
    lineHeight: 19,
  },

  // ── Touchpoints ──
  activeBadge: {
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  activeBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.success,
    letterSpacing: 0.8,
  },
  touchRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 12,
  },
  touchRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairlineSoft,
  },
  touchDotCol: {
    width: 12,
    alignItems: 'center',
  },
  touchDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  touchLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.hairlineSoft,
    marginTop: 4,
  },
  touchAction: {
    fontFamily: FONTS.uiSemiBold,
    fontSize: 13.5,
    color: COLORS.ink,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  touchMeta: {
    fontFamily: FONTS.monoBold,
    fontSize: 10.5,
    color: COLORS.muted,
    marginTop: 3,
    letterSpacing: 0.4,
  },
  touchEmpty: {
    marginTop: 10,
    fontFamily: FONTS.ui,
    fontSize: 12,
    color: COLORS.muted,
    fontStyle: 'italic',
  },

  // ── Empty / error state ──
  emptyTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    color: COLORS.ink,
    marginTop: 6,
  },
  emptyBody: {
    fontFamily: FONTS.ui,
    fontSize: 12.5,
    color: COLORS.mutedDeep,
    marginTop: 6,
    lineHeight: 19,
  },
  errorId: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 8,
    letterSpacing: 0.4,
  },
});

export default InsightVoterProfileScreen;
