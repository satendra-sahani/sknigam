import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import api from '../services/api';
import { trySubmitNow } from '../services/visitQueue';
import { COLORS } from '../utils/constants';
import type { RootStackParamList, VoterData } from '../types';

interface Props {
  route: RouteProp<RootStackParamList, 'VoterVisit'>;
  navigation: StackNavigationProp<RootStackParamList, 'VoterVisit'>;
}

const INTENTIONS = ['Will Vote', 'May Vote', "Won't Vote", 'First-Time Voter'] as const;
const GRIEVANCES = [
  'Roads',
  'Water',
  'Electricity',
  'Employment',
  'Education',
  'Health',
  'Pension',
  'Corruption',
  'LawAndOrder',
  'Other',
] as const;

const VoterVisitScreen: React.FC<Props> = ({ route, navigation }) => {
  const { voterId } = route.params;
  const [voter, setVoter] = useState<VoterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [votingIntention, setVotingIntention] = useState('');
  const [favouriteCandidate, setFavouriteCandidate] = useState('');
  const [staffRemarks, setStaffRemarks] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [grievances, setGrievances] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/voters/${voterId}`);
        const v: VoterData & { grievances?: string[] } = res.data.data;
        setVoter(v);
        setVotingIntention(v.votingIntention || '');
        setFavouriteCandidate(v.favouriteCandidate || '');
        setStaffRemarks(v.staffRemarks || '');
        setMobileNumber(v.mobileNumber || '');
        setGrievances(Array.isArray(v.grievances) ? v.grievances : []);
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.error || 'Failed to load voter');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [voterId, navigation]);

  function toggleGrievance(g: string) {
    setGrievances((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function pickPhoto(source: 'camera' | 'library') {
    const cb = (res: any) => {
      if (res?.assets?.[0]?.uri) setPhotoUri(res.assets[0].uri);
    };
    if (source === 'camera') {
      launchCamera({ mediaType: 'photo', quality: 0.7, saveToPhotos: false }, cb);
    } else {
      launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, cb);
    }
  }

  async function save() {
    if (!voter) return;
    if (!votingIntention) {
      Alert.alert('Required', 'Select a voting intention');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        verificationStatus: true,
        votingIntention,
        favouriteCandidate: favouriteCandidate.trim() || undefined,
        staffRemarks: staffRemarks.trim() || undefined,
        mobileNumber: mobileNumber.trim() || undefined,
        grievances,
        visitDate: new Date().toISOString(),
      };
      const result = await trySubmitNow({
        voterId,
        voterName: voter.fullName,
        boothId: voter.boothId,
        payload,
        photoUri,
      });
      if (result.submitted) {
        Alert.alert('Saved', 'Visit recorded.');
      } else {
        Alert.alert('Queued', 'No connection — saved locally. It will sync when online.');
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !voter) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={COLORS.grey700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{voter.fullName}</Text>
          <Text style={styles.subtitle}>
            Serial {voter.voterSerialNumber} · {voter.epicNumber}
          </Text>
        </View>
        {voter.verificationStatus && (
          <View style={styles.doneBadge}>
            <Icon name="check" size={14} color={COLORS.white} />
            <Text style={styles.doneBadgeText}>Done</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Section title="Voter Info">
          <InfoRow label="Father/Husband" value={voter.fatherOrHusbandName} />
          <InfoRow label="Gender · Age" value={`${voter.gender} · ${voter.age}y`} />
          <InfoRow label="Address" value={voter.address} />
          {voter.caste && <InfoRow label="Caste" value={voter.caste} />}
          {voter.religion && <InfoRow label="Religion" value={voter.religion} />}
        </Section>

        <Section title="Voting Intention *">
          <View style={styles.chipRow}>
            {INTENTIONS.map((i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setVotingIntention(i)}
                style={[styles.chip, votingIntention === i && styles.chipActive]}>
                <Text style={[styles.chipText, votingIntention === i && styles.chipTextActive]}>{i}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section title="Favourite Candidate / Party">
          <TextInput
            value={favouriteCandidate}
            onChangeText={setFavouriteCandidate}
            placeholder="e.g. BJP, SP, Candidate name"
            placeholderTextColor={COLORS.grey400}
            style={styles.input}
          />
        </Section>

        <Section title="Mobile Number">
          <TextInput
            value={mobileNumber}
            onChangeText={setMobileNumber}
            placeholder="10 digits"
            placeholderTextColor={COLORS.grey400}
            keyboardType="phone-pad"
            maxLength={10}
            style={styles.input}
          />
        </Section>

        <Section title="Grievances">
          <View style={styles.chipRow}>
            {GRIEVANCES.map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => toggleGrievance(g)}
                style={[styles.chip, grievances.includes(g) && styles.chipActive]}>
                <Text style={[styles.chipText, grievances.includes(g) && styles.chipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section title="Remarks">
          <TextInput
            value={staffRemarks}
            onChangeText={setStaffRemarks}
            placeholder="Optional notes from the visit"
            placeholderTextColor={COLORS.grey400}
            multiline
            style={[styles.input, styles.textarea]}
          />
        </Section>

        <Section title="Photo">
          {photoUri ? (
            <View style={styles.photoBox}>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              <TouchableOpacity onPress={() => setPhotoUri(undefined)} style={styles.photoRemove}>
                <Icon name="close-circle" size={22} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ) : voter.voterPhoto ? (
            <Image source={{ uri: voter.voterPhoto }} style={styles.photo} />
          ) : null}
          <View style={styles.photoBtnRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => pickPhoto('camera')}>
              <Icon name="camera" size={18} color={COLORS.primary} />
              <Text style={styles.secondaryBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => pickPhoto('library')}>
              <Icon name="image-multiple" size={18} color={COLORS.primary} />
              <Text style={styles.secondaryBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </Section>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={save} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Icon name="check" size={18} color={COLORS.white} />
              <Text style={styles.saveBtnText}>Save Visit</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey200,
  },
  backBtn: { padding: 6 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.grey800 },
  subtitle: { fontSize: 12, color: COLORS.grey500 },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  doneBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 30 },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  infoLabel: { fontSize: 12, color: COLORS.grey500 },
  infoValue: { fontSize: 13, color: COLORS.grey800, fontWeight: '600', flex: 1, textAlign: 'right' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.grey100,
  },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.grey700, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  input: {
    backgroundColor: COLORS.grey100,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.grey800,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  photoBox: { position: 'relative' },
  photo: { width: '100%', height: 180, borderRadius: 10, marginBottom: 10, backgroundColor: COLORS.grey100 },
  photoRemove: { position: 'absolute', top: 6, right: 6, backgroundColor: COLORS.white, borderRadius: 12 },
  photoBtnRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
  },
  secondaryBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  footer: {
    padding: 14,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grey200,
  },
  saveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  saveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});

export default VoterVisitScreen;
