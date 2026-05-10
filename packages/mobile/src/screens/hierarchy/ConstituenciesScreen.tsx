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
import { COLORS } from '../../utils/constants';
import { FONTS, RADIUS } from '../../utils/theme';
import AppBar from '../../components/AppBar';
import type { HierarchyAcRow, RootStackParamList } from '../../types';

interface Props {
  route: RouteProp<RootStackParamList, 'Constituencies'>;
  navigation: StackNavigationProp<RootStackParamList, 'Constituencies'>;
}

const toneOf = (pct: number) => {
  if (pct >= 70) return COLORS.success;
  if (pct >= 20) return COLORS.brass;
  return COLORS.danger;
};

const ConstituenciesScreen: React.FC<Props> = ({ route, navigation }) => {
  const { district } = route.params;
  const { t } = useI18n();
  const [rows, setRows] = useState<HierarchyAcRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await api.get('/analytics/hierarchy/constituencies', {
          params: { district },
        });
        setRows(res.data.data);
      } catch (err: any) {
        Alert.alert(t('error'), err.response?.data?.error || t('constituencies_load_failed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [district, t],
  );

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', () => load(true));
    return unsub;
  }, [load, navigation]);

  const filtered = rows.filter((r) =>
    r.assemblyConstituency.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function renderItem({ item }: { item: HierarchyAcRow }) {
    const pct = item.totalVoters > 0 ? Math.round((item.verified / item.totalVoters) * 100) : 0;
    const tone = toneOf(pct);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('BoothsInAc', {
            district,
            assemblyConstituency: item.assemblyConstituency,
          })
        }
        style={styles.row}>
        <View style={[styles.toneBar, { backgroundColor: tone }]} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.assemblyConstituency}
          </Text>
          <Text style={styles.rowMeta}>
            {item.booths.toLocaleString('en-IN')} booths ·{' '}
            {item.totalVoters.toLocaleString('en-IN')} voters
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', minWidth: 64 }}>
          <Text style={[styles.rowPct, { color: tone }]}>{pct}%</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
      <AppBar
        title={`${district} — constituencies`}
        hi={`${district} · ${rows.length} ACs`}
        back
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={16} color={COLORS.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search · खोजें"
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
          keyExtractor={(item) => item.assemblyConstituency}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.indigo} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="vote-outline" size={38} color={COLORS.indigoDeep} />
              </View>
              <Text style={styles.emptyText}>No constituencies found</Text>
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toneBar: { width: 4, height: 32, borderRadius: 2, marginRight: 12 },
  rowName: { fontSize: 14, color: COLORS.ink, fontFamily: FONTS.uiSemiBold, fontWeight: '600' },
  rowMeta: { fontSize: 11, color: COLORS.muted, fontFamily: FONTS.mono, marginTop: 2 },
  rowPct: { fontSize: 16, fontFamily: FONTS.monoBold, fontWeight: '700' },
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

export default ConstituenciesScreen;
