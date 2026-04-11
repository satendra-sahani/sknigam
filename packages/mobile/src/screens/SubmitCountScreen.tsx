import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { enqueue } from '../services/offlineQueue';
import { COLORS, SLOT_TIMES } from '../utils/constants';
import { getCurrentSlot, getTodayDateString } from '../utils/helpers';
import { AssignmentInfo, VoterCountData } from '../types';
import SlotCard from '../components/SlotCard';
import NetInfo from '@react-native-community/netinfo';

const SubmitCountScreen: React.FC = () => {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [submissions, setSubmissions] = useState<VoterCountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  // Form state
  const [totalVoters, setTotalVoters] = useState('');
  const [maleCount, setMaleCount] = useState('');
  const [femaleCount, setFemaleCount] = useState('');
  const [otherCount, setOtherCount] = useState('');

  const currentSlot = getCurrentSlot();

  const fetchData = useCallback(async () => {
    try {
      const [assignmentRes, submissionsRes] = await Promise.allSettled([
        api.get('/assignments/my'),
        api.get(`/voter-counts/my?date=${getTodayDateString()}`),
      ]);
      if (assignmentRes.status === 'fulfilled') {
        setAssignment(assignmentRes.value.data.data);
      }
      if (submissionsRes.status === 'fulfilled') {
        setSubmissions(submissionsRes.value.data.data || []);
      }
    } catch (error) {
      console.log('[SubmitCount] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getSlotSubmission = (slotKey: string): VoterCountData | undefined => {
    return submissions.find((s) => s.slot === slotKey);
  };

  const isSlotActive = (slot: (typeof SLOT_TIMES)[number]): boolean => {
    if (!currentSlot) return false;
    return slot.key === currentSlot.key;
  };

  const isSlotPast = (slot: (typeof SLOT_TIMES)[number]): boolean => {
    const now = new Date();
    return now.getHours() >= slot.end;
  };

  const isSlotFuture = (slot: (typeof SLOT_TIMES)[number]): boolean => {
    const now = new Date();
    return now.getHours() < slot.start;
  };

  const handleSlotPress = (slotKey: string) => {
    const slot = SLOT_TIMES.find((s) => s.key === slotKey);
    if (!slot) return;

    if (isSlotFuture(slot)) return;

    // Toggle expansion
    if (expandedSlot === slotKey) {
      setExpandedSlot(null);
    } else {
      setExpandedSlot(slotKey);
      // Pre-fill if there's existing data
      const existing = getSlotSubmission(slotKey);
      if (existing) {
        setTotalVoters(String(existing.totalVoters));
        setMaleCount(String(existing.maleCount));
        setFemaleCount(String(existing.femaleCount));
        setOtherCount(String(existing.otherCount));
      } else {
        setTotalVoters('');
        setMaleCount('');
        setFemaleCount('');
        setOtherCount('');
      }
    }
  };

  const parseNum = (val: string): number => {
    const n = parseInt(val, 10);
    return isNaN(n) ? 0 : n;
  };

  const totalGenderCount = parseNum(maleCount) + parseNum(femaleCount) + parseNum(otherCount);
  const totalVotersNum = parseNum(totalVoters);
  const maxVoters = assignment?.booth.totalRegisteredVoters || 99999;

  const validationErrors: string[] = [];
  if (totalVotersNum <= 0) validationErrors.push('Total voters must be greater than 0');
  if (totalVotersNum !== totalGenderCount)
    validationErrors.push(`Gender counts (${totalGenderCount}) must equal total (${totalVotersNum})`);
  if (totalVotersNum > maxVoters)
    validationErrors.push(`Cannot exceed ${maxVoters} registered voters`);

  const isFormValid = totalVotersNum > 0 && totalVotersNum === totalGenderCount && totalVotersNum <= maxVoters;

  const handleSubmit = async () => {
    if (!isFormValid || !expandedSlot || !assignment) return;

    setSubmitting(true);
    const data = {
      boothId: assignment.booth._id,
      slot: expandedSlot,
      electionDate: getTodayDateString(),
      totalVoters: totalVotersNum,
      maleCount: parseNum(maleCount),
      femaleCount: parseNum(femaleCount),
      otherCount: parseNum(otherCount),
    };

    try {
      const netState = await NetInfo.fetch();

      if (!netState.isConnected) {
        await enqueue('voter_count', data);
        Alert.alert(
          'Queued for Sync',
          'Voter count saved offline. It will sync when connectivity is restored.',
        );
        setExpandedSlot(null);
        setSubmitting(false);
        return;
      }

      const response = await api.post('/voter-counts', data);

      if (response.data.success) {
        Alert.alert('Success', 'Voter count submitted successfully!');
        setExpandedSlot(null);
        await fetchData();
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        'Submission failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Submit Voter Counts</Text>
        <Text style={styles.subtitle}>
          {assignment?.booth.name || 'No booth'} | {getTodayDateString()}
        </Text>

        {SLOT_TIMES.map((slot) => {
          const submission = getSlotSubmission(slot.key);
          const active = isSlotActive(slot);
          const past = isSlotPast(slot);
          const future = isSlotFuture(slot);
          const isExpanded = expandedSlot === slot.key;
          const alreadySubmitted = !!submission;

          return (
            <View key={slot.key}>
              <SlotCard
                slotKey={slot.key}
                slotLabel={slot.label}
                isActive={active}
                isPast={past}
                isFuture={future}
                submission={submission}
                onPress={() => handleSlotPress(slot.key)}
              />

              {/* Expanded Form */}
              {isExpanded && !alreadySubmitted && (active || past) && (
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>
                    Enter Count for {slot.label}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Total Voters Cast</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={totalVoters}
                      onChangeText={setTotalVoters}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={COLORS.grey400}
                    />
                  </View>

                  <View style={styles.genderRow}>
                    <View style={styles.genderInput}>
                      <Text style={styles.inputLabel}>Male</Text>
                      <TextInput
                        style={styles.numberInput}
                        value={maleCount}
                        onChangeText={setMaleCount}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={COLORS.grey400}
                      />
                    </View>
                    <View style={styles.genderInput}>
                      <Text style={styles.inputLabel}>Female</Text>
                      <TextInput
                        style={styles.numberInput}
                        value={femaleCount}
                        onChangeText={setFemaleCount}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={COLORS.grey400}
                      />
                    </View>
                    <View style={styles.genderInput}>
                      <Text style={styles.inputLabel}>Other</Text>
                      <TextInput
                        style={styles.numberInput}
                        value={otherCount}
                        onChangeText={setOtherCount}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={COLORS.grey400}
                      />
                    </View>
                  </View>

                  {/* Validation */}
                  <View style={styles.validationBox}>
                    <View style={styles.validationRow}>
                      <Icon
                        name={
                          totalVotersNum === totalGenderCount
                            ? 'check-circle'
                            : 'close-circle'
                        }
                        size={16}
                        color={
                          totalVotersNum === totalGenderCount
                            ? COLORS.success
                            : COLORS.danger
                        }
                      />
                      <Text
                        style={[
                          styles.validationText,
                          {
                            color:
                              totalVotersNum === totalGenderCount
                                ? COLORS.success
                                : COLORS.danger,
                          },
                        ]}>
                        Total ({totalVotersNum}) = M({parseNum(maleCount)}) + F(
                        {parseNum(femaleCount)}) + O({parseNum(otherCount)}) ={' '}
                        {totalGenderCount}
                      </Text>
                    </View>
                    {totalVotersNum > maxVoters && (
                      <View style={styles.validationRow}>
                        <Icon
                          name="close-circle"
                          size={16}
                          color={COLORS.danger}
                        />
                        <Text
                          style={[
                            styles.validationText,
                            { color: COLORS.danger },
                          ]}>
                          Exceeds registered voters ({maxVoters})
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      !isFormValid && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!isFormValid || submitting}
                    activeOpacity={0.8}>
                    {submitting ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <>
                        <Icon
                          name="check-bold"
                          size={20}
                          color={COLORS.white}
                        />
                        <Text style={styles.submitButtonText}>
                          Submit Count
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Already submitted, read-only expanded */}
              {isExpanded && alreadySubmitted && (
                <View style={styles.readOnlyCard}>
                  <Text style={styles.readOnlyTitle}>Submitted Data</Text>
                  <View style={styles.readOnlyRow}>
                    <Text style={styles.readOnlyLabel}>Total:</Text>
                    <Text style={styles.readOnlyValue}>
                      {submission.totalVoters}
                    </Text>
                  </View>
                  <View style={styles.readOnlyRow}>
                    <Text style={styles.readOnlyLabel}>Male:</Text>
                    <Text style={styles.readOnlyValue}>
                      {submission.maleCount}
                    </Text>
                  </View>
                  <View style={styles.readOnlyRow}>
                    <Text style={styles.readOnlyLabel}>Female:</Text>
                    <Text style={styles.readOnlyValue}>
                      {submission.femaleCount}
                    </Text>
                  </View>
                  <View style={styles.readOnlyRow}>
                    <Text style={styles.readOnlyLabel}>Other:</Text>
                    <Text style={styles.readOnlyValue}>
                      {submission.otherCount}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.grey800,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.grey500,
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    marginTop: -8,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.grey800,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.grey600,
    marginBottom: 6,
  },
  numberInput: {
    backgroundColor: COLORS.grey100,
    borderWidth: 1.5,
    borderColor: COLORS.grey200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.grey800,
    textAlign: 'center',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  genderInput: {
    flex: 1,
  },
  validationBox: {
    backgroundColor: COLORS.grey100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  validationText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.grey300,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  readOnlyCard: {
    backgroundColor: COLORS.grey100,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginTop: -8,
  },
  readOnlyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.grey600,
    marginBottom: 10,
  },
  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  readOnlyLabel: {
    fontSize: 14,
    color: COLORS.grey500,
  },
  readOnlyValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.grey700,
  },
});

export default SubmitCountScreen;
