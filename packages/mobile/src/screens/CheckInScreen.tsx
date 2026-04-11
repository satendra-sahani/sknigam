import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchCamera } from 'react-native-image-picker';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import api from '../services/api';
import { enqueue } from '../services/offlineQueue';
import { uploadImage, generateFileName } from '../services/imageUpload';
import { COLORS, CHECK_IN_RADIUS_METERS } from '../utils/constants';
import { calculateDistance, formatDistance, formatTime } from '../utils/helpers';
import { AssignmentInfo, CheckInData } from '../types';
import NetInfo from '@react-native-community/netinfo';

const CheckInScreen: React.FC = () => {
  const { user } = useAuth();
  const { getCurrentLocation, isLoading: gpsLoading } = useLocation();
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [existingCheckIn, setExistingCheckIn] = useState<CheckInData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'located' | 'selfie' | 'submitting'>('idle');

  const fetchData = useCallback(async () => {
    try {
      const [assignmentRes, checkInRes] = await Promise.allSettled([
        api.get('/assignments/my'),
        api.get('/check-ins/today'),
      ]);
      if (assignmentRes.status === 'fulfilled') {
        setAssignment(assignmentRes.value.data.data);
      }
      if (checkInRes.status === 'fulfilled' && checkInRes.value.data.data) {
        setExistingCheckIn(checkInRes.value.data.data);
      }
    } catch (error) {
      console.log('[CheckIn] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckIn = async () => {
    if (!assignment) {
      Alert.alert('Error', 'No booth assigned. Contact your zone in-charge.');
      return;
    }

    setProcessing(true);
    setStep('idle');

    // Step 1: Get GPS
    const coords = await getCurrentLocation();
    if (!coords) {
      setProcessing(false);
      return;
    }

    // Step 2: Calculate distance
    const boothLat = assignment.booth.latitude || 0;
    const boothLng = assignment.booth.longitude || 0;
    const dist = calculateDistance(
      coords.latitude,
      coords.longitude,
      boothLat,
      boothLng,
    );
    setDistance(dist);
    setStep('located');

    if (dist > CHECK_IN_RADIUS_METERS) {
      setShowOverride(true);
      setProcessing(false);
      return;
    }

    // Within radius -- proceed to selfie
    setProcessing(false);
    openCamera(coords.latitude, coords.longitude, dist, true);
  };

  const handleOverrideSubmit = async () => {
    if (!overrideReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for distance override.');
      return;
    }

    const coords = await getCurrentLocation();
    if (!coords) return;

    openCamera(coords.latitude, coords.longitude, distance || 0, false, overrideReason.trim());
  };

  const openCamera = (
    lat: number,
    lng: number,
    dist: number,
    withinRadius: boolean,
    override?: string,
  ) => {
    setStep('selfie');
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1280,
        maxHeight: 1280,
        cameraType: 'front',
        saveToPhotos: false,
      },
      async (response) => {
        if (response.didCancel || !response.assets?.[0]?.uri) {
          setStep('located');
          return;
        }

        const photoUri = response.assets[0].uri;
        setSelfieUri(photoUri);
        setStep('submitting');

        await submitCheckIn(lat, lng, dist, withinRadius, photoUri, override);
      },
    );
  };

  const submitCheckIn = async (
    lat: number,
    lng: number,
    dist: number,
    withinRadius: boolean,
    photoUri: string,
    override?: string,
  ) => {
    setProcessing(true);

    try {
      const netState = await NetInfo.fetch();

      if (!netState.isConnected) {
        // Queue for offline
        await enqueue('check_in', {
          boothId: assignment!.booth._id,
          latitude: lat,
          longitude: lng,
          distanceFromBooth: Math.round(dist),
          isWithinRadius: withinRadius,
          overrideReason: override,
          selfieUri: photoUri,
        });
        Alert.alert(
          'Queued for Sync',
          'Check-in saved offline. It will sync when connectivity is restored.',
        );
        setStep('idle');
        setProcessing(false);
        return;
      }

      // Upload selfie
      const fileName = generateFileName('checkin_selfie');
      const uploadResult = await uploadImage(photoUri, fileName, '/election/check-ins');

      // Submit check-in
      const response = await api.post('/check-ins', {
        boothId: assignment!.booth._id,
        latitude: lat,
        longitude: lng,
        selfieUrl: uploadResult.url,
        distanceFromBooth: Math.round(dist),
        isWithinRadius: withinRadius,
        overrideReason: override,
      });

      if (response.data.success) {
        setExistingCheckIn(response.data.data);
        setShowOverride(false);
        setOverrideReason('');
        Alert.alert('Success', 'You have been checked in successfully!');
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message || 'Check-in failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setProcessing(false);
      setStep('idle');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Already checked in
  if (existingCheckIn) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centeredContent}>
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Icon name="check-circle" size={64} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Checked In</Text>
          <Text style={styles.successTime}>
            {formatTime(existingCheckIn.checkedInAt)}
          </Text>

          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Icon name="map-marker" size={18} color={COLORS.grey500} />
              <Text style={styles.detailText}>
                Distance: {formatDistance(existingCheckIn.distanceFromBooth)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Icon
                name={
                  existingCheckIn.isWithinRadius
                    ? 'check-circle'
                    : 'alert-circle'
                }
                size={18}
                color={
                  existingCheckIn.isWithinRadius
                    ? COLORS.success
                    : COLORS.warning
                }
              />
              <Text style={styles.detailText}>
                {existingCheckIn.isWithinRadius
                  ? 'Within booth radius'
                  : 'Override used'}
              </Text>
            </View>
            {existingCheckIn.overrideReason && (
              <View style={styles.detailRow}>
                <Icon name="text" size={18} color={COLORS.grey500} />
                <Text style={styles.detailText}>
                  Reason: {existingCheckIn.overrideReason}
                </Text>
              </View>
            )}
          </View>

          {existingCheckIn.selfieUrl && (
            <Image
              source={{ uri: existingCheckIn.selfieUrl }}
              style={styles.selfiePreview}
            />
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.centeredContent}>
      <View style={styles.card}>
        <View style={styles.boothInfo}>
          <Icon name="map-marker-radius" size={24} color={COLORS.primary} />
          <Text style={styles.boothName}>
            {assignment?.booth.name || 'No Booth Assigned'}
          </Text>
        </View>

        {/* Distance info if already located */}
        {distance !== null && (
          <View style={styles.distanceBox}>
            <Icon
              name="map-marker-distance"
              size={20}
              color={
                distance <= CHECK_IN_RADIUS_METERS
                  ? COLORS.success
                  : COLORS.danger
              }
            />
            <Text
              style={[
                styles.distanceText,
                {
                  color:
                    distance <= CHECK_IN_RADIUS_METERS
                      ? COLORS.success
                      : COLORS.danger,
                },
              ]}>
              {formatDistance(distance)} from booth
            </Text>
          </View>
        )}

        {/* Override form */}
        {showOverride && (
          <View style={styles.overrideBox}>
            <View style={styles.overrideHeader}>
              <Icon name="alert" size={20} color={COLORS.danger} />
              <Text style={styles.overrideTitle}>
                You are {formatDistance(distance || 0)} away
              </Text>
            </View>
            <Text style={styles.overrideSubtitle}>
              You need to be within {CHECK_IN_RADIUS_METERS}m of the booth.
              Provide a reason to override:
            </Text>
            <TextInput
              style={styles.overrideInput}
              placeholder="Enter reason for distance override..."
              placeholderTextColor={COLORS.grey400}
              value={overrideReason}
              onChangeText={setOverrideReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[
                styles.overrideButton,
                !overrideReason.trim() && styles.buttonDisabled,
              ]}
              onPress={handleOverrideSubmit}
              disabled={!overrideReason.trim() || processing}>
              {processing ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.overrideButtonText}>
                  Override & Take Selfie
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Main Check-In Button */}
        {!showOverride && (
          <TouchableOpacity
            style={styles.checkInButton}
            onPress={handleCheckIn}
            disabled={processing || gpsLoading || !assignment}
            activeOpacity={0.8}>
            {processing || gpsLoading ? (
              <ActivityIndicator color={COLORS.white} size="large" />
            ) : (
              <>
                <Icon name="map-marker-check" size={48} color={COLORS.white} />
                <Text style={styles.checkInButtonText}>Check In</Text>
                <Text style={styles.checkInSubtext}>
                  Tap to verify your location & capture selfie
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centeredContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  boothInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    justifyContent: 'center',
  },
  boothName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.grey800,
  },
  distanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    padding: 10,
    backgroundColor: COLORS.grey100,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkInButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  checkInButtonText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12,
  },
  checkInSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  overrideBox: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: 12,
    padding: 16,
  },
  overrideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  overrideTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.danger,
  },
  overrideSubtitle: {
    fontSize: 13,
    color: COLORS.grey600,
    marginBottom: 12,
    lineHeight: 18,
  },
  overrideInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.grey300,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORS.grey800,
    minHeight: 80,
    marginBottom: 14,
  },
  overrideButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  overrideButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    backgroundColor: COLORS.grey300,
  },
  successCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  successIcon: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.success,
    marginBottom: 4,
  },
  successTime: {
    fontSize: 18,
    color: COLORS.grey600,
    fontWeight: '600',
    marginBottom: 20,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: COLORS.grey100,
    borderRadius: 10,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.grey600,
    flex: 1,
  },
  selfiePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.successLight,
  },
});

export default CheckInScreen;
