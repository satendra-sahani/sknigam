import React from 'react';
import { View } from 'react-native';
import { COLORS } from '../utils/constants';
import { RADIUS } from '../utils/theme';

export type ProgressTone = 'indigo' | 'brass' | 'success' | 'warning' | 'danger';

export interface ProgressProps {
  value: number;
  tone?: ProgressTone;
  height?: number;
  trackColor?: string;
}

const colorOf = (tone: ProgressTone) =>
  ({
    indigo: COLORS.indigo,
    brass: COLORS.brass,
    success: COLORS.success,
    warning: COLORS.warning,
    danger: COLORS.danger,
  }[tone]);

export const Progress: React.FC<ProgressProps> = ({
  value,
  tone = 'indigo',
  height = 6,
  trackColor = '#E9E3D4',
}) => {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View
      style={{
        width: '100%',
        height,
        backgroundColor: trackColor,
        borderRadius: RADIUS.pill,
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: `${pct}%`,
          height: '100%',
          backgroundColor: colorOf(tone),
          borderRadius: RADIUS.pill,
        }}
      />
    </View>
  );
};

export default Progress;
