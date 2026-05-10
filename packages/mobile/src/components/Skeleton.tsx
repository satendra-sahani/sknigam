import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle, StyleProp, DimensionValue } from 'react-native';
import { COLORS } from '../utils/constants';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 12,
  radius = 6,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: COLORS.hairlineSoft,
          opacity,
        },
        style,
      ]}>
      <View />
    </Animated.View>
  );
};

export default Skeleton;
