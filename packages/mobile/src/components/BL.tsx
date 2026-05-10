import React from 'react';
import { Text, TextStyle, View, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';
import { FONTS } from '../utils/theme';

/**
 * Bilingual label — shows English on top, Hindi below in IBM Plex Devanagari.
 * Used everywhere field names appear so staff who read either language can
 * glance and read.
 */
export interface BLProps {
  en: string;
  hi: string;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  inline?: boolean;
  style?: TextStyle;
}

export const BL: React.FC<BLProps> = ({
  en,
  hi,
  size = 13,
  weight = '500',
  color = COLORS.mutedDeep,
  inline = false,
  style,
}) => {
  if (inline) {
    return (
      <Text style={[{ fontSize: size, fontWeight: weight, color, fontFamily: FONTS.uiMedium }, style]}>
        {en}{' '}
        <Text style={{ fontFamily: FONTS.hi, opacity: 0.7 }}>· {hi}</Text>
      </Text>
    );
  }
  return (
    <View style={style}>
      <Text style={{ fontSize: size, fontWeight: weight, color, fontFamily: FONTS.uiMedium, lineHeight: size * 1.25 }}>
        {en}
      </Text>
      <Text
        style={{
          fontSize: size - 1,
          color,
          opacity: 0.68,
          fontFamily: FONTS.hi,
          marginTop: 2,
          lineHeight: (size - 1) * 1.25,
        }}>
        {hi}
      </Text>
    </View>
  );
};

export default BL;
