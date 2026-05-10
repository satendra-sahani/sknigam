import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  Text,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from 'react-native';
import { COLORS } from '../utils/constants';
import { FONTS, RADIUS } from '../utils/theme';

export type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type BtnSize = 'sm' | 'md' | 'lg';

export interface BtnProps {
  children: React.ReactNode;
  kind?: BtnKind;
  size?: BtnSize;
  full?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const palette = (kind: BtnKind) =>
  ({
    primary: { bg: COLORS.indigo, fg: COLORS.white, bd: COLORS.indigo },
    secondary: { bg: COLORS.paper, fg: COLORS.indigo, bd: COLORS.indigo },
    ghost: { bg: 'transparent', fg: COLORS.ink, bd: COLORS.hairline },
    danger: { bg: COLORS.danger, fg: COLORS.white, bd: COLORS.danger },
    success: { bg: COLORS.success, fg: COLORS.white, bd: COLORS.success },
  }[kind]);

export const Btn: React.FC<BtnProps> = ({
  children,
  kind = 'primary',
  size = 'md',
  full,
  icon,
  iconRight,
  disabled,
  loading,
  onPress,
  style,
  testID,
}) => {
  const c = palette(kind);
  const h = size === 'lg' ? 52 : size === 'sm' ? 36 : 48;
  const fontSize = size === 'sm' ? 13 : 15;
  const labelStyle: TextStyle = {
    color: c.fg,
    fontSize,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  };

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled || loading}
      style={[
        {
          height: h,
          paddingHorizontal: 18,
          borderRadius: RADIUS.lg,
          backgroundColor: c.bg,
          borderWidth: 1,
          borderColor: c.bd,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: full ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={c.fg} />
      ) : (
        <>
          {icon ? <View style={{ marginRight: 10 }}>{icon}</View> : null}
          <Text style={labelStyle} numberOfLines={1}>
            {children}
          </Text>
          {iconRight ? <View style={{ marginLeft: 10 }}>{iconRight}</View> : null}
        </>
      )}
    </TouchableOpacity>
  );
};

export default Btn;
