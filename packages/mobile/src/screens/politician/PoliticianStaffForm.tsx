/**
 * Politician → create / edit a managed staff member.
 *
 * Route param `staffId` — when present, loads the existing staff for
 * edit; otherwise this is a create form.  Politicians cannot change
 * a staff member's AC/district or ownership; those fields are inherited
 * from the politician on the server side.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { COLORS } from '../../utils/constants';
import { FONTS } from '../../utils/theme';
import api from '../../services/api';
import {
  createStaff,
  deactivateStaff,
  resetStaffPassword,
  updateStaff,
  ManagedStaff,
} from '../../services/politicianStaff';
import type { RootStackParamList } from '../../types';

type Nav = StackNavigationProp<RootStackParamList, 'PoliticianStaffForm'>;
type Route = RouteProp<RootStackParamList, 'PoliticianStaffForm'>;

export default function PoliticianStaffForm() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const staffId = route.params?.staffId;
  const isEdit = !!staffId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [original, setOriginal] = useState<ManagedStaff | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await api.get<{ data: ManagedStaff }>(`/staff/${staffId}`);
        setOriginal(data.data);
        setName(data.data.name);
        setEmail(data.data.email);
        setPhone(data.data.phone);
        setIsActive(data.data.isActive);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Could not load staff');
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, staffId]);

  const submit = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Name, email and phone are required.');
      return;
    }
    if (!isEdit && password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit && staffId) {
        await updateStaff(staffId, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          isActive,
        });
      } else {
        await createStaff({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password: password.trim(),
        });
      }
      navigation.goBack();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const onResetPassword = () => {
    if (!staffId) return;
    Alert.prompt(
      'Reset password',
      `Set a new password for ${original?.name || 'this staff'}. Minimum 6 characters.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async (newPw) => {
            if (!newPw || newPw.length < 6) {
              Alert.alert('Password too short', 'Please use at least 6 characters.');
              return;
            }
            try {
              await resetStaffPassword(staffId, newPw);
              Alert.alert('Done', 'Password updated. The staff can sign in with the new password.');
            } catch (err: any) {
              Alert.alert('Failed', err?.response?.data?.error || 'Could not update password');
            }
          },
        },
      ],
      'secure-text',
    );
  };

  const onDeactivate = () => {
    if (!staffId) return;
    Alert.alert(
      'Deactivate staff?',
      'They will no longer be able to sign in. You can reactivate by editing them later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateStaff(staffId);
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Failed', err?.response?.data?.error || 'Could not deactivate');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color={COLORS.indigo} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrow-left" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isEdit ? 'Edit staff' : 'New staff'}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Field
          label="Full name *"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ramesh Kumar"
          autoCapitalize="words"
        />
        <Field
          label="Email *"
          value={email}
          onChangeText={setEmail}
          placeholder="staff@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Phone *"
          value={phone}
          onChangeText={setPhone}
          placeholder="10-digit number"
          keyboardType="phone-pad"
        />
        {!isEdit && (
          <Field
            label="Password * (min 6 chars)"
            value={password}
            onChangeText={setPassword}
            placeholder="They'll use this to sign in"
            secureTextEntry
            autoCapitalize="none"
          />
        )}

        {isEdit && (
          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Active</Text>
              <Text style={s.toggleSub}>
                {isActive ? 'Can sign in and receive assignments' : 'Cannot sign in'}
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ true: COLORS.indigo, false: COLORS.hairline }}
              thumbColor="#fff"
            />
          </View>
        )}

        {error && (
          <View style={s.errorBox}>
            <Icon name="alert-circle" size={14} color={COLORS.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={submit}
          disabled={saving}
          style={[s.primaryBtn, saving && { opacity: 0.6 }]}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.primaryBtnText}>{isEdit ? 'Save changes' : 'Create staff'}</Text>
          )}
        </TouchableOpacity>

        {isEdit && (
          <View style={s.dangerZone}>
            <Text style={s.dangerHeading}>Account</Text>
            <TouchableOpacity onPress={onResetPassword} style={s.ghostBtn}>
              <Icon name="key-variant" size={16} color={COLORS.ink} />
              <Text style={s.ghostBtnText}>Reset password</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDeactivate} style={[s.ghostBtn, s.ghostBtnDanger]}>
              <Icon name="account-off-outline" size={16} color={COLORS.danger} />
              <Text style={[s.ghostBtnText, { color: COLORS.danger }]}>Deactivate staff</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        placeholderTextColor={COLORS.muted}
        {...rest}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairlineSoft,
    gap: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.uiSemiBold },
  center: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.ink,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  toggleSub: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.dangerSoft,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: { fontSize: 12.5, color: COLORS.danger, flex: 1 },
  primaryBtn: {
    backgroundColor: COLORS.indigo,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  dangerZone: {
    marginTop: 26,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairlineSoft,
    gap: 10,
  },
  dangerHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: 10,
  },
  ghostBtnDanger: { borderColor: COLORS.dangerSoft },
  ghostBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
});
