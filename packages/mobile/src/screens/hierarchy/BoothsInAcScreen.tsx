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
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import api from '../../services/api';
import { useI18n } from '../../i18n';
import { boothDisplay } from '../../utils/hindify';
import { COLORS } from '../../utils/constants';
import type { HierarchyBoothRow, RootStackParamList } from '../../types';

interface Props {
  route: RouteProp<RootStackParamList, 'BoothsInAc'>;
  navigation: StackNavigationProp<RootStackParamList, 'BoothsInAc'>;
}

const BoothsInAcScreen: React.FC<Props> = ({ route, navigation }) => {
  const { district, assemblyConstituency } = route.params;
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<HierarchyBoothRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/analytics/hierarchy/booths', {
        params: { district, assemblyConstituency },
      });
      setRows(res.data.data);
    } catch (err: any) {
      Alert.alert(t('error'), err.response?.data?.error || t('booths_load_failed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [district, assemblyConstituency, t]);

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', () => load(true));
    return unsub;
  }, [load, navigation]);

  const q = search.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      String(r.partNumber).includes(q) ||
      (r.village || '').toLowerCase().includes(q),
  );

  const totals = rows.reduce(
    (acc, r) => ({
      voters: acc.voters + r.totalVoters,
      verified: acc.verified + r.verified,
    }),
    { voters: 0, verified: 0 },
  );
  const overallPct = totals.voters > 0 ? Math.round((totals.verified / totals.voters) * 100) : 0;

  function renderItem({ item }: { item: HierarchyBoothRow }) {
    const pct = item.totalVoters > 0 ? Math.round((item.verified / item.totalVoters) * 100) : 0;
    const isDone = pct === 100 && item.totalVoters > 0;
    const tone = isDone ? COLORS.success : pct >= 50 ? COLORS.primary : COLORS.warning;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate('BoothVoters', {
            boothId: item._id,
            boothName: item.name,
            partNumber: item.partNumber,
          })
        }
        style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.partBadge, { backgroundColor: `${tone}1A` }]}>
            <Text style={[styles.partLabel, { color: tone }]}>{t('booths_part_label')}</Text>
            <Text style={[styles.partNum, { color: tone }]}>{item.partNumber}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{boothDisplay(item.name, lang)}</Text>
            <View style={styles.metaRow}>
              <Icon name="map-marker" size={11} color={COLORS.grey400} />
              <Text style={styles.meta} numberOfLines={1}>
                {item.village ? `${boothDisplay(item.village, lang)} · ` : ''}
                {t('districts_voters_count', { n: item.totalVoters })}
              </Text>
            </View>
          </View>
          {isDone ? (
            <View style={styles.doneBadge}>
              <Icon name="check" size={14} color={COLORS.white} />
            </View>
          ) : (
            <View style={[styles.pctPill, { backgroundColor: `${tone}1A` }]}>
              <Text style={[styles.pctText, { color: tone }]}>{pct}%</Text>
            </View>
          )}
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: tone }]} />
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.progressText}>
            {t('explore_voters_completed', { done: item.verified, total: item.totalVoters })}
          </Text>
          <View style={styles.actionChip}>
            <Icon
              name={isDone ? 'check-circle-outline' : 'upload-outline'}
              size={13}
              color={isDone ? COLORS.success : COLORS.primary}
            />
            <Text style={[styles.actionText, { color: isDone ? COLORS.success : COLORS.primary }]}>
              {isDone ? t('booths_all_uploaded') : t('booths_complete_upload')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={COLORS.grey800} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{assemblyConstituency}</Text>
          <Text style={styles.subtitle}>
            {rows.length === 1
              ? t('booths_subtitle_one', { pct: overallPct })
              : t('booths_subtitle_many', { n: rows.length, pct: overallPct })}
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={18} color={COLORS.grey400} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('booths_search')}
            placeholderTextColor={COLORS.grey400}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={16} color={COLORS.grey400} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && rows.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="map-search-outline" size={38} color={COLORS.grey400} />
              </View>
              <Text style={styles.emptyText}>{t('booths_empty')}</Text>
              <Text style={styles.emptySub}>
                {rows.length === 0 ? t('booths_empty_data') : t('districts_empty_search')}
              </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey200,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.grey100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.grey800 },
  subtitle: { fontSize: 12, color: COLORS.grey500, marginTop: 2, fontWeight: '600' },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey200,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.grey100,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.grey800, padding: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  partNum: { fontSize: 18, fontWeight: '800', lineHeight: 22 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.grey800 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  meta: { fontSize: 12, color: COLORS.grey500, flex: 1 },
  doneBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pctText: { fontSize: 12, fontWeight: '800' },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.grey200,
    overflow: 'hidden',
    marginTop: 14,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  progressText: { fontSize: 12, color: COLORS.grey600, fontWeight: '600' },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 32 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.grey100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { fontSize: 15, color: COLORS.grey700, fontWeight: '700' },
  emptySub: { fontSize: 12, color: COLORS.grey500, textAlign: 'center', lineHeight: 18 },
});

export default BoothsInAcScreen;
