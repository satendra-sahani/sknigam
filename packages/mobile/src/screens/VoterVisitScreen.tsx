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
import {
  PARTIES,
  CASTES,
  partyLabel,
  casteLabel,
  subCasteLabel,
} from '../utils/voterOptions';
import { dualLanguage } from '../utils/hindify';
import type { RootStackParamList, VoterData } from '../types';

interface Props {
  route: RouteProp<RootStackParamList, 'VoterVisit'>;
  navigation: StackNavigationProp<RootStackParamList, 'VoterVisit'>;
}

const INTENTIONS = [
  { key: 'Will Vote', labelKey: 'visit_intention_will', icon: 'thumb-up', tone: COLORS.success },
  { key: 'May Vote', labelKey: 'visit_intention_may', icon: 'help-circle-outline', tone: COLORS.warning },
  { key: "Won't Vote", labelKey: 'visit_intention_wont', icon: 'thumb-down', tone: COLORS.danger },
  { key: 'First-Time Voter', labelKey: 'visit_intention_first', icon: 'star-outline', tone: COLORS.accent },
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
  }, [voterId, navigation, lang]);

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

  const activeCasteEntry = useMemo(() => CASTES.find((c) => c.code === caste), [caste]);

  function openPicker(kind: 'party' | 'caste' | 'subCaste') {
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
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>{t('visit_loading')}</Text>
      </View>
    );
  }

  const displayName = lang === 'hi' ? voter.fullNameHi || voter.fullName : voter.fullName;
  const displayFather =
    lang === 'hi' ? voter.fatherOrHusbandNameHi || voter.fatherOrHusbandName : voter.fatherOrHusbandName;
  const displayAddress = lang === 'hi' ? voter.addressHi || voter.address : voter.address;
  const genderLabel =
    voter.gender === 'M'
      ? t('visit_gender_male')
      : voter.gender === 'F'
        ? t('visit_gender_female')
        : t('visit_gender_other');

  const partyText = partyLabel(partySupport, lang);
  const casteText = casteLabel(caste, lang);
  const subCasteText = subCasteLabel(caste, subCaste, lang);

  // In preview, free-text values are shown in the currently-selected
  // language: if the user is viewing in Hindi but typed in Latin, we
  // surface the transliterated Hindi so the review screen stays in one
  // script. Both variants are still persisted by confirmSave().
  const previewCandidate = favouriteCandidate
    ? (lang === 'hi' ? (dualLanguage(favouriteCandidate).hi ?? favouriteCandidate) : (dualLanguage(favouriteCandidate).en ?? favouriteCandidate))
    : '';
  const previewProblem = problemDescription
    ? (lang === 'hi' ? (dualLanguage(problemDescription).hi ?? problemDescription) : (dualLanguage(problemDescription).en ?? problemDescription))
    : '';
  const previewRemarks = staffRemarks
    ? (lang === 'hi' ? (dualLanguage(staffRemarks).hi ?? staffRemarks) : (dualLanguage(staffRemarks).en ?? staffRemarks))
    : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={COLORS.grey800} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.subtitle}>
            #{voter.voterSerialNumber} · {voter.epicNumber}
          </Text>
        </View>
        {voter.verificationStatus && (
          <View style={styles.doneBadge}>
            <Icon name="check" size={12} color={COLORS.white} />
            <Text style={styles.doneBadgeText}>{t('visit_done_badge')}</Text>
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
              <Text style={styles.voterHeroName}>{displayName}</Text>
              <Text style={styles.voterHeroMeta}>
                {genderLabel} · {voter.age} {t('visit_years')}
              </Text>
            </View>
          </View>
          <View style={styles.voterGrid}>
            <InfoCell label={t('visit_label_voter_id')} value={voter.epicNumber} />
            <InfoCell label={t('visit_label_father')} value={displayFather} />
            {voter.religion && <InfoCell label={t('visit_label_religion')} value={voter.religion} />}
            <InfoCell label={t('visit_label_address')} value={displayAddress} full />
          </View>
        </View>

        {lang === 'hi' && (
          <View style={styles.hintBanner}>
            <Icon name="keyboard-outline" size={18} color={COLORS.primary} />
            <Text style={styles.hintBannerText}>{t('visit_hindi_keyboard_hint')}</Text>
          </View>
        )}

        <Section title={t('visit_section_intention')} required>
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
                  <Text style={[styles.intentionText, active && { color: COLORS.white }]}>{t(i.labelKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        <Section title={t('visit_section_party')}>
          <TouchableOpacity style={styles.selectBox} onPress={() => openPicker('party')} activeOpacity={0.85}>
            <Text style={[styles.selectText, !partyText && styles.selectPlaceholder]}>
              {partyText || t('visit_placeholder_party')}
            </Text>
            <Icon name="chevron-down" size={20} color={COLORS.grey500} />
          </TouchableOpacity>
        </Section>

        <Section title={t('visit_section_candidate')} helper={t('visit_dual_lang_note')}>
          <TextInput
            value={favouriteCandidate}
            onChangeText={setFavouriteCandidate}
            placeholder={t('visit_placeholder_candidate')}
            placeholderTextColor={COLORS.grey400}
            style={styles.input}
          />
        </Section>

        <Section title={t('visit_section_caste')}>
          <TouchableOpacity style={styles.selectBox} onPress={() => openPicker('caste')} activeOpacity={0.85}>
            <Text style={[styles.selectText, !casteText && styles.selectPlaceholder]}>
              {casteText || t('visit_placeholder_caste')}
            </Text>
            <Icon name="chevron-down" size={20} color={COLORS.grey500} />
          </TouchableOpacity>
          {activeCasteEntry && (
            <TouchableOpacity
              style={[styles.selectBox, { marginTop: 10 }]}
              onPress={() => openPicker('subCaste')}
              activeOpacity={0.85}>
              <Text style={[styles.selectText, !subCasteText && styles.selectPlaceholder]}>
                {subCasteText || t('visit_placeholder_subCaste')}
              </Text>
              <Icon name="chevron-down" size={20} color={COLORS.grey500} />
            </TouchableOpacity>
          )}
        </Section>

        <Section title={t('visit_section_mobile')}>
          <View style={styles.inputWithIcon}>
            <Icon name="phone-outline" size={18} color={COLORS.grey400} />
            <TextInput
              value={mobileNumber}
              onChangeText={setMobileNumber}
              placeholder={t('visit_placeholder_mobile')}
              placeholderTextColor={COLORS.grey400}
              keyboardType="phone-pad"
              maxLength={10}
              style={styles.inputInner}
            />
          </View>
        </Section>

        <Section title={t('visit_section_email')} helper={t('optional')}>
          <View style={styles.inputWithIcon}>
            <Icon name="email-outline" size={18} color={COLORS.grey400} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('visit_placeholder_email')}
              placeholderTextColor={COLORS.grey400}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.inputInner}
            />
          </View>
        </Section>

        <Section title={t('visit_section_aadhaar')} helper={t('optional')}>
          <View style={styles.inputWithIcon}>
            <Icon name="card-account-details-outline" size={18} color={COLORS.grey400} />
            <TextInput
              value={aadhaarNumber}
              onChangeText={(v) => setAadhaarNumber(v.replace(/[^0-9]/g, ''))}
              placeholder={t('visit_placeholder_aadhaar')}
              placeholderTextColor={COLORS.grey400}
              keyboardType="number-pad"
              maxLength={12}
              style={styles.inputInner}
            />
          </View>
        </Section>

        <Section
          title={t('visit_section_grievances')}
          helper={grievances.length > 0 ? t('visit_selected_count', { n: grievances.length }) : undefined}>
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
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(`grievance_${g}`)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        <Section title={t('visit_section_problem')} helper={t('visit_dual_lang_note')}>
          <TextInput
            value={problemDescription}
            onChangeText={setProblemDescription}
            placeholder={t('visit_placeholder_problem')}
            placeholderTextColor={COLORS.grey400}
            multiline
            style={[styles.input, styles.textarea]}
          />
        </Section>

        <Section title={t('visit_section_remarks')} helper={t('visit_dual_lang_note')}>
          <TextInput
            value={staffRemarks}
            onChangeText={setStaffRemarks}
            placeholder={t('visit_placeholder_remarks')}
            placeholderTextColor={COLORS.grey400}
            multiline
            style={[styles.input, styles.textarea]}
          />
        </Section>

        <Section title={t('visit_section_photo')}>
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
              <Text style={styles.secondaryBtnText}>{t('visit_camera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => pickPhoto('library')}>
              <Icon name="image-outline" size={18} color={COLORS.primary} />
              <Text style={styles.secondaryBtnText}>{t('visit_gallery')}</Text>
            </TouchableOpacity>
          </View>
        </Section>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={validateAndPreview}
          disabled={saving}
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Icon name="eye-outline" size={20} color={COLORS.white} />
              <Text style={styles.saveBtnText}>{t('visit_preview_btn')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <PickerModal
        visible={!!picker}
        onClose={closePicker}
        title={
          picker?.kind === 'party'
            ? t('visit_picker_party_title')
            : picker?.kind === 'caste'
              ? t('visit_picker_caste_title')
              : t('visit_picker_subCaste_title')
        }
        search={pickerSearch}
        onSearch={setPickerSearch}
        searchPlaceholder={t('visit_picker_search')}
        items={
          picker?.kind === 'party'
            ? PARTIES.map((p) => ({
                code: p.code,
                label: lang === 'hi' ? p.labelHi : p.labelEn,
                selected: partySupport === p.code,
              }))
            : picker?.kind === 'caste'
              ? CASTES.map((c) => ({
                  code: c.code,
                  label: lang === 'hi' ? c.labelHi : c.labelEn,
                  selected: caste === c.code,
                }))
              : (activeCasteEntry?.subCastes || []).map((s) => ({
                  code: s.code,
                  label: lang === 'hi' ? s.labelHi : s.labelEn,
                  selected: subCaste === s.code,
                }))
        }
        onSelect={selectPicker}
        emptyText={t('visit_picker_empty')}
      />

      <PreviewModal
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={confirmSave}
        rows={[
          { label: t('visit_label_voter_id'), value: voter.epicNumber },
          { label: t('visit_section_intention'), value: t(intentionLabelKey(votingIntention)) },
          { label: t('visit_section_party'), value: partyText || '—' },
          { label: t('visit_section_candidate'), value: previewCandidate || '—' },
          { label: t('visit_section_caste'), value: casteText || '—' },
          { label: t('visit_section_subCaste'), value: subCasteText || '—' },
          { label: t('visit_section_mobile'), value: mobileNumber || '—' },
          { label: t('visit_section_email'), value: email || '—' },
          { label: t('visit_section_aadhaar'), value: aadhaarNumber || '—' },
          {
            label: t('visit_section_grievances'),
            value: grievances.length ? grievances.map((g) => t(`grievance_${g}`)).join(', ') : '—',
          },
          { label: t('visit_section_problem'), value: previewProblem || '—' },
          { label: t('visit_section_remarks'), value: previewRemarks || '—' },
          {
            label: t('visit_section_photo'),
            value: photoUri ? t('visit_photo_attached') : '—',
          },
        ]}
        title={t('visit_preview_title')}
        subtitle={t('visit_preview_subtitle')}
        confirmText={t('visit_confirm_btn')}
        cancelText={t('cancel')}
      />
    </View>
  );
};

function intentionLabelKey(code: string): string {
  if (code === 'Will Vote') return 'visit_intention_will';
  if (code === 'May Vote') return 'visit_intention_may';
  if (code === "Won't Vote") return 'visit_intention_wont';
  if (code === 'First-Time Voter') return 'visit_intention_first';
  return 'visit_required_intention';
}

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

interface PickerItem {
  code: string;
  label: string;
  selected: boolean;
}

function PickerModal({
  visible,
  onClose,
  title,
  items,
  onSelect,
  search,
  onSearch,
  searchPlaceholder,
  emptyText,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: PickerItem[];
  onSelect: (code: string) => void;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder: string;
  emptyText: string;
}) {
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
              <Icon name="close" size={22} color={COLORS.grey700} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearch}>
            <Icon name="magnify" size={18} color={COLORS.grey400} />
            <TextInput
              value={search}
              onChangeText={onSearch}
              placeholder={searchPlaceholder}
              placeholderTextColor={COLORS.grey400}
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
                  {item.selected && <Icon name="check" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PreviewModal({
  visible,
  onClose,
  onConfirm,
  rows,
  title,
  subtitle,
  confirmText,
  cancelText,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  rows: Array<{ label: string; value: string }>;
  title: string;
  subtitle: string;
  confirmText: string;
  cancelText: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { maxHeight: '88%' }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalSubtitle}>{subtitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color={COLORS.grey700} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList} contentContainerStyle={{ paddingBottom: 12 }}>
            {rows.map((r) => (
              <View key={r.label} style={styles.previewRow}>
                <Text style={styles.previewLabel}>{r.label}</Text>
                <Text style={styles.previewValue}>{r.value}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.previewFooter}>
            <TouchableOpacity onPress={onClose} style={styles.previewCancel}>
              <Text style={styles.previewCancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={styles.previewConfirm}>
              <Icon name="check-circle" size={18} color={COLORS.white} />
              <Text style={styles.previewConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  hintBannerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    lineHeight: 17,
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
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.grey100,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectText: { fontSize: 14, color: COLORS.grey800, fontWeight: '600', flex: 1 },
  selectPlaceholder: { color: COLORS.grey400, fontWeight: '500' },
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    maxHeight: '78%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.grey300,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    gap: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.grey800 },
  modalSubtitle: { fontSize: 12, color: COLORS.grey500, marginTop: 2, fontWeight: '600' },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.grey100,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  modalSearchInput: { flex: 1, padding: 0, fontSize: 14, color: COLORS.grey800 },
  modalList: { paddingTop: 4 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  modalItemActive: { backgroundColor: COLORS.primaryLight },
  modalItemText: { fontSize: 14, color: COLORS.grey800, fontWeight: '600', flex: 1 },
  modalItemTextActive: { color: COLORS.primary, fontWeight: '800' },
  modalEmpty: {
    textAlign: 'center',
    color: COLORS.grey500,
    fontSize: 13,
    paddingVertical: 28,
    fontWeight: '600',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey100,
  },
  previewLabel: {
    width: '42%',
    fontSize: 11,
    color: COLORS.grey500,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  previewValue: { flex: 1, fontSize: 13, color: COLORS.grey800, fontWeight: '600' },
  previewFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.grey100,
  },
  previewCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.grey100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.grey700 },
  previewConfirm: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  previewConfirmText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
});

export default VoterVisitScreen;
