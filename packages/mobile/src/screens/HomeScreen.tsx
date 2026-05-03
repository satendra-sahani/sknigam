import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import api from '../services/api';
import { subscribe } from '../services/visitQueue';
import { COLORS } from '../utils/constants';
import type { MainTabParamList, RootStackParamList, QueuedVisit } from '../types';

const roleKeyMap: Record<string, string> = {
  super_admin: 'home_role_super',
  staff: 'home_role_staff',
  politician: 'home_role_politician',
};

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: Nav;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { lang, toggle, t } = useI18n();
  const [assignmentsTotal, setAssignmentsTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [target, setTarget] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/voter-assignments', { params: { limit: 100 } });
      const assignments = res.data.data.assignments || [];
      setAssignmentsTotal(assignments.length);
      setCompleted(assignments.reduce((s: number, a: any) => s + (a.completedCount || 0), 0));
      setTarget(assignments.reduce((s: number, a: any) => s + (a.totalVoters || 0), 0));
      setLoadError(null);
    } catch (err: any) {
      // Surface a compact hint instead of silently showing "0 booths" —
      // that's what made past debugging so painful on field devices.
      const status = err?.response?.status;
      const msg = err?.response?.data?.error;
      if (status) setLoadError(`${status}: ${msg || 'Server error'}`);
      else if (err?.code === 'ECONNABORTED') setLoadError('Request timed out. Check Wi-Fi / server.');
      else setLoadError(`Cannot reach API (${err?.message || 'network error'})`);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [load, navigation]);

  useEffect(() => {
    const unsub = subscribe((q: QueuedVisit[]) => setQueueCount(q.length));
    return unsub;
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const pct = target > 0 ? Math.round((completed / target) * 100) : 0;
  const pending = Math.max(0, target - completed);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.hero} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{t('home_greeting')}</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || t('home_user_fallback')}
              </Text>
              {user?.role && (
                <View style={styles.rolePill}>
                  <Icon name="shield-check" size={12} color={COLORS.primary} />
                  <Text style={styles.rolePillText}>
                    {roleKeyMap[user.role] ? t(roleKeyMap[user.role]) : user.role}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.heroActions}>
              <TouchableOpacity
                onPress={toggle}
                accessibilityLabel={t('lang_switch_tooltip')}
                style={styles.langBtn}>
                <Text style={styles.langBtnText}>
                  {lang === 'en' ? 'EN' : 'हि'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                <Icon name="logout" size={20} color={COLORS.grey300} />
              </TouchableOpacity>
            </View>
          </View>

          {user?.assemblyConstituency && (
            <View style={styles.heroConstituency}>
              <Icon name="map-marker" size={14} color={COLORS.primary} />
              <Text style={styles.constituencyText} numberOfLines={1}>
                {user.assemblyConstituency}
                {user.district ? ` · ${user.district}` : ''}
              </Text>
            </View>
          )}

          <View style={styles.heroStatsRow}>
            <HeroStat label={t('home_stat_booths')} value={String(assignmentsTotal)} icon="map-marker-multiple" />
            <View style={styles.heroDivider} />
            <HeroStat label={t('home_stat_done')} value={String(completed)} icon="check-circle" />
            <View style={styles.heroDivider} />
            <HeroStat label={t('home_stat_pending')} value={String(pending)} icon="clock-outline" />
          </View>

          {loadError && (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle" size={14} color={COLORS.warning} />
              <Text style={styles.errorBannerText} numberOfLines={2}>
                {loadError}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {target > 0 && (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.progressLabel}>{t('home_overall_progress')}</Text>
                  <Text style={styles.progressValue}>{pct}%</Text>
                </View>
                <View style={styles.progressCount}>
                  <Text style={styles.progressCountValue}>{completed.toLocaleString('en-IN')}</Text>
                  <Text style={styles.progressCountDiv}>/</Text>
                  <Text style={styles.progressCountTotal}>{target.toLocaleString('en-IN')}</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.progressFootnote}>
                {assignmentsTotal === 1
                  ? t('home_across_one')
                  : t('home_across_many', { n: assignmentsTotal })}
              </Text>
            </View>
          )}

          {queueCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Queue')}
              style={styles.queueCta}>
              <View style={styles.queueIconWrap}>
                <Icon name="cloud-upload" size={20} color={COLORS.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.queueTitle}>
                  {queueCount === 1
                    ? t('home_queue_waiting_one')
                    : t('home_queue_waiting_many', { n: queueCount })}
                </Text>
                <Text style={styles.queueSub}>{t('home_queue_sub')}</Text>
              </View>
              <Icon name="chevron-right" size={22} color={COLORS.grey400} />
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>{t('home_quick_actions')}</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryCta}
            onPress={() => navigation.navigate('Assignments')}>
            <View style={styles.ctaIconLight}>
              <Icon name="map-marker-multiple" size={22} color={COLORS.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.primaryCtaText}>{t('home_open_booths')}</Text>
              <Text style={styles.primaryCtaSub}>{t('home_open_booths_sub')}</Text>
            </View>
            <Icon name="chevron-right" size={22} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.secondaryCta}
            onPress={() => navigation.navigate('Queue')}>
            <View style={styles.secondaryIcon}>
              <Icon name="cloud-sync" size={22} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.secondaryCtaText}>{t('home_sync_queue')}</Text>
              <Text style={styles.secondaryCtaSub}>
                {queueCount === 0
                  ? t('home_sync_queue_all_clear')
                  : queueCount === 1
                    ? t('home_sync_queue_pending_one')
                    : t('home_sync_queue_pending_many', { n: queueCount })}
              </Text>
            </View>
            <Icon name="chevron-right" size={22} color={COLORS.grey400} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

function HeroStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.heroStat}>
      <Icon name={icon} size={14} color={COLORS.grey400} />
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hero: {
    backgroundColor: COLORS.hero,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  greeting: { fontSize: 13, color: COLORS.grey400, fontWeight: '500' },
  userName: { fontSize: 26, fontWeight: '800', color: COLORS.white, marginTop: 2 },
  rolePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 8,
  },
  rolePillText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langBtn: {
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.heroAccent,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
  },
  langBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.heroAccent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroConstituency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: COLORS.heroAccent,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    maxWidth: '100%',
  },
  constituencyText: { fontSize: 13, color: COLORS.white, fontWeight: '600' },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.heroAccent,
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
  },
  heroStat: { flex: 1, alignItems: 'center', gap: 4 },
  heroDivider: { width: 1, height: 30, backgroundColor: COLORS.grey700 },
  heroStatValue: { fontSize: 20, color: COLORS.white, fontWeight: '800' },
  heroStatLabel: { fontSize: 10, color: COLORS.grey400, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.warningLight,
  },
  errorBannerText: { flex: 1, fontSize: 12, color: COLORS.warning, fontWeight: '600' },
  content: { padding: 16, paddingTop: 20, paddingBottom: 32, gap: 12 },
  progressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.grey200,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  progressLabel: { fontSize: 11, color: COLORS.grey500, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  progressValue: { fontSize: 32, color: COLORS.grey800, fontWeight: '800', marginTop: 4 },
  progressCount: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  progressCountValue: { fontSize: 16, color: COLORS.primary, fontWeight: '800' },
  progressCountDiv: { fontSize: 14, color: COLORS.grey300 },
  progressCountTotal: { fontSize: 14, color: COLORS.grey500, fontWeight: '600' },
  progressBar: { height: 8, backgroundColor: COLORS.grey200, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  progressFootnote: { fontSize: 11, color: COLORS.grey500, marginTop: 10 },
  queueCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 14,
  },
  queueIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueTitle: { fontSize: 14, fontWeight: '700', color: COLORS.grey800 },
  queueSub: { fontSize: 12, color: COLORS.grey600, marginTop: 2 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.grey500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 2,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
  },
  ctaIconLight: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryCtaText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  primaryCtaSub: { color: COLORS.primaryLight, fontSize: 12, marginTop: 2 },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grey200,
  },
  secondaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryCtaText: { color: COLORS.grey800, fontSize: 16, fontWeight: '800' },
  secondaryCtaSub: { color: COLORS.grey500, fontSize: 12, marginTop: 2 },
});

export default HomeScreen;
