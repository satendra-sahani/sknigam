import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/constants';
import { FONTS, RADIUS } from '../utils/theme';

export interface GrievanceChipProps {
  en: string;
  hi: string;
  selected?: boolean;
  onPress?: () => void;
}

export const GrievanceChip: React.FC<GrievanceChipProps> = ({ en, hi, selected, onPress }) => {
  const fg = selected ? COLORS.white : COLORS.mutedDeep;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.pill,
        backgroundColor: selected ? COLORS.indigo : COLORS.paper,
        borderWidth: 1,
        borderColor: selected ? COLORS.indigo : COLORS.hairline,
      }}>
      {selected ? (
        <View style={{ marginRight: 4 }}>
          <Icon name="check" size={12} color={COLORS.white} />
        </View>
      ) : null}
      <Text style={{ fontSize: 12, color: fg, fontFamily: FONTS.uiSemiBold, fontWeight: '600' }}>
        {en}
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: fg,
          fontFamily: FONTS.hi,
          marginLeft: 2,
          opacity: selected ? 0.9 : 0.65,
        }}>
        {' '}
        · {hi}
      </Text>
    </TouchableOpacity>
  );
};

export default GrievanceChip;
