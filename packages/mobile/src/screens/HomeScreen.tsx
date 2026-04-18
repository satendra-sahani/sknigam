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
import api from '../services/api';
import { subscribe } from '../services/visitQueue';
import { COLORS } from '../utils/constants';
import type { MainTabParamList, RootStackParamList, QueuedVisit } from '../types';

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  staff: 'Field Staff',
  politician: 'Politician',
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
  const [assignmentsTotal, setAssignmentsTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [target, setTarget] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/voter-assignments', { params: { limit: 100 } });
      const assignments = res.data.data.assignments || [];
      setAssignmentsTotal(assignments.length);
      setCompleted(assignments.reduce((s: number, a: any) => s + (a.completedCount || 0), 0));
      setTarget(assignments.reduce((s: number, a: any) => s + (a.totalVoters || 0), 0));
    } catch {
      // stay silent on home
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
              <Text style={styles.greeting}>Namaste</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || 'User'}
              </Text>
              {user?.role && (
                <View style={styles.rolePill}>
                  <Icon name="shield-check" size={12} color={COLORS.primary} />
                  <Text style={styles.rolePillText}>{roleLabels[user.role] || user.role}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Icon name="logout" size={20} color={COLORS.grey300} />
            </TouchableOpacity>
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
            <HeroStat label="Booths" value={String(assignmentsTotal)} icon="map-marker-multiple" />
            <View style={styles.heroDivider} />
            <HeroStat label="Done" value={String(completed)} icon="check-circle" />
            <View style={styles.heroDivider} />
            <HeroStat label="Pending" value={String(pending)} icon="clock-outline" />
          </View>
        </View>

        <View style={styles.content}>
          {target > 0 && (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.progressLabel}>Overall progress</Text>
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
                Across {assignmentsTotal} booth{assignmentsTotal === 1 ? '' : 's'}
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
                  {queueCount} visit{queueCount > 1 ? 's' : ''} waiting to sync
                </Text>
                <Text style={styles.queueSub}>Tap to review and upload</Text>
              </View>
              <Icon name="chevron-right" size={22} color={COLORS.grey400} />
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>Quick actions</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryCta}
            onPress={() => navigation.navigate('Assignments')}>
            <View style={styles.ctaIconLight}>
              <Icon name="map-marker-multiple" size={22} color={COLORS.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.primaryCtaText}>Open my booths</Text>
              <Text style={styles.primaryCtaSub}>Visit voters and verify</Text>
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
              <Text style={styles.secondaryCtaText}>Sync queue</Text>
              <Text style={styles.secondaryCtaSub}>
                {queueCount > 0 ? `${queueCount} pending upload${queueCount > 1 ? 's' : ''}` : 'All clear'}
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
