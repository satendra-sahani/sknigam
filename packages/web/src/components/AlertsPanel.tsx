'use client';

import { useState } from 'react';

interface Alert {
  id: string;
  type: string;
  severity: 'critical' | 'attention' | 'info';
  message: string;
  timestamp: string;
  data?: any;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
}

const severityConfig = {
  critical: {
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
    label: 'Critical',
    labelBg: 'bg-rose-100 text-rose-700',
    icon: (
      <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  attention: {
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    label: 'Attention Needed',
    labelBg: 'bg-amber-100 text-amber-700',
    icon: (
      <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    text: 'text-sky-700',
    dot: 'bg-sky-500',
    label: 'Information',
    labelBg: 'bg-sky-100 text-sky-700',
    icon: (
      <svg className="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
};

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AlertsPanel({ alerts, onDismiss }: AlertsPanelProps) {
  const [dismissing, setDismissing] = useState<string | null>(null);

  const grouped = {
    critical: alerts.filter((a) => a.severity === 'critical'),
    attention: alerts.filter((a) => a.severity === 'attention'),
    info: alerts.filter((a) => a.severity === 'info'),
  };

  const handleDismiss = (id: string) => {
    setDismissing(id);
    setTimeout(() => {
      onDismiss?.(id);
      setDismissing(null);
    }, 200);
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/60 p-6 transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900">Live Alerts</h3>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 mb-4">
            <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-700 font-medium">All clear</p>
          <p className="text-xs text-slate-400 mt-1">No active alerts at this time</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 transition-all duration-200">
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-900">Live Alerts</h3>
        </div>
        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-xs font-semibold bg-rose-100 text-rose-700 rounded-full">
          {alerts.length}
        </span>
      </div>

      <div className="px-6 pb-6 space-y-4 max-h-96 overflow-y-auto scrollbar-thin">
        {(['critical', 'attention', 'info'] as const).map((severity) => {
          const items = grouped[severity];
          if (items.length === 0) return null;
          const config = severityConfig[severity];

          return (
            <div key={severity}>
              <div className="flex items-center gap-2 mb-2.5">
                <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${config.text}`}>
                  {config.label}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((alert) => (
                  <div
                    key={alert.id}
                    className={`${config.bg} border ${config.border} rounded-xl p-3.5 flex items-start gap-3 transition-all duration-200 ${
                      dismissing === alert.id ? 'opacity-0 translate-x-4' : 'opacity-100'
                    }`}
                    style={{
                      animation: 'slideIn 0.3s ease-out',
                    }}
                  >
                    <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${config.text} leading-snug`}>{alert.message}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {timeAgo(alert.timestamp)}
                      </p>
                    </div>
                    {onDismiss && (
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
