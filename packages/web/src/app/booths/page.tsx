'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import BoothFormModal from '@/components/BoothFormModal';

export interface Booth {
  _id: string;
  partNumber: number;
  name: string;
  assemblyConstituency: string;
  district: string;
  state: string;
  village?: string;
  address?: string;
  totalVoters: number;
  latitude?: number;
  longitude?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function BoothsPage() {
  const { user } = useAuth();
  const [booths, setBooths] = useState<Booth[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [constituency, setConstituency] = useState('');
  const [district, setDistrict] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Booth | null>(null);
  const [creating, setCreating] = useState(false);

  const canManage = user?.role === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (constituency) params.assemblyConstituency = constituency;
      if (district) params.district = district;
      const res = await api.get('/booths', { params });
      setBooths(res.data.data.booths);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load booths');
    } finally {
      setLoading(false);
    }
  }, [page, search, constituency, district]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(b: Booth) {
    if (!confirm(`Delete booth "${b.name}" (Part ${b.partNumber})? Voters assigned to this booth will become orphaned.`)) return;
    try {
      await api.delete(`/booths/${b._id}`);
      toast.success('Booth deleted');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Booths</h1>
          <p className="text-sm text-slate-500">{pagination.total.toLocaleString('en-IN')} booths</p>
        </div>
        {canManage && (
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition"
          >
            + New Booth
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
          placeholder="Search name / village"
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        />
        <input
          value={constituency}
          onChange={(e) => setConstituency(e.target.value)}
          placeholder="Assembly Constituency"
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        />
        <input
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="District"
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setConstituency('');
              setDistrict('');
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
                <th className="px-4 py-3 text-left font-medium">Part #</th>
                <th className="px-4 py-3 text-left font-medium">Booth</th>
                <th className="px-4 py-3 text-left font-medium">Constituency</th>
                <th className="px-4 py-3 text-left font-medium">District</th>
                <th className="px-4 py-3 text-right font-medium">Voters</th>
                <th className="px-4 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && booths.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No booths found.
                  </td>
                </tr>
              )}
              {!loading &&
                booths.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{b.partNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{b.name}</p>
                      {b.village && <p className="text-xs text-slate-400">{b.village}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.assemblyConstituency}</td>
                    <td className="px-4 py-3 text-slate-600">{b.district}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{b.totalVoters.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right space-x-3">
                      {canManage && (
                        <>
                          <button onClick={() => setEditing(b)} className="text-red-600 hover:text-red-700 text-sm font-medium">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(b)} className="text-slate-500 hover:text-rose-600 text-sm">
                            Delete
                          </button>
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
        <BoothFormModal
          booth={editing}
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
