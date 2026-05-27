import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
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
import Mark from '../components/Mark';
import Avatar from '../components/Avatar';
import type { MainTabParamList, RootStackParamList, QueuedVisit } from '../types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: Nav;
}

/**
 * POLLSTICS · Insight — Home dashboard.
 *
 * Light cream theme throughout (no dark hero).  Top bar carries the
 * brand mark + "INSIGHT · PRO" subtag, a bell with an unread dot, and
 * the user's avatar.  Body is a stack of cards: greeting, KPI grid,
 * progress signal, and alerts.  Data is wired to the real staff
 * voter-assignments endpoint — every value below comes from the
 * server, with sensible zeros while loading.
 */
const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [assignmentsTotal, setAssignmentsTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [target, setTarget] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [queueError, setQueueError] = useState(0);
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
    const unsub = subscribe((q: QueuedVisit[]) => {
      setQueueCount(q.length);
      setQueueError(q.filter((x) => !!x.lastError).length);
    });
    return unsub;
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const pct = target > 0 ? Math.round((completed / target) * 1000) / 10 : 0;
  const pending = Math.max(0, target - completed);
  const seatCode = user?.assemblyConstituency
    ? `${user.assemblyConstituency.toUpperCase()}${user.district ? ' · ' + user.district.toUpperCase() : ''}`
    : 'UP · CONSTITUENCY';

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingHi =
    greetingHour < 12 ? 'सुप्रभात' : greetingHour < 17 ? 'नमस्कार' : 'शुभ संध्या';

  // Build the alerts list from real signals so it stays honest.
  const alerts: Array<{ tone: 'danger' | 'warning' | 'success'; kicker: string; en: string; hi: string }> = [];
  if (loadError) {
    alerts.push({ tone: 'danger', kicker: 'API ERROR', en: loadError, hi: 'सर्वर त्रुटि' });
  }
  if (queueError > 0) {
    alerts.push({
      tone: 'danger',
      kicker: 'SYNC FAILED',
      en: `${queueError} visit${queueError === 1 ? '' : 's'} failed to upload — open Queue to retry`,
      hi: `${queueError} विज़िट सिंक नहीं हुईं — क्यू खोलें`,
    });
  }
  if (queueCount > 0 && queueError === 0) {
    alerts.push({
      tone: 'warning',
      kicker: 'PENDING SYNC',
      en: `${queueCount} visit${queueCount === 1 ? '' : 's'} queued offline`,
      hi: `${queueCount} विज़िट क्यू में`,
    });
  }
  if (assignmentsTotal === 0 && !loadError) {
    alerts.push({
      tone: 'warning',
      kicker: 'NO ASSIGNMENTS',
      en: 'No booths assigned yet — pull to refresh',
      hi: 'अभी कोई बूथ निर्धारित नहीं',
    });
  }
  if (assignmentsTotal > 0 && pct >= 100) {
    alerts.push({
      tone: 'success',
      kicker: 'ALL DONE',
      en: 'Every voter in your booths has been visited',
      hi: 'सभी मतदाताओं से संपर्क पूरा',
    });
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />

      {/* Top bar — light theme, brand mark + bell + avatar */}
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Mark size={28} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.brandName}>POLLSTICS</Text>
            <Text style={styles.brandTag}>INSIGHT · PRO</Text>
          </View>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Queue')}
            style={styles.bellBtn}>
            <Icon name="bell-outline" size={14} color={COLORS.ink} />
            {(queueCount > 0 || queueError > 0 || !!loadError) && (
              <View style={styles.bellDot} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              // Avatar tap brings up a small action sheet rather than
              // logging the user out instantly — too easy to fat-finger.
              Alert.alert(
                user?.name || 'Account',
                user?.email || '',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign out', style: 'destructive', onPress: logout },
                ],
                { cancelable: true },
              )
            }>
            <Avatar name={user?.name} tone="indigo" size={32} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.indigo} />
        }>
        {/* Greeting block */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingKicker}>
            {greeting} <Text style={styles.greetingHi}>· {greetingHi}</Text>
          </Text>
          <Text style={styles.greetingTitle} numberOfLines={1}>
            {user?.name || t('home_user_fallback')}
          </Text>
          <View style={styles.seatRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>FIELD</Text>
            </View>
            <Text style={styles.seatCode} numberOfLines={1}>
              {seatCode}
            </Text>
          </View>
        </View>

        {/* KPI grid 2×2 */}
        <View style={styles.kpiGrid}>
          <Kpi
            label="Booths"
            hi="बूथ"
            value={String(assignmentsTotal)}
            sub={assignmentsTotal === 1 ? '1 assigned to you' : `${assignmentsTotal} assigned to you`}
          />
          <Kpi
            label="Contacted"
            hi="संपर्क"
            value={`${pct}%`}
            sub={`${completed.toLocaleString('en-IN')} of ${target.toLocaleString('en-IN')}`}
            tone="indigoSoft"
            accent={COLORS.indigo}
          />
          <Kpi
            label="Pending"
            hi="बाकी"
            value={pending.toLocaleString('en-IN')}
            sub={pending === 0 ? 'all reached' : 'voters remaining'}
            accent={pending === 0 ? COLORS.success : COLORS.brass}
          />
          <Kpi
            label="Queue"
            hi="क्यू"
            value={String(queueCount)}
            sub={queueError > 0 ? `${queueError} failed · retry now` : queueCount === 0 ? 'all synced' : 'awaiting upload'}
            accent={queueError > 0 ? COLORS.danger : queueCount === 0 ? COLORS.success : COLORS.warning}
          />
        </View>

        {/* Progress signal */}
        {target > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Outreach progress</Text>
                <Text style={styles.sectionHi}>आउटरीच प्रगति</Text>
              </View>
              <Text style={styles.sectionRight}>UPDATED LIVE</Text>
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(100, pct)}%` }]} />
            </View>

            <View style={styles.progressFootRow}>
              <Text style={styles.progressFoot}>{completed.toLocaleString('en-IN')} done</Text>
              <Text style={styles.progressFoot}>{target.toLocaleString('en-IN')} total</Text>
            </View>

            <View style={styles.legendRow}>
              <Legend swatch={COLORS.success} label="Done" hi="पूर्ण" />
              <Legend swatch={COLORS.brass} label="Active" hi="चालू" />
              <Legend swatch={COLORS.danger} label="Lagging" hi="पिछड़ा" />
            </View>
          </View>
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
            en="Sync queue"
            hi="क्यू सिंक"
            kicker={queueCount === 0 ? 'All clear' : `${queueCount} pending`}
            tone={queueError > 0 ? 'danger' : 'brass'}
            icon="cloud-upload-outline"
            onPress={() => navigation.navigate('Queue')}
          />
        </View>

        {/* Alerts */}
        {alerts.length > 0 && (
          <View style={{ gap: 8 }}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Alerts · {alerts.length} new
                </Text>
                <Text style={styles.sectionHi}>अलर्ट · {alerts.length} नए</Text>
              </View>
            </View>
            {alerts.map((a, i) => (
              <AlertRow key={i} {...a} />
            ))}
          </View>
        )}

        <View style={{ height: 6 }} />
      </ScrollView>
    </View>
  );
};

interface KpiProps {
  label: string;
  hi: string;
  value: string;
  sub: string;
  tone?: 'paper' | 'indigoSoft';
  accent?: string;
}

const Kpi: React.FC<KpiProps> = ({ label, hi, value, sub, tone = 'paper', accent }) => {
  const isInk = tone === 'paper';
  return (
    <View
      style={[
        styles.kpi,
        {
          backgroundColor: isInk ? COLORS.paper : COLORS.indigoSoft,
          borderColor: isInk ? COLORS.hairlineSoft : 'transparent',
        },
      ]}>
      <Text style={styles.kpiLabel}>
        {label}
        <Text style={styles.kpiHi}> · {hi}</Text>
      </Text>
      <Text style={[styles.kpiValue, { color: accent || COLORS.ink }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.kpiSub} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
};

interface ActionTileProps {
  en: string;
  hi: string;
  kicker: string;
  tone: 'indigo' | 'brass' | 'danger';
  icon: string;
  onPress: () => void;
}

const ActionTile: React.FC<ActionTileProps> = ({ en, hi, kicker, tone, icon, onPress }) => {
  const c =
    tone === 'indigo' ? COLORS.indigo : tone === 'brass' ? COLORS.brass : COLORS.danger;
  const bg =
    tone === 'indigo'
      ? COLORS.indigoSoft
      : tone === 'brass'
        ? COLORS.brassSoft
        : COLORS.dangerSoft;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.actionTile}>
      <View style={[styles.actionIcon, { backgroundColor: bg }]}>
        <Icon name={icon} size={20} color={c} />
      </View>
      <View>
        <Text style={styles.actionEn}>{en}</Text>
        <Text style={styles.actionHi}>{hi}</Text>
        <Text style={[styles.actionKicker, { color: c }]}>{kicker}</Text>
      </View>
    </TouchableOpacity>
  );
};

interface LegendProps {
  swatch: string;
  label: string;
  hi: string;
}
const Legend: React.FC<LegendProps> = ({ swatch, label, hi }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: swatch }]} />
    <Text style={styles.legendLabel}>
      {label}
      <Text style={styles.legendHi}> · {hi}</Text>
    </Text>
  </View>
);

interface AlertRowProps {
  tone: 'danger' | 'warning' | 'success';
  kicker: string;
  en: string;
  hi: string;
}
const AlertRow: React.FC<AlertRowProps> = ({ tone, kicker, en, hi }) => {
  const c =
    tone === 'danger' ? COLORS.danger : tone === 'warning' ? COLORS.warning : COLORS.success;
  return (
    <View style={[styles.alertRow, { borderLeftColor: c }]}>
      <Text style={[styles.alertKicker, { color: c }]}>{kicker}</Text>
      <Text style={styles.alertEn} numberOfLines={2}>
        {en}
      </Text>
      <Text style={styles.alertHi} numberOfLines={1}>
        {hi}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: COLORS.cream,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairlineSoft,
  },
  brand: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  brandName: {
    fontSize: 14,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 16,
  },
  brandTag: {
    fontSize: 8.5,
    color: '#B8331F',
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginTop: 2,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bellBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#B8331F',
    borderWidth: 1.5,
    borderColor: COLORS.paper,
  },
  body: { padding: 14, gap: 12, paddingBottom: 32 },
  greetingBlock: { paddingHorizontal: 2, paddingTop: 4 },
  greetingKicker: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.mono,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  greetingHi: { fontFamily: FONTS.hi, letterSpacing: 0 },
  greetingTitle: {
    marginTop: 4,
    fontSize: 22,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  seatRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: COLORS.indigoSoft,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10.5,
    color: COLORS.indigoDeep,
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  seatCode: {
    flex: 1,
    fontSize: 11,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.mono,
    letterSpacing: 0.4,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpi: {
    width: '48.5%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  kpiLabel: {
    fontSize: 9.5,
    color: COLORS.muted,
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  kpiHi: {
    fontFamily: FONTS.hi,
    fontWeight: '500',
    letterSpacing: 0,
  },
  kpiValue: {
    fontSize: 22,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  kpiSub: {
    fontSize: 11,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.uiMedium,
  },
  card: {
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.hairlineSoft,
    padding: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  sectionHi: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.hi,
    marginTop: 1,
  },
  sectionRight: {
    fontSize: 10,
    color: COLORS.muted,
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E9E3D4',
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.indigo,
    borderRadius: RADIUS.pill,
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
  legendRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendLabel: {
    fontSize: 11,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  },
  legendHi: { fontFamily: FONTS.hi, fontWeight: '500', color: COLORS.muted },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionTile: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.hairlineSoft,
    padding: 14,
    gap: 10,
    minHeight: 108,
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
  alertRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.hairlineSoft,
    borderLeftWidth: 3,
  },
  alertKicker: {
    fontSize: 9.5,
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  alertEn: {
    fontSize: 12.5,
    color: COLORS.ink,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 17,
  },
  alertHi: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.hi,
    marginTop: 2,
  },
});

export default HomeScreen;
