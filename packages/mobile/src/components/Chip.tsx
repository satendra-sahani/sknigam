import React from 'react';
import { View, Text, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../utils/constants';
import { FONTS, RADIUS } from '../utils/theme';

export type ChipTone =
  | 'neutral'
  | 'indigo'
  | 'brass'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export interface ChipProps {
  children: React.ReactNode;
  tone?: ChipTone;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const map: Record<ChipTone, { bg: string; fg: string }> = {
  neutral: { bg: '#EEEAE0', fg: COLORS.mutedDeep },
  indigo: { bg: COLORS.indigoSoft, fg: COLORS.indigoDeep },
  brass: { bg: COLORS.brassSoft, fg: '#7A5818' },
  success: { bg: COLORS.successSoft, fg: '#0F4A2D' },
  warning: { bg: COLORS.warningSoft, fg: '#7A5008' },
  danger: { bg: COLORS.dangerSoft, fg: '#7A2014' },
  info: { bg: COLORS.infoSoft, fg: '#143A66' },
};

export const Chip: React.FC<ChipProps> = ({ children, tone = 'neutral', icon, style }) => {
  const c = map[tone];
  const labelStyle: TextStyle = {
    fontSize: 11,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
    color: c.fg,
    letterSpacing: 0.2,
  };
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingVertical: 3,
          backgroundColor: c.bg,
          borderRadius: RADIUS.pill,
          alignSelf: 'flex-start',
        },
        style,
      ]}>
      {icon ? <View style={{ marginRight: 4 }}>{icon}</View> : null}
      <Text style={labelStyle}>{children}</Text>
    </View>
  );
};

export default Chip;
