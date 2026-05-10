'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import BoothFormModal from '@/components/BoothFormModal';
import BoothCharts from '@/components/BoothCharts';
import BoothChartsModal from '@/components/BoothChartsModal';
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

type ViewMode = 'list' | 'charts';

export default function BoothsPage() {
  const { user } = useAuth();
  const [booths, setBooths] = useState<Booth[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);

  const [applied, setApplied] = useState<VoterFilterState>(emptyVoterFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<Booth | null>(null);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<ViewMode>('list');
  const [chartBooth, setChartBooth] = useState<Booth | null>(null);

  const canManage = user?.role === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Booth listing only consumes search / district / AC; everything else
      // in `applied` is ignored by /booths but still flows through to
      // BoothCharts so the Charts view stays in sync with the modal.
      const params = buildVoterQuery(applied, { page: String(page), limit: '20' });
      const res = await api.get('/booths', { params });
      setBooths(res.data.data.booths);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load booths');
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

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

  const activeChips = useMemo(() => describeVoterFilters(applied), [applied]);

  function clearChip(chip: VoterChip) {
    setApplied((s) => clearVoterChip(s, chip));
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Booths</h1>
          <p className="text-sm text-slate-500">
            {pagination.total.toLocaleString('en-IN')} booths
            {activeChips.length > 0 && ` · ${activeChips.length} filter${activeChips.length === 1 ? '' : 's'} applied`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FiltersButton onClick={() => setFiltersOpen(true)} count={activeChips.length} />
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            <button
              onClick={() => setView('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}>
              List
            </button>
            <button
              onClick={() => setView('charts')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                view === 'charts' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}>
              Charts
            </button>
          </div>
          {canManage && (
            <button
              onClick={() => setCreating(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-sm">
              + New Booth
            </button>
          )}
        </div>
      </div>

      <ActiveChips
        chips={activeChips}
        onRemove={clearChip}
        onClearAll={() => {
          setApplied(emptyVoterFilters);
          setPage(1);
        }}
      />

      {view === 'charts' ? (
        <BoothCharts
          scope={{
            assemblyConstituency: applied.constituency || undefined,
            district: applied.district || undefined,
            dateFrom: applied.visitDateFrom || undefined,
            dateTo: applied.visitDateTo || undefined,
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden shadow-sm">
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
                {loading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`sk-${i}`} style={{ animation: 'fadeInUp 0.35s ease-out both', animationDelay: `${i * 45}ms` }}>
                      <td className="px-4 py-3"><div className="skeleton h-4 w-8 rounded" /></td>
                      <td className="px-4 py-3">
                        <div className="skeleton h-4 w-40 rounded" />
                        <div className="skeleton h-3 w-24 rounded mt-1.5" />
                      </td>
                      <td className="px-4 py-3"><div className="skeleton h-4 w-32 rounded" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-4 w-24 rounded" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-4 w-12 rounded ml-auto" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-4 w-24 rounded ml-auto" /></td>
                    </tr>
                  ))}
                {!loading && booths.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No booths found.</td></tr>
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
                      <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                        <button onClick={() => setChartBooth(b)} className="text-slate-600 hover:text-red-600 text-sm font-medium" title="View charts for this booth">
                          Charts
                        </button>
                        {canManage && (
                          <>
                            <button onClick={() => setEditing(b)} className="text-red-600 hover:text-red-700 text-sm font-medium">Edit</button>
                            <button onClick={() => handleDelete(b)} className="text-slate-500 hover:text-rose-600 text-sm">Delete</button>
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
      )}

      <SharedVoterFiltersModal
        open={filtersOpen}
        title="Filter booths"
        subtitle="Survey-time fields scope the Charts view; search + location also scope the table"
        initial={applied}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => {
          setApplied(next);
          setPage(1);
          setFiltersOpen(false);
        }}
      />

      {(creating || editing) && (
        <BoothFormModal booth={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={() => { setCreating(false); setEditing(null); load(); }} />
      )}

      {chartBooth && <BoothChartsModal booth={chartBooth} onClose={() => setChartBooth(null)} />}
    </div>
  );
}
