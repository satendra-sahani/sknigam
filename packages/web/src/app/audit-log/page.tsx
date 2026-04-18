'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

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

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '50' };
      if (action) params.action = action;
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.get('/audit-logs', { params });
      setLogs(res.data.data.logs);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, action, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Audit Log</h1>
        <p className="text-sm text-slate-500">
          {pagination.total.toLocaleString('en-IN')} events — logins, voter edits, subscription activity
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load();
        }}
        className="bg-white rounded-xl border border-slate-200/60 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400">
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setAction('');
              setFrom('');
              setTo('');
              setPage(1);
            }}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
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
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No events match.
                  </td>
                </tr>
              )}
              {!loading &&
                logs.map((log) => {
                  const u = typeof log.userId === 'object' && log.userId ? log.userId : null;
                  const isOpen = expanded === log._id;
                  const hasDiff = log.oldValue || log.newValue;
                  return (
                    <Fragment key={log._id}>
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-900">{u?.name || '—'}</p>
                          <p className="text-xs text-slate-400">{log.role}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                          {log.targetEntityId ? log.targetEntityId.slice(-10) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{log.ipAddress || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          {hasDiff && (
                            <button
                              onClick={() => setExpanded(isOpen ? null : log._id)}
                              className="text-xs text-red-600 hover:text-red-700 font-medium">
                              {isOpen ? 'Hide' : 'Diff'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isOpen && hasDiff && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="font-semibold text-rose-700 mb-1">Before</p>
                                <pre className="bg-rose-50 border border-rose-100 rounded p-2 overflow-x-auto text-rose-900">
                                  {JSON.stringify(log.oldValue ?? {}, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <p className="font-semibold text-emerald-700 mb-1">After</p>
                                <pre className="bg-emerald-50 border border-emerald-100 rounded p-2 overflow-x-auto text-emerald-900">
                                  {JSON.stringify(log.newValue ?? {}, null, 2)}
                                </pre>
                              </div>
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
    </div>
  );
}
