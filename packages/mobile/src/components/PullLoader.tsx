import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, Easing } from 'react-native';
import { COLORS } from '../utils/constants';
import { FONTS, RADIUS } from '../utils/theme';

export const PullLoader: React.FC = () => {
  const bars = [useRef(new Animated.Value(0.6)).current, useRef(new Animated.Value(0.6)).current, useRef(new Animated.Value(0.6)).current];
  useEffect(() => {
    const loops = bars.map((b, i) => {
      const seq = Animated.sequence([
        Animated.delay(i * 130),
        Animated.timing(b, { toValue: 1.2, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(b, { toValue: 0.6, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]);
      const loop = Animated.loop(seq);
      loop.start();
      return loop;
    });
    return () => loops.forEach((l) => l.stop());
  }, [bars]);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: COLORS.hairlineSoft,
      }}>
      <View style={{ flexDirection: 'row', marginRight: 8 }}>
        {bars.map((b, i) => (
          <Animated.View
            key={i}
            style={{
              width: 4,
              height: 14,
              borderRadius: 2,
              backgroundColor: COLORS.indigo,
              marginRight: i < 2 ? 3 : 0,
              transform: [{ scaleY: b }],
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 11, color: COLORS.indigo, fontFamily: FONTS.uiBold, fontWeight: '700' }}>
        Refreshing
      </Text>
      <Text style={{ fontSize: 11, color: COLORS.indigo, fontFamily: FONTS.hi, marginLeft: 4, opacity: 0.85 }}>
        · ताज़ा हो रहा है
      </Text>
    </View>
  );
};

export default PullLoader;
