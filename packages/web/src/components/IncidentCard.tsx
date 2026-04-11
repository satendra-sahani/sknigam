'use client';

import { useState } from 'react';

interface Incident {
  _id: string;
  boothId: any;
  reportedBy: any;
  category: string;
  severity: string;
  status: string;
  description: string;
  photos: string[];
  resolvedBy?: any;
  resolvedAt?: string;
  createdAt?: string;
}

interface IncidentCardProps {
  incident: Incident;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

const severityConfig: Record<string, { bg: string; text: string; stripe: string }> = {
  critical: { bg: 'bg-rose-50', text: 'text-rose-700', stripe: 'from-rose-500 to-rose-400' },
  high: { bg: 'bg-amber-50', text: 'text-amber-700', stripe: 'from-amber-500 to-amber-400' },
  medium: { bg: 'bg-sky-50', text: 'text-sky-700', stripe: 'from-sky-500 to-sky-400' },
  low: { bg: 'bg-slate-50', text: 'text-slate-600', stripe: 'from-slate-400 to-slate-300' },
};

const categoryConfig: Record<string, { bg: string; text: string }> = {
  technical: { bg: 'bg-violet-50', text: 'text-violet-700' },
  security: { bg: 'bg-rose-50', text: 'text-rose-700' },
  administrative: { bg: 'bg-amber-50', text: 'text-amber-700' },
  other: { bg: 'bg-slate-50', text: 'text-slate-600' },
};

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  open: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  acknowledged: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  resolved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

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

export default function IncidentCard({ incident, onAcknowledge, onResolve }: IncidentCardProps) {
  const [imageError, setImageError] = useState<Set<number>>(new Set());

  const boothName = typeof incident.boothId === 'object' ? incident.boothId?.name : incident.boothId;
  const reporterName = typeof incident.reportedBy === 'object' ? incident.reportedBy?.name : incident.reportedBy;
  const reporterInitial = reporterName ? reporterName.charAt(0).toUpperCase() : '?';

  const sev = severityConfig[incident.severity] || severityConfig.low;
  const cat = categoryConfig[incident.category] || categoryConfig.other;
  const sts = statusConfig[incident.status] || statusConfig.open;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Severity Stripe */}
      <div className={`h-1 w-full bg-gradient-to-r ${sev.stripe}`} />

      <div className="p-5">
        {/* Header: Category + Severity + Time */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg ${cat.bg} ${cat.text}`}>
            {incident.category}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg ${sev.bg} ${sev.text}`}>
            {incident.severity}
          </span>
          <span className="ml-auto text-xs text-slate-400">{formatTimeAgo(incident.createdAt)}</span>
        </div>

        {/* Booth Name */}
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h4 className="font-semibold text-slate-800">{boothName || 'Unknown Booth'}</h4>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-3">{incident.description}</p>

        {/* Photos */}
        {incident.photos && incident.photos.length > 0 && (
          <div className="flex gap-2 mb-3">
            {incident.photos.slice(0, 3).map((photo, i) => (
              <div
                key={i}
                className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 group/photo"
              >
                {!imageError.has(i) ? (
                  <img
                    src={photo}
                    alt={`Evidence ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    onError={() => setImageError((prev) => new Set(prev).add(i))}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            {incident.photos.length > 3 && (
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 flex-shrink-0">
                +{incident.photos.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Reporter */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-indigo-600">{reporterInitial}</span>
          </div>
          <span className="text-xs text-slate-500">{reporterName || 'Unknown'}</span>
        </div>

        {/* Footer: Status + Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg ${sts.bg} ${sts.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sts.dot}`} />
            {incident.status}
          </span>
          <div className="flex gap-2">
            {incident.status === 'open' && onAcknowledge && (
              <button
                onClick={() => onAcknowledge(incident._id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Acknowledge
              </button>
            )}
            {(incident.status === 'open' || incident.status === 'acknowledged') && onResolve && (
              <button
                onClick={() => onResolve(incident._id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Resolve
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
