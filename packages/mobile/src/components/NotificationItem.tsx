import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/constants';
import { NotificationData } from '../types';
import { formatRelativeTime } from '../utils/helpers';

interface NotificationItemProps {
  notification: NotificationData;
  userId: string;
  onPress: (notification: NotificationData) => void;
  onQuickReply?: (notificationId: string, reply: string) => void;
}

const getTypeConfig = (type: string) => {
  switch (type) {
    case 'urgent':
      return {
        icon: 'alert-circle',
        color: COLORS.danger,
        bg: COLORS.dangerLight,
        label: 'Urgent',
      };
    case 'zone_broadcast':
      return {
        icon: 'bullhorn',
        color: COLORS.primary,
        bg: COLORS.primaryLight,
        label: 'Broadcast',
      };
    case 'report_update':
      return {
        icon: 'file-check',
        color: COLORS.success,
        bg: COLORS.successLight,
        label: 'Report',
      };
    case 'incident_update':
      return {
        icon: 'alert-outline',
        color: COLORS.warning,
        bg: COLORS.warningLight,
        label: 'Incident',
      };
    case 'system':
    default:
      return {
        icon: 'information',
        color: COLORS.grey600,
        bg: COLORS.grey200,
        label: 'System',
      };
  }
};

const QUICK_REPLIES = ['Acknowledged', 'Need Assistance', 'Issue at Booth'];

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  userId,
  onPress,
  onQuickReply,
}) => {
  const isRead = notification.readBy.includes(userId);
  const typeConfig = getTypeConfig(notification.type);
  const isZoneBroadcast = notification.type === 'zone_broadcast';

  return (
    <TouchableOpacity
      style={[styles.container, !isRead && styles.unreadContainer]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}>
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: typeConfig.bg }]}>
          <Icon name={typeConfig.icon} size={20} color={typeConfig.color} />
        </View>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.title, !isRead && styles.unreadTitle]}
              numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={styles.time}>
              {formatRelativeTime(notification.createdAt)}
            </Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
          <View style={styles.footer}>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: typeConfig.bg },
              ]}>
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: typeConfig.color },
                ]}>
                {typeConfig.label}
              </Text>
            </View>
            {!isRead && <View style={styles.unreadDot} />}
          </View>
        </View>
      </View>

      {isZoneBroadcast && onQuickReply && (
        <View style={styles.quickReplies}>
          {QUICK_REPLIES.map((reply) => (
            <TouchableOpacity
              key={reply}
              style={styles.quickReplyBtn}
              onPress={() => onQuickReply(notification._id, reply)}>
              <Text style={styles.quickReplyText}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  unreadContainer: {
    backgroundColor: COLORS.blue50,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.grey700,
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
    color: COLORS.grey800,
  },
  time: {
    fontSize: 12,
    color: COLORS.grey400,
  },
  message: {
    fontSize: 13,
    color: COLORS.grey500,
    lineHeight: 18,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  quickReplies: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.grey200,
  },
  quickReplyBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  quickReplyText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default NotificationItem;
