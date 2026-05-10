'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import ImportVotersModal from '@/components/ImportVotersModal';
import { SkeletonTable } from '@/components/Skeleton';
import { CASTES, UP_DISTRICTS, subCastesFor } from '@/lib/voterReferenceData';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface BoothSummary {
  _id: string;
  name: string;
  partNumber: number;
  assemblyConstituency: string;
}

interface VoterRow {
  _id: string;
  voterSerialNumber: number;
  epicNumber: string;
  fullName: string;
  fatherOrHusbandName?: string;
  gender: 'M' | 'F' | 'T';
  age?: number;
  mobileNumber?: string;
  caste?: string;
  religion?: string;
  verificationStatus: boolean;
  boothId?: BoothSummary | string;
  partNumber: number;
  assemblyConstituency: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface Bucket {
  key: string;
  count: number;
}

interface Breakdown {
  total: number;
  verified: number;
  unverified: number;
  verificationRate: number;
  gender: Bucket[];
  religion: Bucket[];
  caste: Bucket[];
  subCaste: Bucket[];
  votingIntention: Bucket[];
  partySupport: Bucket[];
  age: Bucket[];
  grievances: Bucket[];
  visitsByDay: Bucket[];
}

const PAGE_SIZE = 25;

const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];
const VOTING_INTENTIONS = ['Will Vote', 'May Vote', "Won't Vote", 'First-Time Voter'];
const PARTIES = ['BJP', 'SP', 'BSP', 'INC', 'RLD', 'AAP', 'AIMIM', 'SBSP', 'Apna Dal', 'NISHAD', 'Independent', 'Undecided', 'Other'];
const INFLUENCE_LEVELS = ['High', 'Medium', 'Low'];
const EDUCATION_LEVELS = ['Illiterate', 'Primary', 'Secondary', 'Graduate', 'Post-Graduate'];
const GRIEVANCE_OPTIONS = [
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
];

const PALETTE = [
  '#1F3A8A',
  '#B7873A',
  '#1F7A4E',
  '#205B9C',
  '#C6850D',
  '#7A5818',
  '#4F5867',
  '#0F1B2D',
  '#9B9685',
  '#0F4A2D',
];

interface FilterState {
  search: string;
  constituency: string;
  district: string;
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

const emptyFilters = (params: URLSearchParams): FilterState => ({
  search: '',
  constituency: params.get('assemblyConstituency') || '',
  district: '',
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
});

function buildQuery(state: FilterState, extras: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = { ...extras };
  if (state.search) out.search = state.search;
  if (state.constituency) out.assemblyConstituency = state.constituency;
  if (state.district) out.district = state.district;
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
  return out;
}

function describe(state: FilterState): { key: keyof FilterState | 'age' | 'visit'; label: string }[] {
  const out: { key: keyof FilterState | 'age' | 'visit'; label: string }[] = [];
  if (state.search) out.push({ key: 'search', label: `"${state.search}"` });
  if (state.constituency) out.push({ key: 'constituency', label: `AC: ${state.constituency}` });
  if (state.district) out.push({ key: 'district', label: `District: ${state.district}` });
  if (state.gender) out.push({ key: 'gender', label: `Gender: ${state.gender === 'M' ? 'Male' : state.gender === 'F' ? 'Female' : 'Transgender'}` });
  if (state.verified !== 'all') out.push({ key: 'verified', label: state.verified === 'true' ? 'Verified' : 'Pending' });
  if (state.religion) out.push({ key: 'religion', label: `Religion: ${state.religion}` });
  if (state.caste) out.push({ key: 'caste', label: `Caste: ${state.caste}` });
  if (state.subCaste) out.push({ key: 'subCaste', label: `Sub-caste: ${state.subCaste}` });
  if (state.votingIntention) out.push({ key: 'votingIntention', label: state.votingIntention });
  if (state.partySupport) out.push({ key: 'partySupport', label: `Party: ${state.partySupport}` });
  if (state.influenceLevel) out.push({ key: 'influenceLevel', label: `Influence: ${state.influenceLevel}` });
  if (state.educationLevel) out.push({ key: 'educationLevel', label: state.educationLevel });
  if (state.grievances.length)
    out.push({ key: 'grievances', label: `Grievances: ${state.grievances.length}` });
  if (state.ageMin || state.ageMax)
    out.push({ key: 'age', label: `Age ${state.ageMin || '0'}-${state.ageMax || '∞'}` });
  if (state.visitDateFrom || state.visitDateTo)
    out.push({ key: 'visit', label: `Visit ${state.visitDateFrom || '…'}→${state.visitDateTo || '…'}` });
  return out;
}

export default function VotersPage() {
  const { user } = useAuth();
  const params = useSearchParams();
  const boothIdFromUrl = params.get('boothId') || '';

  const [applied, setApplied] = useState<FilterState>(() => emptyFilters(params));
  const [page, setPage] = useState(1);

  const [voters, setVoters] = useState<VoterRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mode, setMode] = useState<'table' | 'graph'>('table');

  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const canManage = user?.role === 'super_admin';
  const canSeeGraphs = user?.role === 'super_admin' || user?.role === 'politician';

