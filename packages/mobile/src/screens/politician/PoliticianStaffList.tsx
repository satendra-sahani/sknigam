/**
 * Politician → My Staff list.
 *
 * Shows every staff member managed by the logged-in politician (server
 * filters by managedBy = self).  Pull-to-refresh, FAB to add new,
 * tap a row to edit or assign.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { COLORS } from '../../utils/constants';
import { FONTS } from '../../utils/theme';
import { fetchMyStaff, ManagedStaff } from '../../services/politicianStaff';
import type { RootStackParamList } from '../../types';

type Nav = StackNavigationProp<RootStackParamList>;

export default function PoliticianStaffList() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<ManagedStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchMyStaff();
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Could not load staff');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload whenever the screen comes into focus so newly created /
  // edited staff show up without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = ({ item }: { item: ManagedStaff }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate('PoliticianStaffForm', { staffId: item._id })
      }
      style={s.row}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{item.name.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.nameRow}>
          <Text style={s.name} numberOfLines={1}>{item.name}</Text>
          {!item.isActive && (
            <View style={s.inactivePill}>
              <Text style={s.inactivePillText}>INACTIVE</Text>
            </View>
          )}
        </View>
        <Text style={s.meta} numberOfLines={1}>
          {item.phone} · {item.email}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('PoliticianStaffAssign', { staffId: item._id })
        }
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={s.assignBtn}>
        <Icon name="map-marker-plus" size={14} color={COLORS.indigo} />
        <Text style={s.assignBtnText}>Assign</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrow-left" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>My Staff</Text>
          <Text style={s.headerSub}>
            {items.length} {items.length === 1 ? 'member' : 'members'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('PoliticianStaffForm', {})}
          style={s.newBtn}>
          <Icon name="plus" size={16} color="#fff" />
          <Text style={s.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.indigo} />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Icon name="alert-circle-outline" size={36} color={COLORS.danger} />
          <Text style={s.errorTitle}>Could not load staff</Text>
          <Text style={s.errorBody}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              load();
            }}
            style={s.retryBtn}>
            <Text style={s.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={s.center}>
          <Icon name="account-multiple-plus-outline" size={36} color={COLORS.muted} />
          <Text style={s.emptyTitle}>No staff yet</Text>
          <Text style={s.emptyBody}>
            Add your first staff member — they&apos;ll be able to sign in to the
            mobile app and you can assign them to booths.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('PoliticianStaffForm', {})}
            style={s.primaryBtn}>
            <Text style={s.primaryBtnText}>Add staff</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={COLORS.indigo}
            />
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairlineSoft,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.uiSemiBold },
  headerSub: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.indigo,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.paper,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.indigoTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: COLORS.indigo },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.ink, flexShrink: 1 },
  meta: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
  inactivePill: {
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  inactivePillText: { fontSize: 9, fontWeight: '700', color: COLORS.danger, letterSpacing: 0.5 },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.indigoTint,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  assignBtnText: { fontSize: 11.5, fontWeight: '700', color: COLORS.indigo },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.ink, marginTop: 6 },
  emptyBody: { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 19, maxWidth: 320 },
  errorTitle: { fontSize: 15, fontWeight: '600', color: COLORS.ink, marginTop: 6 },
  errorBody: { fontSize: 12.5, color: COLORS.muted, textAlign: 'center', maxWidth: 320 },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  retryBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  primaryBtn: {
    marginTop: 10,
    backgroundColor: COLORS.indigo,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

// Silence the unused Alert import linter (kept for future delete-prompt).
void Alert;
