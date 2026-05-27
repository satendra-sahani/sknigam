'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import ImportVotersModal from '@/components/ImportVotersModal';
import DiscrepancyImportModal from '@/components/DiscrepancyImportModal';
import BoothCharts from '@/components/BoothCharts';
import AssignmentFormModal from '@/components/AssignmentFormModal';
import { useAuth } from '@/hooks/useAuth';
import {
  FiltersButton,
  ActiveChips,
  SharedVoterFiltersModal,
} from '@/components/filters';
import {
  describeVoterFilters,
  clearVoterChip,
  emptyVoterFilters,
  type VoterFilterState,
  type VoterChip,
} from '@/lib/voterFilters';

interface StateSummary {
  state: string;
  stateHi?: string;
  booths: number;
  districtsTotal: number;
  districtsCovered: number;
  constituenciesTotal: number;
  constituenciesCovered: number;
  totalVoters: number;
  verified: number;
}

interface DistrictRow {
  district: string;
  districtHi?: string;
  division: string;
  totalAcs: number;
  booths: number;
  totalVoters: number;
  verified: number;
}

type BoothSource =
  | 'harvard_2019'
  | 'ceo_up_2025'
  | 'voterlist_2026'
  | 'deo_pdf'
  | 'user_upload'
  | 'manual';

interface AcRow {
  number: number;
  assemblyConstituency: string;
  assemblyConstituencyHi?: string;
  district: string;
  districtHi?: string;
  reserved?: 'SC' | 'ST';
  booths: number;
  totalVoters: number;
  verified: number;
  source?: BoothSource;
  lastSyncedAt?: string | null;
}

interface BoothRow {
  _id: string;
  name: string;
  nameHi?: string;
  partNumber: number;
  district: string;
  assemblyConstituency: string;
  assemblyConstituencyNumber?: number;
  village?: string;
  villageHi?: string;
  address?: string;
  totalVoters: number;
  registeredVoters?: number;
  verified: number;
  source?: BoothSource;
  sourceUrl?: string;
  lastSyncedAt?: string | null;
  assignedStaff?: Array<{
    _id: string;
    staffId: string;
    staffName?: string;
    staffPhone?: string;
    voterSerialFrom?: number;
    voterSerialTo?: number;
    totalVoters?: number;
    completedCount?: number;
  }>;
}

interface VoterRow {
  _id: string;
  voterSerialNumber: number;
  epicNumber: string;
  fullName: string;
  fullNameHi?: string;
  fatherOrHusbandName?: string;
  fatherOrHusbandNameHi?: string;
  address?: string;
  addressHi?: string;
  gender: 'M' | 'F' | 'T';
  age?: number;
  verificationStatus: boolean;
  visitDate?: string;
  staffRemarks?: string;
  votingIntention?: string;
  /** Active assignments whose serial range covers this voter.  A booth
   *  split across multiple staff (e.g. 1–200 → Anil, 201–400 → Rekha)
   *  means each voter row only shows its matching staff, not all staff
   *  on the booth. */
  assignedStaff?: Array<{
    _id: string;
    staffId: string;
    staffName?: string;
    staffPhone?: string;
    voterSerialFrom?: number;
    voterSerialTo?: number;
    totalVoters?: number;
    completedCount?: number;
  }>;
}

interface DiscrepancyRow {
  _id: string;
  voterSerialNumber: number;
  partSerialNumber?: number;
  partNumber: number;
  partNameHi?: string;
  partNameEn?: string;
  epicNumber: string;
  voterNameHi: string;
  voterNameEn: string;
  age?: number;
  genderHi?: string;
  gender?: 'M' | 'F' | 'T';
  discrepancyReasonHi: string[];
  discrepancyReasonEn: string[];
  discrepancyReasonKey: string[];
  status: 'pending' | 'resolved' | 'dismissed';
  checked: boolean;
  note?: string;
}

interface DiscrepancyCounts {
  total: number;
  pending: number;
  resolved: number;
  dismissed: number;
}

type Level = 'state' | 'district' | 'ac' | 'booth';

type StatusKey = 'done' | 'progress' | 'empty';

type Lang = 'en' | 'hi';

interface ListSummary {
  state?: string;
  stateHi?: string;
  totalAcs?: number;
  coveredAcs?: number;
  totalBooths?: number;
  totalVoters?: number;
  verified?: number;
  total?: number;
  boothName?: string;
  boothNameHi?: string;
  villageHi?: string;
  assemblyConstituency?: string;
  assemblyConstituencyHi?: string;
  district?: string;
  districtHi?: string;
}

/** UI label translations.  Names (districts/ACs/booths) come from the
 *  server; these are only for fixed UI copy. */
const UI_LABELS = {
  state: { en: 'State', hi: 'राज्य' },
  district: { en: 'District', hi: 'जिला' },
  vidhanSabha: { en: 'Vidhan Sabha', hi: 'विधान सभा' },
  pollingStation: { en: 'Polling Station', hi: 'मतदान केंद्र' },
  booths: { en: 'Booths', hi: 'बूथ' },
  discrepancyVoters: { en: 'Discrepancy Voters', hi: 'विसंगति मतदाता' },
  uploadPdf: { en: 'Upload PDF', hi: 'PDF अपलोड करें' },
  list: { en: 'List', hi: 'सूची' },
  charts: { en: 'Charts', hi: 'चार्ट' },
  showingChartsFor: { en: 'Showing charts for', hi: 'चार्ट दिखाए जा रहे हैं:' },
  from: { en: 'From', hi: 'से' },
  to: { en: 'To', hi: 'तक' },
  clear: { en: 'clear', hi: 'साफ़ करें' },
  all: { en: 'All', hi: 'सभी' },
  pending: { en: 'Pending', hi: 'लंबित' },
  completed: { en: 'Completed', hi: 'पूर्ण' },
  resolved: { en: 'Resolved', hi: 'समाधान' },
  allReasons: { en: 'All reasons', hi: 'सभी कारण' },
  searchDistrict: { en: 'Search district', hi: 'जिला खोजें' },
  searchAcOrNumber: { en: 'Search AC name or number', hi: 'विधान सभा नाम या संख्या खोजें' },
  searchDiscrepancy: { en: 'Search name (Hindi/English), EPIC, serial', hi: 'नाम (हिंदी/अंग्रेज़ी), EPIC, क्रमांक खोजें' },
  searchBooth: { en: 'Search booth, part, or village', hi: 'बूथ, भाग या गाँव खोजें' },
  searchVoter: { en: 'Search name, EPIC, or serial', hi: 'नाम, EPIC या क्रमांक खोजें' },
  bulkUpload: { en: 'Bulk upload?', hi: 'बल्क अपलोड?' },
  upload: { en: 'Upload', hi: 'अपलोड' },
  open: { en: 'Open', hi: 'खोलें' },
  assign: { en: 'Assign', hi: 'नियुक्त करें' },
  reassign: { en: 'Reassign', hi: 'पुनः नियुक्त' },
  assignTooltip: { en: 'Assign this booth to a staff member', hi: 'इस बूथ को कर्मचारी को नियुक्त करें' },
  assignedTo: { en: 'Assigned to', hi: 'नियुक्त' },
  unassigned: { en: 'Unassigned', hi: 'अनियुक्त' },
  prev: { en: '← Prev', hi: '← पिछला' },
  next: { en: 'Next →', hi: 'अगला →' },
  showing: { en: 'Showing', hi: 'दिखा रहा है' },
  of: { en: 'of', hi: 'में से' },
  noDistricts: { en: 'No districts match this filter.', hi: 'इस फ़िल्टर से कोई जिला मेल नहीं खाता।' },
  noConstituencies: { en: 'No constituencies match this filter.', hi: 'इस फ़िल्टर से कोई विधान सभा मेल नहीं खाती।' },
  noBooths: { en: 'No booths match this filter.', hi: 'इस फ़िल्टर से कोई बूथ मेल नहीं खाता।' },
  noVoters: { en: 'No voters match this filter.', hi: 'इस फ़िल्टर से कोई मतदाता मेल नहीं खाता।' },
  noDiscrepancyRows: { en: 'No discrepancy rows match this filter.', hi: 'इस फ़िल्टर से कोई विसंगति मेल नहीं खाती।' },
  completedStatus: { en: 'Completed', hi: 'पूर्ण' },
  inProgress: { en: 'In progress', hi: 'प्रगति में' },
  notStarted: { en: 'Not started', hi: 'शुरू नहीं' },
  dismissed: { en: 'Dismissed', hi: 'ख़ारिज' },
  markResolved: { en: 'Mark resolved', hi: 'समाधान चिह्नित करें' },
  resolvedLabel: { en: '✓ Resolved', hi: '✓ समाधान' },
  dismiss: { en: 'Dismiss', hi: 'ख़ारिज करें' },
  votersCompleted: { en: 'voters completed', hi: 'मतदाता पूर्ण' },
  votersWord: { en: 'voters', hi: 'मतदाता' },
  part: { en: 'Part', hi: 'भाग' },
  noBoothsSetup: { en: 'No booths set up for', hi: 'के लिए अभी तक कोई बूथ सेट नहीं' },
  addPollingStations: {
    en: 'Add the polling stations for this AC before uploading voter lists.',
    hi: 'मतदाता सूची अपलोड करने से पहले इस विधान सभा के लिए मतदान केंद्र जोड़ें।',
  },
  goToBooths: { en: 'Go to Booths →', hi: 'बूथों पर जाएँ →' },
  noDiscrepancyUploaded: { en: 'No discrepancy report uploaded for', hi: 'के लिए कोई विसंगति रिपोर्ट अपलोड नहीं' },
  yet: { en: 'yet.', hi: 'अभी तक।' },
  uploadEciHint: {
    en: 'Upload the ECI "List of voters with no mapping and logical discrepancy" PDF from the DEO portal (e.g. deoria.nic.in).',
    hi: 'DEO पोर्टल (जैसे deoria.nic.in) से ECI "List of voters with no mapping and logical discrepancy" PDF अपलोड करें।',
  },
  uploadDiscrepancyPdf: { en: 'Upload discrepancy PDF', hi: 'विसंगति PDF अपलोड करें' },
  noVotersUploaded: { en: 'No voters uploaded for this booth yet.', hi: 'इस बूथ के लिए अभी तक कोई मतदाता अपलोड नहीं।' },
  uploadHint: {
    en: 'Upload an Excel with voterSerialNumber, EPIC, fullName, gender, age, address, etc.',
    hi: 'voterSerialNumber, EPIC, fullName, लिंग, आयु, पता इत्यादि के साथ एक Excel अपलोड करें।',
  },
  uploadVoterList: { en: 'Upload voter list', hi: 'मतदाता सूची अपलोड करें' },
  boothWord: { en: 'booth', hi: 'बूथ' },
  boothsWord: { en: 'booths', hi: 'बूथ' },
  constituenciesWord: { en: 'constituencies', hi: 'विधान सभाएँ' },
  setUp: { en: 'set up', hi: 'सेट अप' },
  districtsActive: { en: 'districts active', hi: 'जिले सक्रिय' },
  acs: { en: 'ACs', hi: 'विधान सभाएँ' },
  in: { en: 'in', hi: 'में' },
  boothsLoaded: { en: 'booths loaded', hi: 'बूथ लोड' },
  boothLoaded: { en: 'booth loaded', hi: 'बूथ लोड' },
  noBoothsLoaded: { en: 'no booths loaded yet', hi: 'अभी तक कोई बूथ लोड नहीं' },
  boothsUploaded: { en: 'booths uploaded', hi: 'बूथ अपलोड' },
  noBoothsUploaded: { en: 'no booths uploaded', hi: 'कोई बूथ अपलोड नहीं' },
  voterListBulkHint: {
    en: 'Upload at the booth level below — each booth gets its own voter Excel.',
    hi: 'नीचे बूथ स्तर पर अपलोड करें — प्रत्येक बूथ को अपना मतदाता Excel मिलता है।',
  },
  votersWordBooth: { en: 'voters', hi: 'मतदाता' },
  onRoll: { en: 'on roll', hi: 'रोल पर' },
  noVotersUploadedBooth: { en: 'no voters uploaded', hi: 'कोई मतदाता अपलोड नहीं' },
} as const;

