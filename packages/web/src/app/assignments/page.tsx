'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import AssignmentFormModal from '@/components/AssignmentFormModal';
import { SkeletonTable } from '@/components/Skeleton';

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

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [creating, setCreating] = useState(false);

  const canManage = user?.role === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (status !== 'all') params.isActive = status === 'active' ? 'true' : 'false';
      const res = await api.get('/voter-assignments', { params });
      setAssignments(res.data.data.assignments);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Assignments</h1>
          <p className="text-sm text-slate-500">{pagination.total.toLocaleString('en-IN')} records</p>
        </div>
        {canManage && (
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition"
          >
            + New Assignment
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200/60 p-3 flex items-center gap-3">
        <span className="text-xs uppercase text-slate-500 font-medium">Status</span>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['active', 'inactive', 'all'] as const).map((k) => (
            <button
              key={k}
              onClick={() => {
                setStatus(k);
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-medium rounded ${
                status === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
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
                <SkeletonTable
                  rows={6}
                  columns={[{ w: '140px', lines: 2 }, { w: '160px', lines: 2 }, '100px', { w: '120px', alignRight: true }, '80px', { w: '80px', alignRight: true }]}
                />
              )}
              {!loading && assignments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No assignments.
                  </td>
                </tr>
              )}
              {!loading &&
                assignments.map((a) => {
                  const staff = typeof a.staffId === 'object' ? a.staffId : null;
                  const booth = typeof a.boothId === 'object' ? a.boothId : null;
                  const pct = a.totalVoters > 0 ? Math.round((a.completedCount / a.totalVoters) * 100) : 0;
                  return (
                    <tr key={a._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{staff?.name || '—'}</p>
                        <p className="text-xs text-slate-400">{staff?.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-900">{booth?.name || '—'}</p>
                        <p className="text-xs text-slate-400">
                          Part {booth?.partNumber} · {booth?.assemblyConstituency}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-600">
                        {a.voterSerialFrom || a.voterSerialTo
                          ? `${a.voterSerialFrom ?? '1'} – ${a.voterSerialTo ?? '∞'}`
                          : 'Full booth'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm text-slate-900">
                          {a.completedCount} / {a.totalVoters}
                        </p>
                        <div className="mt-1 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden ml-auto">
                          <div className="h-full bg-red-500" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.isActive ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage && a.isActive && (
                          <button onClick={() => handleDeactivate(a)} className="text-slate-500 hover:text-rose-600 text-sm">
                            Deactivate
                          </button>
                        )}
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

      {creating && (
        <AssignmentFormModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}
