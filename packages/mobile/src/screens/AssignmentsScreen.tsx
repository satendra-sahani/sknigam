import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
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
import { FONTS, RADIUS } from '../utils/theme';
import AppBar from '../components/AppBar';
import Chip from '../components/Chip';
import Progress from '../components/Progress';
import Skeleton from '../components/Skeleton';
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

  const load = useCallback(
    async (isRefresh = false) => {
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
    },
    [t],
  );

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
    const isNew = pct === 0;
    const tone = isDone ? 'success' : 'brass';

    return (
      <TouchableOpacity
        activeOpacity={0.85}
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
          <View
            style={[
              styles.partBadge,
              {
                backgroundColor: isDone ? COLORS.successSoft : COLORS.indigoSoft,
              },
            ]}>
            <Text
              style={[
                styles.partNum,
                {
                  color: isDone ? '#0F4A2D' : COLORS.indigoDeep,
                },
              ]}>
              {booth?.partNumber ?? '—'}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.boothName} numberOfLines={1}>
              {booth?.name ? boothDisplay(booth.name, lang) : t('assignments_unknown_booth')}
            </Text>
            <Text style={styles.boothMeta} numberOfLines={1}>
              {booth?.assemblyConstituency}
              {booth?.village ? ` · ${boothDisplay(booth.village, lang)}` : ''}
            </Text>
          </View>
          {isDone ? <Chip tone="success">Done</Chip> : null}
          {isNew ? <Chip tone="neutral">New</Chip> : null}
        </View>

        <View style={{ marginTop: 12 }}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={[styles.progressMono, { color: isDone ? COLORS.success : COLORS.brass }]}>
              {pct}% · {item.completedCount}/{item.totalVoters}
            </Text>
          </View>
          <Progress value={pct} tone={tone as any} height={6} />
        </View>

        {(item.voterSerialFrom || item.voterSerialTo) && (
          <View style={styles.rangeChip}>
            <Icon name="tag-outline" size={11} color={COLORS.muted} />
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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
      <AppBar
        title="My Booths"
        hi="मेरे बूथ"
        right={
          <TouchableOpacity activeOpacity={0.7} style={styles.searchBtn}>
            <Icon name="magnify" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        }
      />

      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryEn}>
            {assignments.length} booths · {overallPct}% complete
          </Text>
          <Text style={styles.summaryHi}>
            {assignments.length} बूथ · {overallPct}% पूर्ण
          </Text>
        </View>
        <View style={{ width: 110 }}>
          <Progress value={overallPct} tone="brass" height={6} />
        </View>
      </View>

      {loading && assignments.length === 0 ? (
        <View style={styles.listContent}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.card, { marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Skeleton width={40} height={40} radius={10} />
                <View style={{ flex: 1, marginLeft: 10, gap: 6 }}>
                  <Skeleton width="80%" height={10} />
                  <Skeleton width="50%" height={8} />
                  <Skeleton width="30%" height={8} />
                </View>
              </View>
              <Skeleton height={6} radius={3} style={{ marginTop: 12 }} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.indigo} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="clipboard-text-off-outline" size={40} color={COLORS.indigoDeep} />
              </View>
              <Text style={styles.emptyText}>No booths assigned yet</Text>
              <Text style={styles.emptyTextHi}>अभी कोई बूथ निर्धारित नहीं</Text>
              <Text style={styles.emptySub}>
                Pull down to refresh. Your supervisor assigns booths from the back office.
              </Text>
              <Text style={styles.emptySubHi}>ताज़ा करने के लिए नीचे खींचें।</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  searchBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  summary: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryEn: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  },
  summaryHi: {
    fontSize: 10,
    color: COLORS.muted,
    fontFamily: FONTS.hi,
  },
  listContent: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 24 },
  card: {
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.hairlineSoft,
    padding: 14,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  partBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partNum: {
    fontSize: 14,
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
  },
  boothName: {
    fontSize: 13,
    color: COLORS.ink,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  },
  boothMeta: {
    fontSize: 10,
    color: COLORS.muted,
    fontFamily: FONTS.ui,
    marginTop: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.uiMedium,
    fontWeight: '500',
  },
  progressMono: {
    fontSize: 11,
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
  },
  rangeChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    backgroundColor: COLORS.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  rangeText: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 17,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
  },
  emptyTextHi: {
    fontSize: 13,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.hi,
    marginTop: -4,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: FONTS.uiMedium,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
    marginTop: 6,
  },
  emptySubHi: {
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: FONTS.hi,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default AssignmentsScreen;
