'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import AssignmentFormModal from '@/components/AssignmentFormModal';
import { SkeletonTable } from '@/components/Skeleton';
import {
  FiltersModal,
  FiltersButton,
  ActiveChips,
  FilterSection,
  LabeledFilterInput,
  LabeledFilterSelect,
  VoterFilterFields,
  type ActiveChip,
} from '@/components/filters';
import {
  buildVoterQuery,
  describeVoterFilters,
  clearVoterChip,
  emptyVoterFilters,
  type VoterFilterState,
  type VoterChip,
} from '@/lib/voterFilters';

interface Assignment {
  _id: string;
  staffId: { _id: string; name: string; email: string; phone: string } | string;
  boothId: { _id: string; name: string; partNumber: number; assemblyConstituency: string } | string;
  assignedBy?: { _id: string; name: string } | string;
  voterSerialFrom?: number;
  voterSerialTo?: number;
  isActive: boolean;
  totalVoters: number;
  completedCount: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface AssignExtras {
  status: 'all' | 'active' | 'inactive';
  staffId: string;
  boothId: string;
  searchStaff: string;
  searchBooth: string;
}

const emptyAssignExtras: AssignExtras = {
  status: 'active',
  staffId: '',
  boothId: '',
  searchStaff: '',
  searchBooth: '',
};

type AssignChipKey = keyof AssignExtras | VoterChip['key'];

interface AssignChip {
  key: AssignChipKey;
  label: string;
  source: 'extra' | 'voter';
  voterChip?: VoterChip;
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [appliedExtras, setAppliedExtras] = useState<AssignExtras>(emptyAssignExtras);
  const [appliedVoter, setAppliedVoter] = useState<VoterFilterState>(emptyVoterFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [creating, setCreating] = useState(false);

  const canManage = user?.role === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // /voter-assignments understands isActive / staffId / boothId.  We
      // also pass `assemblyConstituency` (booth-side filter) where
      // possible.  Other voter-attribute filters are no-ops on this
      // endpoint but stay in the chips so the UX is consistent.
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (appliedExtras.status !== 'all') params.isActive = appliedExtras.status === 'active' ? 'true' : 'false';
      if (appliedExtras.staffId) params.staffId = appliedExtras.staffId;
      if (appliedExtras.boothId) params.boothId = appliedExtras.boothId;
      if (appliedVoter.constituency) params.assemblyConstituency = appliedVoter.constituency;
      const res = await api.get('/voter-assignments', { params });
      setAssignments(res.data.data.assignments);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [page, appliedExtras, appliedVoter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDeactivate(a: Assignment) {
    if (!confirm('Deactivate this assignment?')) return;
    try {
      await api.put(`/voter-assignments/${a._id}/deactivate`);
      toast.success('Assignment deactivated');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  }

  // Client-side post-filter on the joined collections (staff name, booth name).
  const filtered = useMemo(() => {
    const sName = appliedExtras.searchStaff.trim().toLowerCase();
    const bName = appliedExtras.searchBooth.trim().toLowerCase();
    return assignments.filter((a) => {
      const staff = typeof a.staffId === 'object' ? a.staffId : null;
      const booth = typeof a.boothId === 'object' ? a.boothId : null;
      if (sName && !(staff?.name || '').toLowerCase().includes(sName)) return false;
      if (bName && !(booth?.name || '').toLowerCase().includes(bName)) return false;
      return true;
    });
  }, [assignments, appliedExtras.searchStaff, appliedExtras.searchBooth]);

  const assignChips = useMemo<AssignChip[]>(() => {
    const out: AssignChip[] = [];
    if (appliedExtras.status !== 'active')
      out.push({ key: 'status', label: `Status: ${appliedExtras.status[0].toUpperCase()}${appliedExtras.status.slice(1)}`, source: 'extra' });
    if (appliedExtras.staffId) out.push({ key: 'staffId', label: `Staff …${appliedExtras.staffId.slice(-6)}`, source: 'extra' });
    if (appliedExtras.boothId) out.push({ key: 'boothId', label: `Booth …${appliedExtras.boothId.slice(-6)}`, source: 'extra' });
    if (appliedExtras.searchStaff) out.push({ key: 'searchStaff', label: `Staff name: "${appliedExtras.searchStaff}"`, source: 'extra' });
    if (appliedExtras.searchBooth) out.push({ key: 'searchBooth', label: `Booth name: "${appliedExtras.searchBooth}"`, source: 'extra' });
    for (const c of describeVoterFilters(appliedVoter)) {
      out.push({ key: c.key as AssignChipKey, label: c.label, source: 'voter', voterChip: c });
    }
    return out;
  }, [appliedExtras, appliedVoter]);

  function clearChip(chip: ActiveChip<AssignChipKey>) {
    const m = assignChips.find((c) => c.key === chip.key);
    if (!m) return;
    if (m.source === 'extra') {
      setAppliedExtras((s) => {
        const next = { ...s };
        if (m.key === 'status') next.status = 'active';
        else (next as Record<string, string>)[m.key as string] = '';
        return next;
      });
    } else if (m.voterChip) {
      setAppliedVoter((s) => clearVoterChip(s, m.voterChip!));
    }
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Assignments</h1>
          <p className="text-sm text-slate-500">
            {pagination.total.toLocaleString('en-IN')} records
            {assignChips.length > 0 && ` · ${assignChips.length} filter${assignChips.length === 1 ? '' : 's'} applied`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FiltersButton onClick={() => setFiltersOpen(true)} count={assignChips.length} />
          {canManage && (
            <button onClick={() => setCreating(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-sm">
              + New Assignment
            </button>
          )}
        </div>
      </div>

      <ActiveChips
        chips={assignChips.map(({ key, label }) => ({ key, label }))}
        onRemove={clearChip}
        onClearAll={() => {
          setAppliedExtras(emptyAssignExtras);
          setAppliedVoter(emptyVoterFilters);
          setPage(1);
        }}
      />

      <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Staff</th>
                <th className="px-4 py-3 text-left font-medium">Booth</th>
                <th className="px-4 py-3 text-center font-medium">Serial Range</th>
                <th className="px-4 py-3 text-right font-medium">Progress</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <SkeletonTable rows={6} columns={[{ w: '140px', lines: 2 }, { w: '160px', lines: 2 }, '100px', { w: '120px', alignRight: true }, '80px', { w: '80px', alignRight: true }]} />
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No assignments match your filters.</td></tr>
              )}
              {!loading && filtered.map((a) => {
                const staff = typeof a.staffId === 'object' ? a.staffId : null;
                const booth = typeof a.boothId === 'object' ? a.boothId : null;
                const pct = a.totalVoters > 0 ? Math.round((a.completedCount / a.totalVoters) * 100) : 0;
                return (
                  <tr key={a._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><p className="font-medium text-slate-900">{staff?.name || '—'}</p><p className="text-xs text-slate-400">{staff?.phone}</p></td>
                    <td className="px-4 py-3"><p className="text-slate-900">{booth?.name || '—'}</p><p className="text-xs text-slate-400">Part {booth?.partNumber} · {booth?.assemblyConstituency}</p></td>
                    <td className="px-4 py-3 text-center text-xs text-slate-600">{a.voterSerialFrom || a.voterSerialTo ? `${a.voterSerialFrom ?? '1'} – ${a.voterSerialTo ?? '∞'}` : 'Full booth'}</td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm text-slate-900">{a.completedCount} / {a.totalVoters}</p>
                      <div className="mt-1 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden ml-auto"><div className="h-full bg-red-500" style={{ width: `${pct}%` }} /></div>
                    </td>
                    <td className="px-4 py-3 text-center">{a.isActive ? <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span> : <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">Inactive</span>}</td>
                    <td className="px-4 py-3 text-right">{canManage && a.isActive && <button onClick={() => handleDeactivate(a)} className="text-slate-500 hover:text-rose-600 text-sm">Deactivate</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50">Prev</button>
              <button disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>

      <AssignmentsFiltersModal
        open={filtersOpen}
        initialExtras={appliedExtras}
        initialVoter={appliedVoter}
        onClose={() => setFiltersOpen(false)}
        onApply={(extras, voter) => {
          setAppliedExtras(extras);
          setAppliedVoter(voter);
          setPage(1);
          setFiltersOpen(false);
        }}
      />

      {creating && (
        <AssignmentFormModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />
      )}
    </div>
  );
}

function AssignmentsFiltersModal({
  open,
  initialExtras,
  initialVoter,
  onClose,
  onApply,
}: {
  open: boolean;
  initialExtras: AssignExtras;
  initialVoter: VoterFilterState;
  onClose: () => void;
  onApply: (extras: AssignExtras, voter: VoterFilterState) => void;
}) {
  const [extras, setExtras] = useState<AssignExtras>(initialExtras);
  const [voter, setVoter] = useState<VoterFilterState>(initialVoter);
  useEffect(() => {
    if (open) {
      setExtras(initialExtras);
      setVoter(initialVoter);
    }
  }, [open, initialExtras, initialVoter]);

  function updateVoter<K extends keyof VoterFilterState>(key: K, value: VoterFilterState[K]) {
    setVoter((d) => ({ ...d, [key]: value }));
  }

  const extraCount =
    (extras.status !== 'active' ? 1 : 0) +
    (extras.staffId ? 1 : 0) +
    (extras.boothId ? 1 : 0) +
    (extras.searchStaff ? 1 : 0) +
    (extras.searchBooth ? 1 : 0);
  const draftCount = extraCount + describeVoterFilters(voter).length;

  return (
    <FiltersModal
      open={open}
      title="Filter assignments"
      subtitle={`Match by status, staff, booth, or any survey-time field. ${
        draftCount > 0 ? `${draftCount} active.` : ''
      }`}
      applyCount={draftCount}
      onClose={onClose}
      onApply={() => onApply(extras, voter)}
      onReset={() => {
        setExtras(emptyAssignExtras);
        setVoter(emptyVoterFilters);
      }}>
      <FilterSection title="Status" subtitle="Active vs deactivated assignments">
        <LabeledFilterSelect
          label="Status"
          value={extras.status}
          onChange={(v) => setExtras((s) => ({ ...s, status: v as AssignExtras['status'] }))}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'all', label: 'All' },
          ]}
        />
      </FilterSection>
      <FilterSection title="Pin to specific staff or booth" subtitle="Server-side ID filter (24-char hex)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabeledFilterInput label="Staff ID" value={extras.staffId} onChange={(v) => setExtras((s) => ({ ...s, staffId: v }))} placeholder="24-char hex" />
          <LabeledFilterInput label="Booth ID" value={extras.boothId} onChange={(v) => setExtras((s) => ({ ...s, boothId: v }))} placeholder="24-char hex" />
        </div>
      </FilterSection>
      <FilterSection title="Search by name" subtitle="Filters the loaded page client-side">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabeledFilterInput label="Staff name contains" value={extras.searchStaff} onChange={(v) => setExtras((s) => ({ ...s, searchStaff: v }))} placeholder="e.g. Asha" />
          <LabeledFilterInput label="Booth name contains" value={extras.searchBooth} onChange={(v) => setExtras((s) => ({ ...s, searchBooth: v }))} placeholder="e.g. Birla Nagar" />
        </div>
      </FilterSection>
      <VoterFilterFields draft={voter} onChange={updateVoter} searchPlaceholder="Search …" />
    </FiltersModal>
  );
}
