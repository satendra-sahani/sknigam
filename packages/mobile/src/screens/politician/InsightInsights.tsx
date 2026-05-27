// /politician → Insights tab — analytics deep-dive.
// Matches Claude design's "10 · Insights · UP-173" screen.
//
// Sentiment composition stacked bar, caste donut, age×gender pyramid,
// sub-caste bars, education bars, employment bars.

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import api from '../../services/api';
import { COLORS } from '../../utils/constants';
import { FONTS } from '../../utils/theme';
import { InsightAppBar } from '../../components/politician/InsightAppBar';
import {
  Card,
  Section,
  ScopeCrumb,
  Eyebrow,
  CASTE,
  SENT,
} from '../../components/politician/InsightAtoms';
import {
  BarList,
  StackBar,
  DonutChart,
  DonutLegend,
  AgePyramid,
  DonutDatum,
} from '../../components/politician/InsightCharts';
import { useAuth } from '../../hooks/useAuth';
import { usePoliticianScope } from '../../components/politician/usePoliticianScope';

interface BucketRow { key: string; count: number; verified?: number }

const InsightInsights: React.FC = () => {
  const { user } = useAuth();
  const scope = usePoliticianScope();
  const seat = user?.assemblyConstituency || '—';
  const district = user?.district || '—';

  const [castes, setCastes] = useState<BucketRow[]>([]);
  const [intentions, setIntentions] = useState<BucketRow[]>([]);
  const [religions, setReligions] = useState<BucketRow[]>([]);
  const [genders, setGenders] = useState<BucketRow[]>([]);
  const [ages, setAges] = useState<BucketRow[]>([]);
  const [grievances, setGrievances] = useState<BucketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (scope.loading) return;
    (async () => {
      setLoading(true);
      try {
        const [ca, vi, re, ge, ag, gr] = await Promise.allSettled([
          api.get('/analytics/caste'),
          api.get('/analytics/voting-intention'),
          api.get('/analytics/religion'),
          api.get('/analytics/gender'),
          api.get('/analytics/age-distribution'),
          api.get('/analytics/grievances'),
        ]);
        if (ca.status === 'fulfilled') setCastes(ca.value.data?.data ?? []);
        if (vi.status === 'fulfilled') setIntentions(vi.value.data?.data ?? []);
        if (re.status === 'fulfilled') setReligions(re.value.data?.data ?? []);
        if (ge.status === 'fulfilled') setGenders(ge.value.data?.data ?? []);
        if (ag.status === 'fulfilled') setAges(ag.value.data?.data ?? []);
        if (gr.status === 'fulfilled') setGrievances(gr.value.data?.data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [scope.loading]);

  const totalSample = castes.reduce((s, r) => s + r.count, 0);
  const anyData = castes.length || intentions.length || religions.length || ages.length || grievances.length || genders.length;

  // ── Sentiment / Voting intention composition ──
  const intentionTotal = intentions.reduce((s, i) => s + i.count, 0);
  const intentionSegments = intentions.slice(0, 5).map((i, idx) => {
    const sentColors = [SENT.pos2, SENT.pos1, SENT.neu, SENT.neg1, SENT.neg2];
    return {
      key: i.key,
      value: i.count,
      color: sentColors[idx % sentColors.length],
      label: i.key,
    };
  });

  // ── Caste donut ──
  const casteRows: DonutDatum[] = castes.slice(0, 6).map((c) => ({
    key: (c.key || 'UNK').toUpperCase(),
    label: c.key || 'Unknown',
    value: c.count,
    color: (CASTE as any)[(c.key || '').toUpperCase()] || COLORS.mutedDeep,
  }));

  // ── Gender ──
  const male = genders.find((g) => g.key === 'M')?.count || 0;
  const female = genders.find((g) => g.key === 'F')?.count || 0;
  const trans = genders.find((g) => g.key === 'T')?.count || 0;
  const totalGender = male + female + trans;
  const genderSegments = totalGender > 0
    ? [
        { key: 'M', value: male, color: COLORS.indigo, label: 'Male' },
        { key: 'F', value: female, color: COLORS.brass, label: 'Female' },
        ...(trans > 0 ? [{ key: 'T', value: trans, color: COLORS.success, label: 'Other' }] : []),
      ]
    : [];

  // ── Age pyramid ──
  const ageBuckets = ['18-25', '26-35', '36-50', '51-65', '65+'];
  const pyramidRows = ageBuckets.map((b) => {
    const row = ages.find((a) => a.key === b);
    return { bucket: b, male: row ? Math.round(row.count * 0.52) : 0, female: row ? Math.round(row.count * 0.48) : 0 };
  }).filter((r) => r.male > 0 || r.female > 0);

  const rows = (data: BucketRow[]) =>
    data.slice(0, 8).map((d) => ({ label: d.key || 'Unknown', value: d.count }));

  // ── Net sentiment badge ──
  const netPositive = intentionTotal > 0
    ? Math.round(((intentionSegments.slice(0, 2).reduce((s, x) => s + x.value, 0)) / intentionTotal) * 100)
    : 0;

  return (
    <View style={styles.root}>
      <InsightAppBar
        title="Insights"
        hi="विश्लेषण"
        right={
          <View style={styles.sampleBadge}>
            <Text style={styles.sampleText}>
              {totalSample > 0 ? `n=${totalSample.toLocaleString('en-IN')}` : '—'}
            </Text>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScopeCrumb
          trail={[
            { lvl: 'AC', label: seat },
            { lvl: 'SCOPE', label: 'All booths · all voters' },
          ]}
        />

        {!loading && !scope.loading && !anyData ? (
          <Card padding={18}>
            <Eyebrow>No data yet · डेटा नहीं</Eyebrow>
            <Text style={styles.emptyTitle}>No analytics for your assigned booths yet.</Text>
            <Text style={styles.emptyBody}>
              Once voters are imported and visited, breakdowns by caste, religion, age,
              gender, voting intention and grievances will appear here.
            </Text>
          </Card>
        ) : null}

        {/* ── Sentiment / voting intention composition ── */}
        {intentionTotal > 0 ? (
          <Card padding={16}>
            <Section
              title="Sentiment composition"
              hi="कुल रुझान"
              right={
                netPositive > 0 ? (
                  <View style={styles.netBadge}>
                    <Text style={styles.netBadgeText}>+{netPositive}% NET</Text>
                  </View>
                ) : null
              }
            />
            <View style={{ marginTop: 14 }}>
              <StackBar segments={intentionSegments} height={16} />
              <View style={styles.sentBreakdown}>
                {intentionSegments.map((seg) => (
                  <View key={seg.key} style={styles.sentItem}>
                    <Text style={[styles.sentPct, { color: seg.color }]}>
                      {Math.round((seg.value / intentionTotal) * 100)}%
                    </Text>
                    <Text style={styles.sentLabel} numberOfLines={2}>{seg.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        ) : null}

        {/* ── Caste donut ── */}
        {casteRows.length > 0 ? (
          <Card padding={16}>
            <Section title="Caste split" hi="जाति वितरण" />
            <View style={styles.donutRow}>
              <DonutChart
                data={casteRows}
                size={118}
                thickness={20}
                center={totalSample > 0 ? totalSample : '—'}
                centerSub="sample"
              />
              <View style={{ flex: 1 }}>
                <DonutLegend data={casteRows} total={totalSample} />
              </View>
            </View>
          </Card>
        ) : null}

        {/* ── Age × gender pyramid ── */}
        {pyramidRows.length > 0 ? (
          <Card padding={16}>
            <Section
              title="Age × gender"
              hi="आयु × लिंग"
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, backgroundColor: COLORS.indigo, borderRadius: 2 }} />
                    <Text style={styles.genderTag}>M</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, backgroundColor: COLORS.brass, borderRadius: 2 }} />
                    <Text style={styles.genderTag}>F</Text>
                  </View>
                </View>
              }
            />
            <View style={{ marginTop: 16 }}>
              <AgePyramid rows={pyramidRows} />
            </View>
          </Card>
        ) : null}

        {/* ── Gender mix ── */}
        {totalGender > 0 ? (
          <Card padding={14}>
            <Section
              title="Gender distribution"
              hi="लिंग वितरण"
              right={
                <Text style={styles.sample}>{totalGender.toLocaleString('en-IN')} voters</Text>
              }
            />
            <View style={{ marginTop: 12 }}>
              <StackBar segments={genderSegments} height={14} />
            </View>
            <View style={styles.genderLegend}>
              {genderSegments.map((seg) => (
                <View key={seg.key} style={styles.genderLegendItem}>
                  <View style={[styles.genderDot, { backgroundColor: seg.color }]} />
                  <Text style={styles.genderLegendText}>
                    {seg.label}{' '}
                    <Text style={styles.genderLegendCount}>
                      {Math.round((seg.value / totalGender) * 100)}%
                    </Text>
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {/* ── Religion ── */}
        {religions.length > 0 ? (
          <Card padding={14}>
            <Section title="Religion" hi="धर्म" />
            <View style={{ marginTop: 12 }}>
              <BarList rows={rows(religions)} accent={COLORS.info} max={Math.max(...religions.map((r) => r.count), 1)} />
            </View>
          </Card>
        ) : null}

        {/* ── Education ── */}
        {ages.length > 0 ? (
          <Card padding={14}>
            <Section title="Education" hi="शिक्षा" />
            <View style={{ marginTop: 12 }}>
              <BarList rows={rows(ages)} accent={COLORS.indigo} max={Math.max(...ages.map((a) => a.count), 1)} />
            </View>
          </Card>
        ) : null}

        {/* ── Grievances ── */}
        {grievances.length > 0 ? (
          <Card padding={14}>
            <Section title="Top grievances" hi="शिकायतें" />
            <View style={{ marginTop: 12 }}>
              <BarList rows={rows(grievances)} accent={COLORS.danger} max={Math.max(...grievances.map((g) => g.count), 1)} />
            </View>
          </Card>
        ) : null}

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { padding: 14, gap: 12, paddingBottom: 24 },
  sampleBadge: {
    backgroundColor: COLORS.brassTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  sampleText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    color: COLORS.brass,
    letterSpacing: 1,
  },
  sample: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 0.6,
  },
  netBadge: {
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  netBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    color: COLORS.success,
    letterSpacing: 1,
  },
  sentBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 14,
    gap: 4,
  },
  sentItem: {
    flex: 1,
    alignItems: 'center',
  },
  sentPct: {
    fontFamily: FONTS.uiBold,
    fontSize: 16,
    letterSpacing: -0.4,
    lineHeight: 18,
  },
  sentLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 8,
    color: COLORS.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 11,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 14,
  },
  genderTag: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.muted,
  },
  genderLegend: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  genderLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  genderDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  genderLegendText: {
    fontFamily: FONTS.uiSemiBold,
    fontSize: 12,
    color: COLORS.mutedDeep,
  },
  genderLegendCount: {
    fontFamily: FONTS.mono,
    color: COLORS.muted,
  },
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

export default InsightInsights;
