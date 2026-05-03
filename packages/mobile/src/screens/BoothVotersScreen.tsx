import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import api from '../services/api';
import { useI18n } from '../i18n';
import { boothDisplay } from '../utils/hindify';
import { COLORS } from '../utils/constants';
import type { RootStackParamList } from '../types';

interface VoterRow {
  _id: string;
  voterSerialNumber: number;
  epicNumber: string;
  fullName: string;
  fullNameHi?: string;
  fatherOrHusbandName: string;
  fatherOrHusbandNameHi?: string;
  gender: 'M' | 'F' | 'T';
  age: number;
  verificationStatus: boolean;
  votingIntention?: string;
}

interface Props {
  route: RouteProp<RootStackParamList, 'BoothVoters'>;
  navigation: StackNavigationProp<RootStackParamList, 'BoothVoters'>;
}

const filters = [
  { key: 'all', labelKey: 'boothVoters_filter_all', icon: 'account-group' },
  { key: 'pending', labelKey: 'boothVoters_filter_pending', icon: 'clock-outline' },
  { key: 'verified', labelKey: 'boothVoters_filter_done', icon: 'check-circle' },
] as const;

type FilterKey = (typeof filters)[number]['key'];

const BoothVotersScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t, lang } = useI18n();
  const { boothId, boothName, partNumber } = route.params;
  const [voters, setVoters] = useState<VoterRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('pending');

  const load = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      const reset = opts.reset ?? false;
      if (loading) return;
      setLoading(true);
      try {
        const params: Record<string, string> = {
          boothId,
          page: String(reset ? 1 : page),
          limit: '30',
        };
        if (search) params.search = search;
        if (filter === 'verified') params.verificationStatus = 'true';
        if (filter === 'pending') params.verificationStatus = 'false';
        const res = await api.get('/voters', { params });
        const { voters: fetched, pagination } = res.data.data;
        setVoters((prev) => (reset ? fetched : [...prev, ...fetched]));
        setHasMore(pagination.page < pagination.pages);
        setPage((reset ? 1 : page) + 1);
      } catch (err: any) {
        Alert.alert(t('error'), err.response?.data?.error || t('boothVoters_load_failed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [boothId, page, search, filter, loading],
  );

  useEffect(() => {
    setPage(1);
    setVoters([]);
    load({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      setPage(1);
      load({ reset: true });
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  function onRefresh() {
    setRefreshing(true);
    setPage(1);
    load({ reset: true });
  }

  function onSearchSubmit() {
    setPage(1);
    load({ reset: true });
  }

  function renderItem({ item }: { item: VoterRow }) {
    const genderTone = item.gender === 'F' ? '#db2777' : item.gender === 'M' ? COLORS.accent : COLORS.grey500;
    const genderLabel =
      item.gender === 'M'
        ? t('visit_gender_male')
        : item.gender === 'F'
          ? t('visit_gender_female')
          : t('visit_gender_other');
    const displayName = lang === 'hi' ? item.fullNameHi || item.fullName : item.fullName;
    const displayFather =
      lang === 'hi' ? item.fatherOrHusbandNameHi || item.fatherOrHusbandName : item.fatherOrHusbandName;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('VoterVisit', { voterId: item._id })}
        style={styles.row}>
        <View style={[styles.serialBox, item.verificationStatus && styles.serialBoxDone]}>
          <Text style={[styles.serialText, item.verificationStatus && { color: COLORS.white }]}>
            {item.voterSerialNumber}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.voterName} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.voterMetaRow}>
            <View style={[styles.genderPill, { backgroundColor: `${genderTone}15` }]}>
              <Text style={[styles.genderText, { color: genderTone }]}>
                {genderLabel} · {item.age}{lang === 'hi' ? '' : 'y'}
              </Text>
            </View>
          </View>
          <Text style={styles.voterSub} numberOfLines={1}>
            {t('boothVoters_father')} {displayFather}
          </Text>
          <Text style={styles.epicText}>{item.epicNumber}</Text>
        </View>
        {item.verificationStatus ? (
          <View style={styles.statusDone}>
            <Icon name="check-circle" size={20} color={COLORS.success} />
          </View>
        ) : (
          <View style={styles.statusPending}>
            <Icon name="chevron-right" size={18} color={COLORS.grey400} />
          </View>
        )}
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
          <Text style={styles.title} numberOfLines={1}>
            {boothDisplay(boothName, lang)}
          </Text>
          <View style={styles.subtitleRow}>
            <Icon name="map-marker" size={11} color={COLORS.grey500} />
            <Text style={styles.subtitle}>{t('assignments_part')} {partNumber}</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={18} color={COLORS.grey400} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={onSearchSubmit}
            placeholder={t('boothVoters_search')}
            placeholderTextColor={COLORS.grey400}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); onSearchSubmit(); }}>
              <Icon name="close-circle" size={16} color={COLORS.grey400} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabsRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.tab, filter === f.key && styles.tabActive]}>
            <Icon name={f.icon} size={14} color={filter === f.key ? COLORS.white : COLORS.grey500} />
            <Text style={[styles.tabText, filter === f.key && styles.tabTextActive]}>{t(f.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={voters}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        onEndReached={() => hasMore && !loading && load()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loading && voters.length > 0 ? <ActivityIndicator style={{ margin: 20 }} color={COLORS.primary} /> : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="account-search-outline" size={38} color={COLORS.grey400} />
              </View>
              <Text style={styles.emptyText}>{t('boothVoters_empty')}</Text>
              <Text style={styles.emptySub}>{t('boothVoters_empty_sub')}</Text>
            </View>
          ) : null
        }
      />
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
  title: { fontSize: 17, fontWeight: '800', color: COLORS.grey800 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  subtitle: { fontSize: 12, color: COLORS.grey500 },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: COLORS.white,
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
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey200,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.grey100,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 12, color: COLORS.grey600, fontWeight: '700' },
  tabTextActive: { color: COLORS.white },
  listContent: { padding: 12, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grey200,
  },
  serialBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serialBoxDone: { backgroundColor: COLORS.success },
  serialText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  voterName: { fontSize: 15, fontWeight: '700', color: COLORS.grey800 },
  voterMetaRow: { flexDirection: 'row', marginTop: 4 },
  genderPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  genderText: { fontSize: 10, fontWeight: '700' },
  voterSub: { fontSize: 11, color: COLORS.grey500, marginTop: 3 },
  epicText: { fontSize: 10, color: COLORS.grey400, marginTop: 2, fontFamily: 'monospace' },
  statusDone: { justifyContent: 'center', alignItems: 'center' },
  statusPending: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.grey100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.grey100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { fontSize: 15, color: COLORS.grey700, fontWeight: '700' },
  emptySub: { fontSize: 12, color: COLORS.grey500 },
});

export default BoothVotersScreen;
