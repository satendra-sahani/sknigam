import React from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '../utils/constants';
import { FONTS, RADIUS } from '../utils/theme';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hi?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
  suffix?: React.ReactNode;
  /** Use when the field opens a modal/picker rather than typing directly. */
  readOnlyValue?: string;
  onPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Field: React.FC<FieldProps> = ({
  label,
  hi,
  hint,
  error,
  mono,
  suffix,
  readOnlyValue,
  onPress,
  containerStyle,
  value,
  placeholder,
  ...input
}) => {
  const labelRow = (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text
          style={{
            fontSize: 12,
            fontFamily: FONTS.uiSemiBold,
            fontWeight: '600',
            color: COLORS.mutedDeep,
          }}>
          {label}
        </Text>
        {hi ? (
          <Text style={{ fontSize: 12, color: COLORS.mutedDeep, fontFamily: FONTS.hi, opacity: 0.65 }}>
            {hi}
          </Text>
        ) : null}
      </View>
      {hint ? (
        <Text style={{ fontSize: 10, color: COLORS.muted, fontFamily: FONTS.ui }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );

  const baseInputStyle = {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
    color: COLORS.ink,
    fontFamily: mono ? FONTS.monoMedium : FONTS.uiMedium,
    fontWeight: '500' as const,
  };

  const inputBox = (
    <View
      style={{
        height: 48,
        borderRadius: RADIUS.md,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: error ? COLORS.danger : COLORS.hairline,
        backgroundColor: COLORS.paper,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      {readOnlyValue !== undefined ? (
        <Text
          numberOfLines={1}
          style={{
            ...baseInputStyle,
            color: readOnlyValue ? COLORS.ink : COLORS.muted,
          }}>
          {readOnlyValue || placeholder}
        </Text>
      ) : (
        <TextInput
          {...input}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          style={baseInputStyle}
        />
      )}
      {suffix ? <View style={{ marginLeft: 8 }}>{suffix}</View> : null}
    </View>
  );

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {labelRow}
      {onPress ? (
        <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
          {inputBox}
        </TouchableOpacity>
      ) : (
        inputBox
      )}
      {error ? (
        <Text style={{ fontSize: 11, color: COLORS.danger, fontFamily: FONTS.uiMedium, fontWeight: '500' }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

export default Field;
