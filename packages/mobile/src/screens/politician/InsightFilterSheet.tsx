// /politician → Filter sheet (08 of the Insight canvas).
//
// Full-screen modal that lets the politician narrow the voter list.
// Pill toggles for Age / Gender / Caste / Sub-caste / Religion /
// Education / Voting-intention.  Footer shows the live count and an
// Apply button.  No write actions — purely a read-side facet picker.

import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../utils/constants';
import { FONTS } from '../../utils/theme';

/* ── Filter state model (mirrors the server-side scope) ─────────── */

export interface FilterState {
  ageMin?: number;
  ageMax?: number;
  gender: string[];
  caste: string[];
  subCaste: string[];
  religion: string[];
  educationLevel: string[];
  votingIntention: string[];
  verificationStatus?: boolean;
  search: string;
}

export const emptyFilters = (): FilterState => ({
  gender: [],
  caste: [],
  subCaste: [],
  religion: [],
  educationLevel: [],
  votingIntention: [],
  search: '',
});

/** Compact chip descriptions for the active-filter strip on VoterList. */
export function describeFilters(
  f: FilterState,
): Array<{ key: string; label: string; sub?: string }> {
  const out: Array<{ key: string; label: string; sub?: string }> = [];
  if (f.ageMin !== undefined || f.ageMax !== undefined) {
    out.push({
      key: 'age',
      label: 'Age',
      sub: `${f.ageMin ?? 18}–${f.ageMax ?? 100}`,
    });
  }
  if (f.gender.length) out.push({ key: 'gender', label: 'Gender', sub: f.gender.join(', ') });
  if (f.caste.length) out.push({ key: 'caste', label: 'Caste', sub: f.caste.join(', ') });
  if (f.subCaste.length) out.push({ key: 'subCaste', label: 'Sub-caste', sub: f.subCaste.join(', ') });
  if (f.religion.length) out.push({ key: 'religion', label: 'Religion', sub: f.religion.join(', ') });
  if (f.educationLevel.length)
    out.push({ key: 'edu', label: 'Edu.', sub: f.educationLevel.join(', ') });
  if (f.votingIntention.length)
    out.push({ key: 'vi', label: 'Intent', sub: f.votingIntention.join(', ') });
  if (f.verificationStatus !== undefined)
    out.push({
      key: 'verified',
      label: 'Status',
      sub: f.verificationStatus ? 'Verified' : 'Pending',
    });
  return out;
}

/* ── Static facet options that match the server's allowed values ─── */

const AGE_PRESETS: Array<{ label: string; min?: number; max?: number }> = [
  { label: '18–25', min: 18, max: 25 },
  { label: '26–35', min: 26, max: 35 },
  { label: '36–50', min: 36, max: 50 },
  { label: '51–65', min: 51, max: 65 },
  { label: '65+', min: 66 },
];

const GENDER = [
  { key: 'M', en: 'Male', hi: 'पुरुष' },
  { key: 'F', en: 'Female', hi: 'महिला' },
  { key: 'T', en: 'Other', hi: 'अन्य' },
];

const CASTE = [
  { key: 'General', en: 'General', hi: 'सामान्य' },
  { key: 'OBC', en: 'OBC', hi: 'पिछड़ा' },
  { key: 'SC', en: 'SC', hi: 'अनुसूचित जाति' },
  { key: 'ST', en: 'ST', hi: 'जनजाति' },
  { key: 'Minority', en: 'Minority', hi: 'अल्पसंख्यक' },
];

const RELIGION = ['Hindu', 'Muslim', 'Sikh', 'Christian', 'Buddhist', 'Jain', 'Other'];

const EDUCATION = [
  'Illiterate',
  'Primary',
  'Secondary',
  'Higher Secondary',
  'Graduate',
  'Post-Graduate',
];

const INTENTION = [
  'Strong support',
  'Lean support',
  'Undecided',
  'Lean opposed',
  'Strong opposed',
];

/* ── Pill component ─────────────────────────────────────────────── */

function Pill({
  active,
  onPress,
  tone = 'indigo',
  children,
}: {
  active: boolean;
  onPress: () => void;
  tone?: 'indigo' | 'brass' | 'info';
  children: React.ReactNode;
}) {
  const palette = {
    indigo: { onBg: COLORS.indigo, onFg: '#fff' },
    brass: { onBg: COLORS.brass, onFg: '#fff' },
    info: { onBg: COLORS.info, onFg: '#fff' },
  }[tone];
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View
        style={[
          styles.pill,
          active
            ? { backgroundColor: palette.onBg, borderColor: palette.onBg }
            : { backgroundColor: COLORS.paper, borderColor: COLORS.hairline },
        ]}>
        <Text
          style={[
            styles.pillText,
            { color: active ? palette.onFg : COLORS.mutedDeep },
          ]}>
          {children}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function SectionHead({ en, hi, action }: { en: string; hi?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHead}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flex: 1 }}>
        <Text style={styles.sectionEn}>{en}</Text>
        {hi ? <Text style={styles.sectionHi}>{hi}</Text> : null}
      </View>
      {action}
    </View>
  );
}

/* ── Main sheet component ───────────────────────────────────────── */

interface Props {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (next: FilterState) => void;
  resultCount: number;
  totalCount: number;
}

