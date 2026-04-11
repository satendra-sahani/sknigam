'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import NotificationComposer from '@/components/NotificationComposer';
import { useAuth } from '@/hooks/useAuth';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  sentBy: any;
  recipients: string[];
  readBy: string[];
  targetZone?: string;
  targetRole?: string;
  createdAt?: string;
}

type TabFilter = 'all' | 'mine' | 'system';

const typeIcons: Record<string, { icon: string; bg: string; color: string }> = {
  system: { icon: 'bell', bg: 'bg-slate-100', color: 'text-slate-600' },
  zone_broadcast: { icon: 'megaphone', bg: 'bg-indigo-100', color: 'text-indigo-600' },
  report_update: { icon: 'document', bg: 'bg-emerald-100', color: 'text-emerald-600' },
  incident_update: { icon: 'alert', bg: 'bg-amber-100', color: 'text-amber-600' },
  urgent: { icon: 'urgent', bg: 'bg-rose-100', color: 'text-rose-600' },
};

function TypeIcon({ type }: { type: string }) {
  const config = typeIcons[type] || typeIcons.system;

  if (type === 'urgent' || type === 'incident_update') {
    return (
      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <svg className={`w-5 h-5 ${config.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
    );
  }

  if (type === 'zone_broadcast') {
    return (
      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <svg className={`w-5 h-5 ${config.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      </div>
    );
  }

  if (type === 'report_update') {
    return (
      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <svg className={`w-5 h-5 ${config.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
      <svg className={`w-5 h-5 ${config.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    </div>
  );
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'Unknown';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { user } = useAuth();

  const canCompose = user?.role === 'super_admin' || user?.role === 'zone_incharge';

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications', { params: { limit: 50 } });
      setNotifications(response.data.data.notifications || []);
    } catch {
      toast.error('Failed to load notifications');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchNotifications();
      setLoading(false);
    };
    load();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id
            ? { ...n, readBy: [...n.readBy, user?._id || ''] }
            : n
        )
      );
    } catch {
      // Silently fail
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          readBy: [...new Set([...n.readBy, user?._id || ''])],
        }))
      );
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'mine': {
        const userId = user?._id || '';
        return notifications.filter((n) => {
          const sentById = typeof n.sentBy === 'object' ? n.sentBy?._id : n.sentBy;
          return sentById === userId;
        });
      }
      case 'system':
        return notifications.filter((n) => n.type === 'system');
      default:
        return notifications;
    }
  }, [notifications, activeTab, user?._id]);

  const tabCounts = useMemo(() => ({
    all: notifications.length,
    mine: notifications.filter((n) => {
      const sentById = typeof n.sentBy === 'object' ? n.sentBy?._id : n.sentBy;
      return sentById === (user?._id || '');
    }).length,
    system: notifications.filter((n) => n.type === 'system').length,
  }), [notifications, user?._id]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readBy.includes(user?._id || '')).length,
    [notifications, user?._id]
  );

  /* ---------- Skeleton ---------- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-4 w-72 bg-slate-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="flex gap-6">
          <div className="w-96 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-50 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-2xl border border-slate-200/60 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">Broadcast and manage communications</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Mark all as read
          </button>
        )}
      </div>

      {/* Split Layout */}
      <div className="flex gap-6">
        {/* Left: Composer */}
        {canCompose && (
          <div className="w-96 flex-shrink-0">
            <NotificationComposer onSent={fetchNotifications} />
          </div>
        )}

        {/* Right: Feed */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="flex items-center border-b border-slate-200/60 px-5">
              {([
                { key: 'all' as TabFilter, label: 'All' },
                { key: 'mine' as TabFilter, label: 'Sent by me' },
                { key: 'system' as TabFilter, label: 'System' },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-4 py-3.5 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-indigo-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {tab.label}
                    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full ${
                      activeTab === tab.key
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tabCounts[tab.key]}
                    </span>
                  </span>
                  {activeTab === tab.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Notification Items */}
            <div className="divide-y divide-slate-100">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-500">No notifications yet</p>
                  <p className="text-xs text-slate-400 mt-1">New notifications will appear here</p>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const isRead = notif.readBy.includes(user?._id || '');
                  const senderName = typeof notif.sentBy === 'object' ? notif.sentBy?.name : notif.sentBy;
                  const readPercent = notif.recipients.length > 0
                    ? Math.round((notif.readBy.length / notif.recipients.length) * 100)
                    : 0;
                  const isExpanded = expandedId === notif._id;

                  return (
                    <div key={notif._id}>
                      <div
                        className={`flex items-start gap-4 p-5 cursor-pointer transition-colors hover:bg-slate-50/50 ${
                          !isRead ? 'border-l-2 border-l-indigo-500 bg-indigo-50/30' : 'border-l-2 border-l-transparent'
                        }`}
                        onClick={() => {
                          if (!isRead) markAsRead(notif._id);
                          setExpandedId(isExpanded ? null : notif._id);
                        }}
                      >
                        {/* Type Icon */}
                        <TypeIcon type={notif.type} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className={`text-sm ${!isRead ? 'font-semibold' : 'font-medium'} text-slate-800 truncate`}>
                                {notif.title}
                              </h4>
                              <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{notif.message}</p>
                            </div>
                            <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                          </div>

                          {/* Meta Row */}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-slate-400">
                              {senderName || 'System'}
                            </span>
                            {/* Read Progress */}
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-400 rounded-full transition-all"
                                  style={{ width: `${readPercent}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-400">
                                {notif.readBy.length}/{notif.recipients.length} read
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded: Recipient Details */}
                      {isExpanded && (
                        <div className="px-5 pb-4 pl-[76px]">
                          <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                              Full Message
                            </p>
                            <p className="text-sm text-slate-600 mb-3">{notif.message}</p>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                              Recipients ({notif.recipients.length})
                            </p>
                            <p className="text-xs text-slate-400">
                              {notif.readBy.length} have read this notification
                            </p>
                            {notif.targetZone && (
                              <p className="text-xs text-slate-400 mt-1">
                                Zone: <span className="font-medium text-slate-600">{notif.targetZone}</span>
                              </p>
                            )}
                            {notif.targetRole && (
                              <p className="text-xs text-slate-400 mt-1">
                                Role: <span className="font-medium text-slate-600">{notif.targetRole}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