type LabelKey = keyof typeof UI_LABELS;

/**
 * Best-effort Devanagari rendering of a Roman-transliterated booth / village
 * name.  The ECI 2026 booth rows only carry the English transliteration
 * (e.g. "Polling Station 3 — Pra.vi. Nagla Chatura R.n.1"), but the
 * *structural* words ("Polling Station", "Pra.vi.", "R.n.", "Composite
 * Vi.") have well-known Hindi forms.  Proper nouns (village / town) stay
 * in Roman because we don't have a reliable transliteration map for
 * arbitrary Indian place names — rendering them in garbled Devanagari
 * would be worse than leaving them in Roman.
 *
 * When the row *does* carry a server-supplied `nameHi` we skip this and
 * use that verbatim — this helper is only the fallback path.
 */
const BOOTH_TERM_MAP: Array<[RegExp, string]> = [
  [/\bPolling Station\b/gi, 'मतदान केंद्र'],
  [/\bComposite Vidyalaya\b/gi, 'कम्पोज़िट विद्यालय'],
  [/\bComposite Vi\.?/gi, 'कम्पोज़िट वि.'],
  [/\bPrimary School\b/gi, 'प्राथमिक विद्यालय'],
  [/\bPri\.\s*School\b/gi, 'प्रा. विद्यालय'],
  [/\bPra\.\s*Vi\.?/gi, 'प्रा.वि.'],
  [/\bP\.\s*V\.?/gi, 'प्रा.वि.'],
  [/\bJunior High School\b/gi, 'जूनियर हाई स्कूल'],
  [/\bJ\.\s*H\.\s*S\.?/gi, 'जू.हा.स्कूल'],
  [/\bUpper Primary School\b/gi, 'उच्च प्राथमिक विद्यालय'],
  [/\bU\.\s*P\.\s*S\.?/gi, 'उ.प्रा.स्कूल'],
  [/\bU\.\s*M\.\s*School\b/gi, 'उ.मा. स्कूल'],
  [/\bInter College\b/gi, 'इंटर कॉलेज'],
  [/\bDegree College\b/gi, 'डिग्री कॉलेज'],
  [/\bSchool\b/gi, 'स्कूल'],
  [/\bCollege\b/gi, 'कॉलेज'],
  [/\bR\.\s*n\.?/gi, 'क.नं.'],
  [/\bRoom\s*No\.?/gi, 'कमरा नं.'],
  [/\bMust\b/g, 'मुस्त'],
  [/\bKhas\b/g, 'खास'],
];

function hindiizeBoothName(en?: string): string {
  if (!en) return '';
  let out = en;
  for (const [rx, rep] of BOOTH_TERM_MAP) out = out.replace(rx, rep);
  // Structural substitution leaves embedded proper nouns (village names
  // like "gijoli", "Nagla Chatura", "Hazipurkhera") in Roman.  Pipe any
  // surviving Roman word through the transliterator so Hindi mode doesn't
  // show half-English booth labels.  Strings that are already Devanagari
  // are left untouched.
  out = out.replace(/[A-Za-z][A-Za-z.]*/g, (m) => {
    // Keep short tokens already handled as abbreviations (e.g. "क.नं."
    // mapped from "R.n.") by skipping runs that are purely dots+letters
    // under 2 chars — those won't round-trip cleanly.
    const alpha = m.replace(/\./g, '');
    if (alpha.length < 2) return m;
    return transliterateToDevanagari(m);
  });
  return out;
}

/**
 * Best-effort Roman → Devanagari transliterator for arbitrary Indian
 * names (voter fullName, father/husband name, etc.).  Uploaded rolls
 * only carry the English transliteration, so rendering them in Roman
 * inside an otherwise-Hindi UI is jarring for canvassers reading off
 * the list.  This is rule-based and ITRANS-flavoured:
 *   - `aa` → आ/ा (long);  single `a` → inherent schwa / short
 *   - `ee` → ई/ी;  `oo` → ऊ/ू;  `ai` → ऐ/ै;  `au` → औ/ौ
 *   - digraphs `kh gh ch chh jh th dh ph bh sh` handled as single
 *     aspirated consonants
 *   - `ng` before a consonant collapses to anusvar ं (so "Singh"
 *     renders "सिंह" and not "सिन्घ")
 *
 * Unknown tokens (digits, EPIC codes, punctuation) pass through
 * unchanged.  Hand-curated overrides for common names ("Ram" → "राम",
 * "Singh" → "सिंह") ride on top so the most frequent cases are exact.
 * Imperfect — but far more useful than leaving names in Roman when the
 * reader selected Hindi.
 */
const NAME_OVERRIDES: Record<string, string> = {
  ram: 'राम',
  singh: 'सिंह',
  kumar: 'कुमार',
  kumari: 'कुमारी',
  devi: 'देवी',
  lal: 'लाल',
  shah: 'शाह',
  khan: 'ख़ान',
  das: 'दास',
  prasad: 'प्रसाद',
  sharma: 'शर्मा',
  verma: 'वर्मा',
  gupta: 'गुप्ता',
  yadav: 'यादव',
  mishra: 'मिश्रा',
  tiwari: 'तिवारी',
  pandey: 'पांडे',
  dubey: 'दुबे',
  chaudhary: 'चौधरी',
  thakur: 'ठाकुर',
};

