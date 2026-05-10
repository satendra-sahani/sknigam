import React from 'react';
import { View, Text, Image, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { COLORS } from '../utils/constants';
import { FONTS } from '../utils/theme';

export type AvatarTone = 'indigo' | 'brass' | 'success' | 'muted';

export interface AvatarProps {
  name?: string;
  size?: number;
  tone?: AvatarTone;
  uri?: string;
  style?: StyleProp<ViewStyle>;
}

const map: Record<AvatarTone, { bg: string; fg: string }> = {
  indigo: { bg: COLORS.indigoSoft, fg: COLORS.indigoDeep },
  brass: { bg: COLORS.brassSoft, fg: '#7A5818' },
  success: { bg: COLORS.successSoft, fg: '#0F4A2D' },
  muted: { bg: '#EEEAE0', fg: COLORS.mutedDeep },
};

const initialsOf = (name?: string) => {
  if (!name) return 'AK';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'AK';
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 40,
  tone = 'indigo',
  uri,
  style,
}) => {
  const { bg, fg } = map[tone];
  const radius = size / 2;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          { width: size, height: size, borderRadius: radius, backgroundColor: bg },
          style as StyleProp<ImageStyle>,
        ]}
      />
    );
  }
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      <Text
        style={{
          color: fg,
          fontFamily: FONTS.uiBold,
          fontWeight: '700',
          fontSize: size * 0.38,
        }}>
        {initialsOf(name)}
      </Text>
    </View>
  );
};

export default Avatar;
