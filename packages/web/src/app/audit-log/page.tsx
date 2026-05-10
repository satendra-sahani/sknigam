'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
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

interface AuditLog {
  _id: string;
  userId: { _id: string; name: string; email: string; role: string } | string | null;
  role: string;
  action: string;
  targetEntityId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  timestamp: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ACTIONS = [
  'login',
  'logout',
  'login_failed',
  'otp_sent',
  'otp_verified',
  'user_create',
  'user_update',
  'user_delete',
  'booth_create',
  'booth_update',
  'voter_import',
  'voter_update',
  'voter_visit',
  'assignment_create',
  'assignment_update',
  'assignment_delete',
  'subscription_create',
  'subscription_payment',
  'subscription_cancel',
  'notification_send',
];

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  logout: 'bg-slate-100 text-slate-600 border-slate-200',
  login_failed: 'bg-rose-50 text-rose-700 border-rose-200',
  otp_sent: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  otp_verified: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  user_create: 'bg-sky-50 text-sky-700 border-sky-200',
  user_update: 'bg-amber-50 text-amber-700 border-amber-200',
  user_delete: 'bg-rose-50 text-rose-700 border-rose-200',
  booth_create: 'bg-sky-50 text-sky-700 border-sky-200',
  booth_update: 'bg-amber-50 text-amber-700 border-amber-200',
  voter_import: 'bg-violet-50 text-violet-700 border-violet-200',
  voter_update: 'bg-amber-50 text-amber-700 border-amber-200',
  voter_visit: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  assignment_create: 'bg-sky-50 text-sky-700 border-sky-200',
  assignment_update: 'bg-amber-50 text-amber-700 border-amber-200',
  assignment_delete: 'bg-rose-50 text-rose-700 border-rose-200',
  subscription_create: 'bg-sky-50 text-sky-700 border-sky-200',
  subscription_payment: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  subscription_cancel: 'bg-rose-50 text-rose-700 border-rose-200',
  notification_send: 'bg-slate-100 text-slate-600 border-slate-200',
};

interface AuditExtras {
  action: string;
  userId: string;
}

const emptyAuditExtras: AuditExtras = { action: '', userId: '' };

type AuditChipKey = keyof AuditExtras | VoterChip['key'];

interface AuditChip {
  key: AuditChipKey;
  label: string;
  source: 'extra' | 'voter';
  voterChip?: VoterChip;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [page, setPage] = useState(1);

