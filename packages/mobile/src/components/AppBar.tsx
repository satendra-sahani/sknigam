import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/constants';
import { FONTS } from '../utils/theme';

export interface AppBarProps {
  title: string;
  hi?: string;
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  tone?: 'cream' | 'ink';
}

export const AppBar: React.FC<AppBarProps> = ({
  title,
  hi,
  back,
  onBack,
  right,
  tone = 'cream',
}) => {
  const ink = tone === 'ink';
  const fg = ink ? COLORS.white : COLORS.ink;
  const subFg = ink ? 'rgba(255,255,255,0.7)' : COLORS.mutedDeep;
  return (
    <View
      style={{
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        backgroundColor: ink ? COLORS.ink : COLORS.cream,
        borderBottomWidth: ink ? 0 : 1,
        borderBottomColor: COLORS.hairlineSoft,
      }}>
      {back ? (
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          style={{
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 18,
            marginRight: 4,
          }}>
          <Icon name="chevron-left" size={22} color={fg} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 8 }} />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 16,
            color: fg,
            fontFamily: FONTS.uiSemiBold,
            fontWeight: '600',
            letterSpacing: -0.1,
          }}>
          {title}
        </Text>
        {hi ? (
          <Text
            numberOfLines={1}
            style={{
              fontSize: 12,
              color: subFg,
              fontFamily: FONTS.hi,
              marginTop: 1,
              opacity: 0.85,
            }}>
            {hi}
          </Text>
        ) : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
};

export default AppBar;