const CONSONANT_DIGRAPHS: Record<string, string> = {
  chh: 'छ',
  kh: 'ख',
  gh: 'घ',
  ch: 'च',
  jh: 'झ',
  th: 'थ',
  dh: 'ध',
  ph: 'फ',
  bh: 'भ',
  sh: 'श',
};

const CONSONANTS_SINGLE: Record<string, string> = {
  k: 'क',
  g: 'ग',
  c: 'च',
  j: 'ज',
  t: 'त',
  d: 'द',
  n: 'न',
  p: 'प',
  f: 'फ',
  b: 'ब',
  m: 'म',
  y: 'य',
  r: 'र',
  l: 'ल',
  v: 'व',
  w: 'व',
  s: 'स',
  h: 'ह',
  z: 'ज़',
  x: 'क्स',
  q: 'क़',
};

const VOWEL_DIGRAPHS_INITIAL: Record<string, string> = {
  aa: 'आ',
  ee: 'ई',
  oo: 'ऊ',
  ai: 'ऐ',
  au: 'औ',
};
const VOWEL_DIGRAPHS_MATRA: Record<string, string> = {
  aa: 'ा',
  ee: 'ी',
  oo: 'ू',
  ai: 'ै',
  au: 'ौ',
};
const VOWELS_INITIAL: Record<string, string> = {
  a: 'अ',
  i: 'इ',
  u: 'उ',
  e: 'ए',
  o: 'ओ',
};
const VOWELS_MATRA: Record<string, string> = {
  a: '',
  i: 'ि',
  u: 'ु',
  e: 'े',
  o: 'ो',
};

function transliterateWord(word: string): string {
  const low = word.toLowerCase();
  const override = NAME_OVERRIDES[low];
  if (override) return override;

  const s = low;
  let i = 0;
  let out = '';
  let lastWasConsonant = false;

  while (i < s.length) {
    const three = s.slice(i, i + 3);
    if (CONSONANT_DIGRAPHS[three]) {
      out += CONSONANT_DIGRAPHS[three];
      i += 3;
      lastWasConsonant = true;
      continue;
    }
    const two = s.slice(i, i + 2);
    if (CONSONANT_DIGRAPHS[two]) {
      out += CONSONANT_DIGRAPHS[two];
      i += 2;
      lastWasConsonant = true;
      continue;
    }
    if (two === 'ng') {
      // "ng" before another consonant → anusvar (e.g. Singh → सिंह).
      // At word-end, fall back to न्ग.
      const next = s[i + 2];
      if (next && /[a-z]/.test(next) && !VOWELS_INITIAL[next] && !VOWEL_DIGRAPHS_INITIAL[s.slice(i + 2, i + 4)]) {
        out += 'ं';
        i += 2;
        lastWasConsonant = false;
        continue;
      }
    }
    if (VOWEL_DIGRAPHS_INITIAL[two]) {
      out += lastWasConsonant ? VOWEL_DIGRAPHS_MATRA[two] : VOWEL_DIGRAPHS_INITIAL[two];
      i += 2;
      lastWasConsonant = false;
      continue;
    }
    const c = s[i];
    if (CONSONANTS_SINGLE[c]) {
      out += CONSONANTS_SINGLE[c];
      i++;
      lastWasConsonant = true;
      continue;
    }
    if (VOWELS_INITIAL[c]) {
      out += lastWasConsonant ? VOWELS_MATRA[c] : VOWELS_INITIAL[c];
      i++;
      lastWasConsonant = false;
      continue;
    }
    out += s[i];
    i++;
    lastWasConsonant = false;
  }
  return out;
}

function transliterateToDevanagari(en?: string): string {
  if (!en) return '';
  return en
    .split(/(\s+|[^\w]+)/)
    .map((tok) => {
      if (!tok) return tok;
      // Preserve whitespace, punctuation, pure-digit, and EPIC-like codes.
      if (!/[A-Za-z]/.test(tok)) return tok;
      if (/\d/.test(tok)) return tok; // EPIC/code tokens like "ZSY3999364"
      return transliterateWord(tok);
    })
    .join('');
}

function statusFor(verified: number, total: number): StatusKey {
  if (total === 0) return 'empty';
  if (verified >= total) return 'done';
  return 'progress';
}

function statusMeta(status: StatusKey, labels?: { done: string; progress: string; empty: string }) {
  const done = labels?.done ?? 'Completed';
  const progress = labels?.progress ?? 'In progress';
  const empty = labels?.empty ?? 'Not started';
  if (status === 'done') {
    return {
      label: done,
      checkbox: 'bg-emerald-500 border-emerald-500 text-white',
      pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      bar: 'bg-emerald-500',
      dot: 'bg-emerald-500',
    };
  }
  if (status === 'progress') {
    return {
      label: progress,
      checkbox: 'bg-red-500 border-red-500 text-white',
      pill: 'bg-red-50 text-red-700 border-red-200',
      bar: 'bg-red-500',
      dot: 'bg-red-500',
    };
  }
  return {
    label: empty,
    checkbox: 'bg-white border-slate-300 text-transparent',
    pill: 'bg-slate-50 text-slate-600 border-slate-200',
    bar: 'bg-slate-200',
    dot: 'bg-slate-300',
  };
}

function useStatusLabels(t: (key: LabelKey) => string) {
  return {
    done: t('completedStatus'),
    progress: t('inProgress'),
    empty: t('notStarted'),
  };
}

