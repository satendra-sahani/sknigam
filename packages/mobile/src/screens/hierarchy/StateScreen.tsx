import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import api from '../../services/api';
import { useI18n } from '../../i18n';
import { COLORS } from '../../utils/constants';
import { FONTS, RADIUS } from '../../utils/theme';
import AppBar from '../../components/AppBar';
import Card from '../../components/Card';
import Progress from '../../components/Progress';
import type {
  HierarchyStateSummary,
  MainTabParamList,
  RootStackParamList,
} from '../../types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Explore'>,
  StackNavigationProp<RootStackParamList>
>;

const StateScreen: React.FC<{ navigation: Nav }> = ({ navigation }) => {
  const { t } = useI18n();
  const [summary, setSummary] = useState<HierarchyStateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await api.get('/analytics/hierarchy/state');
        setSummary(res.data.data);
      } catch (err: any) {
        Alert.alert(t('error'), err.response?.data?.error || t('explore_load_failed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', () => load(true));
    return unsub;
  }, [load, navigation]);

  const pct =
    summary && summary.totalVoters > 0
      ? Math.round((summary.verified / summary.totalVoters) * 1000) / 10
      : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
      <AppBar
        title="Explore"
        hi="खोज"
        right={
          <TouchableOpacity activeOpacity={0.7} style={styles.iconBtn}>
            <Icon name="magnify" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        }
      />

      {loading && !summary ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.indigo} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.indigo} />
          }>
          {/* State summary card */}
          <Card padding={14}>
            <View style={styles.stateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.overline}>STATE · राज्य</Text>
                <Text style={styles.stateName}>{summary?.state || 'Uttar Pradesh'}</Text>
                <Text style={styles.stateNameHi}>उत्तर प्रदेश</Text>
              </View>
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>UP</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={{ flex: 1 }}>
                <Text style={styles.statNum}>{summary?.districts ?? 0}</Text>
                <Text style={styles.statLabel}>Districts</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statNum}>{summary?.constituencies ?? 0}</Text>
                <Text style={styles.statLabel}>ACs</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statNum}>
                  {summary?.booths
                    ? summary.booths >= 100000
                      ? `${(summary.booths / 100000).toFixed(2)}L`
                      : summary.booths.toLocaleString('en-IN')
                    : 0}
                </Text>
                <Text style={styles.statLabel}>Booths</Text>
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabelText}>State coverage</Text>
                <Text style={styles.progressMonoBrass}>{pct}%</Text>
              </View>
              <Progress value={pct} tone="brass" height={6} />
            </View>
          </Card>

          {/* Legend */}
          <Card padding={14} style={{ marginTop: 12 }}>
            <Text style={styles.legendTitle}>Status legend · स्थिति</Text>
            <View style={{ gap: 8 }}>
              <LegendRow color={COLORS.success} en="Strong" hi="मज़बूत" sub="≥ 70% coverage" />
              <LegendRow color={COLORS.brass} en="Active" hi="सक्रिय" sub="20–70% coverage" />
              <LegendRow color={COLORS.danger} en="Lagging" hi="पिछड़ रहा" sub="< 20% coverage" />
            </View>
          </Card>

          {/* Search row */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.searchRow}
            onPress={() =>
              navigation.navigate('Districts', { state: summary?.state || 'Uttar Pradesh' })
            }>
            <Icon name="magnify" size={16} color={COLORS.muted} />
            <Text style={styles.searchText}>Search districts · ज़िला खोजें</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('Districts', { state: summary?.state || 'Uttar Pradesh' })
            }
            style={styles.viewAllRow}>
            <Text style={styles.viewAllText}>VIEW ALL DISTRICTS </Text>
            <Icon name="arrow-right" size={14} color={COLORS.indigo} />
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

interface LegendRowProps {
  color: string;
  en: string;
  hi: string;
  sub: string;
}
const LegendRow: React.FC<LegendRowProps> = ({ color, en, hi, sub }) => (
  <View style={styles.legendRow}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendEn}>{en}</Text>
    <Text style={styles.legendDot2}> · </Text>
    <Text style={styles.legendHi}>{hi}</Text>
    <View style={{ flex: 1 }} />
    <Text style={styles.legendSub}>{sub}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 14, paddingBottom: 32 },
  stateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overline: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.uiBold,
    fontWeight: '600',
    letterSpacing: 1.4,
  },
  stateName: {
    fontSize: 22,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 4,
  },
  stateNameHi: {
    fontSize: 12,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.hi,
    marginTop: 2,
  },
  codeBlock: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 22,
    color: COLORS.indigoDeep,
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
  },
  statsGrid: { flexDirection: 'row', marginTop: 14 },
  statNum: {
    fontSize: 16,
    color: COLORS.ink,
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.uiMedium,
    fontWeight: '500',
    marginTop: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressLabelText: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  },
  progressMonoBrass: {
    fontSize: 11,
    color: COLORS.brass,
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
  },
  legendTitle: {
    fontSize: 12,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
    marginBottom: 10,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 12, height: 12, borderRadius: 3, marginRight: 10 },
  legendDot2: { color: COLORS.muted },
  legendEn: { fontSize: 12, color: COLORS.ink, fontFamily: FONTS.uiBold, fontWeight: '700' },
  legendHi: { fontSize: 12, color: COLORS.muted, fontFamily: FONTS.hi, opacity: 0.85 },
  legendSub: { fontSize: 11, color: COLORS.muted, fontFamily: FONTS.mono },
  searchRow: {
    height: 48,
    marginTop: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  searchText: { marginLeft: 10, fontSize: 13, color: COLORS.muted, fontFamily: FONTS.ui },
  viewAllRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  viewAllText: {
    fontSize: 11,
    color: COLORS.indigo,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default StateScreen;
