import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NetInfo from '@react-native-community/netinfo';
import { subscribe, flushQueue, removeFromQueue } from '../services/visitQueue';
import { COLORS } from '../utils/constants';
import type { QueuedVisit } from '../types';

const QueueScreen: React.FC = () => {
  const [queue, setQueue] = useState<QueuedVisit[]>([]);
  const [flushing, setFlushing] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = subscribe(setQueue);
    const net = NetInfo.addEventListener((state) => setOnline(!!state.isConnected));
    NetInfo.fetch().then((s) => setOnline(!!s.isConnected));
    return () => {
      unsub();
      net();
    };
  }, []);

  async function onFlush() {
    setFlushing(true);
    try {
      const res = await flushQueue();
      if (res.flushed > 0) {
        Alert.alert('Synced', `${res.flushed} visit${res.flushed > 1 ? 's' : ''} uploaded.`);
      } else if (!online) {
        Alert.alert('Offline', 'No internet. The queue will sync when online.');
      } else if (res.remaining > 0) {
        Alert.alert('Still pending', 'Some items could not be submitted. Check errors.');
      } else {
        Alert.alert('All clear', 'Nothing to sync.');
      }
    } finally {
      setFlushing(false);
    }
  }

  function onDelete(item: QueuedVisit) {
    Alert.alert('Delete queued visit?', `Discard the saved visit for ${item.voterName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeFromQueue(item.id) },
    ]);
  }

  function renderItem({ item }: { item: QueuedVisit }) {
    return (
      <View style={styles.row}>
        <View style={styles.rowIcon}>
          <Icon
            name={item.lastError ? 'alert-circle' : 'cloud-upload-outline'}
            size={22}
            color={item.lastError ? COLORS.danger : COLORS.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.voterName}>{item.voterName}</Text>
          <Text style={styles.meta}>
            Queued {new Date(item.createdAt).toLocaleString()} · {item.attempts} tries
          </Text>
          {item.lastError && <Text style={styles.error}>{item.lastError}</Text>}
        </View>
        <TouchableOpacity onPress={() => onDelete(item)} style={styles.deleteBtn}>
          <Icon name="trash-can-outline" size={20} color={COLORS.grey500} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sync Queue</Text>
          <Text style={styles.subtitle}>
            {queue.length} pending · {online ? 'online' : 'offline'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onFlush}
          disabled={flushing || queue.length === 0}
          style={[styles.flushBtn, (flushing || queue.length === 0) && { opacity: 0.5 }]}>
          {flushing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Icon name="sync" size={16} color={COLORS.white} />
              <Text style={styles.flushBtnText}>Sync now</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={<RefreshControl refreshing={flushing} onRefresh={onFlush} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="cloud-check" size={48} color={COLORS.grey300} />
            <Text style={styles.emptyText}>All visits synced</Text>
          </View>
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
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey200,
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.grey800 },
  subtitle: { fontSize: 12, color: COLORS.grey500, marginTop: 2 },
  flushBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  flushBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: COLORS.white,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.grey100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voterName: { fontSize: 14, fontWeight: '700', color: COLORS.grey800 },
  meta: { fontSize: 12, color: COLORS.grey500, marginTop: 2 },
  error: { fontSize: 11, color: COLORS.danger, marginTop: 2 },
  deleteBtn: { padding: 6 },
  sep: { height: 1, backgroundColor: COLORS.grey100 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.grey500 },
});

export default QueueScreen;