export default function ExplorePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  // Politicians get their own drill at /politician/explore.
  useEffect(() => {
    if (user?.role === 'politician') router.replace('/politician/explore');
  }, [user, router]);
  const canAssign = user?.role === 'super_admin';
  const state = params.get('state') || 'Uttar Pradesh';
  const district = params.get('district') || '';
  const ac = params.get('ac') || '';
  const boothId = params.get('boothId') || '';
  const boothName = params.get('boothName') || '';
  const partNumber = params.get('partNumber') || '';

  const level: Level = boothId ? 'booth' : !district ? 'state' : !ac ? 'district' : 'ac';
  const tab = (params.get('tab') as 'booths' | 'discrepancies') || 'booths';

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<StateSummary | null>(null);
  // Each *list* state holds only the current *page* of rows — the server
  // filters, searches, and slices.  Use `listSummary`/`counts`/`pagination`
  // for totals instead of derived-from-array totals.
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [acs, setAcs] = useState<AcRow[]>([]);
  const [booths, setBooths] = useState<BoothRow[]>([]);
  const [voters, setVoters] = useState<VoterRow[]>([]);
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyRow[]>([]);
  const [discrepancyCounts, setDiscrepancyCounts] = useState<DiscrepancyCounts>({
    total: 0,
    pending: 0,
    resolved: 0,
    dismissed: 0,
  });
  // Scope-wide totals returned by the paginated endpoints so the page
  // header ("X voters in Y district") stays stable while the user pages
  // through the list.  Shape varies per level — treated as opaque here
  // and read out in `headerStats`.
  const [listSummary, setListSummary] = useState<ListSummary>({});
  // Filter-pill counts from the server — { all, pending, done }.  Unlike
  // `pagination.total`, these do NOT narrow when the user types in the
  // search box, so the pill counts stay meaningful as a scope summary.
  const [listCounts, setListCounts] = useState({ all: 0, pending: 0, done: 0 });
  // Page metadata returned by whichever endpoint fed the current list.
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  // Full dictionary of discrepancy reasons at this AC, independent of the
  // current page — used by the reason-filter dropdown so switching pages
  // doesn't make options flicker in/out.
  const [reasonDictionary, setReasonDictionary] = useState<
    { key: string; hi: string; en: string; count: number }[]
  >([]);
  const [reasonFilter, setReasonFilter] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [search, setSearch] = useState('');
  // Debounced copy of `search` used to drive the actual fetch — typing
  // doesn't hammer the API; we wait until the user pauses.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [uploadBoothId, setUploadBoothId] = useState<string | null>(null);
  const [discrepancyImportOpen, setDiscrepancyImportOpen] = useState(false);
  // Selected booth for the "Assign to staff" dialog.  Holds the ID plus
  // a display label so the modal can show which booth is pre-selected
  // without needing to re-hit /booths to resolve the name.
  const [assignBooth, setAssignBooth] = useState<{ id: string; label: string } | null>(null);

  // View-mode toggle + date range for the Charts view.  Charts are
  // available at every level (state / district / AC / booth) and scope
  // themselves from the URL automatically — no extra fetches needed to
  // know which slice we're on.  Dates filter on voter visitDate.
  const [view, setView] = useState<'list' | 'charts'>('list');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exploreFilters, setExploreFilters] = useState<VoterFilterState>(emptyVoterFilters);
  const exploreChips = describeVoterFilters(exploreFilters);

  // Current page index driving the server-side pager.  Reset to 1 when
  // the drill level, tab, search, or status filter changes so the user
  // never lands on an empty "page 5 of 2" state after re-filtering.
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // UI language — affects label text and whether rendered names prefer
  // the Hindi (Devanagari) variant returned by the server.  Persisted in
  // localStorage so the choice survives refreshes.  Falls back to English
  // on first visit and when a given name has no Hindi entry on record.
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('pollstics.lang');
    if (saved === 'hi' || saved === 'en') setLang(saved);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('pollstics.lang', lang);
  }, [lang]);
  const t = useCallback((key: LabelKey) => UI_LABELS[key][lang], [lang]);
  const localizeName = useCallback(
    (en?: string, hi?: string) => (lang === 'hi' ? hi || en || '' : en || ''),
    [lang],
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pageParams = {
        paginated: 'true',
        page: String(page),
        limit: String(PAGE_SIZE),
        search: debouncedSearch,
        filter,
      };

      if (level === 'state') {
        const [s, d] = await Promise.all([
          api.get('/analytics/hierarchy/state', { params: { state } }),
          api.get('/analytics/hierarchy/districts', {
            params: { state, ...pageParams },
          }),
        ]);
        setSummary(s.data.data);
        setDistricts(d.data.data.rows);
        setPagination(d.data.data.pagination);
        setListCounts(d.data.data.counts);
        setListSummary(d.data.data.summary || {});
      } else if (level === 'district') {
        const res = await api.get('/analytics/hierarchy/constituencies', {
          params: { state, district, ...pageParams },
        });
        setAcs(res.data.data.rows);
        setPagination(res.data.data.pagination);
        setListCounts(res.data.data.counts);
        setListSummary(res.data.data.summary || {});
      } else if (level === 'ac') {
        if (tab === 'discrepancies') {
          const statusParam =
            filter === 'pending' ? 'pending' : filter === 'done' ? undefined : undefined;
          const res = await api.get('/discrepancies', {
            params: {
              assemblyConstituency: ac,
              page,
              limit: PAGE_SIZE,
              search: debouncedSearch || undefined,
              status: statusParam,
              reasonKey: reasonFilter || undefined,
            },
          });
          setDiscrepancies(res.data.data.rows);
          setPagination(res.data.data.pagination);
          setDiscrepancyCounts(res.data.data.counts);
          // Reason dictionary is server-provided so it doesn't shrink to
          // only the page's reasons — keeps the dropdown stable.
          const dict = res.data.data.reasonDictionary || [];
          setReasonDictionary(
            Array.isArray(dict)
              ? dict.map((r: any) => ({ key: r.key, hi: r.hi, en: r.en, count: r.count ?? 0 }))
              : [],
          );
          // Map discrepancy counts → the common { all, pending, done } shape
          // the filter pills expect.  "done" = resolved + dismissed so both
          // terminal states appear together under "Resolved".
          const counts = res.data.data.counts as DiscrepancyCounts;
          setListCounts({
            all: counts.total,
            pending: counts.pending,
            done: counts.resolved + counts.dismissed,
          });
        } else {
          const [bRes, dRes] = await Promise.all([
            api.get('/analytics/hierarchy/booths', {
              params: { state, district, assemblyConstituency: ac, ...pageParams },
            }),
            api
              .get('/discrepancies', {
                params: { assemblyConstituency: ac, limit: 1 },
              })
              .catch(() => ({
                data: { data: { counts: { total: 0, pending: 0, resolved: 0, dismissed: 0 } } },
              })),
          ]);
          setBooths(bRes.data.data.rows);
          setPagination(bRes.data.data.pagination);
          setListCounts(bRes.data.data.counts);
          setListSummary(bRes.data.data.summary || {});
          setDiscrepancyCounts(dRes.data.data.counts);
        }
      } else if (level === 'booth') {
        const res = await api.get('/analytics/hierarchy/voters', {
          params: { boothId, ...pageParams },
        });
        setVoters(res.data.data.rows);
        setPagination(res.data.data.pagination);
        setListCounts(res.data.data.counts);
        setListSummary(res.data.data.summary || {});
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [level, tab, state, district, ac, boothId, page, debouncedSearch, filter, reasonFilter]);

  // Drill-level / tab changes: reset page + search/filter so we don't
  // land on a stale filter state for a newly-opened scope.  The actual
  // fetch runs on the next render via the load() dependency.
  useEffect(() => {
    setSearch('');
    setDebouncedSearch('');
    setFilter('all');
    setReasonFilter('');
    setPage(1);
  }, [level, tab, state, district, ac, boothId]);

  // Keep page in sync with filter-narrowing events — stepping from
  // "Pending (200)" to "Done (0)" should reset to page 1 instead of
  // asking the server for a page that doesn't exist for the new scope.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter, reasonFilter]);

  useEffect(() => {
    load();
  }, [load]);

  function navTo(next: {
    district?: string;
    ac?: string;
    boothId?: string;
    boothName?: string;
    partNumber?: string | number;
    tab?: 'booths' | 'discrepancies';
  }) {
    const usp = new URLSearchParams();
    usp.set('state', state);
    const d = next.district !== undefined ? next.district : district;
    const a = next.ac !== undefined ? next.ac : ac;
    const b = next.boothId !== undefined ? next.boothId : boothId;
    if (d) usp.set('district', d);
    if (a) usp.set('ac', a);
    if (b) {
      usp.set('boothId', b);
      if (next.boothName) usp.set('boothName', next.boothName);
      if (next.partNumber !== undefined) usp.set('partNumber', String(next.partNumber));
    }
    if (next.tab && next.tab !== 'booths') usp.set('tab', next.tab);
    router.push(`/explore?${usp.toString()}`);
  }

  async function toggleDiscrepancyCheck(d: DiscrepancyRow) {
    const nextChecked = !d.checked;
    setDiscrepancies((rows) =>
      rows.map((r) => (r._id === d._id ? { ...r, checked: nextChecked } : r)),
    );
    try {
      await api.patch(`/discrepancies/${d._id}`, { checked: nextChecked });
    } catch (err: any) {
      setDiscrepancies((rows) =>
        rows.map((r) => (r._id === d._id ? { ...r, checked: !nextChecked } : r)),
      );
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  }

  async function setDiscrepancyStatus(d: DiscrepancyRow, status: 'pending' | 'resolved' | 'dismissed') {
    const prev = d.status;
    setDiscrepancies((rows) =>
      rows.map((r) => (r._id === d._id ? { ...r, status } : r)),
    );
    try {
      await api.patch(`/discrepancies/${d._id}`, { status });
      setDiscrepancyCounts((c) => ({
        ...c,
        pending: c.pending + (status === 'pending' ? 1 : 0) - (prev === 'pending' ? 1 : 0),
        resolved: c.resolved + (status === 'resolved' ? 1 : 0) - (prev === 'resolved' ? 1 : 0),
        dismissed: c.dismissed + (status === 'dismissed' ? 1 : 0) - (prev === 'dismissed' ? 1 : 0),
      }));
    } catch (err: any) {
      setDiscrepancies((rows) =>
        rows.map((r) => (r._id === d._id ? { ...r, status: prev } : r)),
      );
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  }

  // Server-side pagination: the list state arrays already hold *just*
  // the current page post-filter, so rendering reads them directly.
  // Empty-state hints live below in the per-level branches.
  const totalFiltered = pagination.total;
  const totalPages = pagination.pages;
  const safePage = pagination.page;
  const startIdx = (safePage - 1) * pagination.limit;
  const currentRowsLen =
    level === 'state'
      ? districts.length
      : level === 'district'
      ? acs.length
      : level === 'ac' && tab === 'discrepancies'
      ? discrepancies.length
      : level === 'ac'
      ? booths.length
      : voters.length;
  const endIdx = Math.min(startIdx + currentRowsLen, totalFiltered);

  const reasonOptions = reasonDictionary;

  const headerStats = useMemo(() => {
    if (level === 'state' && summary) {
      return {
        title: localizeName(summary.state, summary.stateHi),
        subtitle: `${summary.districtsCovered}/${summary.districtsTotal} ${t('districtsActive')} · ${summary.constituenciesCovered}/${summary.constituenciesTotal} ${t('acs')} · ${summary.booths} ${t('boothsWord')}`,
        verified: summary.verified,
        total: summary.totalVoters,
        coveredPct:
          summary.districtsTotal > 0
            ? Math.round((summary.districtsCovered / summary.districtsTotal) * 100)
            : 0,
      };
    }
    if (level === 'district') {
      const totalAcs = listSummary.totalAcs ?? 0;
      const coveredAcs = listSummary.coveredAcs ?? 0;
      const voters = listSummary.totalVoters ?? 0;
      const verified = listSummary.verified ?? 0;
      return {
        title: localizeName(district, listSummary.districtHi),
        subtitle: `${totalAcs} ${t('constituenciesWord')} · ${coveredAcs} ${t('setUp')} · ${voters.toLocaleString('en-IN')} ${t('votersWord')}`,
        verified,
        total: voters,
        coveredPct: totalAcs > 0 ? Math.round((coveredAcs / totalAcs) * 100) : 0,
      };
    }
    if (level === 'ac') {
      const totalBooths = listSummary.totalBooths ?? 0;
      const voters = listSummary.totalVoters ?? 0;
      const verified = listSummary.verified ?? 0;
      const boothsLabel = totalBooths === 1 ? t('boothWord') : t('boothsWord');
      const districtName = localizeName(district, listSummary.districtHi);
      // Hindi reads postposition-first: "आगरा में 520 बूथ · 0 मतदाता".
      // English reads subject-first: "520 booths · 0 voters in Agra".
      const subtitle =
        lang === 'hi'
          ? `${districtName} ${t('in')} ${totalBooths} ${boothsLabel} · ${voters.toLocaleString('en-IN')} ${t('votersWord')}`
          : `${totalBooths} ${boothsLabel} · ${voters.toLocaleString('en-IN')} ${t('votersWord')} ${t('in')} ${districtName}`;
      return {
        title: localizeName(ac, listSummary.assemblyConstituencyHi),
        subtitle,
        verified,
        total: voters,
        coveredPct: 0,
      };
    }
    const boothTitle =
      lang === 'hi'
        ? listSummary.boothNameHi || hindiizeBoothName(boothName || 'Booth')
        : boothName || 'Booth';
    return {
      title: boothTitle,
      subtitle: `${t('part')} ${partNumber} · ${localizeName(district, listSummary.districtHi)} · ${localizeName(ac, listSummary.assemblyConstituencyHi)}`,
      verified: listSummary.verified ?? 0,
      total: listSummary.total ?? 0,
      coveredPct: 0,
    };
  }, [level, summary, listSummary, state, district, ac, boothName, partNumber, t, localizeName, lang]);

  const overallPct =
    headerStats.total > 0 ? Math.round((headerStats.verified / headerStats.total) * 100) : 0;

  // Filter-pill counts come straight from the server — stable across
  // pages and independent of the active search box.
  const counts = listCounts;

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm flex-wrap">
        <Crumb onClick={() => navTo({ district: '', ac: '', boothId: '' })} active={level === 'state'}>
          {localizeName(state, summary?.stateHi || listSummary.stateHi || (lang === 'hi' ? 'उत्तर प्रदेश' : undefined))}
        </Crumb>
        {district && (
          <>
            <span className="text-slate-300">/</span>
            <Crumb onClick={() => navTo({ ac: '', boothId: '' })} active={level === 'district'}>
              {localizeName(district, listSummary.districtHi)}
            </Crumb>
          </>
        )}
        {ac && (
          <>
            <span className="text-slate-300">/</span>
            <Crumb onClick={() => navTo({ boothId: '' })} active={level === 'ac'}>
              {localizeName(ac, listSummary.assemblyConstituencyHi)}
            </Crumb>
          </>
        )}
        {boothId && (
          <>
            <span className="text-slate-300">/</span>
            <Crumb onClick={() => {}} active>
              {lang === 'hi'
                ? listSummary.boothNameHi || hindiizeBoothName(boothName || 'Booth')
                : boothName || 'Booth'}
            </Crumb>
          </>
        )}
        <div className="flex-1" />
        <FiltersButton onClick={() => setFiltersOpen(true)} count={exploreChips.length} />
        <LanguageSwitcher lang={lang} setLang={setLang} />
      </nav>

      <ActiveChips
        chips={exploreChips}
        onRemove={(chip) => {
          const next = clearVoterChip(exploreFilters, chip as VoterChip);
          setExploreFilters(next);
          setDateFrom(next.visitDateFrom);
          setDateTo(next.visitDateTo);
        }}
        onClearAll={() => {
          setExploreFilters(emptyVoterFilters);
          setDateFrom('');
          setDateTo('');
        }}
      />

      {/* Header card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {level === 'state'
                ? t('state')
                : level === 'district'
                ? t('district')
                : level === 'ac'
                ? t('vidhanSabha')
                : t('pollingStation')}
            </p>
            <h1 className="text-2xl font-bold mt-1">{headerStats.title}</h1>
            <p className="text-sm text-slate-400 mt-1">{headerStats.subtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{overallPct}%</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {headerStats.verified.toLocaleString('en-IN')} / {headerStats.total.toLocaleString('en-IN')} {t('votersCompleted')}
            </p>
          </div>
        </div>
        <div className="h-2 bg-slate-700 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-rose-500 transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* AC-level tab switch: Booths vs Discrepancies */}
      {level === 'ac' && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => navTo({ tab: 'booths' })}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${
                tab === 'booths' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t('booths')}
              <span className="ml-2 text-[10px] font-bold text-slate-500">
                {(listSummary.totalBooths ?? 0) || (tab === 'booths' ? listCounts.all : 0)}
              </span>
            </button>
            <button
              onClick={() => navTo({ tab: 'discrepancies' })}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${
                tab === 'discrepancies'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t('discrepancyVoters')}
              <span
                className={`ml-2 text-[10px] font-bold ${
                  discrepancyCounts.pending > 0 ? 'text-amber-700' : 'text-slate-500'
                }`}>
                {discrepancyCounts.pending}/{discrepancyCounts.total}
              </span>
            </button>
          </div>
          <div className="flex-1" />
          {tab === 'discrepancies' && (
            <button
              onClick={() => setDiscrepancyImportOpen(true)}
              className="px-3 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition">
              {t('uploadPdf')}
            </button>
          )}
        </div>
      )}

      {/* View-mode toggle — List (drill-down hierarchy) vs Charts (analytics
          scoped to whatever slice the current breadcrumbs describe).  Sits
          above the filter bar so it's always reachable at every level. */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}>
            📋 {t('list')}
          </button>
          <button
            onClick={() => setView('charts')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              view === 'charts' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}>
            📊 {t('charts')}
          </button>
        </div>
        {view === 'charts' && (
          <>
            <span className="text-[11px] text-slate-400">{t('showingChartsFor')}</span>
            <span className="text-[11px] font-semibold text-slate-700">
              {level === 'state'
                ? localizeName(state, summary?.stateHi || listSummary.stateHi)
                : level === 'district'
                ? localizeName(district, listSummary.districtHi)
                : level === 'ac'
                ? localizeName(ac, listSummary.assemblyConstituencyHi)
                : lang === 'hi'
                ? listSummary.boothNameHi || hindiizeBoothName(boothName || 'Booth')
                : boothName || 'Booth'}
            </span>
            <span className="text-slate-300">·</span>
            <label className="text-[10px] text-slate-500">{t('from')}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            />
            <label className="text-[10px] text-slate-500">{t('to')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-[11px] text-slate-500 hover:text-slate-900">
                {t('clear')}
              </button>
            )}
          </>
        )}
      </div>

      {view === 'charts' && (
        <BoothCharts
          scope={{
            boothId: level === 'booth' ? boothId : undefined,
            assemblyConstituency: level === 'ac' ? ac : undefined,
            district: level === 'district' ? district : undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          }}
        />
      )}

      {/* Filter + search */}
      {view === 'list' && <div className="flex items-center gap-2 flex-wrap">
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} label={`${t('all')} (${counts.all})`} />
        <FilterPill
          active={filter === 'pending'}
          onClick={() => setFilter('pending')}
          label={`${t('pending')} (${counts.pending})`}
          tone="red"
        />
        <FilterPill
          active={filter === 'done'}
          onClick={() => setFilter('done')}
          label={
            level === 'ac' && tab === 'discrepancies'
              ? `${t('resolved')} (${counts.done})`
              : `${t('completed')} (${counts.done})`
          }
          tone="green"
        />
        {level === 'ac' && tab === 'discrepancies' && reasonOptions.length > 0 && (
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-full text-slate-700">
            <option value="">{t('allReasons')}</option>
            {reasonOptions.map((r) => (
              <option key={r.key} value={r.key}>
                {lang === 'hi' ? r.hi : r.en} ({r.count})
              </option>
            ))}
          </select>
        )}
        <div className="flex-1" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            level === 'state'
              ? t('searchDistrict')
              : level === 'district'
              ? t('searchAcOrNumber')
              : level === 'ac' && tab === 'discrepancies'
              ? t('searchDiscrepancy')
              : level === 'ac'
              ? t('searchBooth')
              : t('searchVoter')
          }
          className="min-w-[240px] px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        />
        {level === 'ac' && tab === 'booths' && (
          <button
            onClick={() => {
              toast(t('voterListBulkHint'), { icon: '↓' });
            }}
            className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50">
            {t('bulkUpload')}
          </button>
        )}
      </div>}

      {/* Content — only rendered in list view; charts view handles its own content above */}
      {view === 'list' && loading && <ListSkeleton level={level} />}

      {view === 'list' && !loading && level === 'state' && (
        <CheckList>
          {districts.map((d) => (
            <DistrictListRow
              key={d.district}
              row={d}
              lang={lang}
              t={t}
              onOpen={() => navTo({ district: d.district, ac: '', boothId: '' })}
            />
          ))}
          {districts.length === 0 && <EmptyRow message={t('noDistricts')} />}
        </CheckList>
      )}

      {view === 'list' && !loading && level === 'district' && (
        <CheckList>
          {acs.map((a) => (
            <AcListRow
              key={a.assemblyConstituency + a.number}
              row={a}
              lang={lang}
              t={t}
              onOpen={() => navTo({ ac: a.assemblyConstituency, boothId: '' })}
            />
          ))}
          {acs.length === 0 && <EmptyRow message={t('noConstituencies')} />}
        </CheckList>
      )}

      {view === 'list' && !loading && level === 'ac' && tab === 'booths' && (
        <>
          {listCounts.all === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-amber-300 p-8 text-center">
              <p className="text-sm font-semibold text-slate-900">
                {lang === 'hi'
                  ? `${localizeName(ac, listSummary.assemblyConstituencyHi)} ${t('noBoothsSetup')} ${t('yet')}`
                  : `${t('noBoothsSetup')} ${ac} ${t('yet')}`}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {t('addPollingStations')}
              </p>
              <Link
                href={`/booths?ac=${encodeURIComponent(ac)}`}
                className="inline-block mt-3 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800">
                {t('goToBooths')}
              </Link>
            </div>
          ) : (
            <CheckList>
              {booths.map((b) => (
                <BoothListRow
                  key={b._id}
                  row={b}
                  lang={lang}
                  t={t}
                  onOpen={() => navTo({ boothId: b._id, boothName: b.name, partNumber: b.partNumber })}
                  onUpload={() => setUploadBoothId(b._id)}
                  onAssign={
                    canAssign
                      ? () =>
                          setAssignBooth({
                            id: b._id,
                            label: `${t('part')} ${b.partNumber} · ${b.name} · ${b.assemblyConstituency}`,
                          })
                      : undefined
                  }
                />
              ))}
              {booths.length === 0 && <EmptyRow message={t('noBooths')} />}
            </CheckList>
          )}
        </>
      )}

      {view === 'list' && !loading && level === 'ac' && tab === 'discrepancies' && (
        <>
          {discrepancyCounts.total === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-amber-300 p-8 text-center">
              <p className="text-sm font-semibold text-slate-900">
                {lang === 'hi'
                  ? `${localizeName(ac, listSummary.assemblyConstituencyHi)} ${t('noDiscrepancyUploaded')} ${t('yet')}`
                  : `${t('noDiscrepancyUploaded')} ${ac} ${t('yet')}`}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {t('uploadEciHint')}
              </p>
              <button
                onClick={() => setDiscrepancyImportOpen(true)}
                className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                {t('uploadDiscrepancyPdf')}
              </button>
            </div>
          ) : (
            <CheckList>
              {discrepancies.map((d) => (
                <DiscrepancyListRow
                  key={d._id}
                  row={d}
                  lang={lang}
                  t={t}
                  onToggleCheck={() => toggleDiscrepancyCheck(d)}
                  onStatusChange={(status) => setDiscrepancyStatus(d, status)}
                />
              ))}
              {discrepancies.length === 0 && (
                <EmptyRow message={t('noDiscrepancyRows')} />
              )}
            </CheckList>
          )}
        </>
      )}

      {view === 'list' && !loading && level === 'booth' && (
        <>
          {(listSummary.total ?? 0) === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-amber-300 p-8 text-center">
              <p className="text-sm font-semibold text-slate-900">{t('noVotersUploaded')}</p>
              <p className="text-xs text-slate-500 mt-1">{t('uploadHint')}</p>
              <button
                onClick={() => setUploadBoothId(boothId)}
                className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                {t('uploadVoterList')}
              </button>
            </div>
          ) : (
            <CheckList>
              {voters.map((v) => (
                <VoterListRow key={v._id} row={v} lang={lang} t={t} />
              ))}
              {voters.length === 0 && <EmptyRow message={t('noVoters')} />}
            </CheckList>
          )}
        </>
      )}

      {/* Shared pagination footer — rendered when the server reports more
          than one page for the current filter.  The underlying slice is
          already the current page, so we just forward the metadata. */}
      {view === 'list' && !loading && totalPages > 1 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalFiltered={totalFiltered}
          startIdx={startIdx}
          endIdx={endIdx}
          t={t}
          onChange={(p) => setPage(p)}
        />
      )}

      {uploadBoothId && (
        <ImportVotersModal
          defaultBoothId={uploadBoothId}
          onClose={() => setUploadBoothId(null)}
          onImported={() => {
            setUploadBoothId(null);
            load();
            toast.success('Uploaded — progress refreshed');
          }}
        />
      )}

      {assignBooth && (
        <AssignmentFormModal
          defaultBoothId={assignBooth.id}
          defaultBoothLabel={assignBooth.label}
          onClose={() => setAssignBooth(null)}
          onSaved={() => {
            setAssignBooth(null);
            toast.success('Staff assigned to booth');
          }}
        />
      )}

      {discrepancyImportOpen && (
        <DiscrepancyImportModal
          onClose={() => setDiscrepancyImportOpen(false)}
          onImported={() => {
            setDiscrepancyImportOpen(false);
            load();
            toast.success('Discrepancy list imported');
          }}
          defaultAc={ac}
        />
      )}

      <SharedVoterFiltersModal
        open={filtersOpen}
        title="Filter explore"
        subtitle="Survey-time fields scope every chart and the voter sub-list at this drill level"
        initial={exploreFilters}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => {
          setExploreFilters(next);
          // Keep the existing inline charts-mode date inputs in sync — they
          // read the same `dateFrom`/`dateTo` setters the modal owns.
          setDateFrom(next.visitDateFrom);
          setDateTo(next.visitDateTo);
          setFiltersOpen(false);
        }}
      />
    </div>
  );
}

