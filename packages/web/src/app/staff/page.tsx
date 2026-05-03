'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import StaffFormModal from '@/components/StaffFormModal';
import { SkeletonTable } from '@/components/Skeleton';

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
  const [search, setSearch] = useState('');
  const [constituency, setConstituency] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [creating, setCreating] = useState(false);

  const canManage = user?.role === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (constituency) params.assemblyConstituency = constituency;
      if (status !== 'all') params.isActive = status === 'active' ? 'true' : 'false';
      const res = await api.get('/staff', { params });
      setStaff(res.data.data.staff);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [page, search, constituency, status]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Field Staff</h1>
          <p className="text-sm text-slate-500">{pagination.total.toLocaleString('en-IN')} staff</p>
        </div>
        {canManage && (
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition"
          >
            + New Staff
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load();
        }}
        className="bg-white rounded-xl border border-slate-200/60 p-4 grid grid-cols-1 md:grid-cols-4 gap-3"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / email / phone"
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        />
        <input
          value={constituency}
          onChange={(e) => setConstituency(e.target.value)}
          placeholder="Assembly Constituency"
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </select>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setConstituency('');
              setStatus('all');
              setPage(1);
            }}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
          >
            Reset
          </button>
          <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition">
            Apply
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
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
                <SkeletonTable
                  rows={6}
                  columns={[{ w: '140px', lines: 2 }, { w: '140px', lines: 2 }, '140px', '90px', '80px', { w: '90px', alignRight: true }]}
                />
              )}
              {!loading && staff.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No staff found.
                  </td>
                </tr>
              )}
              {!loading &&
                staff.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white text-xs font-semibold flex items-center justify-center overflow-hidden">
                          {s.profilePhoto ? (
                            <img src={s.profilePhoto} alt={s.name} className="w-full h-full object-cover" />
                          ) : (
                            s.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()
                          )}
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
                      {s.idProofUrl ? (
                        <a href={s.idProofUrl} target="_blank" rel="noreferrer" className="text-red-600 text-xs hover:underline">
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.isActive ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      {canManage && (
                        <>
                          <button onClick={() => setEditing(s)} className="text-red-600 hover:text-red-700 text-sm font-medium">
                            Edit
                          </button>
                          {s.isActive && (
                            <button onClick={() => handleDeactivate(s)} className="text-slate-500 hover:text-rose-600 text-sm">
                              Deactivate
                            </button>
                          )}
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
            <p className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50"
              >
                Prev
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {(creating || editing) && (
        <StaffFormModal
          staff={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
