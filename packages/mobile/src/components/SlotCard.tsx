import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/constants';
import { VoterCountData } from '../types';
import StatusBadge from './StatusBadge';

interface SlotCardProps {
  slotKey: string;
  slotLabel: string;
  isActive: boolean;
  isPast: boolean;
  isFuture: boolean;
  submission?: VoterCountData;
  onPress?: () => void;
}

const SlotCard: React.FC<SlotCardProps> = ({
  slotKey,
  slotLabel,
  isActive,
  isPast,
  isFuture,
  submission,
  onPress,
}) => {
  const getStatusColor = (): string => {
    if (!submission) return COLORS.grey300;
    switch (submission.status) {
      case 'approved':
        return COLORS.success;
      case 'rejected':
      case 'revision_requested':
        return COLORS.danger;
      case 'pending':
        return COLORS.warning;
      default:
        return COLORS.grey300;
    }
  };

  const getStatusIcon = (): string => {
    if (!submission) return 'circle-outline';
    switch (submission.status) {
      case 'approved':
        return 'check-circle';
      case 'rejected':
        return 'close-circle';
      case 'revision_requested':
        return 'alert-circle';
      case 'pending':
        return 'clock-outline';
      default:
        return 'circle-outline';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isActive && styles.activeContainer,
        isFuture && styles.futureContainer,
      ]}
      onPress={onPress}
      disabled={isFuture}
      activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.slotInfo}>
          <Icon
            name={getStatusIcon()}
            size={24}
            color={getStatusColor()}
          />
          <Text style={[styles.slotTime, isActive && styles.activeText]}>
            {slotLabel}
          </Text>
        </View>
        {isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        )}
        {isFuture && (
          <View style={styles.lockedBadge}>
            <Icon name="lock" size={14} color={COLORS.grey500} />
            <Text style={styles.lockedText}>Not yet</Text>
          </View>
        )}
        {submission && <StatusBadge status={submission.status} />}
      </View>

      {submission && (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Voters:</Text>
            <Text style={styles.detailValue}>{submission.totalVoters}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              M: {submission.maleCount} | F: {submission.femaleCount} | O:{' '}
              {submission.otherCount}
            </Text>
          </View>
          {submission.rejectionReason && (
            <View style={styles.rejectionBox}>
              <Icon name="alert" size={16} color={COLORS.danger} />
              <Text style={styles.rejectionText}>
                {submission.rejectionReason}
              </Text>
            </View>
          )}
        </View>
      )}

      {isActive && !submission && (
        <View style={styles.tapHint}>
          <Icon name="gesture-tap" size={18} color={COLORS.primary} />
          <Text style={styles.tapHintText}>Tap to submit count</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  activeContainer: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.blue50,
  },
  futureContainer: {
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  slotTime: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.grey700,
    marginLeft: 10,
  },
  activeText: {
    color: COLORS.primary,
  },
  activeBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockedText: {
    color: COLORS.grey500,
    fontSize: 12,
  },
  details: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.grey200,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.grey600,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.grey800,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  rejectionText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.danger,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  tapHintText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default SlotCard;
