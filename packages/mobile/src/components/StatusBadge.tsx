import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'small',
}) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'approved':
      case 'resolved':
        return {
          bg: COLORS.successLight,
          text: COLORS.success,
          label: status === 'resolved' ? 'Resolved' : 'Approved',
        };
      case 'rejected':
        return {
          bg: COLORS.dangerLight,
          text: COLORS.danger,
          label: 'Rejected',
        };
      case 'revision_requested':
        return {
          bg: COLORS.warningLight,
          text: COLORS.warning,
          label: 'Revision',
        };
      case 'pending':
        return {
          bg: COLORS.warningLight,
          text: COLORS.warning,
          label: 'Pending',
        };
      case 'open':
        return {
          bg: COLORS.dangerLight,
          text: COLORS.danger,
          label: 'Open',
        };
      case 'acknowledged':
        return {
          bg: COLORS.primaryLight,
          text: COLORS.primary,
          label: 'Acknowledged',
        };
      default:
        return {
          bg: COLORS.grey200,
          text: COLORS.grey600,
          label: status,
        };
    }
  };

  const statusStyle = getStatusStyle();
  const isMedium = size === 'medium';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: statusStyle.bg },
        isMedium && styles.badgeMedium,
      ]}>
      <Text
        style={[
          styles.text,
          { color: statusStyle.text },
          isMedium && styles.textMedium,
        ]}>
        {statusStyle.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeMedium: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textMedium: {
    fontSize: 13,
  },
});

export default StatusBadge;
