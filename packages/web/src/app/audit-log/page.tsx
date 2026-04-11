'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';

interface AuditLogEntry {
  _id: string;
  userId: any;
  role: string;
  action: string;
  targetEntityId?: string;
  ipAddress?: string;
  device?: string;
  timestamp: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const actionLabels: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  login_failed: 'Login Failed',
  staff_create: 'Staff Created',
  staff_update: 'Staff Updated',
  staff_delete: 'Staff Deleted',
  booth_create: 'Booth Created',
  booth_update: 'Booth Updated',
  assignment_create: 'Assignment Created',
  assignment_update: 'Assignment Updated',
  voter_count_submit: 'Voter Count Submitted',
  voter_count_approve: 'Voter Count Approved',
  voter_count_reject: 'Voter Count Rejected',
  check_in: 'Check-In',
  incident_create: 'Incident Reported',
  incident_update: 'Incident Updated',
  notification_send: 'Notification Sent',
  staff_swap: 'Staff Swapped',
  otp_sent: 'OTP Sent',
  otp_verified: 'OTP Verified',
};

const actionTypeConfig: Record<string, { bg: string; text: string; iconType: string }> = {
  login: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconType: 'login' },
  logout: { bg: 'bg-slate-50', text: 'text-slate-600', iconType: 'logout' },
  login_failed: { bg: 'bg-rose-50', text: 'text-rose-700', iconType: 'error' },
  staff_create: { bg: 'bg-sky-50', text: 'text-sky-700', iconType: 'create' },
  staff_update: { bg: 'bg-amber-50', text: 'text-amber-700', iconType: 'update' },
  staff_delete: { bg: 'bg-rose-50', text: 'text-rose-700', iconType: 'delete' },
  booth_create: { bg: 'bg-sky-50', text: 'text-sky-700', iconType: 'create' },
  booth_update: { bg: 'bg-amber-50', text: 'text-amber-700', iconType: 'update' },
  assignment_create: { bg: 'bg-sky-50', text: 'text-sky-700', iconType: 'create' },
  assignment_update: { bg: 'bg-amber-50', text: 'text-amber-700', iconType: 'update' },
  voter_count_submit: { bg: 'bg-sky-50', text: 'text-sky-700', iconType: 'create' },
  voter_count_approve: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconType: 'login' },
  voter_count_reject: { bg: 'bg-rose-50', text: 'text-rose-700', iconType: 'delete' },
  check_in: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconType: 'login' },
  incident_create: { bg: 'bg-amber-50', text: 'text-amber-700', iconType: 'create' },
  incident_update: { bg: 'bg-amber-50', text: 'text-amber-700', iconType: 'update' },
  notification_send: { bg: 'bg-violet-50', text: 'text-violet-700', iconType: 'create' },
  staff_swap: { bg: 'bg-amber-50', text: 'text-amber-700', iconType: 'update' },
  otp_sent: { bg: 'bg-sky-50', text: 'text-sky-700', iconType: 'create' },
  otp_verified: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconType: 'login' },
};

function ActionIcon({ type }: { type: string }) {
  const iconType = actionTypeConfig[type]?.iconType || 'create';
  switch (iconType) {
    case 'login':
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      );
    case 'logout':
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      );
    case 'create':
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      );
    case 'update':
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case 'delete':
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
}

