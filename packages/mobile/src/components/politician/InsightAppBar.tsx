// Shared top AppBar used by every politician screen.
// Matches `InsightAppBar` from the Claude design canvas —
// gradient cream background, rounded back button, bell with dot, avatar.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../utils/constants';
import { FONTS } from '../../utils/theme';
import { InsightMark } from './InsightAtoms';

interface Props {
  title?: string;
  hi?: string;
  back?: () => void;
  showMark?: boolean;
  right?: React.ReactNode;
}

export function InsightAppBar({ title, hi, back, showMark, right }: Props) {
  const { user, logout } = useAuth();
  const initials = (user?.name || 'P')
    .split(/\s+/)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  function confirmLogout() {
    Alert.alert('Sign out · साइन आउट', `Sign out ${user?.name || ''}?`, [
      { text: 'Cancel · रद्द करें', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <View style={styles.bar}>
      {back ? (
        <TouchableOpacity
          accessibilityLabel="Back"
          onPress={back}
          style={styles.backBtn}
          activeOpacity={0.7}>
          <Icon name="chevron-left" size={18} color={COLORS.ink} />
        </TouchableOpacity>
      ) : showMark ? (
        <InsightMark />
      ) : null}

      {title ? (
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title}>{title}</Text>
          {hi ? <Text style={styles.hi}>{hi}</Text> : null}
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <View style={styles.right}>
        {right}
        <View style={styles.bell}>
          <Icon name="bell-outline" size={15} color={COLORS.ink} />
          <View style={styles.bellDot} />
        </View>
        <TouchableOpacity onPress={confirmLogout} activeOpacity={0.7}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.cream,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairlineSoft,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    elevation: 1,
    shadowColor: '#0F1B2D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  title: {
    fontFamily: FONTS.uiBold,
    fontSize: 17,
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  hi: {
    fontFamily: FONTS.hi,
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  right: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bell: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#0F1B2D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  bellDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.signal,
    borderWidth: 2,
    borderColor: COLORS.paper,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    color: COLORS.indigoDeep,
    letterSpacing: 0.4,
  },
});
