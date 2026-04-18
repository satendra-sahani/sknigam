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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import api from '../services/api';
import { COLORS } from '../utils/constants';
import type { RootStackParamList } from '../types';

interface VoterRow {
  _id: string;
  voterSerialNumber: number;
  epicNumber: string;
  fullName: string;
  fatherOrHusbandName: string;
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
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Done' },
] as const;

type FilterKey = (typeof filters)[number]['key'];

const BoothVotersScreen: React.FC<Props> = ({ route, navigation }) => {
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
        Alert.alert('Error', err.response?.data?.error || 'Failed to load voters');
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
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('VoterVisit', { voterId: item._id })}
        style={styles.row}>
        <View style={styles.serialBox}>
          <Text style={styles.serialText}>{item.voterSerialNumber}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.voterName} numberOfLines={1}>
            {item.fullName}
          </Text>
          <Text style={styles.voterMeta} numberOfLines={1}>
            {item.gender} · {item.age}y · {item.fatherOrHusbandName}
          </Text>
          <Text style={styles.epicText}>{item.epicNumber}</Text>
        </View>
        {item.verificationStatus ? (
          <Icon name="check-circle" size={22} color={COLORS.success} />
        ) : (
          <Icon name="clock-outline" size={22} color={COLORS.grey400} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={COLORS.grey700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{boothName}</Text>
          <Text style={styles.subtitle}>Part {partNumber}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={18} color={COLORS.grey400} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={onSearchSubmit}
            placeholder="Name, EPIC, serial"
            placeholderTextColor={COLORS.grey400}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.tabsRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.tab, filter === f.key && styles.tabActive]}>
            <Text style={[styles.tabText, filter === f.key && styles.tabTextActive]}>{f.label}</Text>
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
        ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 16 }} color={COLORS.primary} /> : null}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Icon name="account-search-outline" size={42} color={COLORS.grey300} />
              <Text style={styles.emptyText}>No voters found</Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
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
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey200,
  },
  backBtn: { padding: 6 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.grey800 },
  subtitle: { fontSize: 12, color: COLORS.grey500 },
  filterRow: {
    padding: 12,
    paddingBottom: 8,
    backgroundColor: COLORS.white,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.grey100,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.grey800, padding: 0 },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey200,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.grey100,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 12, color: COLORS.grey600, fontWeight: '600' },
  tabTextActive: { color: COLORS.white },
  listContent: { paddingVertical: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    padding: 12,
  },
  sep: { height: 1, backgroundColor: COLORS.grey100 },
  serialBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serialText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  voterName: { fontSize: 15, fontWeight: '700', color: COLORS.grey800 },
  voterMeta: { fontSize: 12, color: COLORS.grey500, marginTop: 2 },
  epicText: { fontSize: 11, color: COLORS.grey400, marginTop: 2, fontFamily: 'monospace' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.grey500 },
});

export default BoothVotersScreen;
