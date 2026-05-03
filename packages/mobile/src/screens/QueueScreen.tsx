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
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NetInfo from '@react-native-community/netinfo';
import { subscribe, flushQueue, removeFromQueue } from '../services/visitQueue';
import { useI18n } from '../i18n';
import { COLORS } from '../utils/constants';
import type { QueuedVisit } from '../types';

const QueueScreen: React.FC = () => {
  const { t } = useI18n();
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
        Alert.alert(
          t('queue_synced_title'),
          res.flushed === 1 ? t('queue_synced_one') : t('queue_synced_many', { n: res.flushed }),
        );
      } else if (!online) {
        Alert.alert(t('queue_offline_title'), t('queue_offline_body'));
      } else if (res.remaining > 0) {
        Alert.alert(t('queue_pending_title'), t('queue_pending_body'));
      } else {
        Alert.alert(t('queue_all_clear_title'), t('queue_all_clear_body'));
      }
    } finally {
      setFlushing(false);
    }
  }

  function onDelete(item: QueuedVisit) {
    Alert.alert(t('queue_delete_title'), t('queue_delete_body', { name: item.voterName }), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('queue_delete_btn'), style: 'destructive', onPress: () => removeFromQueue(item.id) },
    ]);
  }

  function renderItem({ item }: { item: QueuedVisit }) {
    const hasError = !!item.lastError;
    const tone = hasError ? COLORS.danger : COLORS.accent;
    const toneLight = hasError ? COLORS.dangerLight : COLORS.accentLight;
    return (
      <View style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: toneLight }]}>
          <Icon name={hasError ? 'alert-circle' : 'cloud-upload-outline'} size={22} color={tone} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.voterName}>{item.voterName}</Text>
          <Text style={styles.meta}>
            {new Date(item.createdAt).toLocaleString()} · {item.attempts === 1 ? t('queue_try_one') : t('queue_try_many', { n: item.attempts })}
          </Text>
          {hasError && (
            <View style={styles.errorBox}>
              <Icon name="alert" size={11} color={COLORS.danger} />
              <Text style={styles.errorText} numberOfLines={2}>
                {item.lastError}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => onDelete(item)} style={styles.deleteBtn}>
          <Icon name="trash-can-outline" size={18} color={COLORS.grey500} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('queue_title')}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: online ? COLORS.success : COLORS.grey400 }]} />
            <Text style={styles.subtitle}>
              {queue.length === 1
                ? t('queue_status_one', { state: online ? t('queue_online') : t('queue_offline') })
                : t('queue_status_many', { n: queue.length, state: online ? t('queue_online') : t('queue_offline') })}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onFlush}
          disabled={flushing || queue.length === 0}
          style={[styles.flushBtn, (flushing || queue.length === 0) && { opacity: 0.4 }]}>
          {flushing ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <>
              <Icon name="sync" size={16} color={COLORS.white} />
              <Text style={styles.flushBtnText}>{t('queue_sync_now')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {!online && queue.length > 0 && (
        <View style={styles.offlineBanner}>
          <Icon name="wifi-off" size={16} color={COLORS.warning} />
          <Text style={styles.offlineText}>{t('queue_offline_banner')}</Text>
        </View>
      )}

      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={flushing} onRefresh={onFlush} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: COLORS.successLight }]}>
              <Icon name="cloud-check-outline" size={42} color={COLORS.success} />
            </View>
            <Text style={styles.emptyText}>{t('queue_empty')}</Text>
            <Text style={styles.emptySub}>{t('queue_empty_sub')}</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey200,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.grey800 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  subtitle: { fontSize: 12, color: COLORS.grey500, fontWeight: '600' },
  flushBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  flushBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.warningLight,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  offlineText: { flex: 1, fontSize: 12, color: COLORS.grey700, fontWeight: '600' },
  listContent: { padding: 16, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.grey200,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voterName: { fontSize: 15, fontWeight: '700', color: COLORS.grey800 },
  meta: { fontSize: 12, color: COLORS.grey500, marginTop: 3 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 6,
    padding: 6,
    backgroundColor: COLORS.dangerLight,
    borderRadius: 6,
  },
  errorText: { flex: 1, fontSize: 11, color: COLORS.danger, fontWeight: '600' },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.grey100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 80, gap: 14, paddingHorizontal: 40 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { fontSize: 16, color: COLORS.grey800, fontWeight: '700' },
  emptySub: { fontSize: 13, color: COLORS.grey500, textAlign: 'center', lineHeight: 18 },
});

export default QueueScreen;
