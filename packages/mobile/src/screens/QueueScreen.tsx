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
import { FONTS, RADIUS } from '../utils/theme';
import AppBar from '../components/AppBar';
import Avatar from '../components/Avatar';
import Btn from '../components/Btn';
import Chip from '../components/Chip';
import OfflineStrip from '../components/OfflineStrip';
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
    const status: 'failed' | 'queued' = hasError ? 'failed' : 'queued';
    const statusLabel = hasError ? 'Failed' : 'Queued';
    const statusTone: 'danger' | 'warning' = hasError ? 'danger' : 'warning';

    const initials = item.voterName
      .split(' ')
      .map((s) => s[0]?.toUpperCase())
      .slice(0, 2)
      .join('');

    return (
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <Avatar
            name={initials}
            tone={hasError ? 'muted' : 'indigo'}
            size={36}
            style={{ marginRight: 10 }}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.voterName} numberOfLines={1}>
              {item.voterName}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              {' · try '}
              {item.attempts}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Chip tone={statusTone}>{statusLabel}</Chip>
          </View>
        </View>
        {hasError ? (
          <View style={styles.errorRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.errorEn} numberOfLines={2}>
                {item.lastError}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Btn size="sm" kind="danger" onPress={onFlush}>
                Retry
              </Btn>
              <Btn size="sm" kind="ghost" onPress={() => onDelete(item)}>
                Delete
              </Btn>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
      {!online ? <OfflineStrip queued={queue.length} /> : null}
      <AppBar
        title="Queue"
        hi="क्यू"
        right={
          <View
            style={[
              styles.statusPill,
              { backgroundColor: online ? COLORS.successSoft : COLORS.dangerSoft },
            ]}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: online ? COLORS.success : COLORS.danger },
              ]}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: online ? '#0F4A2D' : '#7A2014' },
              ]}>
              {online ? 'Online' : 'Offline'}
            </Text>
          </View>
        }
      />

      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.summaryNum}>{queue.length}</Text>
          <Text style={styles.summaryLabel}>pending · बाकी</Text>
        </View>
        <Btn
          size="md"
          loading={flushing}
          disabled={queue.length === 0}
          onPress={onFlush}
          icon={<Icon name="sync" size={14} color={COLORS.white} />}>
          Sync now · सिंक
        </Btn>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={
          <RefreshControl refreshing={flushing} onRefresh={onFlush} tintColor={COLORS.indigo} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="cloud-check-outline" size={48} color={COLORS.success} />
            </View>
            <Text style={styles.emptyText}>All caught up</Text>
            <Text style={styles.emptyTextHi}>सब पूरा</Text>
            <Text style={styles.emptySub}>
              Every visit is synced. Capture more — they'll upload immediately.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    marginRight: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusPillText: {
    fontSize: 11,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryNum: {
    fontSize: 22,
    color: COLORS.ink,
    fontFamily: FONTS.monoBold,
    fontWeight: '800',
    lineHeight: 24,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
    marginTop: 2,
  },
  listContent: { paddingHorizontal: 14, paddingBottom: 24 },
  row: {
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.hairlineSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  rowMain: { flexDirection: 'row', alignItems: 'center' },
  voterName: {
    fontSize: 14,
    color: COLORS.ink,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  },
  meta: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.mono,
    marginTop: 2,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorEn: {
    fontSize: 11,
    color: '#7A2014',
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 30,
    gap: 6,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
  },
  emptyTextHi: {
    fontSize: 13,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.hi,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: FONTS.uiMedium,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
});

export default QueueScreen;
