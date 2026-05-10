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
import { FONTS, RADIUS } from '../../utils/theme';
import AppBar from '../../components/AppBar';
import Progress from '../../components/Progress';
import type { HierarchyBoothRow, RootStackParamList } from '../../types';

interface Props {
  route: RouteProp<RootStackParamList, 'BoothsInAc'>;
  navigation: StackNavigationProp<RootStackParamList, 'BoothsInAc'>;
}

const toneOf = (pct: number) => {
  if (pct >= 70) return COLORS.success;
  if (pct >= 20) return COLORS.brass;
  return COLORS.danger;
};

const BoothsInAcScreen: React.FC<Props> = ({ route, navigation }) => {
  const { district, assemblyConstituency } = route.params;
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<HierarchyBoothRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(
    async (isRefresh = false) => {
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
    },
    [district, assemblyConstituency, t],
  );

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

  function renderItem({ item }: { item: HierarchyBoothRow }) {
    const pct = item.totalVoters > 0 ? Math.round((item.verified / item.totalVoters) * 100) : 0;
    const tone = toneOf(pct);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('BoothVoters', {
            boothId: item._id,
            boothName: item.name,
            partNumber: item.partNumber,
          })
        }
        style={styles.row}>
        <View style={styles.partBadge}>
          <Text style={styles.partNum}>{item.partNumber}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>
            {boothDisplay(item.name, lang)}
          </Text>
          <View style={{ marginTop: 6 }}>
            <Progress value={pct} tone={pct >= 70 ? 'success' : 'brass'} height={4} />
          </View>
        </View>
        <Text style={[styles.pct, { color: tone }]}>{pct}%</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
      <AppBar
        title={`${assemblyConstituency} — booths`}
        hi={`${assemblyConstituency} · ${rows.length} बूथ`}
        back
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={16} color={COLORS.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by part #, name · पार्ट # या नाम"
            placeholderTextColor={COLORS.muted}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={16} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && rows.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.indigo} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.indigo} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="map-search-outline" size={38} color={COLORS.indigoDeep} />
              </View>
              <Text style={styles.emptyText}>No booths found</Text>
            </View>
          }
        />
      )}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 24 },
  row: {
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.hairlineSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  partBadge: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  partNum: {
    fontSize: 13,
    color: COLORS.ink,
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
  },
  name: { fontSize: 13, color: COLORS.ink, fontFamily: FONTS.uiSemiBold, fontWeight: '600' },
  pct: {
    fontSize: 13,
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
    width: 44,
    textAlign: 'right',
    marginLeft: 8,
  },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: { fontSize: 15, color: COLORS.ink, fontFamily: FONTS.uiBold, fontWeight: '700' },
});

export default BoothsInAcScreen;