function Crumb({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md transition ${
        active
          ? 'bg-slate-900 text-white font-medium'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
      }`}>
      {children}
    </button>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: 'red' | 'green';
}) {
  const activeBg =
    tone === 'red' ? 'bg-red-600' : tone === 'green' ? 'bg-emerald-600' : 'bg-slate-900';
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
        active
          ? `${activeBg} text-white`
          : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
      }`}>
      {label}
    </button>
  );
}

function CheckList({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 divide-y divide-slate-100 overflow-hidden">
      {children}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  totalFiltered,
  startIdx,
  endIdx,
  t,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalFiltered: number;
  startIdx: number;
  endIdx: number;
  t: (key: LabelKey) => string;
  onChange: (page: number) => void;
}) {
  // Build a compact page-number strip: first, last, and a small window
  // around the current page.  For ≤7 pages we render them all; otherwise
  // we ellipsize the middle so very long lists (e.g. UP districts = 75)
  // don't explode the footer width.
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);
    if (left > 2) pages.push('ellipsis');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
      <p className="text-xs text-slate-500">
        {t('showing')} <span className="font-medium text-slate-700">{startIdx + 1}</span>–
        <span className="font-medium text-slate-700">{endIdx}</span> {t('of')}{' '}
        <span className="font-medium text-slate-700">{totalFiltered.toLocaleString('en-IN')}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(Math.max(1, page - 1))}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50">
          {t('prev')}
        </button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-2 text-xs text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`min-w-[32px] px-2 py-1.5 text-xs font-medium rounded-lg border transition ${
                p === page
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}>
              {p}
            </button>
          ),
        )}
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50">
          {t('next')}
        </button>
      </div>
    </div>
  );
}

function Checkbox({
  status,
  labels,
}: {
  status: StatusKey;
  labels?: { done: string; progress: string; empty: string };
}) {
  const meta = statusMeta(status, labels);
  return (
    <span
      className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center text-xs font-bold ${meta.checkbox}`}
      aria-label={meta.label}>
      {status === 'done' ? '✓' : status === 'progress' ? '•' : ''}
    </span>
  );
}

