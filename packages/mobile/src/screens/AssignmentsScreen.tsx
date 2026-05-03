import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
import api from '../services/api';
import { useI18n } from '../i18n';
import { boothDisplay } from '../utils/hindify';
import { COLORS } from '../utils/constants';
import type { MainTabParamList, RootStackParamList } from '../types';

interface PopulatedBooth {
  _id: string;
  name: string;
  partNumber: number;
  assemblyConstituency: string;
  village?: string;
}

interface Assignment {
  _id: string;
  boothId: PopulatedBooth | string;
  voterSerialFrom?: number;
  voterSerialTo?: number;
  isActive: boolean;
  totalVoters: number;
  completedCount: number;
}

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Assignments'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: Nav;
}

const AssignmentsScreen: React.FC<Props> = ({ navigation }) => {
  const { t, lang } = useI18n();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/voter-assignments', { params: { limit: 100 } });
      setAssignments(res.data.data.assignments);
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error;
      const detail = status
        ? `HTTP ${status}: ${serverMsg || 'Server error'}`
        : err?.code === 'ECONNABORTED'
          ? 'Request timed out. Check Wi-Fi / server.'
          : `Cannot reach API (${err?.message || 'network error'}).\n\nAPI URL: ${api.defaults.baseURL}`;
      Alert.alert(t('assignments_failed'), detail);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', () => load());
    return unsub;
  }, [load, navigation]);

  const totals = assignments.reduce(
    (acc, a) => ({ done: acc.done + a.completedCount, target: acc.target + a.totalVoters }),
    { done: 0, target: 0 },
  );
  const overallPct = totals.target > 0 ? Math.round((totals.done / totals.target) * 100) : 0;

  function renderItem({ item }: { item: Assignment }) {
    const booth = typeof item.boothId === 'object' ? item.boothId : null;
    const pct = item.totalVoters > 0 ? Math.round((item.completedCount / item.totalVoters) * 100) : 0;
    const isDone = pct === 100;
    const tone = isDone ? COLORS.success : pct >= 50 ? COLORS.primary : COLORS.warning;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (!booth) return;
          navigation.navigate('BoothVoters', {
            assignmentId: item._id,
            boothId: booth._id,
            boothName: booth.name,
            partNumber: booth.partNumber,
          });
        }}
        style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.partBadge, { backgroundColor: `${tone}1A` }]}>
            <Text style={[styles.partLabel, { color: tone }]}>{t('assignments_part')}</Text>
            <Text style={[styles.partNum, { color: tone }]}>{booth?.partNumber ?? '—'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.boothName} numberOfLines={1}>
              {booth?.name ? boothDisplay(booth.name, lang) : t('assignments_unknown_booth')}
            </Text>
            <View style={styles.metaRow}>
              <Icon name="map-marker" size={12} color={COLORS.grey400} />
              <Text style={styles.boothMeta} numberOfLines={1}>
                {booth?.assemblyConstituency}
                {booth?.village ? ` · ${boothDisplay(booth.village, lang)}` : ''}
              </Text>
            </View>
          </View>
          {isDone ? (
            <View style={styles.doneBadge}>
              <Icon name="check" size={12} color={COLORS.white} />
            </View>
          ) : (
            <Icon name="chevron-right" size={22} color={COLORS.grey400} />
          )}
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: tone }]} />
          </View>
          <View style={styles.progressRow}>
            <Text style={[styles.progressPct, { color: tone }]}>{pct}%</Text>
            <Text style={styles.progressText}>
              {t('assignments_of_voters', { done: item.completedCount, total: item.totalVoters })}
            </Text>
          </View>
        </View>

        {(item.voterSerialFrom || item.voterSerialTo) && (
          <View style={styles.rangeChip}>
            <Icon name="tag-outline" size={11} color={COLORS.grey500} />
            <Text style={styles.rangeText}>
              {t('assignments_serial', {
                from: item.voterSerialFrom ?? '1',
                to: item.voterSerialTo ?? '∞',
              })}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.header}>
        <Text style={styles.title}>{t('assignments_title')}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Icon name="map-marker-multiple" size={12} color={COLORS.primary} />
            <Text style={styles.summaryText}>
              {assignments.length === 1
                ? t('assignments_count_one')
                : t('assignments_count_many', { n: assignments.length })}
            </Text>
          </View>
          {totals.target > 0 && (
            <View style={[styles.summaryPill, { backgroundColor: COLORS.accentLight }]}>
              <Icon name="chart-line" size={12} color={COLORS.accent} />
              <Text style={[styles.summaryText, { color: COLORS.accent }]}>
                {t('assignments_overall', { n: overallPct })}
              </Text>
            </View>
          )}
        </View>
      </View>
      {loading && assignments.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>{t('assignments_loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="clipboard-text-off-outline" size={40} color={COLORS.grey400} />
              </View>
              <Text style={styles.emptyText}>{t('assignments_empty')}</Text>
              <Text style={styles.emptySub}>{t('assignments_empty_sub')}</Text>
            </View>
          }
        />
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
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  summaryText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  listContent: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.grey200,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  partBadge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  partNum: { fontSize: 17, fontWeight: '800', lineHeight: 20 },
  boothName: { fontSize: 16, fontWeight: '700', color: COLORS.grey800 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  boothMeta: { fontSize: 12, color: COLORS.grey500, flex: 1 },
  doneBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: { marginTop: 14 },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.grey200,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  progressPct: { fontSize: 15, fontWeight: '800' },
  progressText: { fontSize: 12, color: COLORS.grey600, fontWeight: '600' },
  rangeChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    backgroundColor: COLORS.grey100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rangeText: { fontSize: 11, color: COLORS.grey600, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: COLORS.grey500 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.grey100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { fontSize: 16, color: COLORS.grey700, fontWeight: '700' },
  emptySub: { fontSize: 13, color: COLORS.grey500, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 },
});

export default AssignmentsScreen;
