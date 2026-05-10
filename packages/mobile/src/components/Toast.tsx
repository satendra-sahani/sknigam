import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/constants';
import { FONTS, RADIUS } from '../utils/theme';

export type ToastTone = 'success' | 'danger' | 'warning' | 'info';

export interface ToastProps {
  tone?: ToastTone;
  en: string;
  hi?: string;
}

const map: Record<ToastTone, { bg: string; fg: string; icon: string; iconName: string }> = {
  success: { bg: COLORS.successSoft, fg: '#0F4A2D', icon: COLORS.success, iconName: 'check-bold' },
  danger: { bg: COLORS.dangerSoft, fg: '#7A2014', icon: COLORS.danger, iconName: 'alert-circle' },
  warning: { bg: COLORS.warningSoft, fg: '#7A5008', icon: COLORS.warning, iconName: 'alert' },
  info: { bg: COLORS.infoSoft, fg: '#143A66', icon: COLORS.info, iconName: 'information' },
};

export const Toast: React.FC<ToastProps> = ({ tone = 'success', en, hi }) => {
  const m = map[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: RADIUS.md,
        backgroundColor: m.bg,
        borderWidth: 1,
        borderColor: m.icon + '30',
      }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: m.icon,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
        }}>
        <Icon name={m.iconName} size={14} color={COLORS.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: m.fg, fontFamily: FONTS.uiSemiBold, fontWeight: '600' }}>
          {en}
        </Text>
        {hi ? (
          <Text style={{ fontSize: 11, color: m.fg, fontFamily: FONTS.hi, opacity: 0.9, marginTop: 1 }}>
            {hi}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export default Toast;
