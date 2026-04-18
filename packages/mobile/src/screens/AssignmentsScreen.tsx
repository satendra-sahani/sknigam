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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import api from '../services/api';
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
      Alert.alert('Error', err.response?.data?.error || 'Failed to load assignments');
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

  function renderItem({ item }: { item: Assignment }) {
    const booth = typeof item.boothId === 'object' ? item.boothId : null;
    const pct = item.totalVoters > 0 ? Math.round((item.completedCount / item.totalVoters) * 100) : 0;
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
          <View style={styles.partBadge}>
            <Text style={styles.partNum}>{booth?.partNumber ?? '—'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.boothName} numberOfLines={1}>
              {booth?.name || 'Unknown booth'}
            </Text>
            <Text style={styles.boothMeta} numberOfLines={1}>
              {booth?.assemblyConstituency}
              {booth?.village ? ` · ${booth.village}` : ''}
            </Text>
          </View>
          <Icon name="chevron-right" size={22} color={COLORS.grey400} />
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {item.completedCount} / {item.totalVoters}
          </Text>
        </View>
        {(item.voterSerialFrom || item.voterSerialTo) && (
          <Text style={styles.rangeText}>
            Serial {item.voterSerialFrom ?? '1'} – {item.voterSerialTo ?? '∞'}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Assignments</Text>
        <Text style={styles.subtitle}>{assignments.length} active</Text>
      </View>
      {loading && assignments.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="clipboard-text-off" size={48} color={COLORS.grey300} />
              <Text style={styles.emptyText}>No assignments yet</Text>
              <Text style={styles.emptySub}>
                Ask your admin to assign a booth. Pull down to refresh.
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
    padding: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey200,
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.grey800 },
  subtitle: { fontSize: 12, color: COLORS.grey500, marginTop: 2 },
  listContent: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  partBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partNum: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  boothName: { fontSize: 15, fontWeight: '700', color: COLORS.grey800 },
  boothMeta: { fontSize: 12, color: COLORS.grey500, marginTop: 2 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.grey200,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.primary },
  progressText: { fontSize: 12, color: COLORS.grey600, fontWeight: '600' },
  rangeText: { fontSize: 11, color: COLORS.grey500, marginTop: 6 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, color: COLORS.grey600, fontWeight: '600' },
  emptySub: { fontSize: 12, color: COLORS.grey400, textAlign: 'center', paddingHorizontal: 40 },
});

export default AssignmentsScreen;
