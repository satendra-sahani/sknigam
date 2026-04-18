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
  StatusBar,
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

const INTENTIONS = [
  { key: 'Will Vote', icon: 'thumb-up', tone: COLORS.success },
  { key: 'May Vote', icon: 'help-circle-outline', tone: COLORS.warning },
  { key: "Won't Vote", icon: 'thumb-down', tone: COLORS.danger },
  { key: 'First-Time Voter', icon: 'star-outline', tone: COLORS.accent },
] as const;

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
      Alert.alert('Required', 'Please select a voting intention');
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
        Alert.alert('Saved', 'Visit recorded successfully.');
      } else {
        Alert.alert('Queued', 'No internet. Saved locally — will sync when back online.');
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
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading voter details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={COLORS.grey800} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {voter.fullName}
          </Text>
          <Text style={styles.subtitle}>
            #{voter.voterSerialNumber} · {voter.epicNumber}
          </Text>
        </View>
        {voter.verificationStatus && (
          <View style={styles.doneBadge}>
            <Icon name="check" size={12} color={COLORS.white} />
            <Text style={styles.doneBadgeText}>Done</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.voterCard}>
          <View style={styles.voterHero}>
            {voter.voterPhoto ? (
              <Image source={{ uri: voter.voterPhoto }} style={styles.voterPhoto} />
            ) : (
              <View style={styles.voterAvatar}>
                <Text style={styles.voterInitial}>{voter.fullName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.voterHeroName}>{voter.fullName}</Text>
              <Text style={styles.voterHeroMeta}>
                {voter.gender === 'M' ? 'Male' : voter.gender === 'F' ? 'Female' : 'Other'} · {voter.age} years
              </Text>
            </View>
          </View>
          <View style={styles.voterGrid}>
            <InfoCell label="Father / Husband" value={voter.fatherOrHusbandName} />
            {voter.caste && <InfoCell label="Caste" value={voter.caste} />}
            {voter.religion && <InfoCell label="Religion" value={voter.religion} />}
            <InfoCell label="Address" value={voter.address} full />
          </View>
        </View>

        <Section title="Voting Intention" required>
          <View style={styles.intentionGrid}>
            {INTENTIONS.map((i) => {
              const active = votingIntention === i.key;
              return (
                <TouchableOpacity
                  key={i.key}
                  activeOpacity={0.8}
                  onPress={() => setVotingIntention(i.key)}
                  style={[
                    styles.intentionCard,
                    active && { backgroundColor: i.tone, borderColor: i.tone },
                  ]}>
                  <Icon name={i.icon} size={22} color={active ? COLORS.white : i.tone} />
                  <Text style={[styles.intentionText, active && { color: COLORS.white }]}>{i.key}</Text>
                </TouchableOpacity>
              );
            })}
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
          <View style={styles.inputWithIcon}>
            <Icon name="phone-outline" size={18} color={COLORS.grey400} />
            <TextInput
              value={mobileNumber}
              onChangeText={setMobileNumber}
              placeholder="10 digits"
              placeholderTextColor={COLORS.grey400}
              keyboardType="phone-pad"
              maxLength={10}
              style={styles.inputInner}
            />
          </View>
        </Section>

        <Section title="Grievances" helper={grievances.length > 0 ? `${grievances.length} selected` : undefined}>
          <View style={styles.chipRow}>
            {GRIEVANCES.map((g) => {
              const active = grievances.includes(g);
              return (
                <TouchableOpacity
                  key={g}
                  activeOpacity={0.8}
                  onPress={() => toggleGrievance(g)}
                  style={[styles.chip, active && styles.chipActive]}>
                  {active && <Icon name="check" size={12} color={COLORS.white} />}
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        <Section title="Remarks">
          <TextInput
            value={staffRemarks}
            onChangeText={setStaffRemarks}
            placeholder="Optional notes from this visit..."
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
                <Icon name="close" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={styles.photoBtnRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => pickPhoto('camera')}>
              <Icon name="camera-outline" size={18} color={COLORS.primary} />
              <Text style={styles.secondaryBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => pickPhoto('library')}>
              <Icon name="image-outline" size={18} color={COLORS.primary} />
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
              <Icon name="check-circle" size={20} color={COLORS.white} />
              <Text style={styles.saveBtnText}>Save Visit</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

function Section({
  title,
  children,
  required,
  helper,
}: {
  title: string;
  children: React.ReactNode;
  required?: boolean;
  helper?: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {title}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        {helper && <Text style={styles.sectionHelper}>{helper}</Text>}
      </View>
      {children}
    </View>
  );
}

function InfoCell({ label, value, full }: { label: string; value?: string; full?: boolean }) {
  if (!value) return null;
  return (
    <View style={[styles.infoCell, full && { width: '100%' }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: COLORS.grey500 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey200,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.grey100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.grey800 },
  subtitle: { fontSize: 12, color: COLORS.grey500, marginTop: 2, fontFamily: 'monospace' },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  doneBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 30 },
  voterCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.grey200,
  },
  voterHero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.grey100 },
  voterPhoto: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.grey100 },
  voterAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voterInitial: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  voterHeroName: { fontSize: 17, fontWeight: '800', color: COLORS.grey800 },
  voterHeroMeta: { fontSize: 13, color: COLORS.grey500, marginTop: 3 },
  voterGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 12, gap: 14 },
  infoCell: { width: '45%' },
  infoLabel: { fontSize: 10, color: COLORS.grey500, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 13, color: COLORS.grey800, fontWeight: '600', marginTop: 3 },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.grey200,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.grey800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: { color: COLORS.primary },
  sectionHelper: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  intentionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  intentionCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.grey200,
    backgroundColor: COLORS.white,
  },
  intentionText: { fontSize: 12, fontWeight: '700', color: COLORS.grey800, flex: 1 },
  input: {
    backgroundColor: COLORS.grey100,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.grey800,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.grey100,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputInner: { flex: 1, paddingVertical: 12, fontSize: 14, color: COLORS.grey800 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.grey100,
    borderWidth: 1,
    borderColor: COLORS.grey200,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.grey700, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  photoBox: { position: 'relative', marginBottom: 10 },
  photo: { width: '100%', height: 200, borderRadius: 12, backgroundColor: COLORS.grey100 },
  photoRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBtnRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
  },
  secondaryBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  footer: {
    padding: 14,
    paddingBottom: 18,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grey200,
  },
  saveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
  },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
});

export default VoterVisitScreen;
