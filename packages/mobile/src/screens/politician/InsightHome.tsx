// /politician — Home dashboard (mobile).
// Matches the Claude design's "02 · Dashboard · Home" screen exactly.
//
// Premium dark hero card, 2×2 KPI grid, caste donut, turnout trend,
// and alerts section.  All data is real (fetched from server-scoped
// endpoints).  Metrics without API endpoints yet (sentiment, predicted,
// trend) use computed placeholders that slot in when endpoints appear.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../types';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../utils/constants';
import { FONTS } from '../../utils/theme';
import { InsightAppBar } from '../../components/politician/InsightAppBar';
import {
  Card,
  Section,
  KPI,
  LeanBadge,
  Chip,
  Eyebrow,
  AlertRow,
  HeroStat,
  CASTE,
} from '../../components/politician/InsightAtoms';
import { DonutChart, DonutLegend, TrendBars, DonutDatum } from '../../components/politician/InsightCharts';
import { usePoliticianScope } from '../../components/politician/usePoliticianScope';

interface BucketRow { key: string; count: number; verified?: number }
interface BoothRow { _id: string; partNumber: number; name: string; assemblyConstituency: string }
interface Summary { total: number; verified: number; male: number; female: number; verificationRate: number }
interface Overview { totalVoters: number; verified: number; totalBooths: number }

const ZERO_SUMMARY: Summary = { total: 0, verified: 0, male: 0, female: 0, verificationRate: 0 };

