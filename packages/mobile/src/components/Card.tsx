import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { COLORS } from '../utils/constants';
import { RADIUS } from '../utils/theme';

export interface CardProps {
  children: React.ReactNode;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, padding = 14, style }) => (
  <View
    style={[
      {
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.hairlineSoft,
        padding,
      },
      style,
    ]}>
    {children}
  </View>
);

export default Card;
