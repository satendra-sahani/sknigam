import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          {user?.role && <Text style={styles.role}>{roleLabels[user.role] || user.role}</Text>}
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Icon name="logout" size={22} color={COLORS.grey500} />
        </TouchableOpacity>
      </View>

      {user?.assemblyConstituency && (
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Icon name="map-marker" size={18} color={COLORS.primary} />
            <Text style={styles.cardLabel}>Constituency</Text>
          </View>
          <Text style={styles.cardValue}>{user.assemblyConstituency}</Text>
          {user.district && <Text style={styles.cardSub}>{user.district}, Uttar Pradesh</Text>}
        </View>
      )}

      <View style={styles.statsRow}>
        <StatBox label="Assignments" value={String(assignmentsTotal)} icon="clipboard-check" />
        <StatBox label="Done" value={String(completed)} icon="account-check" color={COLORS.success} />
        <StatBox label="Pending" value={String(Math.max(0, target - completed))} icon="account-clock" color={COLORS.warning} />
      </View>

      {target > 0 && (
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Icon name="chart-line" size={18} color={COLORS.primary} />
            <Text style={styles.cardLabel}>Overall Progress</Text>
          </View>
          <Text style={styles.cardValue}>
            {completed.toLocaleString('en-IN')} / {target.toLocaleString('en-IN')}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.cardSub}>{pct}% complete across {assignmentsTotal} booth{assignmentsTotal === 1 ? '' : 's'}</Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.primaryCta}
        onPress={() => navigation.navigate('Assignments')}>
        <Icon name="view-list" size={22} color={COLORS.white} />
        <Text style={styles.primaryCtaText}>Open My Booths</Text>
        <Icon name="chevron-right" size={22} color={COLORS.white} />
      </TouchableOpacity>

      {queueCount > 0 && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Queue')}
          style={styles.queueCta}>
          <Icon name="cloud-upload" size={22} color={COLORS.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.queueTitle}>
              {queueCount} visit{queueCount > 1 ? 's' : ''} pending sync
            </Text>
            <Text style={styles.queueSub}>Tap to review and upload</Text>
          </View>
          <Icon name="chevron-right" size={22} color={COLORS.grey500} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

function StatBox({
  label,
  value,
  icon,
  color = COLORS.primary,
}: {
  label: string;
  value: string;
  icon: string;
  color?: string;
}) {
  return (
    <View style={styles.statBox}>
      <Icon name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 13, color: COLORS.grey500 },
  userName: { fontSize: 22, fontWeight: '800', color: COLORS.grey800, marginTop: 2 },
  role: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  logoutBtn: { padding: 4 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: { fontSize: 18, fontWeight: '700', color: COLORS.grey800, marginTop: 2 },
  cardSub: { fontSize: 12, color: COLORS.grey500, marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
    gap: 6,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: COLORS.grey500, fontWeight: '600', textTransform: 'uppercase' },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.grey200,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: { height: '100%', backgroundColor: COLORS.primary },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
  },
  primaryCtaText: { flex: 1, color: COLORS.white, fontSize: 15, fontWeight: '700' },
  queueCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.warningLight,
    borderRadius: 14,
    padding: 14,
  },
  queueTitle: { fontSize: 14, fontWeight: '700', color: COLORS.grey800 },
  queueSub: { fontSize: 12, color: COLORS.grey600, marginTop: 2 },
});

export default HomeScreen;
