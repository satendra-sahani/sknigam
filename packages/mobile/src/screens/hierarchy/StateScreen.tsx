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

  const load = useCallback(async (isRefresh = false) => {
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
  }, []);

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', () => load(true));
    return unsub;
  }, [load, navigation]);

  const pct = summary && summary.totalVoters > 0
    ? Math.round((summary.verified / summary.totalVoters) * 100)
    : 0;
  const isDone = pct === 100 && (summary?.totalVoters ?? 0) > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.header}>
        <Text style={styles.title}>{t('explore_title')}</Text>
        <Text style={styles.subtitle}>{t('explore_subtitle')}</Text>
      </View>

      {loading && !summary ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />
          }>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Districts', { state: summary?.state || t('explore_state_default') })}
            style={styles.stateCard}>
            <View style={styles.stateTop}>
              <View style={styles.flagIcon}>
                <Icon name="map" size={26} color={COLORS.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stateLabel}>{t('explore_state_label')}</Text>
                <Text style={styles.stateName}>{summary?.state || t('explore_state_default')}</Text>
              </View>
              {isDone ? (
                <View style={styles.doneBadge}>
                  <Icon name="check" size={16} color={COLORS.white} />
                </View>
              ) : (
                <Icon name="chevron-right" size={26} color={COLORS.white} style={{ opacity: 0.8 }} />
              )}
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{summary?.districts ?? 0}</Text>
                <Text style={styles.statLabel}>{t('explore_stat_districts')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{summary?.constituencies ?? 0}</Text>
                <Text style={styles.statLabel}>{t('explore_stat_acs')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{summary?.booths ?? 0}</Text>
                <Text style={styles.statLabel}>{t('explore_stat_booths')}</Text>
              </View>
            </View>

            <View style={styles.progressBlock}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>{t('explore_outreach_progress')}</Text>
                <Text style={styles.progressPct}>{pct}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.progressMeta}>
                {t('explore_voters_completed', { done: summary?.verified ?? 0, total: summary?.totalVoters ?? 0 })}
              </Text>
            </View>

            <View style={styles.cta}>
              <Text style={styles.ctaText}>
                {isDone ? t('explore_all_voters_reached') : t('explore_drill_in')}
              </Text>
              <Icon
                name={isDone ? 'check-circle' : 'arrow-right'}
                size={16}
                color={COLORS.white}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.legend}>
            <Text style={styles.legendTitle}>{t('explore_how_title')}</Text>
            <View style={styles.legendRow}>
              <View style={[styles.legendBadge, { backgroundColor: COLORS.successLight }]}>
                <Icon name="check" size={14} color={COLORS.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.legendLabel}>{t('explore_green_tick')}</Text>
                <Text style={styles.legendSub}>{t('explore_green_tick_sub')}</Text>
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendBadge, { backgroundColor: COLORS.warningLight }]}>
                <Icon name="progress-clock" size={14} color={COLORS.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.legendLabel}>{t('explore_progress_bar')}</Text>
                <Text style={styles.legendSub}>{t('explore_progress_bar_sub')}</Text>
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendBadge, { backgroundColor: COLORS.accentLight }]}>
                <Icon name="upload" size={14} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.legendLabel}>{t('explore_complete_upload')}</Text>
                <Text style={styles.legendSub}>{t('explore_complete_upload_sub')}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey200,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.grey800 },
  subtitle: { fontSize: 12, color: COLORS.grey500, marginTop: 4, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 32 },
  stateCard: {
    backgroundColor: COLORS.hero,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  stateTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flagIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateLabel: { fontSize: 10, fontWeight: '800', color: COLORS.grey400, letterSpacing: 1.2 },
  stateName: { fontSize: 22, fontWeight: '800', color: COLORS.white, marginTop: 2 },
  doneBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.heroAccent,
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 11, color: COLORS.grey400, marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.grey700 },
  progressBlock: { marginTop: 18 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 13, color: COLORS.grey300, fontWeight: '700' },
  progressPct: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.heroAccent,
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  progressMeta: { fontSize: 12, color: COLORS.grey400, marginTop: 8, fontWeight: '600' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  ctaText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  legend: {
    marginTop: 24,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grey200,
  },
  legendTitle: { fontSize: 14, fontWeight: '800', color: COLORS.grey800, marginBottom: 14 },
  legendRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  legendBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendLabel: { fontSize: 13, fontWeight: '700', color: COLORS.grey800 },
  legendSub: { fontSize: 12, color: COLORS.grey500, marginTop: 2, lineHeight: 16 },
});

export default StateScreen;