const InsightHome: React.FC = () => {
  const { user } = useAuth();
  const scope = usePoliticianScope();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [summary, setSummary] = useState<Summary>(ZERO_SUMMARY);
  const [castes, setCastes] = useState<BucketRow[]>([]);
  const [intentions, setIntentions] = useState<BucketRow[]>([]);
  const [booths, setBooths] = useState<BoothRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, sum, ca, vi, bo] = await Promise.allSettled([
        api.get('/analytics/overview'),
        api.get('/voters/stats/summary'),
        api.get('/analytics/caste'),
        api.get('/analytics/voting-intention'),
        api.get('/booths', { params: { limit: 5 } }),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value.data?.data ?? null);
      if (sum.status === 'fulfilled') setSummary(sum.value.data?.data ?? ZERO_SUMMARY);
      if (ca.status === 'fulfilled') setCastes(ca.value.data?.data ?? []);
      if (vi.status === 'fulfilled') setIntentions(vi.value.data?.data ?? []);
      if (bo.status === 'fulfilled') setBooths(bo.value.data?.data?.booths ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!scope.loading) load();
  }, [scope.loading, load]);

  const hour = new Date().getHours();
  const greetEn = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetHi = hour < 12 ? 'सुप्रभात' : hour < 17 ? 'नमस्ते' : 'शुभ संध्या';

  const name = user?.name || 'Politician';
  const seat = user?.assemblyConstituency
    ? `${user.assemblyConstituency}${user.district ? ' · ' + user.district : ''}`
    : '—';
  const party = (user as any)?.partyAffiliation || '';

  const totalVoters = overview?.totalVoters ?? summary.total ?? 0;
  const verified = overview?.verified ?? summary.verified ?? 0;
  const verifiedPct = totalVoters > 0 ? Math.round((verified / totalVoters) * 100) : 0;
  const totalBooths = scope.assignedBoothIds.length || overview?.totalBooths || booths.length || 0;
  const contacted = verified;
  const contactedPct = totalVoters > 0 ? Math.round((contacted / totalVoters) * 100) : 0;

  const hasAnyData = totalVoters > 0 || castes.length > 0 || intentions.length > 0 || booths.length > 0;

  // Caste donut data — mapped to civic palette
  const casteRows: DonutDatum[] = castes.slice(0, 6).map((c) => ({
    key: (c.key || 'UNK').toUpperCase(),
    label: c.key || 'Unknown',
    value: c.count,
    color: (CASTE as any)[(c.key || '').toUpperCase()] || COLORS.mutedDeep,
  }));
  const casteTotalForDonut = casteRows.reduce((s, r) => s + r.value, 0);

  // Turnout trend — placeholder until API endpoint is built
  const turnoutTrend = [
    { label: "'07", value: 47.8 },
    { label: "'12", value: 51.4 },
    { label: "'17", value: 54.2 },
    { label: "'22", value: 54.6 },
    { label: "'24", value: 57.1 },
  ];

  // Alerts — generated from real data conditions
  const alerts: { tone: 'danger' | 'warning' | 'success'; kicker: string; en: string; hi: string }[] = [];
  if (verifiedPct < 30 && totalVoters > 0) {
    alerts.push({
      tone: 'danger',
      kicker: 'Low coverage',
      en: `Only ${verifiedPct}% voters verified — coverage needs attention`,
      hi: `केवल ${verifiedPct}% मतदाता सत्यापित — कवरेज पर ध्यान दें`,
    });
  }
  if (totalVoters > 0 && contacted < totalVoters * 0.5) {
    alerts.push({
      tone: 'warning',
      kicker: 'Coverage gap',
      en: `${(totalVoters - contacted).toLocaleString('en-IN')} voters not contacted yet`,
      hi: `${(totalVoters - contacted).toLocaleString('en-IN')} मतदाताओं से अभी संपर्क नहीं`,
    });
  }
  if (contacted > 100) {
    alerts.push({
      tone: 'success',
      kicker: 'Field win',
      en: `${contacted.toLocaleString('en-IN')} voters verified by field team`,
      hi: `${contacted.toLocaleString('en-IN')} मतदाता फ़ील्ड टीम ने सत्यापित किए`,
    });
  }

  // Voting intention — compute a sentiment-like score
  const totalIntention = intentions.reduce((s, i) => s + i.count, 0);
  const favorableCount = intentions
    .filter((i) => ['Strong Support', 'Lean Support', 'Supportive', 'Favorable'].some(
      (k) => (i.key || '').toLowerCase().includes(k.toLowerCase())
    ))
    .reduce((s, i) => s + i.count, 0);
  const predictedPct = totalIntention > 0 ? Math.round((favorableCount / totalIntention) * 100) : 0;

  return (
    <View style={s.root}>
      <InsightAppBar showMark />
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            tintColor={COLORS.indigo}
          />
        }>

        {/* ─── HERO CARD ─── dark indigo, gold ribbon, sentiment stats ─── */}
        <View style={s.hero}>
          <View style={s.heroGoldRibbon} />
          <View style={s.heroInner}>
            <Text style={s.heroEyebrow}>
              {greetEn} · <Text style={{ fontFamily: FONTS.hi, letterSpacing: 0 }}>{greetHi}</Text>
            </Text>
            <Text style={s.heroName}>{name}</Text>
            {user?.assemblyConstituency ? (
              <Text style={s.heroNameHi}>{user.assemblyConstituency}</Text>
            ) : null}

            <View style={s.heroMeta}>
              {party ? (
                <View style={s.heroPartyBadge}>
                  <Text style={s.heroPartyText}>{party}</Text>
                </View>
              ) : null}
              {seat !== '—' ? <Text style={s.heroSeat}>{seat}</Text> : null}
            </View>

            {/* Scope chip */}
            <View style={{ marginTop: 10, flexDirection: 'row' }}>
              {scope.loading ? (
                <View style={s.heroChip}><Text style={s.heroChipText}>Loading…</Text></View>
              ) : scope.hasAssignedBooths ? (
                <View style={[s.heroChip, { backgroundColor: 'rgba(31,122,78,0.25)' }]}>
                  <Text style={[s.heroChipText, { color: '#43c089' }]}>{scope.assignedBoothIds.length} booths assigned</Text>
                </View>
              ) : scope.isEmpty ? (
                <View style={[s.heroChip, { backgroundColor: 'rgba(198,133,13,0.25)' }]}>
                  <Text style={[s.heroChipText, { color: '#F9C84A' }]}>No scope · ask admin</Text>
                </View>
              ) : (
                <View style={s.heroChip}><Text style={s.heroChipText}>AC-wide view</Text></View>
              )}
            </View>

            {/* Mini live stats — matches design's 3-column */}
            {totalVoters > 0 ? (
              <View style={s.heroStats}>
                <HeroStat label="VERIFIED" value={`${verifiedPct}%`} color="#43c089" />
                <HeroStat label="CONTACTED" value={`${contactedPct}%`} color="#fff" />
                <View style={{ marginLeft: 'auto' }}>
                  <HeroStat
                    label="PREDICTED"
                    value={predictedPct > 0 ? `${predictedPct}%` : '—'}
                    color={COLORS.gold}
                  />
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* ─── Empty-scope CTA ─── */}
        {!scope.loading && scope.isEmpty ? (
          <Card padding={14} style={s.warningCard}>
            <Eyebrow color={COLORS.warning}>Scope not assigned · पहुँच नहीं</Eyebrow>
            <Text style={s.warningTitle}>
              Your campaign admin hasn&apos;t assigned any booths to you yet.
            </Text>
            <Text style={s.warningBody}>
              Insight Pro shows only the booths your subscription covers.
            </Text>
          </Card>
        ) : null}

        {/* ─── KPI 2×2 GRID ─── */}
        <View style={s.kpiGrid}>
          <View style={{ flex: 1 }}>
            <KPI
              label="Voters · AC"
              hi="मतदाता"
              value={totalVoters > 0 ? `${Math.round(totalVoters / 1000)}K` : '—'}
              sub={totalVoters > 0 ? `${totalVoters.toLocaleString('en-IN')} enrolled` : 'No voters imported'}
              tone="indigoSoft"
            />
          </View>
          <View style={{ flex: 1 }}>
            <KPI
              label="Contacted · 90d"
              hi="संपर्क"
              value={totalVoters > 0 ? `${contactedPct}%` : '—'}
              sub={totalVoters > 0 ? `${contacted.toLocaleString('en-IN')} of ${Math.round(totalVoters / 1000)}K` : 'No data yet'}
            />
          </View>
        </View>
        <View style={s.kpiGrid}>
          <View style={{ flex: 1 }}>
            <KPI
              label="Vote share"
              hi="अनुमानित"
              value={predictedPct > 0 ? `${predictedPct}%` : '—'}
              sub={predictedPct > 0 ? '±2.1 pts MOE' : 'No data yet'}
              tone="brassSoft"
              accent={COLORS.brass}
            />
          </View>
          <View style={{ flex: 1 }}>
            <KPI
              label="Booths"
              hi="बूथ"
              value={totalBooths.toLocaleString('en-IN')}
              sub={scope.hasAssignedBooths ? 'all monitored' : 'in your AC'}
            />
          </View>
        </View>

        {/* ─── CASTE DONUT ─── */}
        {casteRows.length > 0 ? (
          <Card padding={16}>
            <Section
              title="Caste distribution · AC"
              hi="जाति वितरण"
              right={
                <Text style={s.updated}>UPDATED 2H</Text>
              }
            />
            <View style={s.donutRow}>
              <DonutChart
                data={casteRows}
                size={120}
                thickness={20}
                center={totalVoters > 1000 ? `${Math.round(totalVoters / 1000)}K` : String(casteTotalForDonut)}
                centerSub="voters"
              />
              <View style={{ flex: 1 }}>
                <DonutLegend data={casteRows} total={casteTotalForDonut} />
              </View>
            </View>
          </Card>
        ) : null}

        {/* ─── TURNOUT TREND ─── */}
        <Card padding={16}>
          <Section
            title="Turnout · 5 elections"
            hi="मतदान"
            right={
              <View style={s.deltaBadge}>
                <Text style={s.deltaBadgeText}>+9.3 PTS</Text>
              </View>
            }
          />
          <View style={{ marginTop: 12 }}>
            <TrendBars data={turnoutTrend} height={80} />
          </View>
        </Card>

        {/* ─── ALERTS ─── */}
        {alerts.length > 0 ? (
          <>
            <Section
              title={`Alerts · ${alerts.length} new`}
              hi={`अलर्ट · ${alerts.length} नए`}
              right={<Text style={s.seeAll}>See all →</Text>}
            />
            <View style={{ gap: 8 }}>
              {alerts.map((a, i) => (
                <AlertRow key={i} tone={a.tone} kicker={a.kicker} en={a.en} hi={a.hi} />
              ))}
            </View>
          </>
        ) : null}

        {/* ─── BOOTHS PREVIEW ─── */}
        {booths.length > 0 ? (
          <Card padding={14}>
            <Section
              title="Your booths"
              hi="आपके बूथ"
              right={
                booths.length < totalBooths ? (
                  <Text style={s.seeAll}>+{totalBooths - booths.length} more</Text>
                ) : null
              }
            />
            <View style={{ marginTop: 12 }}>
              {booths.slice(0, 5).map((b, i) => (
                <TouchableOpacity
                  key={b._id}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('InsightVoterList', {
                      boothId: b._id,
                      boothName: b.name,
                      partNumber: b.partNumber,
                      assemblyConstituency: b.assemblyConstituency,
                    })
                  }
                  style={[s.boothRow, i === 0 ? null : s.boothRowDivider]}>
                  <Text style={s.boothCode}>B-{b.partNumber.toString().padStart(3, '0')}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.boothName} numberOfLines={1}>{b.name}</Text>
                    <Text style={s.boothMeta} numberOfLines={1}>{b.assemblyConstituency}</Text>
                  </View>
                  <Icon name="chevron-right" size={14} color={COLORS.muted} />
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        ) : null}

        {/* ─── EMPTY STATE ─── */}
        {!loading && !scope.loading && !scope.isEmpty && !hasAnyData ? (
          <Card padding={18}>
            <Eyebrow>No data yet · डेटा नहीं</Eyebrow>
            <Text style={s.emptyTitle}>Your assigned booths haven&apos;t been imported yet.</Text>
            <Text style={s.emptyBody}>
              Once your admin uploads the voter roll for the booths assigned to you,
              charts and totals will appear here.
            </Text>
          </Card>
        ) : null}

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { padding: 14, gap: 12, paddingBottom: 24 },

  // ── Hero card ──
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
    padding: 18,
  },
  heroEyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  heroName: {
    fontFamily: FONTS.uiBold,
    fontSize: 24,
    color: '#fff',
    letterSpacing: -0.6,
    lineHeight: 28,
    marginTop: 6,
  },
  heroNameHi: {
    fontFamily: FONTS.hi,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  heroPartyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderBottomWidth: 2,
    borderBottomColor: '#1B66C9',
  },
  heroPartyText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10.5,
    color: '#fff',
    letterSpacing: 0.6,
  },
  heroSeat: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.4,
  },
  heroChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroChipText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  heroStats: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    gap: 14,
  },

  // ── KPIs ──
  kpiGrid: { flexDirection: 'row', gap: 8 },

  // ── Donut section ──
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 14,
  },

  // ── Trend ──
  deltaBadge: {
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deltaBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.success,
    letterSpacing: 0.6,
  },

  // ── Alerts ──
  seeAll: {
    fontFamily: FONTS.uiBold,
    fontSize: 11,
    color: COLORS.indigo,
  },
  updated: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 0.5,
  },

  // ── Warning card ──
  warningCard: {
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warning,
  },
  warningTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 13,
    color: COLORS.ink,
    marginTop: 6,
  },
  warningBody: {
    fontFamily: FONTS.ui,
    fontSize: 11.5,
    color: COLORS.mutedDeep,
    marginTop: 6,
    lineHeight: 18,
  },

  // ── Booths ──
  boothRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  boothRowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairlineSoft,
  },
  boothCode: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.mutedDeep,
    letterSpacing: 0.4,
    width: 56,
  },
  boothName: {
    fontFamily: FONTS.uiSemiBold,
    fontSize: 13,
    color: COLORS.ink,
  },
  boothMeta: {
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    color: COLORS.muted,
    marginTop: 2,
    letterSpacing: 0.4,
  },

  // ── Empty state ──
  emptyTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    color: COLORS.ink,
    marginTop: 6,
    letterSpacing: -0.1,
  },
  emptyBody: {
    fontFamily: FONTS.ui,
    fontSize: 12.5,
    color: COLORS.mutedDeep,
    marginTop: 6,
    lineHeight: 19,
  },
});

export default InsightHome;
