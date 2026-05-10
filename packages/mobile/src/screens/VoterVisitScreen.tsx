import React, { useEffect, useMemo, useState } from 'react';
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
  Modal,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import api from '../services/api';
import { trySubmitNow } from '../services/visitQueue';
import { useI18n } from '../i18n';
import { COLORS } from '../utils/constants';
import { FONTS, RADIUS } from '../utils/theme';
import {
  PARTIES,
  CASTES,
  RELIGIONS,
  partyLabel,
  casteLabel,
  subCasteLabel,
  religionLabel,
  castesForReligion,
} from '../utils/voterOptions';
import { dualLanguage } from '../utils/hindify';
import { ensureCameraPermission, ensureGalleryPermission } from '../utils/permissions';
import AppBar from '../components/AppBar';
import Avatar from '../components/Avatar';
import Btn from '../components/Btn';
import Card from '../components/Card';
import Chip from '../components/Chip';
import Field from '../components/Field';
import GrievanceChip from '../components/GrievanceChip';
import IntentCard from '../components/IntentCard';
import SectionLabel from '../components/SectionLabel';
import type { RootStackParamList, VoterData } from '../types';

interface Props {
  route: RouteProp<RootStackParamList, 'VoterVisit'>;
  navigation: StackNavigationProp<RootStackParamList, 'VoterVisit'>;
}

const INTENTIONS: Array<{
  key: string;
  en: string;
  hi: string;
  tone: 'success' | 'brass' | 'danger' | 'info';
  icon: string;
}> = [
  { key: 'Will Vote', en: 'Will Vote', hi: 'वोट देंगे', tone: 'success', icon: 'thumb-up' },
  { key: 'May Vote', en: 'May Vote', hi: 'शायद वोट दें', tone: 'brass', icon: 'help-circle-outline' },
  { key: "Won't Vote", en: "Won't Vote", hi: 'नहीं देंगे', tone: 'danger', icon: 'thumb-down' },
  { key: 'First-Time Voter', en: 'First-time', hi: 'पहली बार', tone: 'info', icon: 'star-outline' },
];

const GRIEVANCE_LIST: Array<{ code: string; en: string; hi: string }> = [
  { code: 'Roads', en: 'Roads', hi: 'सड़क' },
  { code: 'Water', en: 'Water', hi: 'पानी' },
  { code: 'Electricity', en: 'Electricity', hi: 'बिजली' },
  { code: 'Employment', en: 'Employment', hi: 'रोज़गार' },
  { code: 'Education', en: 'Education', hi: 'शिक्षा' },
  { code: 'Health', en: 'Health', hi: 'स्वास्थ्य' },
  { code: 'Pension', en: 'Pension', hi: 'पेंशन' },
  { code: 'Corruption', en: 'Corruption', hi: 'भ्रष्टाचार' },
  { code: 'LawAndOrder', en: 'Law & Order', hi: 'कानून' },
  { code: 'Other', en: 'Other', hi: 'अन्य' },
];

interface VoterDataWithHi extends VoterData {
  fullNameHi?: string;
  fatherOrHusbandNameHi?: string;
  addressHi?: string;
  favouriteCandidateHi?: string;
  problemDescriptionHi?: string;
  staffRemarksHi?: string;
}

type PickerState =
  | { kind: 'party' }
  | { kind: 'caste' }
  | { kind: 'subCaste' }
  | { kind: 'religion' }
  | null;

const VoterVisitScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t, lang } = useI18n();
  const { voterId } = route.params;
  const [voter, setVoter] = useState<VoterDataWithHi | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [votingIntention, setVotingIntention] = useState('');
  const [partySupport, setPartySupport] = useState('');
  const [favouriteCandidate, setFavouriteCandidate] = useState('');
  const [staffRemarks, setStaffRemarks] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [caste, setCaste] = useState('');
  const [subCaste, setSubCaste] = useState('');
  const [religion, setReligion] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [grievances, setGrievances] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  const [picker, setPicker] = useState<PickerState>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/voters/${voterId}`);
        const v: VoterDataWithHi = res.data.data;
        setVoter(v);
        setVotingIntention(v.votingIntention || '');
        setPartySupport(v.partySupport || '');
        setFavouriteCandidate(
          (lang === 'hi' ? v.favouriteCandidateHi || v.favouriteCandidate : v.favouriteCandidate) || '',
        );
        setStaffRemarks((lang === 'hi' ? v.staffRemarksHi || v.staffRemarks : v.staffRemarks) || '');
        setMobileNumber(v.mobileNumber || '');
        setEmail(v.email || '');
        setAadhaarNumber(v.aadhaarNumber || '');
        setCaste(v.caste || '');
        setSubCaste(v.subCaste || '');
        setReligion(v.religion || '');
        setProblemDescription(
          (lang === 'hi' ? v.problemDescriptionHi || v.problemDescription : v.problemDescription) || '',
        );
        setGrievances(Array.isArray(v.grievances) ? v.grievances : []);
      } catch (err: any) {
        Alert.alert(t('error'), err.response?.data?.error || t('visit_load_failed'));
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [voterId, navigation, lang, t]);

  function toggleGrievance(g: string) {
    setGrievances((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function pickPhoto(source: 'camera' | 'library') {
    const cb = (res: any) => {
      // Image-picker reports `didCancel` when the user backs out of the
      // OS picker — that's not an error, just a no-op. `errorCode` shows
      // up if a runtime permission was still missing somehow; surface it.
      if (res?.didCancel) return;
      if (res?.errorCode) {
        Alert.alert(t('error'), res.errorMessage || res.errorCode);
        return;
      }
      if (res?.assets?.[0]?.uri) setPhotoUri(res.assets[0].uri);
    };

    if (source === 'camera') {
      const granted = await ensureCameraPermission();
      if (!granted) return;
      launchCamera({ mediaType: 'photo', quality: 0.7, saveToPhotos: false }, cb);
    } else {
      const granted = await ensureGalleryPermission();
      if (!granted) return;
      launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, cb);
    }
  }

  const availableCastes = useMemo(() => castesForReligion(religion), [religion]);
  const activeCasteEntry = useMemo(() => CASTES.find((c) => c.code === caste), [caste]);

  // When religion changes, drop the previously-picked caste/sub-caste if
  // they no longer apply to the new religion. Without this, switching from
  // Hindu→Muslim would leave "Yadav" hanging in the saved payload.
  useEffect(() => {
    if (!religion) return;
    if (caste && !availableCastes.some((c) => c.code === caste)) {
      setCaste('');
      setSubCaste('');
    }
  }, [religion, caste, availableCastes]);

  function openPicker(kind: 'party' | 'caste' | 'subCaste' | 'religion') {
    if (kind === 'subCaste' && !activeCasteEntry) return;
    setPickerSearch('');
    setPicker({ kind });
  }

  function closePicker() {
    setPicker(null);
    setPickerSearch('');
  }

  function selectPicker(code: string) {
    if (!picker) return;
    if (picker.kind === 'party') setPartySupport(code);
    else if (picker.kind === 'caste') {
      setCaste(code);
      setSubCaste('');
    } else if (picker.kind === 'subCaste') setSubCaste(code);
    else if (picker.kind === 'religion') setReligion(code);
    closePicker();
  }

  function validateAndPreview() {
    if (!voter) return;
    if (!votingIntention) {
      Alert.alert(t('required'), t('visit_required_intention'));
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert(t('required'), t('visit_invalid_email'));
      return;
    }
    if (aadhaarNumber && !/^[0-9]{12}$/.test(aadhaarNumber.trim())) {
      Alert.alert(t('required'), t('visit_invalid_aadhaar'));
      return;
    }
    if (mobileNumber && !/^[0-9]{10}$/.test(mobileNumber.trim())) {
      Alert.alert(t('required'), t('visit_invalid_mobile'));
      return;
    }
    setShowPreview(true);
  }

  async function confirmSave() {
    if (!voter) return;
    setShowPreview(false);
    setSaving(true);
    try {
      const candidatePair = dualLanguage(favouriteCandidate);
      const problemPair = dualLanguage(problemDescription);
      const remarksPair = dualLanguage(staffRemarks);
      const payload: Record<string, any> = {
        verificationStatus: true,
        votingIntention,
        partySupport: partySupport || undefined,
        favouriteCandidate: candidatePair.en,
        favouriteCandidateHi: candidatePair.hi,
        staffRemarks: remarksPair.en,
        staffRemarksHi: remarksPair.hi,
        mobileNumber: mobileNumber.trim() || undefined,
        email: email.trim() || undefined,
        aadhaarNumber: aadhaarNumber.trim() || undefined,
        caste: caste || undefined,
        subCaste: subCaste || undefined,
        religion: religion || undefined,
        problemDescription: problemPair.en,
        problemDescriptionHi: problemPair.hi,
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
        Alert.alert(t('visit_saved_title'), t('visit_saved_body'));
      } else {
        Alert.alert(t('visit_queued_title'), t('visit_queued_body'));
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(t('error'), err.response?.data?.error || err.message || t('visit_save_failed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !voter) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.indigo} size="large" />
        <Text style={styles.loadingText}>{t('visit_loading')}</Text>
      </View>
    );
  }

  const displayName = lang === 'hi' ? voter.fullNameHi || voter.fullName : voter.fullName;
  const displayFather =
    lang === 'hi' ? voter.fatherOrHusbandNameHi || voter.fatherOrHusbandName : voter.fatherOrHusbandName;
  const partyText = partyLabel(partySupport, lang);
  const casteText = casteLabel(caste, lang);
  const subCasteText = subCasteLabel(caste, subCaste, lang);
  const religionText = religionLabel(religion, lang);
  const initials = displayName.split(' ').map((s) => s[0]?.toUpperCase()).slice(0, 2).join('');

  const previewCandidate = favouriteCandidate
    ? lang === 'hi'
      ? dualLanguage(favouriteCandidate).hi ?? favouriteCandidate
      : dualLanguage(favouriteCandidate).en ?? favouriteCandidate
    : '';
  const previewProblem = problemDescription
    ? lang === 'hi'
      ? dualLanguage(problemDescription).hi ?? problemDescription
      : dualLanguage(problemDescription).en ?? problemDescription
    : '';
  const previewRemarks = staffRemarks
    ? lang === 'hi'
      ? dualLanguage(staffRemarks).hi ?? staffRemarks
      : dualLanguage(staffRemarks).en ?? staffRemarks
    : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
      <AppBar
        title="Voter visit"
        hi="मतदाता विज़िट"
        back
        onBack={() => navigation.goBack()}
        right={
          <Text style={styles.serialChip}>
            {String(voter.voterSerialNumber).padStart(3, '0')}
          </Text>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Card padding={14}>
          <View style={styles.heroRow}>
            {voter.voterPhoto ? (
              <Image source={{ uri: voter.voterPhoto }} style={styles.heroPhoto} />
            ) : (
              <Avatar name={initials || 'AK'} tone="indigo" size={56} />
            )}
            <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
              <Text style={styles.heroName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.heroNameHi} numberOfLines={1}>
                {voter.fullNameHi || displayName}
              </Text>
              <View style={styles.heroChips}>
                <Chip tone="neutral">
                  {voter.gender} · {voter.age}
                </Chip>
                <View style={{ width: 6 }} />
                <Chip tone="neutral">Serial {voter.voterSerialNumber}</Chip>
              </View>
            </View>
          </View>
          <View style={styles.heroEpicRow}>
            <Text style={styles.heroEpic}>EPIC · {voter.epicNumber}</Text>
            <Text style={styles.heroEpic}>S/o {displayFather}</Text>
          </View>
        </Card>

        {/* Voting intention */}
        <SectionLabel num="1" en="Voting intention" hi="मतदान का इरादा" />
        <View style={styles.intentionGrid}>
          {INTENTIONS.map((i) => (
            <View key={i.key} style={{ width: '48%' }}>
              <IntentCard
                tone={i.tone}
                en={i.en}
                hi={i.hi}
                icon={i.icon}
                selected={votingIntention === i.key}
                onPress={() => setVotingIntention(i.key)}
              />
            </View>
          ))}
        </View>

        {/* Party & candidate */}
        <SectionLabel num="2" en="Party & candidate" hi="पार्टी और उम्मीदवार" />
        <Field
          label="Party support"
          hi="समर्थित पार्टी"
          readOnlyValue={partyText}
          placeholder="Select a party · पार्टी चुनें"
          onPress={() => openPicker('party')}
          suffix={<Icon name="chevron-down" size={16} color={COLORS.muted} />}
        />
        <Field
          label="Favourite candidate"
          hi="पसंदीदा उम्मीदवार"
          value={favouriteCandidate}
          onChangeText={setFavouriteCandidate}
          placeholder="Type or transliterate · टाइप करें"
        />

        {/* Identity & reach */}
        <SectionLabel num="3" en="Identity & reach" hi="पहचान" />
        <Field
          label="Religion"
          hi="धर्म"
          readOnlyValue={religionText}
          placeholder="Select religion · धर्म चुनें"
          onPress={() => openPicker('religion')}
          suffix={<Icon name="chevron-down" size={16} color={COLORS.muted} />}
        />
        <Field
          label="Caste"
          hi="जाति"
          readOnlyValue={casteText}
          placeholder="Select caste · जाति चुनें"
          onPress={() => openPicker('caste')}
          suffix={<Icon name="chevron-down" size={16} color={COLORS.muted} />}
        />
        {activeCasteEntry ? (
          <Field
            label="Sub-caste"
            hi="उप-जाति"
            readOnlyValue={subCasteText}
            placeholder="Select sub-caste · उप-जाति चुनें"
            onPress={() => openPicker('subCaste')}
            suffix={<Icon name="chevron-down" size={16} color={COLORS.muted} />}
          />
        ) : null}
        <Field
          label="Mobile"
          hi="मोबाइल"
          mono
          value={mobileNumber}
          onChangeText={setMobileNumber}
          keyboardType="phone-pad"
          maxLength={10}
          placeholder="10-digit number"
        />
        <Field
          label="Email"
          hi="ईमेल"
          hint="optional"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="name@example.com"
        />
        <Field
          label="Aadhaar"
          hi="आधार"
          hint="optional"
          mono
          value={aadhaarNumber}
          onChangeText={(v) => setAadhaarNumber(v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={12}
          placeholder="12 digits"
        />

        {/* Grievances */}
        <SectionLabel num="4" en="Grievances" hi="शिकायतें" />
        <View style={styles.chipRow}>
          {GRIEVANCE_LIST.map((g) => (
            <GrievanceChip
              key={g.code}
              en={g.en}
              hi={g.hi}
              selected={grievances.includes(g.code)}
              onPress={() => toggleGrievance(g.code)}
            />
          ))}
        </View>

        {/* Notes */}
        <SectionLabel num="5" en="Notes" hi="टिप्पणियाँ" />
        <View style={styles.textareaBox}>
          <TextInput
            value={problemDescription}
            onChangeText={setProblemDescription}
            placeholder="Problem description · समस्या का विवरण"
            placeholderTextColor={COLORS.muted}
            multiline
            style={styles.textarea}
          />
        </View>
        <View style={styles.textareaBox}>
          <TextInput
            value={staffRemarks}
            onChangeText={setStaffRemarks}
            placeholder="Staff remarks · कर्मचारी की टिप्पणी"
            placeholderTextColor={COLORS.muted}
            multiline
            style={styles.textarea}
          />
        </View>

        {/* Photo */}
        <SectionLabel num="6" en="Photo" hi="फ़ोटो" />
        <View style={styles.photoBlock}>
          <View style={styles.photoBox}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImg} />
            ) : (
              <Text style={styles.photoPlaceholder}>voter{'\n'}photo{'\n'}110×130</Text>
            )}
            {photoUri ? (
              <View style={styles.photoOk}>
                <Text style={styles.photoOkText}>OK</Text>
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1, marginLeft: 12, justifyContent: 'space-between' }}>
            <Text style={styles.photoNote}>
              {photoUri
                ? 'Captured. Faces are stored only on this device until sync.'
                : 'Capture or pick a photo. Stored only on this device until sync.'}
              {'\n'}
              <Text style={styles.photoNoteHi}>सिंक तक डिवाइस में।</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn size="sm" kind="secondary" onPress={() => pickPhoto('camera')}>
                {photoUri ? 'Replace' : 'Camera'}
              </Btn>
              <Btn size="sm" kind="ghost" onPress={() => pickPhoto('library')}>
                Gallery
              </Btn>
            </View>
            {photoUri ? (
              <TouchableOpacity onPress={() => setPhotoUri(undefined)} style={styles.photoRemove}>
                <Icon name="close" size={12} color={COLORS.danger} />
                <Text style={styles.photoRemoveText}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Sticky save */}
      <View style={styles.footer}>
        <Btn full size="lg" loading={saving} onPress={validateAndPreview} icon={<Icon name="eye-outline" size={18} color={COLORS.white} />}>
          Preview & save · पूर्वावलोकन
        </Btn>
      </View>

      <PickerModal
        visible={!!picker}
        onClose={closePicker}
        title={
          picker?.kind === 'party'
            ? 'Choose party · पार्टी चुनें'
            : picker?.kind === 'caste'
              ? 'Choose caste · जाति चुनें'
              : picker?.kind === 'religion'
                ? 'Choose religion · धर्म चुनें'
                : 'Choose sub-caste · उप-जाति'
        }
        search={pickerSearch}
        onSearch={setPickerSearch}
        searchPlaceholder="Search · खोजें"
        items={
          picker?.kind === 'party'
            ? PARTIES.map((p) => ({
                code: p.code,
                label: lang === 'hi' ? p.labelHi : p.labelEn,
                selected: partySupport === p.code,
              }))
            : picker?.kind === 'caste'
              ? availableCastes.map((c) => ({
                  code: c.code,
                  label: lang === 'hi' ? c.labelHi : c.labelEn,
                  selected: caste === c.code,
                }))
              : picker?.kind === 'religion'
                ? RELIGIONS.map((r) => ({
                    code: r.code,
                    label: lang === 'hi' ? r.labelHi : r.labelEn,
                    selected: religion === r.code,
                  }))
                : (activeCasteEntry?.subCastes || []).map((s) => ({
                    code: s.code,
                    label: lang === 'hi' ? s.labelHi : s.labelEn,
                    selected: subCaste === s.code,
                  }))
        }
        onSelect={selectPicker}
        emptyText="No matches"
      />

      <PreviewModal
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={confirmSave}
        voterName={displayName}
        voterNameHi={voter.fullNameHi || displayName}
        gender={voter.gender}
        age={voter.age}
        epic={voter.epicNumber}
        serial={voter.voterSerialNumber}
        rows={[
          {
            label: 'Voting intention',
            hi: 'मतदान का इरादा',
            value: INTENTIONS.find((i) => i.key === votingIntention)?.en || '—',
            tone: 'success',
          },
          { label: 'Party support', hi: 'समर्थित पार्टी', value: partyText || '—' },
          { label: 'Favourite candidate', hi: 'पसंदीदा उम्मीदवार', value: previewCandidate || '—', muted: !previewCandidate },
          { label: 'Religion', hi: 'धर्म', value: religionText || '—', muted: !religionText },
          { label: 'Caste · Sub-caste', hi: 'जाति · उप-जाति', value: [casteText, subCasteText].filter(Boolean).join(' · ') || '—' },
          { label: 'Mobile', hi: 'मोबाइल', value: mobileNumber || '—', mono: true },
          { label: 'Email', hi: 'ईमेल', value: email || '—' },
          { label: 'Aadhaar', hi: 'आधार', value: aadhaarNumber || '—', mono: true },
          {
            label: 'Grievances',
            hi: 'शिकायतें',
            value:
              grievances.length > 0
                ? grievances.map((g) => GRIEVANCE_LIST.find((x) => x.code === g)?.en || g).join(', ')
                : '—',
          },
          { label: 'Notes', hi: 'टिप्पणियाँ', value: previewProblem || '—' },
          { label: 'Remarks', hi: 'कर्मचारी टिप्पणी', value: previewRemarks || '—' },
          { label: 'Photo', hi: 'फ़ोटो', value: photoUri ? 'Captured' : '—' },
        ]}
      />
    </View>
  );
};

interface PickerItem {
  code: string;
  label: string;
  selected: boolean;
}

const PickerModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  title: string;
  items: PickerItem[];
  onSelect: (code: string) => void;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder: string;
  emptyText: string;
}> = ({ visible, onClose, title, items, onSelect, search, onSearch, searchPlaceholder, emptyText }) => {
  const q = search.trim().toLowerCase();
  const filtered = q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color={COLORS.mutedDeep} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearch}>
            <Icon name="magnify" size={16} color={COLORS.muted} />
            <TextInput
              value={search}
              onChangeText={onSearch}
              placeholder={searchPlaceholder}
              placeholderTextColor={COLORS.muted}
              style={styles.modalSearchInput}
            />
          </View>
          <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
            {filtered.length === 0 ? (
              <Text style={styles.modalEmpty}>{emptyText}</Text>
            ) : (
              filtered.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.modalItem, item.selected && styles.modalItemActive]}
                  onPress={() => onSelect(item.code)}>
                  <Text style={[styles.modalItemText, item.selected && styles.modalItemTextActive]}>
                    {item.label}
                  </Text>
                  {item.selected && <Icon name="check" size={18} color={COLORS.indigo} />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

interface PreviewRow {
  label: string;
  hi?: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
  tone?: 'success';
}

const PreviewModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  voterName: string;
  voterNameHi: string;
  gender: string;
  age: number;
  epic: string;
  serial: number;
  rows: PreviewRow[];
}> = ({ visible, onClose, onConfirm, voterName, voterNameHi, gender, age, epic, serial, rows }) => {
  const initials = voterName
    .split(' ')
    .map((s) => s[0]?.toUpperCase())
    .slice(0, 2)
    .join('');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { maxHeight: '92%', backgroundColor: COLORS.cream }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Preview & confirm</Text>
              <Text style={styles.modalSubtitle}>पूर्वावलोकन और पुष्टि</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color={COLORS.mutedDeep} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ paddingHorizontal: 14 }} contentContainerStyle={{ paddingBottom: 12 }}>
            <Card padding={14}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: RADIUS.lg,
                    backgroundColor: COLORS.indigoSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontFamily: FONTS.uiBold, fontSize: 18, color: COLORS.indigoDeep }}>
                    {initials}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.previewName}>{voterName}</Text>
                  <Text style={styles.previewNameHi}>
                    {voterNameHi} · {gender} · {age}
                  </Text>
                  <Text style={styles.previewEpic}>
                    {epic} · Serial {String(serial).padStart(3, '0')}
                  </Text>
                </View>
              </View>
            </Card>
            <View style={{ marginTop: 6 }}>
              {rows.map((r) => (
                <View key={r.label} style={styles.previewRow}>
                  <View style={{ minWidth: 110 }}>
                    <Text style={styles.previewLabel}>{r.label}</Text>
                    {r.hi ? <Text style={styles.previewLabelHi}>{r.hi}</Text> : null}
                  </View>
                  <Text
                    style={[
                      styles.previewValue,
                      r.mono ? { fontFamily: FONTS.monoSemiBold } : null,
                      r.muted ? { color: COLORS.muted } : null,
                      r.tone === 'success' ? { color: COLORS.success } : null,
                    ]}
                    numberOfLines={2}>
                    {r.value}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={styles.previewFooter}>
            <Btn kind="ghost" size="lg" onPress={onClose}>
              Edit · संपादित
            </Btn>
            <View style={{ flex: 1 }}>
              <Btn full size="lg" onPress={onConfirm} icon={<Icon name="check" size={16} color={COLORS.white} />}>
                Confirm save · सेव करें
              </Btn>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.uiMedium,
    fontWeight: '500',
  },
  serialChip: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.mono,
    paddingRight: 6,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 96, gap: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroPhoto: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.indigoSoft },
  heroName: {
    fontSize: 16,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
  },
  heroNameHi: {
    fontSize: 13,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.hi,
    marginTop: 1,
  },
  heroChips: { flexDirection: 'row', marginTop: 6 },
  heroEpicRow: {
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroEpic: {
    fontSize: 12,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.monoMedium,
    fontWeight: '500',
  },
  intentionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    rowGap: 8,
    justifyContent: 'space-between',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, rowGap: 6 },
  textareaBox: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.lg,
    padding: 12,
    minHeight: 80,
  },
  textarea: {
    fontSize: 13,
    color: COLORS.ink,
    fontFamily: FONTS.uiMedium,
    fontWeight: '500',
    padding: 0,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  photoBlock: { flexDirection: 'row' },
  photoBox: {
    width: 110,
    height: 130,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: {
    fontSize: 10,
    color: COLORS.muted,
    textAlign: 'center',
    fontFamily: FONTS.mono,
  },
  photoOk: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: COLORS.successSoft,
  },
  photoOkText: {
    fontSize: 9,
    color: '#0F4A2D',
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
  },
  photoNote: {
    fontSize: 12,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.uiMedium,
    fontWeight: '500',
    lineHeight: 18,
  },
  photoNoteHi: { color: COLORS.mutedDeep, fontFamily: FONTS.hi, opacity: 0.8 },
  photoRemove: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  photoRemoveText: {
    fontSize: 11,
    color: COLORS.danger,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
    marginLeft: 4,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: COLORS.cream,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairlineSoft,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,27,45,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 18,
    maxHeight: '78%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.hairline,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.hi,
    marginTop: 2,
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 14,
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    marginBottom: 8,
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: COLORS.ink,
    fontFamily: FONTS.uiMedium,
    fontWeight: '500',
    padding: 0,
  },
  modalList: { paddingTop: 4 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  modalItemActive: { backgroundColor: COLORS.indigoSoft },
  modalItemText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ink,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  },
  modalItemTextActive: { color: COLORS.indigoDeep },
  modalEmpty: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 13,
    paddingVertical: 28,
    fontFamily: FONTS.uiMedium,
    fontWeight: '500',
  },
  previewName: {
    fontSize: 15,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
  },
  previewNameHi: {
    fontSize: 12,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.hi,
  },
  previewEpic: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.mono,
    marginTop: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairlineSoft,
  },
  previewLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  previewLabelHi: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.hi,
    opacity: 0.8,
  },
  previewValue: {
    flex: 1,
    fontSize: 13,
    color: COLORS.ink,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
    textAlign: 'right',
    marginLeft: 12,
  },
  previewFooter: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 4,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairlineSoft,
  },
});

export default VoterVisitScreen;
