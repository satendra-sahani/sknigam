'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import StaffFormModal from '@/components/StaffFormModal';
import StaffPasswordModal from '@/components/StaffPasswordModal';
import { SkeletonTable } from '@/components/Skeleton';
import {
  FiltersButton,
  ActiveChips,
  SharedVoterFiltersModal,
} from '@/components/filters';
import {
  buildVoterQuery,
  describeVoterFilters,
  clearVoterChip,
  emptyVoterFilters,
  type VoterFilterState,
  type VoterChip,
} from '@/lib/voterFilters';

export interface StaffUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  assemblyConstituency?: string;
  district?: string;
  isActive: boolean;
  isVerified: boolean;
  profilePhoto?: string;
  idProofUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);

  const [applied, setApplied] = useState<VoterFilterState>(emptyVoterFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<StaffUser | null>(null);

  const canManage = user?.role === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // /staff consumes search / district / assemblyConstituency / isActive
      // (which we map from `verified`).  Other survey-time filters are sent
      // but ignored server-side, which is fine — the modal stays consistent
      // across pages and filters that don't apply remain visible chips.
      const params = buildVoterQuery(applied, { page: String(page), limit: '20' });
      // staff endpoint uses `isActive`, not `verificationStatus`.  Translate.
      if (params.verificationStatus) {
        params.isActive = params.verificationStatus;
        delete params.verificationStatus;
      }
      const res = await api.get('/staff', { params });
      setStaff(res.data.data.staff);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDeactivate(s: StaffUser) {
    if (!confirm(`Deactivate staff "${s.name}"?`)) return;
    try {
      await api.delete(`/staff/${s._id}`);
      toast.success('Staff deactivated');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  }

  const activeChips = useMemo(() => describeVoterFilters(applied), [applied]);

  function clearChip(chip: VoterChip) {
    setApplied((s) => clearVoterChip(s, chip));
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Field Staff</h1>
          <p className="text-sm text-slate-500">
            {pagination.total.toLocaleString('en-IN')} staff
            {activeChips.length > 0 && ` · ${activeChips.length} filter${activeChips.length === 1 ? '' : 's'} applied`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FiltersButton onClick={() => setFiltersOpen(true)} count={activeChips.length} />
          {canManage && (
            <button onClick={() => setCreating(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-sm">
              + New Staff
            </button>
          )}
        </div>
      </div>

      <ActiveChips chips={activeChips} onRemove={clearChip} onClearAll={() => { setApplied(emptyVoterFilters); setPage(1); }} />

      <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="px-4 py-3 text-left font-medium">Constituency</th>
                <th className="px-4 py-3 text-center font-medium">ID Proof</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <SkeletonTable rows={6} columns={[{ w: '140px', lines: 2 }, { w: '140px', lines: 2 }, '140px', '90px', '80px', { w: '90px', alignRight: true }]} />
              )}
              {!loading && staff.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No staff found.</td></tr>
              )}
              {!loading && staff.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white text-xs font-semibold flex items-center justify-center overflow-hidden">
                        {s.profilePhoto ? <img src={s.profilePhoto} alt={s.name} className="w-full h-full object-cover" /> : s.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{s.name}</p>
                        {s.district && <p className="text-xs text-slate-400">{s.district}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{s.email}</p>
                    <p className="text-xs font-mono text-slate-400">{s.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.assemblyConstituency || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {s.idProofUrl ? <a href={s.idProofUrl} target="_blank" rel="noreferrer" className="text-red-600 text-xs hover:underline">View</a> : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.isActive ? <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span> : <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">Inactive</span>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {canManage && (
                      <>
                        <button onClick={() => setEditing(s)} className="text-red-600 hover:text-red-700 text-sm font-medium">Edit</button>
                        <button
                          onClick={() => setPwdTarget(s)}
                          className="text-slate-700 hover:text-slate-900 text-sm font-medium">
                          Password
                        </button>
                        {s.isActive && <button onClick={() => handleDeactivate(s)} className="text-slate-500 hover:text-rose-600 text-sm">Deactivate</button>}
                      </>
                    )}
                  </td>
                </tr>
              ))}
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

      <SharedVoterFiltersModal
        open={filtersOpen}
        title="Filter staff"
        subtitle="Match staff by their assigned location and activation status"
        initial={applied}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => { setApplied(next); setPage(1); setFiltersOpen(false); }}
        searchPlaceholder="Search name / email / phone …"
      />

      {(creating || editing) && (
        <StaffFormModal staff={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={() => { setCreating(false); setEditing(null); load(); }} />
      )}

      {pwdTarget && (
        <StaffPasswordModal
          staffId={pwdTarget._id}
          staffName={pwdTarget.name}
          onClose={() => setPwdTarget(null)}
        />
      )}
    </div>
  );
}
