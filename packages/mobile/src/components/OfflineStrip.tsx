import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/constants';
import { FONTS } from '../utils/theme';

export interface OfflineStripProps {
  queued?: number;
}

export const OfflineStrip: React.FC<OfflineStripProps> = ({ queued = 0 }) => (
  <View
    style={{
      height: 28,
      backgroundColor: COLORS.warningSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
    <Icon name="wifi-off" size={12} color="#7A5008" />
    <Text
      style={{
        fontSize: 12,
        color: '#7A5008',
        fontFamily: FONTS.uiSemiBold,
        fontWeight: '600',
        marginLeft: 6,
      }}>
      Offline · {queued} queued
    </Text>
    <Text
      style={{
        fontSize: 12,
        color: '#7A5008',
        fontFamily: FONTS.hi,
        marginLeft: 6,
        opacity: 0.85,
      }}>
      · ऑफलाइन · {queued} क्यू में
    </Text>
  </View>
);

export default OfflineStrip;
