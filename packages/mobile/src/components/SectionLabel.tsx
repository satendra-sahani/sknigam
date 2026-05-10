import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '../utils/constants';
import { FONTS } from '../utils/theme';

export interface SectionLabelProps {
  num: number | string;
  en: string;
  hi?: string;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ num, en, hi }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.ink,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
      }}>
      <Text
        style={{
          color: COLORS.white,
          fontFamily: FONTS.monoSemiBold,
          fontSize: 11,
          fontWeight: '700',
        }}>
        {num}
      </Text>
    </View>
    <Text
      style={{
        fontSize: 13,
        color: COLORS.ink,
        fontFamily: FONTS.uiBold,
        fontWeight: '700',
        marginRight: 6,
      }}>
      {en}
    </Text>
    {hi ? (
      <Text
        style={{
          fontSize: 12,
          color: COLORS.mutedDeep,
          fontFamily: FONTS.hi,
          opacity: 0.8,
        }}>
        · {hi}
      </Text>
    ) : null}
  </View>
);

export default SectionLabel;