const InsightFilterSheet: React.FC<Props> = ({
  open,
  onClose,
  filters,
  onApply,
  resultCount,
  totalCount,
}) => {
  // Local working copy so the sheet is editable without thrashing the
  // list every keystroke.  Apply commits.
  const [draft, setDraft] = useState<FilterState>(filters);

  // Reset draft when the sheet opens with new external filters.
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const toggle = (key: keyof FilterState, val: string) => {
    setDraft((prev) => {
      const cur = (prev[key] as string[]) || [];
      const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
      return { ...prev, [key]: next };
    });
  };

  const toggleAge = (min?: number, max?: number) => {
    setDraft((prev) => {
      if (prev.ageMin === min && prev.ageMax === max) {
        return { ...prev, ageMin: undefined, ageMax: undefined };
      }
      return { ...prev, ageMin: min, ageMax: max };
    });
  };

  const toggleVerified = (val?: boolean) => {
    setDraft((prev) =>
      prev.verificationStatus === val
        ? { ...prev, verificationStatus: undefined }
        : { ...prev, verificationStatus: val },
    );
  };

  const reset = () => setDraft(emptyFilters());

  const draftDelta = useMemo(() => describeFilters(draft).length, [draft]);

  return (
    <Modal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Filters · विश्लेषण</Text>
            <Text style={styles.headerCount}>
              Live count · {resultCount}/{totalCount}
            </Text>
          </View>
          <TouchableOpacity onPress={reset} activeOpacity={0.7} style={{ marginRight: 6 }}>
            <Text style={styles.resetBtn}>RESET</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
            <Icon name="close" size={14} color={COLORS.ink} />
          </TouchableOpacity>
        </View>

        {/* Body */}
        <ScrollView contentContainerStyle={styles.body}>
          <SectionHead en="Age" hi="आयु" />
          <View style={styles.pillsRow}>
            {AGE_PRESETS.map((a) => (
              <Pill
                key={a.label}
                active={draft.ageMin === a.min && draft.ageMax === a.max}
                onPress={() => toggleAge(a.min, a.max)}>
                {a.label}
              </Pill>
            ))}
          </View>

          <SectionHead en="Gender" hi="लिंग" />
          <View style={styles.pillsRow}>
            {GENDER.map((g) => (
              <Pill
                key={g.key}
                active={draft.gender.includes(g.key)}
                onPress={() => toggle('gender', g.key)}>
                {g.en}{' '}
                <Text style={styles.pillHi}>· {g.hi}</Text>
              </Pill>
            ))}
          </View>

          <SectionHead en="Caste · category" hi="जाति वर्ग" />
          <View style={styles.pillsRow}>
            {CASTE.map((c) => (
              <Pill
                key={c.key}
                tone="brass"
                active={draft.caste.includes(c.key)}
                onPress={() => toggle('caste', c.key)}>
                {c.en}{' '}
                <Text style={styles.pillHi}>· {c.hi}</Text>
              </Pill>
            ))}
          </View>

          <SectionHead en="Religion" hi="धर्म" />
          <View style={styles.pillsRow}>
            {RELIGION.map((r) => (
              <Pill
                key={r}
                tone="info"
                active={draft.religion.includes(r)}
                onPress={() => toggle('religion', r)}>
                {r}
              </Pill>
            ))}
          </View>

          <SectionHead en="Education" hi="शिक्षा" />
          <View style={styles.pillsRow}>
            {EDUCATION.map((e) => (
              <Pill
                key={e}
                active={draft.educationLevel.includes(e)}
                onPress={() => toggle('educationLevel', e)}>
                {e}
              </Pill>
            ))}
          </View>

          <SectionHead en="Voting intention" hi="मतदान रुझान" />
          <View style={styles.pillsRow}>
            {INTENTION.map((s) => (
              <Pill
                key={s}
                tone="info"
                active={draft.votingIntention.includes(s)}
                onPress={() => toggle('votingIntention', s)}>
                {s}
              </Pill>
            ))}
          </View>

          <SectionHead en="Verification" hi="सत्यापन" />
          <View style={styles.pillsRow}>
            <Pill
              active={draft.verificationStatus === true}
              onPress={() => toggleVerified(true)}>
              Verified <Text style={styles.pillHi}>· सत्यापित</Text>
            </Pill>
            <Pill
              tone="brass"
              active={draft.verificationStatus === false}
              onPress={() => toggleVerified(false)}>
              Pending <Text style={styles.pillHi}>· बाक़ी</Text>
            </Pill>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Sticky footer */}
        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerCount}>
              {resultCount.toLocaleString('en-IN')}
              <Text style={styles.footerCountSub}>
                {' '}
                / {totalCount.toLocaleString('en-IN')} voters
              </Text>
            </Text>
            <Text style={styles.footerMeta}>
              {draftDelta > 0
                ? `${draftDelta} filter${draftDelta === 1 ? '' : 's'} active`
                : 'No filters · showing all'}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.85} onPress={() => onApply(draft)}>
            <View style={styles.applyBtn}>
              <Text style={styles.applyBtnText}>Apply · लागू</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairlineSoft,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 16,
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
  headerCount: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  resetBtn: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: '#B8331F',
    letterSpacing: 0.6,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  sectionHead: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionEn: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    color: COLORS.ink,
    letterSpacing: -0.1,
  },
  sectionHi: {
    fontFamily: FONTS.hi,
    fontSize: 10.5,
    color: COLORS.muted,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: FONTS.uiSemiBold,
    fontSize: 11.5,
  },
  pillHi: {
    fontFamily: FONTS.hi,
    fontWeight: '500',
    opacity: 0.65,
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairlineSoft,
    backgroundColor: COLORS.cream,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerCount: {
    fontFamily: FONTS.uiBold,
    fontSize: 22,
    color: COLORS.ink,
    letterSpacing: -0.4,
  },
  footerCountSub: {
    fontFamily: FONTS.ui,
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  footerMeta: {
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    color: COLORS.muted,
    letterSpacing: 0.4,
    marginTop: 3,
  },
  applyBtn: {
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.3,
  },
});

export default InsightFilterSheet;
