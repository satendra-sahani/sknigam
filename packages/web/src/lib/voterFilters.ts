// Single source of truth for the survey-time filter set used across every
// admin list/dashboard page (Voters, Booths, Staff, Audit Log, Assignments,
// Analytics, Explore). Each page composes its own modal, but every page
// imports the same FilterState shape, query-builder, chip-describer, and
// reference dropdown lists from here so nothing drifts.

import { CASTES, UP_DISTRICTS, subCastesFor } from './voterReferenceData';

export const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];
export const VOTING_INTENTIONS = ['Will Vote', 'May Vote', "Won't Vote", 'First-Time Voter'];
export const PARTIES = [
  'BJP',
  'SP',
  'BSP',
  'INC',
  'RLD',
  'AAP',
  'AIMIM',
  'SBSP',
  'Apna Dal',
  'NISHAD',
  'Independent',
  'Undecided',
  'Other',
];
export const INFLUENCE_LEVELS = ['High', 'Medium', 'Low'];
export const EDUCATION_LEVELS = ['Illiterate', 'Primary', 'Secondary', 'Graduate', 'Post-Graduate'];
export const GENDERS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'T', label: 'Transgender' },
];
export const VERIFIED_OPTS = [
  { value: 'all', label: 'Any' },
  { value: 'true', label: 'Verified' },
  { value: 'false', label: 'Pending' },
];
export const GRIEVANCE_OPTIONS = [
  { value: 'Roads', label: 'Roads' },
  { value: 'Water', label: 'Water' },
  { value: 'Electricity', label: 'Electricity' },
  { value: 'Employment', label: 'Employment' },
  { value: 'Education', label: 'Education' },
  { value: 'Health', label: 'Health' },
  { value: 'Pension', label: 'Pension' },
  { value: 'Corruption', label: 'Corruption' },
  { value: 'LawAndOrder', label: 'Law & Order' },
  { value: 'Other', label: 'Other' },
];

export { CASTES, UP_DISTRICTS, subCastesFor };

/** Master filter shape — every survey-time field. Pages may ignore some. */
export interface VoterFilterState {
  search: string;
  district: string;
  constituency: string;
  gender: string;
  verified: 'all' | 'true' | 'false';
  religion: string;
  caste: string;
  subCaste: string;
  votingIntention: string;
  partySupport: string;
  influenceLevel: string;
  educationLevel: string;
  grievances: string[];
  ageMin: string;
  ageMax: string;
  visitDateFrom: string;
  visitDateTo: string;
}

export const emptyVoterFilters: VoterFilterState = {
  search: '',
  district: '',
  constituency: '',
  gender: '',
  verified: 'all',
  religion: '',
  caste: '',
  subCaste: '',
  votingIntention: '',
  partySupport: '',
  influenceLevel: '',
  educationLevel: '',
  grievances: [],
  ageMin: '',
  ageMax: '',
  visitDateFrom: '',
  visitDateTo: '',
};

/** Build the query-string params, omitting empty values. */
export function buildVoterQuery(
  state: VoterFilterState,
  extras: Record<string, string> = {},
): Record<string, string> {
  const out: Record<string, string> = { ...extras };
  if (state.search) out.search = state.search;
  if (state.district) out.district = state.district;
  if (state.constituency) out.assemblyConstituency = state.constituency;
  if (state.gender) out.gender = state.gender;
  if (state.verified !== 'all') out.verificationStatus = state.verified;
  if (state.religion) out.religion = state.religion;
  if (state.caste) out.caste = state.caste;
  if (state.subCaste) out.subCaste = state.subCaste;
  if (state.votingIntention) out.votingIntention = state.votingIntention;
  if (state.partySupport) out.partySupport = state.partySupport;
  if (state.influenceLevel) out.influenceLevel = state.influenceLevel;
  if (state.educationLevel) out.educationLevel = state.educationLevel;
  if (state.grievances.length) out.grievances = state.grievances.join(',');
  if (state.ageMin) out.ageMin = state.ageMin;
  if (state.ageMax) out.ageMax = state.ageMax;
  if (state.visitDateFrom) out.visitDateFrom = state.visitDateFrom;
  if (state.visitDateTo) out.visitDateTo = state.visitDateTo;
  // Same `dateFrom`/`dateTo` aliases for older endpoints (analytics, booth charts).
  if (state.visitDateFrom) out.dateFrom = state.visitDateFrom;
  if (state.visitDateTo) out.dateTo = state.visitDateTo;
  return out;
}

export type VoterChipKey =
  | keyof VoterFilterState
  | 'age'
  | 'visit';

export interface VoterChip {
  key: VoterChipKey;
  label: string;
}

/** Convert applied filters into a list of removable display chips. */
export function describeVoterFilters(state: VoterFilterState): VoterChip[] {
  const out: VoterChip[] = [];
  if (state.search) out.push({ key: 'search', label: `"${state.search}"` });
  if (state.district) out.push({ key: 'district', label: `District: ${state.district}` });
  if (state.constituency) out.push({ key: 'constituency', label: `AC: ${state.constituency}` });
  if (state.gender) {
    const g = state.gender === 'M' ? 'Male' : state.gender === 'F' ? 'Female' : 'Transgender';
    out.push({ key: 'gender', label: `Gender: ${g}` });
  }
  if (state.verified !== 'all') out.push({ key: 'verified', label: state.verified === 'true' ? 'Verified' : 'Pending' });
  if (state.religion) out.push({ key: 'religion', label: `Religion: ${state.religion}` });
  if (state.caste) out.push({ key: 'caste', label: `Caste: ${state.caste}` });
  if (state.subCaste) out.push({ key: 'subCaste', label: `Sub-caste: ${state.subCaste}` });
  if (state.votingIntention) out.push({ key: 'votingIntention', label: state.votingIntention });
  if (state.partySupport) out.push({ key: 'partySupport', label: `Party: ${state.partySupport}` });
  if (state.influenceLevel) out.push({ key: 'influenceLevel', label: `Influence: ${state.influenceLevel}` });
  if (state.educationLevel) out.push({ key: 'educationLevel', label: state.educationLevel });
  if (state.grievances.length) out.push({ key: 'grievances', label: `Grievances: ${state.grievances.length}` });
  if (state.ageMin || state.ageMax) out.push({ key: 'age', label: `Age ${state.ageMin || '0'}-${state.ageMax || '∞'}` });
  if (state.visitDateFrom || state.visitDateTo)
    out.push({ key: 'visit', label: `Visit ${state.visitDateFrom || '…'} → ${state.visitDateTo || '…'}` });
  return out;
}

/** Remove one chip from a state, returning the updated state. */
export function clearVoterChip(state: VoterFilterState, chip: VoterChip): VoterFilterState {
  const next = { ...state };
  switch (chip.key) {
    case 'age':
      next.ageMin = '';
      next.ageMax = '';
      return next;
    case 'visit':
      next.visitDateFrom = '';
      next.visitDateTo = '';
      return next;
    case 'verified':
      next.verified = 'all';
      return next;
    case 'grievances':
      next.grievances = [];
      return next;
    default:
      (next as Record<string, unknown>)[chip.key] = '';
      return next;
  }
}
