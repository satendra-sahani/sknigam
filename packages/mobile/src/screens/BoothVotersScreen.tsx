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
import { FONTS, RADIUS } from '../utils/theme';
import AppBar from '../components/AppBar';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
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
  { key: 'all' as const, en: 'All', hi: 'सभी' },
  { key: 'pending' as const, en: 'Pending', hi: 'बाकी' },
  { key: 'verified' as const, en: 'Done', hi: 'पूर्ण' },
];

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
  const [counts, setCounts] = useState({ all: 0, pending: 0, done: 0 });

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

        if (reset) {
          if (filter === 'all') setCounts((c) => ({ ...c, all: pagination.total }));
          if (filter === 'pending') setCounts((c) => ({ ...c, pending: pagination.total }));
          if (filter === 'verified') setCounts((c) => ({ ...c, done: pagination.total }));
        }
      } catch (err: any) {
        Alert.alert(t('error'), err.response?.data?.error || t('boothVoters_load_failed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [boothId, page, search, filter, loading, t],
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
    const displayName = lang === 'hi' ? item.fullNameHi || item.fullName : item.fullName;
    const displayFather =
      lang === 'hi' ? item.fatherOrHusbandNameHi || item.fatherOrHusbandName : item.fatherOrHusbandName;
    const isDone = item.verificationStatus;
    const initials = displayName
      .split(' ')
      .map((w) => w[0]?.toUpperCase())
      .slice(0, 2)
      .join('');

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('VoterVisit', { voterId: item._id })}
        style={styles.row}>
        <Text style={styles.serial}>
          {String(item.voterSerialNumber).padStart(3, '0')}
        </Text>
        <Avatar
          name={initials}
          tone={isDone ? 'success' : 'indigo'}
          size={36}
          style={{ marginRight: 10 }}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={{ marginLeft: 6 }}>
              <Chip tone="neutral">
                {item.gender} · {item.age}
              </Chip>
            </View>
          </View>
          <Text style={styles.nameHi} numberOfLines={1}>
            {displayFather}
          </Text>
          <Text style={styles.epic} numberOfLines={1}>
            {item.epicNumber}
          </Text>
        </View>
        <View style={{ marginLeft: 8 }}>
          <Chip tone={isDone ? 'success' : 'neutral'}>{isDone ? 'Done' : 'Pending'}</Chip>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
      <AppBar
        title={`${boothDisplay(boothName, lang)}`}
        hi={`बूथ ${partNumber} · मतदाता`}
        back
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={16} color={COLORS.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={onSearchSubmit}
            placeholder="Search name, EPIC, serial · नाम / ईपीआईसी"
            placeholderTextColor={COLORS.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                onSearchSubmit();
              }}>
              <Icon name="close-circle" size={16} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabsRow}>
        {filters.map((f) => {
          const active = filter === f.key;
          const count = f.key === 'all' ? counts.all : f.key === 'pending' ? counts.pending : counts.done;
          return (
            <TouchableOpacity
              key={f.key}
              activeOpacity={0.85}
              onPress={() => setFilter(f.key)}
              style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{f.en}</Text>
              {count > 0 ? (
                <Text style={[styles.tabCount, active && styles.tabCountActive]}> {count}</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={voters}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.indigo} />
        }
        onEndReached={() => hasMore && !loading && load()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loading && voters.length > 0 ? (
            <ActivityIndicator style={{ margin: 20 }} color={COLORS.indigo} />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="account-search-outline" size={38} color={COLORS.indigoDeep} />
              </View>
              <Text style={styles.emptyText}>No voters found</Text>
              <Text style={styles.emptySub}>Try changing the filter or search.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  searchWrap: { paddingHorizontal: 14, paddingVertical: 10 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 14,
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.ink,
    fontFamily: FONTS.uiMedium,
    fontWeight: '500',
    padding: 0,
    marginLeft: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 6,
  },
  tab: {
    flex: 1,
    height: 36,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  tabActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  tabText: {
    fontSize: 12,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  },
  tabTextActive: { color: COLORS.white },
  tabCount: {
    fontSize: 12,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.monoMedium,
    opacity: 0.8,
  },
  tabCountActive: { color: COLORS.white, opacity: 0.8 },
  listContent: { paddingHorizontal: 14, paddingBottom: 24 },
  row: {
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.hairlineSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serial: {
    width: 32,
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: FONTS.monoSemiBold,
    fontWeight: '600',
  },
  name: {
    fontSize: 13,
    color: COLORS.ink,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
    flexShrink: 1,
  },
  nameHi: {
    fontSize: 11,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.hi,
    marginTop: 1,
  },
  epic: {
    fontSize: 10,
    color: COLORS.muted,
    fontFamily: FONTS.mono,
    marginTop: 3,
  },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: FONTS.uiMedium,
    fontWeight: '500',
  },
});

export default BoothVotersScreen;
