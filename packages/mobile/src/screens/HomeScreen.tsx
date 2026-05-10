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
import { FONTS, RADIUS } from '../utils/theme';
import Avatar from '../components/Avatar';
import Btn from '../components/Btn';
import Card from '../components/Card';
import Chip from '../components/Chip';
import Progress from '../components/Progress';
import type { MainTabParamList, RootStackParamList, QueuedVisit } from '../types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: Nav;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { t } = useI18n();
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
      setCompleted(
        assignments.reduce((s: number, a: any) => s + (a.completedCount || 0), 0),
      );
      setTarget(
        assignments.reduce((s: number, a: any) => s + (a.totalVoters || 0), 0),
      );
      setLoadError(null);
    } catch (err: any) {
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

  const pct = target > 0 ? Math.round((completed / target) * 1000) / 10 : 0;
  const pending = Math.max(0, target - completed);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.ink} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.indigo} />
        }
        contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Civic banner */}
        <View style={styles.banner}>
          <View style={styles.bannerTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar name={user?.name} tone="brass" size={40} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.bannerGreeting}>Good morning · सुप्रभात</Text>
                <Text style={styles.bannerName} numberOfLines={1}>
                  {user?.name || t('home_user_fallback')}
                </Text>
              </View>
            </View>
            <View style={styles.bannerActions}>
              <Chip tone="indigo">FIELD STAFF</Chip>
              <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.7}>
                <Icon name="logout" size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          </View>

          {(user?.assemblyConstituency || user?.district) && (
            <View style={styles.locationPill}>
              <Icon name="map-marker" size={14} color={COLORS.brass} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.locationName} numberOfLines={1}>
                  {user?.assemblyConstituency || '—'}
                  {user?.district ? ` · ${user.district}` : ''}
                </Text>
              </View>
              {user?.assemblyConstituency ? (
                <Text style={styles.locationCode} numberOfLines={1}>
                  UP-AC
                </Text>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Sync alert */}
          {queueCount > 0 && (
            <View style={styles.syncAlert}>
              <View style={styles.syncIconBox}>
                <Icon name="cloud-upload" size={18} color={COLORS.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.syncTitle}>{queueCount} visits queued offline</Text>
                <Text style={styles.syncSub}>{queueCount} विज़िट ऑफलाइन क्यू में</Text>
              </View>
              <Btn size="sm" onPress={() => navigation.navigate('Queue')}>
                Sync
              </Btn>
            </View>
          )}

          {/* Error */}
          {loadError ? (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle" size={14} color={COLORS.danger} />
              <Text style={styles.errorText} numberOfLines={2}>
                {loadError}
              </Text>
            </View>
          ) : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatTile
              n={String(assignmentsTotal)}
              en="Booths"
              hi="बूथ"
              color={COLORS.indigo}
            />
            <StatTile n={String(completed)} en="Done" hi="पूर्ण" color={COLORS.success} />
            <StatTile n={String(pending)} en="Pending" hi="बाकी" color={COLORS.brass} />
          </View>

          {/* Progress card */}
          {target > 0 && (
            <Card padding={16}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.progressTitle}>Overall progress</Text>
                  <Text style={styles.progressTitleHi}>कुल प्रगति</Text>
                </View>
                <Text style={styles.progressPct}>{pct}%</Text>
              </View>
              <Progress value={pct} tone="brass" height={6} />
              <View style={styles.progressFootRow}>
                <Text style={styles.progressFoot}>{completed.toLocaleString('en-IN')} done</Text>
                <Text style={styles.progressFoot}>{target.toLocaleString('en-IN')} total</Text>
              </View>
            </Card>
          )}

          {/* Quick actions */}
          <View style={styles.actionsRow}>
            <ActionTile
              en="My booths"
              hi="मेरे बूथ"
              kicker={`${assignmentsTotal} assigned`}
              tone="indigo"
              icon="map-marker-multiple"
              onPress={() => navigation.navigate('Assignments')}
            />
            <ActionTile
              en="Queue"
              hi="क्यू"
              kicker={queueCount === 0 ? 'All synced' : `${queueCount} to sync`}
              tone="warning"
              icon="cloud-upload"
              onPress={() => navigation.navigate('Queue')}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

interface StatTileProps {
  n: string;
  en: string;
  hi: string;
  color: string;
}

const StatTile: React.FC<StatTileProps> = ({ n, en, hi, color }) => (
  <Card padding={12} style={{ flex: 1 }}>
    <Text style={[styles.statValue, { color }]}>{n}</Text>
    <Text style={styles.statLabel}>{en}</Text>
    <Text style={styles.statLabelHi}>{hi}</Text>
  </Card>
);

interface ActionTileProps {
  en: string;
  hi: string;
  kicker: string;
  tone: 'indigo' | 'warning';
  icon: string;
  onPress: () => void;
}

const ActionTile: React.FC<ActionTileProps> = ({ en, hi, kicker, tone, icon, onPress }) => {
  const c = tone === 'indigo' ? COLORS.indigo : COLORS.warning;
  const bg = tone === 'indigo' ? COLORS.indigoSoft : COLORS.warningSoft;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.actionTile}>
      <View style={[styles.actionIcon, { backgroundColor: bg }]}>
        <Icon name={icon} size={22} color={c} />
      </View>
      <View>
        <Text style={styles.actionEn}>{en}</Text>
        <Text style={styles.actionHi}>{hi}</Text>
        <Text style={[styles.actionKicker, { color: c }]}>{kicker}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  banner: {
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 18,
    backgroundColor: COLORS.ink,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  bannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerGreeting: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.62)',
    fontFamily: FONTS.uiMedium,
  },
  bannerName: {
    fontSize: 16,
    color: COLORS.white,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
    marginTop: 1,
  },
  bannerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  locationPill: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationName: {
    fontSize: 12,
    color: COLORS.white,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  },
  locationCode: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: FONTS.mono,
  },
  content: { paddingHorizontal: 14, paddingTop: 16, gap: 14 },
  syncAlert: {
    padding: 12,
    backgroundColor: COLORS.warningSoft,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#F1DEAA',
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  syncTitle: {
    fontSize: 13,
    color: '#7A5008',
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
  },
  syncSub: {
    fontSize: 11,
    color: '#7A5008',
    fontFamily: FONTS.hi,
    opacity: 0.85,
    marginTop: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerSoft,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#7A2014',
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  statValue: {
    fontFamily: FONTS.monoBold,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 28,
  },
  statLabel: {
    marginTop: 6,
    fontSize: 11,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  },
  statLabelHi: {
    fontSize: 10,
    color: COLORS.muted,
    fontFamily: FONTS.hi,
    marginTop: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 13,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
  },
  progressTitleHi: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.hi,
  },
  progressPct: {
    fontSize: 22,
    color: COLORS.brass,
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  progressFootRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressFoot: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.mono,
  },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionTile: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.hairlineSoft,
    padding: 14,
    minHeight: 116,
    justifyContent: 'space-between',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEn: {
    fontSize: 14,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
  },
  actionHi: {
    fontSize: 11,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.hi,
    marginTop: 1,
  },
  actionKicker: {
    fontSize: 11,
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
    marginTop: 6,
  },
});

export default HomeScreen;