const roleColors: Record<string, string> = {
  super_admin: 'bg-violet-50 text-violet-700',
  zone_incharge: 'bg-indigo-50 text-indigo-700',
  booth_supervisor: 'bg-sky-50 text-sky-700',
  data_entry_operator: 'bg-slate-50 text-slate-600',
  observer: 'bg-slate-50 text-slate-500',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { user } = useAuth();

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      const params: any = { page, limit: 50 };
      if (actionFilter) params.action = actionFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;

      const response = await api.get('/audit-logs', { params });
      const data = response.data.data;
      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error('Access denied. Super Admin only.');
      } else {
        toast.error('Failed to load audit logs');
      }
    }
  }, [actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchLogs();
      setLoading(false);
    };
    load();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    if (!userSearch.trim()) return logs;
    const q = userSearch.toLowerCase();
    return logs.filter((log) => {
      const userName = typeof log.userId === 'object' ? log.userId?.name : log.userId;
      const userEmail = typeof log.userId === 'object' ? log.userId?.email : '';
      return (
        (userName && userName.toLowerCase().includes(q)) ||
        (userEmail && userEmail.toLowerCase().includes(q))
      );
    });
  }, [logs, userSearch]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayLogs = logs.filter((l) => new Date(l.timestamp).toDateString() === today);
    const uniqueUsers = new Set(logs.map((l) => {
      return typeof l.userId === 'object' ? l.userId?._id : l.userId;
    })).size;
    const actionCounts: Record<string, number> = {};
    logs.forEach((l) => {
      actionCounts[l.action] = (actionCounts[l.action] || 0) + 1;
    });
    const mostCommon = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      todayCount: todayLogs.length,
      uniqueUsers,
      mostCommon: mostCommon ? actionLabels[mostCommon[0]] || mostCommon[0] : 'N/A',
    };
  }, [logs]);

  const exportCSV = () => {
    if (logs.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Target', 'IP Address', 'Device'];
    const rows = logs.map((log) => {
      const userName = typeof log.userId === 'object' ? log.userId?.name : log.userId;
      return [
        new Date(log.timestamp).toLocaleString(),
        userName || 'Unknown',
        log.role,
        actionLabels[log.action] || log.action,
        log.targetEntityId || '-',
        log.ipAddress || '-',
        log.device || '-',
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('CSV exported');
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /* ---------- Skeleton ---------- */
  if (loading) {
    return (
      <AuthGuard allowedRoles={['super_admin']}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 w-40 bg-slate-200 rounded-xl animate-pulse" />
              <div className="h-4 w-56 bg-slate-100 rounded-lg animate-pulse mt-2" />
            </div>
            <div className="h-10 w-32 bg-slate-100 rounded-xl animate-pulse" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mb-3" />
                <div className="h-8 w-16 bg-slate-200 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-4 space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={['super_admin']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Log</h1>
            <p className="text-sm text-slate-500 mt-1">Complete activity trail</p>
          </div>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Actions Today</p>
                <p className="text-2xl font-bold text-slate-900">{stats.todayCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unique Users</p>
                <p className="text-2xl font-bold text-slate-900">{stats.uniqueUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Most Common</p>
                <p className="text-lg font-bold text-slate-900 truncate">{stats.mostCommon}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
            >
              <option value="">All Actions</option>
              {Object.entries(actionLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <div className="relative flex-1 min-w-[180px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
              />
            </div>
            {(actionFilter || dateFrom || dateTo || userSearch) && (
              <button
                onClick={() => { setActionFilter(''); setDateFrom(''); setDateTo(''); setUserSearch(''); }}
                className="px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/60">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Timestamp</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Action</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Target</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">IP Address</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-slate-500">No audit log entries found</p>
                        <p className="text-xs text-slate-400">Adjust your filters or date range</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => {
                    const userName = typeof log.userId === 'object' ? log.userId?.name : log.userId;
                    const userEmail = typeof log.userId === 'object' ? log.userId?.email : '';
                    const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';
                    const ac = actionTypeConfig[log.action] || { bg: 'bg-slate-50', text: 'text-slate-600', iconType: 'create' };
                    const rc = roleColors[log.role] || 'bg-slate-50 text-slate-600';

                    return (
                      <tr key={log._id} className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                        <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap text-xs">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-indigo-600">{userInitial}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{userName || 'Unknown'}</p>
                              {userEmail && (
                                <p className="text-xs text-slate-400 truncate">{userEmail}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg ${rc}`}>
                            {log.role?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg ${ac.bg} ${ac.text}`}>
                            <ActionIcon type={log.action} />
                            {actionLabels[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-500 max-w-[150px] truncate">
                          {log.targetEntityId || '-'}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                          {log.ipAddress || '-'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[120px] truncate">
                          {log.device || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/60 shadow-sm px-5 py-3.5">
            <p className="text-sm text-slate-500">
              Page <span className="font-medium text-slate-700">{pagination.page}</span> of{' '}
              <span className="font-medium text-slate-700">{pagination.pages}</span>
              {' '}({pagination.total} entries)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
