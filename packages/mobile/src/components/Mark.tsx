import React from 'react';
import { Image, View, ImageStyle, StyleProp } from 'react-native';

/**
 * POLLSTICS brand mark — the circular "P + play + speed-lines" logo.
 * Always renders the canonical PNG from src/assets/logo.png, never an icon
 * font, so the brand stays recognisable everywhere we show it (splash,
 * login, permission prompts).
 */
export interface MarkProps {
  size?: number;
  glow?: boolean;
  style?: StyleProp<ImageStyle>;
}

const logo = require('../assets/logo.png');

export const Mark: React.FC<MarkProps> = ({ size = 56, glow, style }) => {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        // RN can't replicate a CSS `drop-shadow`, but `shadowColor` + elevation
        // gives the same brand-glow on Android/iOS without dragging in
        // react-native-svg or linear-gradient.
        shadowColor: glow ? '#D82A2A' : '#0F1B2D',
        shadowOpacity: glow ? 0.55 : 0.18,
        shadowRadius: glow ? 18 : 14,
        shadowOffset: { width: 0, height: glow ? 0 : 6 },
        elevation: glow ? 12 : 4,
      }}>
      <Image
        source={logo}
        style={[{ width: size, height: size, resizeMode: 'contain' }, style]}
      />
    </View>
  );
};

export default Mark;
