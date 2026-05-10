import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/constants';
import { FONTS, RADIUS } from '../utils/theme';

export type IntentTone = 'success' | 'brass' | 'danger' | 'info';

export interface IntentCardProps {
  tone: IntentTone;
  en: string;
  hi: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
}

const map: Record<IntentTone, { c: string; soft: string }> = {
  success: { c: COLORS.success, soft: COLORS.successSoft },
  brass: { c: COLORS.brass, soft: COLORS.brassSoft },
  danger: { c: COLORS.danger, soft: COLORS.dangerSoft },
  info: { c: COLORS.info, soft: COLORS.infoSoft },
};

export const IntentCard: React.FC<IntentCardProps> = ({
  tone,
  en,
  hi,
  selected,
  onPress,
  icon,
}) => {
  const { c, soft } = map[tone];
  const bg = selected ? c : COLORS.paper;
  const fg = selected ? COLORS.white : COLORS.ink;
  const ring = selected ? c : COLORS.hairline;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        flex: 1,
        padding: 14,
        borderRadius: RADIUS.xl,
        backgroundColor: bg,
        borderWidth: 1.5,
        borderColor: ring,
        minHeight: 88,
      }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 1.5,
            borderColor: selected ? COLORS.white : COLORS.hairline,
            backgroundColor: selected ? COLORS.white : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {selected ? <Icon name="check" size={11} color={c} /> : null}
        </View>
        {icon ? (
          <Icon
            name={icon}
            size={16}
            color={selected ? 'rgba(255,255,255,0.7)' : c}
          />
        ) : (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: selected ? 'rgba(255,255,255,0.4)' : soft,
            }}
          />
        )}
      </View>
      <View style={{ marginTop: 16 }}>
        <Text
          style={{ fontSize: 14, color: fg, fontFamily: FONTS.uiSemiBold, fontWeight: '700' }}
          numberOfLines={1}>
          {en}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: selected ? 'rgba(255,255,255,0.85)' : COLORS.mutedDeep,
            fontFamily: FONTS.hi,
            marginTop: 1,
          }}
          numberOfLines={1}>
          {hi}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default IntentCard;