function ProgressMini({
  verified,
  total,
  status,
  labels,
}: {
  verified: number;
  total: number;
  status: StatusKey;
  labels?: { done: string; progress: string; empty: string };
}) {
  const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
  const meta = statusMeta(status, labels);
  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
        <span>{verified.toLocaleString('en-IN')} / {total.toLocaleString('en-IN')}</span>
        <span className="font-semibold text-slate-700">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${meta.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusPill({
  status,
  labels,
}: {
  status: StatusKey;
  labels?: { done: string; progress: string; empty: string };
}) {
  const meta = statusMeta(status, labels);
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${meta.pill}`}>
      {meta.label}
    </span>
  );
}

/**
 * Source / freshness indicator.  Built so even if we ship with only 2019
 * baseline data loaded, the UI never lies about how old it is — we tell the
 * user "Baseline 2019" in yellow until a per-AC 2025 refresh overwrites it.
 */
function sourceMeta(source?: BoothSource): { label: string; pill: string; tooltip: string } {
  switch (source) {
    case 'voterlist_2026':
      return {
        label: 'ECI 2026 Final',
        pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        tooltip:
          'ECI 2026 SIR Final Electoral Roll polling-station list, obtained via voterlist.co.in (which republishes the authoritative ECI metadata).',
      };
    case 'ceo_up_2025':
      return {
        label: 'CEO UP 2025',
        pill: 'bg-teal-50 text-teal-700 border-teal-200',
        tooltip: 'Latest draft roll from CEO Uttar Pradesh (2025).',
      };
    case 'deo_pdf':
      return {
        label: 'DEO PDF',
        pill: 'bg-sky-50 text-sky-700 border-sky-200',
        tooltip: 'Imported from a District Electoral Officer PDF.',
      };
    case 'user_upload':
      return {
        label: 'Uploaded',
        pill: 'bg-violet-50 text-violet-700 border-violet-200',
        tooltip: 'Bulk-imported by a super admin.',
      };
    case 'manual':
      return {
        label: 'Manual',
        pill: 'bg-slate-50 text-slate-600 border-slate-200',
        tooltip: 'Added by hand through the booth CRUD.',
      };
    case 'harvard_2019':
      return {
        label: 'Baseline 2019',
        pill: 'bg-amber-50 text-amber-700 border-amber-200',
        tooltip:
          'Seeded from Harvard Dataverse 2019 polling-station data. Will be refreshed when the 2025 scraper runs for this AC.',
      };
    default:
      return {
        label: 'No data',
        pill: 'bg-slate-50 text-slate-500 border-slate-200',
        tooltip: 'No booths loaded for this area yet.',
      };
  }
}

function formatRelative(iso?: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return 'never';
  const diffMs = Date.now() - then;
  const d = Math.floor(diffMs / 86_400_000);
  if (d < 1) return 'today';
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  const y = Math.floor(d / 365);
  return `${y}y ago`;
}

function FreshnessPill({
  source,
  lastSyncedAt,
  compact = false,
}: {
  source?: BoothSource;
  lastSyncedAt?: string | null;
  compact?: boolean;
}) {
  const meta = sourceMeta(source);
  const rel = formatRelative(lastSyncedAt);
  return (
    <span
      title={`${meta.tooltip} · last synced ${rel}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${meta.pill}`}>
      {meta.label}
      {!compact && source && (
        <span className="normal-case font-medium opacity-70">· {rel}</span>
      )}
    </span>
  );
}

function DistrictListRow({
  row,
  lang,
  t,
  onOpen,
}: {
  row: DistrictRow;
  lang: Lang;
  t: (key: LabelKey) => string;
  onOpen: () => void;
}) {
  const status = statusFor(row.verified, row.totalVoters);
  const labels = useStatusLabels(t);
  const displayName = lang === 'hi' ? row.districtHi || row.district : row.district;
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition text-left">
      <Checkbox status={status} labels={labels} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 truncate">{displayName}</span>
          {lang === 'hi' && row.districtHi && (
            <span className="text-xs text-slate-400 truncate">({row.district})</span>
          )}
          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{row.division}</span>
          <StatusPill status={status} labels={labels} />
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {row.totalAcs} {t('vidhanSabha')}{lang === 'en' && row.totalAcs !== 1 ? 's' : ''} ·{' '}
          {row.booths > 0 ? `${row.booths} ${t('boothsUploaded')}` : t('noBoothsUploaded')}
        </p>
      </div>
      <ProgressMini verified={row.verified} total={row.totalVoters} status={status} labels={labels} />
      <span className="text-slate-300 text-lg">›</span>
    </button>
  );
}

function AcListRow({
  row,
  lang,
  t,
  onOpen,
}: {
  row: AcRow;
  lang: Lang;
  t: (key: LabelKey) => string;
  onOpen: () => void;
}) {
  const status = statusFor(row.verified, row.totalVoters);
  const labels = useStatusLabels(t);
  const displayName = lang === 'hi' ? row.assemblyConstituencyHi || row.assemblyConstituency : row.assemblyConstituency;
  const boothsLoadedText =
    row.booths === 1
      ? `${row.booths} ${t('boothLoaded')}`
      : `${row.booths} ${t('boothsLoaded')}`;
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition text-left">
      <Checkbox status={status} labels={labels} />
      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-700">
        <span className="text-[8px] font-bold tracking-wider">AC</span>
        <span className="text-sm font-extrabold leading-none">{row.number || '—'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 truncate">{displayName}</span>
          {lang === 'hi' && row.assemblyConstituencyHi && (
            <span className="text-xs text-slate-400 truncate">({row.assemblyConstituency})</span>
          )}
          {row.reserved && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              {row.reserved}
            </span>
          )}
          <StatusPill status={status} labels={labels} />
          <FreshnessPill source={row.source} lastSyncedAt={row.lastSyncedAt} />
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {row.booths > 0 ? boothsLoadedText : t('noBoothsLoaded')}
        </p>
      </div>
      <ProgressMini verified={row.verified} total={row.totalVoters} status={status} labels={labels} />
      <span className="text-slate-300 text-lg">›</span>
    </button>
  );
}

function BoothListRow({
  row,
  lang,
  t,
  onOpen,
  onUpload,
  onAssign,
}: {
  row: BoothRow;
  lang: Lang;
  t: (key: LabelKey) => string;
  onOpen: () => void;
  onUpload: () => void;
  /** Only super_admin sees this — POST /voter-assignments is admin-only,
   *  so showing it to other roles would just surface a 403. */
  onAssign?: () => void;
}) {
  const status = statusFor(row.verified, row.totalVoters);
  const labels = useStatusLabels(t);
  const displayName =
    lang === 'hi' ? row.nameHi || hindiizeBoothName(row.name) : row.name;
  const displayVillage =
    lang === 'hi' ? row.villageHi || hindiizeBoothName(row.village) : row.village;
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition">
      <Checkbox status={status} labels={labels} />
      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-700">
        <span className="text-[8px] font-bold tracking-wider">{lang === 'hi' ? 'भाग' : 'PART'}</span>
        <span className="text-sm font-extrabold leading-none">{row.partNumber}</span>
      </div>
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 truncate">{displayName}</span>
          {lang === 'hi' && row.nameHi && row.nameHi !== row.name && (
            <span className="text-xs text-slate-400 truncate">({row.name})</span>
          )}
          <StatusPill status={status} labels={labels} />
          <FreshnessPill source={row.source} lastSyncedAt={row.lastSyncedAt} compact />
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {displayVillage ? `${displayVillage} · ` : ''}
          {row.totalVoters > 0
            ? `${row.totalVoters.toLocaleString('en-IN')} ${t('votersWordBooth')}`
            : row.registeredVoters
              ? `${row.registeredVoters.toLocaleString('en-IN')} ${t('onRoll')}`
              : t('noVotersUploadedBooth')}
        </p>
        {row.assignedStaff && row.assignedStaff.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-slate-500">{t('assignedTo')}:</span>
            {row.assignedStaff.map((a) => {
              const label = a.staffName || a.staffPhone || '—';
              const rangeLabel =
                a.voterSerialFrom && a.voterSerialTo
                  ? ` · #${a.voterSerialFrom}–${a.voterSerialTo}`
                  : '';
              return (
                <span
                  key={a._id}
                  title={
                    (a.staffPhone ? `${a.staffPhone}` : '') +
                    (rangeLabel ? ` — serials${rangeLabel}` : '')
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {label}
                  {rangeLabel && (
                    <span className="text-emerald-500/80">{rangeLabel}</span>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </button>
      <ProgressMini verified={row.verified} total={row.totalVoters} status={status} labels={labels} />
      {onAssign && (
        <button
          onClick={onAssign}
          title={t('assignTooltip')}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-lg transition">
          {row.assignedStaff && row.assignedStaff.length > 0 ? t('reassign') : t('assign')}
        </button>
      )}
      <button
        onClick={onUpload}
        className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition">
        {t('upload')}
      </button>
      <button
        onClick={onOpen}
        className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-lg transition">
        {t('open')}
      </button>
    </div>
  );
}

function VoterListRow({
  row,
  lang,
  t,
}: {
  row: VoterRow;
  lang: Lang;
  t: (key: LabelKey) => string;
}) {
  const status: StatusKey = row.verificationStatus ? 'done' : 'progress';
  const labels = useStatusLabels(t);
  const genderLabel =
    lang === 'hi'
      ? row.gender === 'M'
        ? 'पुरुष'
        : row.gender === 'F'
          ? 'महिला'
          : 'अन्य'
      : row.gender === 'M'
        ? 'Male'
        : row.gender === 'F'
          ? 'Female'
          : 'Other';
  const relLabel = lang === 'hi' ? 'पुत्र/पुत्री' : 'S/o';
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition">
      <Checkbox status={status} labels={labels} />
      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-700">
        <span className="text-[8px] font-bold tracking-wider">{lang === 'hi' ? 'क्र' : 'SR'}</span>
        <span className="text-sm font-extrabold leading-none">{row.voterSerialNumber}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 truncate">
            {lang === 'hi'
              ? row.fullNameHi || transliterateToDevanagari(row.fullName)
              : row.fullName}
          </span>
          {lang === 'hi' && (
            <span className="text-xs text-slate-400 truncate">({row.fullName})</span>
          )}
          <StatusPill status={status} labels={labels} />
          {row.votingIntention && row.verificationStatus && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              {row.votingIntention}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {row.fatherOrHusbandName
            ? `${relLabel} ${
                lang === 'hi'
                  ? row.fatherOrHusbandNameHi ||
                    transliterateToDevanagari(row.fatherOrHusbandName)
                  : row.fatherOrHusbandName
              } · `
            : ''}
          {genderLabel}
          {row.age ? `, ${row.age}` : ''} · EPIC {row.epicNumber}
        </p>
        {row.staffRemarks && (
          <p className="text-[11px] text-slate-600 italic mt-1 truncate">"{row.staffRemarks}"</p>
        )}
        {row.assignedStaff && row.assignedStaff.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-slate-500">{t('assignedTo')}:</span>
            {row.assignedStaff.map((a) => (
              <span
                key={a._id}
                title={a.staffPhone || ''}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {a.staffName || a.staffPhone || '—'}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="text-right text-xs text-slate-500 flex-shrink-0">
        {row.verificationStatus && row.visitDate ? (
          <>
            <p className="font-semibold text-slate-700">{lang === 'hi' ? 'भ्रमण किया' : 'Visited'}</p>
            <p>{new Date(row.visitDate).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN')}</p>
          </>
        ) : (
          <p className="text-amber-600 font-semibold">{lang === 'hi' ? 'भ्रमण लंबित' : 'Pending visit'}</p>
        )}
      </div>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return <div className="px-4 py-10 text-center text-sm text-slate-500">{message}</div>;
}

function ListSkeleton({ level }: { level: Level }) {
  const rowCount = level === 'booth' ? 8 : level === 'ac' ? 7 : 6;
  const showBadge = level === 'district' || level === 'ac' || level === 'booth';
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 divide-y divide-slate-100 overflow-hidden">
      {Array.from({ length: rowCount }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3"
          style={{ animation: 'fadeInUp 0.35s ease-out both', animationDelay: `${i * 50}ms` }}>
          <div className="skeleton flex-shrink-0 w-6 h-6 rounded-md" />
          {showBadge && <div className="skeleton flex-shrink-0 w-11 h-11 rounded-lg" />}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="skeleton h-4 rounded"
                style={{ width: `${40 + ((i * 13) % 30)}%` }}
              />
              <div className="skeleton h-4 w-16 rounded-full" />
            </div>
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
          <div className="min-w-[140px] space-y-1.5 hidden sm:block">
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-1.5 w-full rounded-full" />
          </div>
          <div className="skeleton w-4 h-4 rounded" />
        </div>
      ))}
    </div>
  );
}

function DiscrepancyListRow({
  row,
  lang,
  t,
  onToggleCheck,
  onStatusChange,
}: {
  row: DiscrepancyRow;
  lang: Lang;
  t: (key: LabelKey) => string;
  onToggleCheck: () => void;
  onStatusChange: (status: 'pending' | 'resolved' | 'dismissed') => void;
}) {
  const statusKey: StatusKey =
    row.status === 'resolved' ? 'done' : row.status === 'dismissed' ? 'done' : 'progress';
  const labels = useStatusLabels(t);
  const genderLabel =
    lang === 'hi'
      ? row.gender === 'M'
        ? 'पुरुष'
        : row.gender === 'F'
          ? 'महिला'
          : row.gender === 'T'
            ? 'अन्य'
            : '—'
      : row.gender === 'M'
        ? 'Male'
        : row.gender === 'F'
          ? 'Female'
          : row.gender === 'T'
            ? 'Other'
            : '—';

  return (
    <div className="flex items-start gap-4 px-4 py-3 hover:bg-slate-50 transition">
      {/* Checkbox: reviewer marks that they've looked at this row */}
      <button
        onClick={onToggleCheck}
        className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center text-xs font-bold transition ${
          row.checked
            ? 'bg-slate-900 border-slate-900 text-white'
            : 'bg-white border-slate-300 text-transparent hover:border-slate-500'
        }`}
        aria-label={row.checked ? 'Marked reviewed' : 'Mark as reviewed'}>
        {row.checked ? '✓' : ''}
      </button>

      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-700">
        <span className="text-[8px] font-bold tracking-wider">{lang === 'hi' ? 'क्र' : 'SR'}</span>
        <span className="text-sm font-extrabold leading-none">{row.voterSerialNumber}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 truncate">
            {lang === 'hi' ? row.voterNameHi || row.voterNameEn || '—' : row.voterNameEn || '—'}
          </span>
          <span className="text-sm text-slate-600 truncate">
            ({lang === 'hi' ? row.voterNameEn : row.voterNameHi})
          </span>
          <StatusPill status={statusKey} labels={labels} />
          {row.status === 'resolved' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              {t('resolved')}
            </span>
          )}
          {row.status === 'dismissed' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 border border-slate-300">
              {t('dismissed')}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-0.5 truncate">
          EPIC <span className="font-mono text-slate-700">{row.epicNumber}</span> · {t('part')} {row.partNumber}
          {row.age !== undefined ? ` · ${row.age}` : ''}
          {row.gender ? ` · ${genderLabel}` : ''}
        </p>

        {row.partNameHi && (
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {lang === 'hi' ? row.partNameHi : row.partNameEn || ''}{' '}
            <span className="text-slate-500">· {lang === 'hi' ? row.partNameEn : row.partNameHi}</span>
          </p>
        )}

        {/* Reason list — bilingual */}
        <ul className="mt-2 space-y-1">
          {row.discrepancyReasonEn.map((en, i) => {
            const primary = lang === 'hi' ? row.discrepancyReasonHi[i] : en;
            const secondary = lang === 'hi' ? en : row.discrepancyReasonHi[i];
            return (
              <li
                key={i}
                className="text-[11px] leading-snug bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                <span className="font-semibold text-amber-900">{primary}</span>
                <span className="text-amber-700"> — {secondary}</span>
              </li>
            );
          })}
          {row.discrepancyReasonEn.length === 0 && (
            <li className="text-[11px] text-slate-400 italic">
              {lang === 'hi' ? 'कोई कारण दर्ज नहीं' : 'No reason recorded'}
            </li>
          )}
        </ul>
      </div>

      <div className="flex-shrink-0 flex flex-col gap-1 items-end">
        <button
          onClick={() => onStatusChange(row.status === 'resolved' ? 'pending' : 'resolved')}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition border ${
            row.status === 'resolved'
              ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
              : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
          }`}>
          {row.status === 'resolved' ? t('resolvedLabel') : t('markResolved')}
        </button>
        <button
          onClick={() => onStatusChange(row.status === 'dismissed' ? 'pending' : 'dismissed')}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition border ${
            row.status === 'dismissed'
              ? 'bg-slate-800 text-white border-slate-800 hover:bg-slate-900'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}>
          {row.status === 'dismissed' ? t('dismissed') : t('dismiss')}
        </button>
      </div>
    </div>
  );
}

function LanguageSwitcher({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (lang: Lang) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Language">
      <button
        onClick={() => setLang('en')}
        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
          lang === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
        }`}>
        EN
      </button>
      <button
        onClick={() => setLang('hi')}
        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
          lang === 'hi' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
        }`}>
        हिं
      </button>
    </div>
  );
}