  const loadTable = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = buildQuery(applied, {
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (boothIdFromUrl) queryParams.boothId = boothIdFromUrl;
      const res = await api.get('/voters', { params: queryParams });
      setVoters(res.data.data.voters);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load voters');
    } finally {
      setLoading(false);
    }
  }, [applied, page, boothIdFromUrl]);

  const loadBreakdown = useCallback(async () => {
    if (!canSeeGraphs) return;
    setBreakdownLoading(true);
    try {
      const queryParams = buildQuery(applied);
      if (boothIdFromUrl) queryParams.boothId = boothIdFromUrl;
      const res = await api.get('/voters/stats/breakdown', { params: queryParams });
      setBreakdown(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load chart data');
    } finally {
      setBreakdownLoading(false);
    }
  }, [applied, boothIdFromUrl, canSeeGraphs]);

  useEffect(() => {
    loadTable();
  }, [loadTable]);

  useEffect(() => {
    if (mode === 'graph') {
      loadBreakdown();
    }
  }, [mode, loadBreakdown]);

  const activeChips = useMemo(() => describe(applied), [applied]);
  const activeCount = activeChips.length;

  function clearChip(key: { key: keyof FilterState | 'age' | 'visit'; label: string }) {
    setApplied((s) => {
      const next = { ...s };
      if (key.key === 'age') {
        next.ageMin = '';
        next.ageMax = '';
      } else if (key.key === 'visit') {
        next.visitDateFrom = '';
        next.visitDateTo = '';
      } else if (key.key === 'verified') {
        next.verified = 'all';
      } else if (key.key === 'grievances') {
        next.grievances = [];
      } else {
        (next as Record<string, unknown>)[key.key] = '';
      }
      return next;
    });
    setPage(1);
  }

  function clearAll() {
    setApplied(emptyFilters(new URLSearchParams()));
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Voters</h1>
          <p className="text-sm text-slate-500">
            {pagination.total.toLocaleString('en-IN')} voters
            {applied.constituency ? ` in ${applied.constituency}` : ''}
            {activeCount > 0 ? ` · ${activeCount} filter${activeCount === 1 ? '' : 's'} applied` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 transition shadow-sm">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M2.5 4h11M4.5 8h7M6.5 12h3" />
            </svg>
            Filters
            {activeCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-900 text-white font-semibold">
                {activeCount}
              </span>
            )}
          </button>
          {canSeeGraphs && (
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm shadow-sm">
              <button
                onClick={() => setMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                  mode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 3h10M2 7h10M2 11h10" />
                </svg>
                Table
              </button>
              <button
                onClick={() => setMode('graph')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                  mode === 'graph' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 12V4M5 12V8M8 12V2M11 12V6" strokeLinecap="round" />
                </svg>
                Graph
              </button>
            </div>
          )}
          {canManage && (
            <button
              onClick={() => setImportOpen(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-sm">
              Bulk Import
            </button>
          )}
        </div>
      </div>

      {/* Active filter pills */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip, i) => (
            <span
              key={`${String(chip.key)}-${i}`}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-slate-900 text-white shadow-sm">
              {chip.label}
              <button
                aria-label={`Remove ${chip.label}`}
                onClick={() => clearChip(chip)}
                className="ml-0.5 w-4 h-4 inline-flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M2 2l4 4M6 2L2 6" />
                </svg>
              </button>
            </span>
          ))}
          <button
            onClick={clearAll}
            className="ml-1 text-xs text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline">
            Clear all
          </button>
        </div>
      )}

      {mode === 'graph' ? (
        <GraphMode breakdown={breakdown} loading={breakdownLoading} />
      ) : (
        <TableMode
          voters={voters}
          loading={loading}
          pagination={pagination}
          page={page}
          setPage={setPage}
        />
      )}

      {filtersOpen && (
        <FiltersModal
          initial={applied}
          onClose={() => setFiltersOpen(false)}
          onApply={(next) => {
            setApplied(next);
            setPage(1);
            setFiltersOpen(false);
          }}
        />
      )}

      {importOpen && (
        <ImportVotersModal
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false);
            loadTable();
            if (mode === 'graph') loadBreakdown();
          }}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Filters modal                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

interface FiltersModalProps {
  initial: FilterState;
  onClose: () => void;
  onApply: (next: FilterState) => void;
}

function FiltersModal({ initial, onClose, onApply }: FiltersModalProps) {
  const [draft, setDraft] = useState<FilterState>(initial);

  // Esc to close + lock body scroll while the modal is mounted.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const draftCount = useMemo(() => describe(draft).length, [draft]);

  function update<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  // When the user picks a different caste, drop a sub-caste that no longer
  // belongs to it. Without this you'd send an impossible combo to the API.
  function changeCaste(next: string) {
    setDraft((d) => {
      const valid = subCastesFor(next).some((s) => s.code === d.subCaste);
      return { ...d, caste: next, subCaste: valid ? d.subCaste : '' };
    });
  }

  const subCasteOptions = subCastesFor(draft.caste);

  function toggleGrievance(g: string) {
    setDraft((d) =>
      d.grievances.includes(g)
        ? { ...d, grievances: d.grievances.filter((x) => x !== g) }
        : { ...d, grievances: [...d.grievances, g] },
    );
  }

  function reset() {
    setDraft(emptyFilters(new URLSearchParams()));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end md:items-center md:justify-center bg-slate-900/50 backdrop-blur-sm animate-fadein"
      onClick={onClose}>
      <div
        className="bg-white w-full md:w-[760px] md:max-w-[92vw] md:rounded-2xl md:max-h-[90vh] flex flex-col shadow-2xl border-t md:border border-slate-200 animate-slidein"
        onClick={(e) => e.stopPropagation()}>
        {/* Sticky header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Filter voters</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Narrow down by survey-time fields. {draftCount > 0 && `${draftCount} active.`}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <Section title="Search" subtitle="Match by name, EPIC, mobile or father's name">
            <Input
              value={draft.search}
              onChange={(v) => update('search', v)}
              placeholder="Search …"
            />
          </Section>

          <Section title="Location" subtitle="District → assembly constituency">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabeledSelect
                label="District"
                value={draft.district}
                onChange={(v) => update('district', v)}
                options={[
                  { value: '', label: 'Any district' },
                  ...UP_DISTRICTS.map((d) => ({ value: d, label: d })),
                ]}
              />
              <LabeledInput
                label="Assembly constituency"
                value={draft.constituency}
                onChange={(v) => update('constituency', v)}
                placeholder="e.g. Lucknow Cantt"
              />
            </div>
          </Section>

          <Section title="Identity" subtitle="Religion, caste hierarchy">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabeledSelect
                label="Religion"
                value={draft.religion}
                onChange={(v) => update('religion', v)}
                options={[{ value: '', label: 'Any' }, ...RELIGIONS.map((r) => ({ value: r, label: r }))]}
              />
              <LabeledSelect
                label="Caste"
                value={draft.caste}
                onChange={changeCaste}
                options={[
                  { value: '', label: 'Any caste' },
                  ...CASTES.map((c) => ({ value: c.code, label: c.label })),
                ]}
              />
              <div>
                <Label>Sub-caste</Label>
                <select
                  value={draft.subCaste}
                  onChange={(e) => update('subCaste', e.target.value)}
                  disabled={!draft.caste}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed">
                  <option value="">{draft.caste ? 'Any sub-caste' : 'Pick caste first'}</option>
                  {subCasteOptions.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          <Section title="Demographics" subtitle="Gender, age range, education">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabeledSelect
                label="Gender"
                value={draft.gender}
                onChange={(v) => update('gender', v)}
                options={[
                  { value: '', label: 'Any' },
                  { value: 'M', label: 'Male' },
                  { value: 'F', label: 'Female' },
                  { value: 'T', label: 'Transgender' },
                ]}
              />
              <div>
                <Label>Age range</Label>
                <div className="flex items-center gap-2">
                  <Input value={draft.ageMin} onChange={(v) => update('ageMin', v)} placeholder="min" type="number" />
                  <span className="text-xs text-slate-400">to</span>
                  <Input value={draft.ageMax} onChange={(v) => update('ageMax', v)} placeholder="max" type="number" />
                </div>
              </div>
              <LabeledSelect
                label="Education"
                value={draft.educationLevel}
                onChange={(v) => update('educationLevel', v)}
                options={[{ value: '', label: 'Any' }, ...EDUCATION_LEVELS.map((l) => ({ value: l, label: l }))]}
              />
            </div>
          </Section>

          <Section title="Political" subtitle="Voting intention, party preference, influence">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabeledSelect
                label="Voting intention"
                value={draft.votingIntention}
                onChange={(v) => update('votingIntention', v)}
                options={[{ value: '', label: 'Any' }, ...VOTING_INTENTIONS.map((v) => ({ value: v, label: v }))]}
              />
              <LabeledSelect
                label="Party support"
                value={draft.partySupport}
                onChange={(v) => update('partySupport', v)}
                options={[{ value: '', label: 'Any' }, ...PARTIES.map((p) => ({ value: p, label: p }))]}
              />
              <LabeledSelect
                label="Influence level"
                value={draft.influenceLevel}
                onChange={(v) => update('influenceLevel', v)}
                options={[{ value: '', label: 'Any' }, ...INFLUENCE_LEVELS.map((l) => ({ value: l, label: l }))]}
              />
            </div>
          </Section>

          <Section title="Field activity" subtitle="Verification status, visit date range">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabeledSelect
                label="Status"
                value={draft.verified}
                onChange={(v) => update('verified', v as FilterState['verified'])}
                options={[
                  { value: 'all', label: 'Any' },
                  { value: 'true', label: 'Verified' },
                  { value: 'false', label: 'Pending' },
                ]}
              />
              <div>
                <Label>Visit from</Label>
                <Input type="date" value={draft.visitDateFrom} onChange={(v) => update('visitDateFrom', v)} />
              </div>
              <div>
                <Label>Visit to</Label>
                <Input type="date" value={draft.visitDateTo} onChange={(v) => update('visitDateTo', v)} />
              </div>
            </div>
          </Section>

          <Section title="Grievances" subtitle="Voters whose visits flagged ALL of the chosen issues">
            <div className="flex flex-wrap gap-1.5">
              {GRIEVANCE_OPTIONS.map((g) => {
                const on = draft.grievances.includes(g);
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() => toggleGrievance(g)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition font-medium ${
                      on
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}>
                    {on && (
                      <svg className="inline-block mr-1" width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 5l2 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {g === 'LawAndOrder' ? 'Law & Order' : g}
                  </button>
                );
              })}
            </div>
          </Section>
        </div>

        {/* Sticky footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            onClick={reset}
            className="text-sm text-slate-600 hover:text-slate-900 font-medium">
            Reset all
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900">
              Cancel
            </button>
            <button
              onClick={() => onApply(draft)}
              className="px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition shadow-sm">
              Apply{draftCount > 0 ? ` (${draftCount})` : ''}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slidein {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fadein { animation: fadein 0.18s ease-out; }
        .animate-slidein { animation: slidein 0.24s cubic-bezier(0.2, 0.7, 0.2, 1); }
      `}</style>
    </div>
  );
}

/* Modal helpers ----------------------------------------------------------- */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <header className="mb-2.5">
        <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">{children}</span>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 placeholder:text-slate-400"
    />
  );
}

function LabeledInput(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <Label>{props.label}</Label>
      <Input {...props} />
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Table mode                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

interface TableModeProps {
  voters: VoterRow[];
  loading: boolean;
  pagination: Pagination;
  page: number;
  setPage: (fn: (p: number) => number) => void;
}

function TableMode({ voters, loading, pagination, page, setPage }: TableModeProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">EPIC</th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Father / Husband</th>
              <th className="px-4 py-3 text-center font-medium">Age / Sex</th>
              <th className="px-4 py-3 text-left font-medium">Booth</th>
              <th className="px-4 py-3 text-left font-medium">Caste</th>
              <th className="px-4 py-3 text-left font-medium">Mobile</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <SkeletonTable
                rows={8}
                columns={['110px', { w: '160px', lines: 2 }, '140px', '60px', { w: '140px', lines: 2 }, '80px', '110px', '70px', { w: '60px', alignRight: true }]}
              />
            )}
            {!loading && voters.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="inline-flex flex-col items-center gap-2 text-slate-400">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <circle cx="11" cy="11" r="6" />
                      <path d="M16 16l4 4" strokeLinecap="round" />
                    </svg>
                    <span className="text-sm">No voters match your filters.</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading &&
              voters.map((v) => {
                const booth = typeof v.boothId === 'object' ? v.boothId : null;
                return (
                  <tr key={v._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{v.epicNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {v.fullName}
                      <div className="text-xs text-slate-400">#{v.voterSerialNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{v.fatherOrHusbandName || '—'}</td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {v.age ?? '—'} / {v.gender}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {booth ? (
                        <>
                          <span className="text-slate-900">{booth.name}</span>
                          <div className="text-xs text-slate-400">
                            Part {v.partNumber} · {v.assemblyConstituency}
                          </div>
                        </>
                      ) : (
                        <span>Part {v.partNumber}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{v.caste || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{v.mobileNumber || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {v.verificationStatus ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/voters/${v._id}`} className="text-red-600 hover:text-red-700 text-sm font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50">
              Prev
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Graph mode                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

interface GraphModeProps {
  breakdown: Breakdown | null;
  loading: boolean;
}

function GraphMode({ breakdown, loading }: GraphModeProps) {
  if (loading && !breakdown) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/60 p-5 h-72">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-56 w-full mt-4" />
          </div>
        ))}
      </div>
    );
  }

  if (!breakdown) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/60 p-8 text-center text-slate-400 text-sm">
        No data to chart.
      </div>
    );
  }

  const doughnutFor = (buckets: Bucket[]) => ({
    labels: buckets.map((b) => b.key || 'Unknown'),
    datasets: [
      {
        data: buckets.map((b) => b.count),
        backgroundColor: PALETTE,
        borderWidth: 1,
        borderColor: '#fff',
      },
    ],
  });
  const barFor = (buckets: Bucket[], color = '#1F3A8A') => ({
    labels: buckets.map((b) => b.key || 'Unknown'),
    datasets: [
      {
        data: buckets.map((b) => b.count),
        backgroundColor: color,
        borderRadius: 6,
      },
    ],
  });

  const horizontalBarOpts = {
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
  };
  const barOpts = {
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };
  const doughnutOpts = {
    plugins: { legend: { position: 'right' as const, labels: { boxWidth: 10, font: { size: 11 } } } },
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total voters" value={breakdown.total} />
        <Kpi label="Verified" value={breakdown.verified} tone="success" />
        <Kpi label="Pending" value={breakdown.unverified} tone="warning" />
        <Kpi label="Verification rate" value={`${breakdown.verificationRate}%`} tone="info" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Gender" subtitle="Distribution across the filtered set">
          {breakdown.gender.length ? <Doughnut data={doughnutFor(breakdown.gender)} options={doughnutOpts} /> : <Empty />}
        </ChartCard>

        <ChartCard title="Religion" subtitle="Survey-captured religion split">
          {breakdown.religion.length ? <Doughnut data={doughnutFor(breakdown.religion)} options={doughnutOpts} /> : <Empty />}
        </ChartCard>

        <ChartCard title="Caste (top 10)" subtitle="Largest caste buckets in the current filter">
          {breakdown.caste.length ? <Bar data={barFor(breakdown.caste.slice(0, 10), '#B7873A')} options={horizontalBarOpts} /> : <Empty />}
        </ChartCard>

        <ChartCard title="Sub-caste (top 10)">
          {breakdown.subCaste.length ? <Bar data={barFor(breakdown.subCaste.slice(0, 10), '#7A5818')} options={horizontalBarOpts} /> : <Empty />}
        </ChartCard>

        <ChartCard title="Voting intention" subtitle="Will / May / Won't / First-time">
          {breakdown.votingIntention.length ? <Doughnut data={doughnutFor(breakdown.votingIntention)} options={doughnutOpts} /> : <Empty />}
        </ChartCard>

        <ChartCard title="Party support">
          {breakdown.partySupport.length ? <Bar data={barFor(breakdown.partySupport, '#1F3A8A')} options={barOpts} /> : <Empty />}
        </ChartCard>

        <ChartCard title="Age groups" subtitle="18-25 · 26-35 · 36-50 · 51-65 · 65+">
          {breakdown.age.length ? <Bar data={barFor(breakdown.age, '#205B9C')} options={barOpts} /> : <Empty />}
        </ChartCard>

        <ChartCard title="Top grievances">
          {breakdown.grievances.length ? <Bar data={barFor(breakdown.grievances, '#1F7A4E')} options={horizontalBarOpts} /> : <Empty />}
        </ChartCard>

        <div className="md:col-span-2">
          <ChartCard title="Visits over time" subtitle="Daily visits captured by staff">
            {breakdown.visitsByDay.length ? (
              <Line
                data={{
                  labels: breakdown.visitsByDay.map((b) => b.key),
                  datasets: [
                    {
                      label: 'Visits',
                      data: breakdown.visitsByDay.map((b) => b.count),
                      borderColor: '#1F3A8A',
                      backgroundColor: 'rgba(31,58,138,0.12)',
                      tension: 0.3,
                      pointRadius: 2,
                      pointBackgroundColor: '#1F3A8A',
                      fill: true,
                    },
                  ],
                }}
                options={{
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                }}
              />
            ) : (
              <Empty hint="No staff visits in the filtered range yet." />
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number | string; tone?: 'success' | 'warning' | 'info' }) {
  const tones: Record<string, string> = {
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    info: 'text-sky-700',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone ? tones[tone] : 'text-slate-900'}`}>
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-5 h-80 shadow-sm">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      <div className="h-[calc(100%-2.25rem)]">{children}</div>
    </div>
  );
}

function Empty({ hint }: { hint?: string }) {
  return (
    <div className="h-full flex items-center justify-center text-xs text-slate-400">
      {hint || 'No data for this filter.'}
    </div>
  );
}
