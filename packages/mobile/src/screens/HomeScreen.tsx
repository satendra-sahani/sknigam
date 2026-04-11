import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { COLORS, SLOT_TIMES } from '../utils/constants';
import { getTodayDateString, getSlotStatusLabel } from '../utils/helpers';
import { AssignmentInfo, VoterCountData, CheckInData, NotificationData } from '../types';
import CountdownTimer from '../components/CountdownTimer';
import StatusBadge from '../components/StatusBadge';
import { getQueueCount } from '../services/offlineQueue';

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [checkIn, setCheckIn] = useState<CheckInData | null>(null);
  const [submissions, setSubmissions] = useState<VoterCountData[]>([]);
  const [latestNotification, setLatestNotification] = useState<NotificationData | null>(null);
  const [offlineCount, setOfflineCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [assignmentRes, checkInRes, submissionsRes, notifRes] =
        await Promise.allSettled([
          api.get('/assignments/my'),
          api.get('/check-ins/today'),
          api.get(`/voter-counts/my?date=${getTodayDateString()}`),
          api.get('/notifications?limit=1'),
        ]);

      if (assignmentRes.status === 'fulfilled') {
        setAssignment(assignmentRes.value.data.data);
      }
      if (checkInRes.status === 'fulfilled') {
        setCheckIn(checkInRes.value.data.data);
      }
      if (submissionsRes.status === 'fulfilled') {
        setSubmissions(submissionsRes.value.data.data || []);
      }
      if (notifRes.status === 'fulfilled') {
        const payload = notifRes.value.data.data;
        const notifs = payload?.notifications || payload || [];
        if (Array.isArray(notifs) && notifs.length > 0) {
          setLatestNotification(notifs[0]);
        }
      }

      const queueCount = await getQueueCount();
      setOfflineCount(queueCount);
    } catch (error) {
      console.log('[Home] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getSlotSubmission = (slotKey: string): VoterCountData | undefined => {
    return submissions.find((s) => s.slot === slotKey);
  };

  const getSlotCircleColor = (slotKey: string): string => {
    const sub = getSlotSubmission(slotKey);
    if (!sub) return COLORS.grey300;
    switch (sub.status) {
      case 'approved':
        return COLORS.success;
      case 'pending':
        return COLORS.primary;
      case 'rejected':
      case 'revision_requested':
        return COLORS.danger;
      default:
        return COLORS.grey300;
    }
  };

  const totalSubmittedVoters = submissions.reduce(
    (sum, s) => sum + s.totalVoters,
    0,
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
        />
      }>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Staff'}</Text>
        </View>
        <View style={styles.headerActions}>
          {offlineCount > 0 && (
            <View style={styles.syncBadge}>
              <Icon name="cloud-upload" size={16} color={COLORS.warning} />
              <Text style={styles.syncCount}>{offlineCount}</Text>
            </View>
          )}
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Icon name="logout" size={22} color={COLORS.grey500} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Booth Card */}
      {assignment ? (
        <View style={styles.boothCard}>
          <View style={styles.boothHeader}>
            <Icon name="map-marker" size={22} color={COLORS.primary} />
            <Text style={styles.boothTitle}>My Booth</Text>
          </View>
          <Text style={styles.boothName}>{assignment.booth.name}</Text>
          <View style={styles.boothDetails}>
            <View style={styles.boothDetailItem}>
              <Text style={styles.boothDetailLabel}>Part No.</Text>
              <Text style={styles.boothDetailValue}>
                {assignment.booth.partNumber}
              </Text>
            </View>
            <View style={styles.boothDetailItem}>
              <Text style={styles.boothDetailLabel}>Zone</Text>
              <Text style={styles.boothDetailValue}>
                {assignment.booth.zone}
              </Text>
            </View>
            <View style={styles.boothDetailItem}>
              <Text style={styles.boothDetailLabel}>Voters</Text>
              <Text style={styles.boothDetailValue}>
                {assignment.booth.totalRegisteredVoters}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.noAssignmentCard}>
          <Icon name="alert-circle-outline" size={32} color={COLORS.warning} />
          <Text style={styles.noAssignmentText}>
            No booth assigned. Contact your zone in-charge.
          </Text>
        </View>
      )}

      {/* Check-In Status */}
      <View style={styles.checkInCard}>
        <View style={styles.checkInRow}>
          <View style={styles.checkInInfo}>
            <Text style={styles.sectionTitle}>Check-In Status</Text>
            {checkIn ? (
              <Text style={styles.checkInTime}>
                Checked in at{' '}
                {new Date(checkIn.checkedInAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            ) : (
              <Text style={styles.pendingText}>Not yet checked in</Text>
            )}
          </View>
          <View
            style={[
              styles.checkInStatusIcon,
              {
                backgroundColor: checkIn
                  ? COLORS.successLight
                  : COLORS.dangerLight,
              },
            ]}>
            <Icon
              name={checkIn ? 'check-circle' : 'close-circle'}
              size={28}
              color={checkIn ? COLORS.success : COLORS.danger}
            />
          </View>
        </View>
      </View>

      {/* Countdown Timer */}
      <CountdownTimer />

      {/* Slot Progress */}
      <View style={styles.slotProgressSection}>
        <Text style={styles.sectionTitle}>Slot Progress</Text>
        <View style={styles.slotCircles}>
          {SLOT_TIMES.map((slot, index) => (
            <View key={slot.key} style={styles.slotCircleWrapper}>
              <View
                style={[
                  styles.slotCircle,
                  { backgroundColor: getSlotCircleColor(slot.key) },
                ]}>
                <Text style={styles.slotCircleNumber}>{index + 1}</Text>
              </View>
              <Text style={styles.slotCircleLabel}>{slot.label}</Text>
              <Text style={styles.slotCircleStatus}>
                {getSlotStatusLabel(getSlotSubmission(slot.key)?.status)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Today's Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Icon name="chart-bar" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Today's Summary</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{submissions.length}</Text>
            <Text style={styles.summaryLabel}>Slots Submitted</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{totalSubmittedVoters}</Text>
            <Text style={styles.summaryLabel}>Total Voters</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {submissions.filter((s) => s.status === 'approved').length}
            </Text>
            <Text style={styles.summaryLabel}>Approved</Text>
          </View>
        </View>
      </View>

      {/* Latest Notification */}
      {latestNotification && (
        <TouchableOpacity
          style={styles.notifCard}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.7}>
          <View style={styles.notifHeader}>
            <Icon name="bell-outline" size={18} color={COLORS.primary} />
            <Text style={styles.notifHeaderText}>Latest Notification</Text>
            <Icon name="chevron-right" size={18} color={COLORS.grey400} />
          </View>
          <Text style={styles.notifTitle} numberOfLines={1}>
            {latestNotification.title}
          </Text>
          <Text style={styles.notifMessage} numberOfLines={2}>
            {latestNotification.message}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.grey500,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.grey800,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  syncCount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.warning,
  },
  logoutBtn: {
    padding: 4,
  },
  boothCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  boothHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  boothTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  boothName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.grey800,
    marginBottom: 14,
  },
  boothDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.grey100,
    borderRadius: 10,
    padding: 12,
  },
  boothDetailItem: {
    alignItems: 'center',
  },
  boothDetailLabel: {
    fontSize: 11,
    color: COLORS.grey500,
    marginBottom: 4,
    fontWeight: '500',
  },
  boothDetailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.grey700,
  },
  noAssignmentCard: {
    backgroundColor: COLORS.warningLight,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  noAssignmentText: {
    fontSize: 14,
    color: COLORS.grey600,
    textAlign: 'center',
  },
  checkInCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  checkInRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkInInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.grey700,
    marginBottom: 4,
  },
  checkInTime: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '500',
  },
  pendingText: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '500',
  },
  checkInStatusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotProgressSection: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  slotCircles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  slotCircleWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  slotCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  slotCircleNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  slotCircleLabel: {
    fontSize: 10,
    color: COLORS.grey500,
    fontWeight: '500',
  },
  slotCircleStatus: {
    fontSize: 9,
    color: COLORS.grey400,
    marginTop: 2,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.grey200,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.grey800,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.grey500,
    marginTop: 2,
    fontWeight: '500',
  },
  notifCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  notifHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.grey800,
    marginBottom: 4,
  },
  notifMessage: {
    fontSize: 13,
    color: COLORS.grey500,
    lineHeight: 18,
  },
});

export default HomeScreen;