  const [appliedExtras, setAppliedExtras] = useState<AuditExtras>(emptyAuditExtras);
  const [appliedVoter, setAppliedVoter] = useState<VoterFilterState>(emptyVoterFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildVoterQuery(appliedVoter, { page: String(page), limit: '50' });
      // Audit log endpoint accepts `action`, `userId`, `from`, `to` (date).
      // Translate visit-date keys → from/to so the existing endpoint works
      // without backend changes.
      if (appliedExtras.action) params.action = appliedExtras.action;
      if (appliedExtras.userId) params.userId = appliedExtras.userId;
      if (params.visitDateFrom) {
        params.from = params.visitDateFrom;
        delete params.visitDateFrom;
      }
      if (params.visitDateTo) {
        params.to = params.visitDateTo;
        delete params.visitDateTo;
      }
      delete params.dateFrom;
      delete params.dateTo;
      const res = await api.get('/audit-logs', { params });
      setLogs(res.data.data.logs);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, appliedExtras, appliedVoter]);

  useEffect(() => {
    load();
  }, [load]);

  const auditChips = useMemo<AuditChip[]>(() => {
    const out: AuditChip[] = [];
    if (appliedExtras.action) out.push({ key: 'action', label: `Action: ${appliedExtras.action}`, source: 'extra' });
    if (appliedExtras.userId) out.push({ key: 'userId', label: `User …${appliedExtras.userId.slice(-6)}`, source: 'extra' });
    for (const c of describeVoterFilters(appliedVoter)) {
      out.push({ key: c.key as AuditChipKey, label: c.label, source: 'voter', voterChip: c });
    }
    return out;
  }, [appliedExtras, appliedVoter]);

  function clearChip(chip: ActiveChip<AuditChipKey>) {
    const m = auditChips.find((c) => c.key === chip.key);
    if (!m) return;
    if (m.source === 'extra') {
      setAppliedExtras((s) => ({ ...s, [m.key as keyof AuditExtras]: '' }));
    } else if (m.voterChip) {
      setAppliedVoter((s) => clearVoterChip(s, m.voterChip!));
    }
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500">
            {pagination.total.toLocaleString('en-IN')} events — logins, voter edits, subscription activity
            {auditChips.length > 0 && ` · ${auditChips.length} filter${auditChips.length === 1 ? '' : 's'} applied`}
          </p>
        </div>
        <FiltersButton onClick={() => setFiltersOpen(true)} count={auditChips.length} />
      </div>

      <ActiveChips
        chips={auditChips.map(({ key, label }) => ({ key, label }))}
        onRemove={clearChip}
        onClearAll={() => {
          setAppliedExtras(emptyAuditExtras);
          setAppliedVoter(emptyVoterFilters);
          setPage(1);
        }}
      />

      <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">When</th>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">Target</th>
                <th className="px-4 py-3 text-left font-medium">IP</th>
                <th className="px-4 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <SkeletonTable rows={8} columns={['150px', { w: '140px', lines: 2 }, '130px', '180px', '110px', { w: '60px', alignRight: true }]} />
              )}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No events match.</td></tr>
              )}
              {!loading && logs.map((log) => {
                const u = typeof log.userId === 'object' && log.userId ? log.userId : null;
                const isOpen = expanded === log._id;
                const hasDiff = log.oldValue || log.newValue;
                return (
                  <Fragment key={log._id}>
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3"><p className="text-slate-900">{u?.name || '—'}</p><p className="text-xs text-slate-400">{log.role}</p></td>
                      <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{log.action}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">{log.targetEntityId ? log.targetEntityId.slice(-10) : '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">{log.ipAddress || '—'}</td>
                      <td className="px-4 py-3 text-right">{hasDiff && <button onClick={() => setExpanded(isOpen ? null : log._id)} className="text-xs text-red-600 hover:text-red-700 font-medium">{isOpen ? 'Hide' : 'Diff'}</button>}</td>
                    </tr>
                    {isOpen && hasDiff && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div><p className="font-semibold text-rose-700 mb-1">Before</p><pre className="bg-rose-50 border border-rose-100 rounded p-2 overflow-x-auto text-rose-900">{JSON.stringify(log.oldValue ?? {}, null, 2)}</pre></div>
                            <div><p className="font-semibold text-emerald-700 mb-1">After</p><pre className="bg-emerald-50 border border-emerald-100 rounded p-2 overflow-x-auto text-emerald-900">{JSON.stringify(log.newValue ?? {}, null, 2)}</pre></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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

      <AuditFiltersModal
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
    </div>
  );
}

function AuditFiltersModal({
  open,
  initialExtras,
  initialVoter,
  onClose,
  onApply,
}: {
  open: boolean;
  initialExtras: AuditExtras;
  initialVoter: VoterFilterState;
  onClose: () => void;
  onApply: (extras: AuditExtras, voter: VoterFilterState) => void;
}) {
  const [extras, setExtras] = useState<AuditExtras>(initialExtras);
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

  const draftCount =
    (extras.action ? 1 : 0) + (extras.userId ? 1 : 0) + describeVoterFilters(voter).length;

  return (
    <FiltersModal
      open={open}
      title="Filter audit log"
      subtitle={`Narrow by event type, actor, or any survey-time field. ${
        draftCount > 0 ? `${draftCount} active.` : ''
      }`}
      applyCount={draftCount}
      onClose={onClose}
      onApply={() => onApply(extras, voter)}
      onReset={() => {
        setExtras(emptyAuditExtras);
        setVoter(emptyVoterFilters);
      }}>
      <FilterSection title="Event" subtitle="Type of action and the user who performed it">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabeledFilterSelect
            label="Action"
            value={extras.action}
            onChange={(v) => setExtras((s) => ({ ...s, action: v }))}
            options={[{ value: '', label: 'Any action' }, ...ACTIONS.map((a) => ({ value: a, label: a }))]}
          />
          <LabeledFilterInput
            label="User ID (actor)"
            value={extras.userId}
            onChange={(v) => setExtras((s) => ({ ...s, userId: v }))}
            placeholder="MongoDB user _id (24-char hex)"
          />
        </div>
      </FilterSection>
      <VoterFilterFields draft={voter} onChange={updateVoter} searchPlaceholder="Search …" />
    </FiltersModal>
  );
}
