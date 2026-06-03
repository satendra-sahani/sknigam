/**
 * Politician → assign a managed staff member to one of the politician's
 * own assigned booths.
 *
 * Two-step picker:
 *   1. Pick a staff member (if staffId not preset via route param)
 *   2. Pick a booth (server returns only the politician's own booths)
 *   3. Optionally cap the voter serial range and submit.
 *
 * Also lists the staff's existing active assignments so the politician
 * can see the current state and deactivate any with one tap.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
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
import {
  AssignableBooth,
  ManagedStaff,
  PoliticianAssignment,
  assignStaffToBooth,
  deactivateAssignment,
  fetchMyAssignments,
  fetchMyBooths,
  fetchMyStaff,
} from '../../services/politicianStaff';
import type { RootStackParamList } from '../../types';

type Nav = StackNavigationProp<RootStackParamList, 'PoliticianStaffAssign'>;
type Route = RouteProp<RootStackParamList, 'PoliticianStaffAssign'>;

export default function PoliticianStaffAssign() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const presetStaffId = route.params?.staffId;

  const [staff, setStaff] = useState<ManagedStaff[]>([]);
  const [booths, setBooths] = useState<AssignableBooth[]>([]);
  const [assignments, setAssignments] = useState<PoliticianAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [staffId, setStaffId] = useState<string | null>(presetStaffId ?? null);
  const [boothId, setBoothId] = useState<string | null>(null);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, b] = await Promise.all([fetchMyStaff(), fetchMyBooths()]);
      setStaff(s.filter((x) => x.isActive));
      setBooths(b);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Could not load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Whenever the selected staff changes, refresh their active assignments
  // so the bottom list reflects the current state.
  useEffect(() => {
    if (!staffId) {
      setAssignments([]);
      return;
    }
    fetchMyAssignments(staffId).then(setAssignments).catch(() => setAssignments([]));
  }, [staffId]);

  const selectedStaff = useMemo(
    () => staff.find((s) => s._id === staffId) || null,
    [staff, staffId],
  );

  const submit = async () => {
    if (!staffId || !boothId) {
      Alert.alert('Pick both', 'Choose a staff member and a booth before assigning.');
      return;
    }
    const from = rangeFrom.trim() ? Number(rangeFrom.trim()) : undefined;
    const to = rangeTo.trim() ? Number(rangeTo.trim()) : undefined;
    if ((from !== undefined && isNaN(from)) || (to !== undefined && isNaN(to))) {
      Alert.alert('Invalid range', 'Voter serial range must be numbers.');
      return;
    }
    setSaving(true);
    try {
      await assignStaffToBooth({
        staffId,
        boothId,
        voterSerialFrom: from,
        voterSerialTo: to,
      });
      Alert.alert('Assigned', 'The staff member now has access to that booth.', [
        {
          text: 'OK',
          onPress: () => {
            setBoothId(null);
            setRangeFrom('');
            setRangeTo('');
            // Refresh existing assignments list so the new row shows up.
            if (staffId) fetchMyAssignments(staffId).then(setAssignments).catch(() => {});
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert(
        'Could not assign',
        err?.response?.data?.error || err?.message || 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const onDeactivate = (a: PoliticianAssignment) => {
    Alert.alert(
      'Remove assignment?',
      'The staff member will no longer have access to this booth.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateAssignment(a._id);
              setAssignments((arr) => arr.filter((x) => x._id !== a._id));
            } catch (err: any) {
              Alert.alert('Failed', err?.response?.data?.error || 'Could not remove');
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
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrow-left" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Assign to booth</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {error && (
          <View style={s.errorBox}>
            <Icon name="alert-circle" size={14} color={COLORS.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* STEP 1 — pick staff */}
        <Text style={s.sectionLabel}>1 · Staff member</Text>
        {staff.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>No active staff</Text>
            <Text style={s.emptyBody}>
              Add a staff member first, then come back here to assign them to a booth.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('PoliticianStaffForm', {})}
              style={s.primaryBtn}>
              <Text style={s.primaryBtnText}>Add staff</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.pickerList}>
            {staff.map((m) => {
              const active = staffId === m._id;
              return (
                <TouchableOpacity
                  key={m._id}
                  onPress={() => setStaffId(m._id)}
                  activeOpacity={0.75}
                  style={[s.pickerRow, active && s.pickerRowActive]}>
                  <Icon
                    name={active ? 'check-circle' : 'circle-outline'}
                    size={18}
                    color={active ? COLORS.indigo : COLORS.muted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerName}>{m.name}</Text>
                    <Text style={s.pickerMeta}>{m.phone}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* STEP 2 — pick booth */}
        <Text style={[s.sectionLabel, { marginTop: 22 }]}>2 · Booth</Text>
        {booths.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>No booths assigned to you</Text>
            <Text style={s.emptyBody}>
              Ask the admin to add booths to your scope from the web dashboard.
              Once they appear, you&apos;ll be able to assign staff to them here.
            </Text>
          </View>
        ) : (
          <View style={s.pickerList}>
            {booths.map((b) => {
              const active = boothId === b._id;
              return (
                <TouchableOpacity
                  key={b._id}
                  onPress={() => setBoothId(b._id)}
                  activeOpacity={0.75}
                  style={[s.pickerRow, active && s.pickerRowActive]}>
                  <Icon
                    name={active ? 'check-circle' : 'circle-outline'}
                    size={18}
                    color={active ? COLORS.indigo : COLORS.muted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerName}>
                      B-{String(b.partNumber).padStart(3, '0')} · {b.name}
                    </Text>
                    <Text style={s.pickerMeta}>{b.assemblyConstituency}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* STEP 3 — optional serial range */}
        <Text style={[s.sectionLabel, { marginTop: 22 }]}>3 · Voter range (optional)</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>From serial</Text>
            <TextInput
              style={s.input}
              value={rangeFrom}
              onChangeText={setRangeFrom}
              placeholder="leave blank for whole booth"
              placeholderTextColor={COLORS.muted}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>To serial</Text>
            <TextInput
              style={s.input}
              value={rangeTo}
              onChangeText={setRangeTo}
              placeholder="leave blank for whole booth"
              placeholderTextColor={COLORS.muted}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={submit}
          disabled={saving || !staffId || !boothId}
          style={[
            s.primaryBtn,
            { marginTop: 22 },
            (saving || !staffId || !boothId) && { opacity: 0.45 },
          ]}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.primaryBtnText}>
              {selectedStaff ? `Assign ${selectedStaff.name}` : 'Assign'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Existing assignments for the selected staff */}
        {selectedStaff && assignments.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { marginTop: 30 }]}>
              Current assignments for {selectedStaff.name}
            </Text>
            <View style={{ gap: 8 }}>
              {assignments.map((a) => (
                <View key={a._id} style={s.assignCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.assignTitle}>
                      {a.booth
                        ? `B-${String(a.booth.partNumber).padStart(3, '0')} · ${a.booth.name}`
                        : 'Booth'}
                    </Text>
                    <Text style={s.assignMeta}>
                      {a.totalVoters > 0
                        ? `${a.completedCount}/${a.totalVoters} done`
                        : 'No voters loaded'}
                      {a.voterSerialFrom != null || a.voterSerialTo != null
                        ? ` · serials ${a.voterSerialFrom ?? '–'} to ${a.voterSerialTo ?? '–'}`
                        : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onDeactivate(a)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="close-circle-outline" size={22} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  pickerList: { gap: 6 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerRowActive: { borderColor: COLORS.indigo, backgroundColor: COLORS.indigoTint },
  pickerName: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  pickerMeta: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: COLORS.ink,
  },
  primaryBtn: {
    backgroundColor: COLORS.indigo,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyCard: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  emptyBody: { fontSize: 12.5, color: COLORS.muted, lineHeight: 18 },
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
  assignCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  assignTitle: { fontSize: 13.5, fontWeight: '600', color: COLORS.ink },
  assignMeta: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
});
