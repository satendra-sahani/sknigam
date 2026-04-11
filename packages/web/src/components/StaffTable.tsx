'use client';

import { useState, Fragment } from 'react';
import api from '@/lib/api';

interface Staff {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  zone?: string;
  isVerified: boolean;
  isActive: boolean;
  trainingCompleted: boolean;
  score?: number;
}

interface Scorecard {
  checkInScore: number;
  submissionScore: number;
  approvalScore: number;
  incidentScore: number;
  totalScore: number;
}

interface StaffTableProps {
  staff: Staff[];
  onEdit?: (staff: Staff) => void;
  onDeactivate?: (id: string) => void;
  loading?: boolean;
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  zone_incharge: 'Zone Incharge',
  booth_supervisor: 'Booth Supervisor',
  data_entry_operator: 'Data Entry',
  observer: 'Observer',
};

const roleBadgeColors: Record<string, string> = {
  super_admin: 'bg-violet-50 text-violet-700 border border-violet-200/60',
  zone_incharge: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
  booth_supervisor: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  data_entry_operator: 'bg-sky-50 text-sky-700 border border-sky-200/60',
  observer: 'bg-slate-50 text-slate-700 border border-slate-200/60',
};

const avatarGradients: Record<string, string> = {
  super_admin: 'from-violet-500 to-purple-600',
  zone_incharge: 'from-indigo-500 to-blue-600',
  booth_supervisor: 'from-emerald-500 to-teal-600',
  data_entry_operator: 'from-sky-500 to-cyan-600',
  observer: 'from-slate-500 to-gray-600',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

function getScoreBarColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

function getScoreRingColor(score: number): string {
  if (score >= 75) return 'stroke-emerald-500';
  if (score >= 50) return 'stroke-amber-500';
  return 'stroke-rose-500';
}

function ScoreRing({ score, max = 100, size = 36 }: { score: number; max?: number; size?: number }) {
  const pct = Math.min((score / max) * 100, 100);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-slate-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className={getScoreRingColor(pct)}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className={`absolute text-[10px] font-bold ${getScoreColor(pct)}`}>{score}</span>
    </div>
  );
}

function ShimmerRow() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-36 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-5 py-4"><div className="h-3.5 w-24 bg-slate-200 rounded animate-pulse" /></td>
      <td className="px-5 py-4"><div className="h-6 w-20 bg-slate-200 rounded-lg animate-pulse" /></td>
      <td className="px-5 py-4"><div className="h-3.5 w-16 bg-slate-200 rounded animate-pulse" /></td>
      <td className="px-5 py-4"><div className="h-5 w-16 bg-slate-200 rounded animate-pulse" /></td>
      <td className="px-5 py-4"><div className="h-9 w-9 bg-slate-200 rounded-full animate-pulse" /></td>
      <td className="px-5 py-4"><div className="flex gap-1"><div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse" /><div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse" /></div></td>
    </tr>
  );
}

export default function StaffTable({ staff, onEdit, onDeactivate, loading }: StaffTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loadingScorecard, setLoadingScorecard] = useState(false);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setScorecard(null);
      return;
    }

    setExpandedId(id);
    setLoadingScorecard(true);
    try {
      const response = await api.get(`/staff/scorecard/${id}`);
      setScorecard(response.data.data);
    } catch {
      setScorecard(null);
    } finally {
      setLoadingScorecard(false);
    }
  };

  const scorecardMetrics = scorecard
    ? [
        {
          label: 'Check-in',
          subtitle: '25 pts max',
          value: scorecard.checkInScore,
          max: 25,
          icon: (
            <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
        {
          label: 'Submissions',
          subtitle: '25 pts max',
          value: scorecard.submissionScore,
          max: 25,
          icon: (
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          label: 'Approval Rate',
          subtitle: '25 pts max',
          value: scorecard.approvalScore,
          max: 25,
          icon: (
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          label: 'Incidents',
          subtitle: '25 pts max',
          value: scorecard.incidentScore,
          max: 25,
          icon: (
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/60">
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Staff</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Phone</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Zone</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Score</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(6)].map((_, i) => (
              <ShimmerRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/60">
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Staff</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Phone</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Zone</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Score</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">No staff members found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search or filters</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              staff.map((member) => (
                <Fragment key={member._id}>
                  <tr
                    className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer ${
                      !member.isActive ? 'opacity-50' : ''
                    } ${expandedId === member._id ? 'bg-slate-50/50' : ''}`}
                    onClick={() => toggleExpand(member._id)}
                  >
                    {/* Staff: Avatar + Name + Email */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGradients[member.role] || 'from-slate-500 to-gray-600'} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                          {getInitials(member.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
                          <p className="text-xs text-slate-500 truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-5 py-3.5 text-sm text-slate-600">{member.phone}</td>

                    {/* Role Badge */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${roleBadgeColors[member.role] || 'bg-slate-50 text-slate-700 border border-slate-200/60'}`}>
                        {roleLabels[member.role] || member.role}
                      </span>
                    </td>

                    {/* Zone */}
                    <td className="px-5 py-3.5 text-sm text-slate-600">{member.zone || <span className="text-slate-300">--</span>}</td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      {member.isVerified ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Score */}
                    <td className="px-5 py-3.5">
                      <ScoreRing score={member.score ?? 0} />
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        {onEdit && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(member); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpand(member._id); }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            expandedId === member._id
                              ? 'text-brand-600 bg-brand-50'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                          title="View Scorecard"
                        >
                          <svg className={`w-4 h-4 transition-transform ${expandedId === member._id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {onDeactivate && member.isActive && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeactivate(member._id); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Deactivate"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Scorecard Row */}
                  {expandedId === member._id && (
                    <tr className="bg-gradient-to-r from-slate-50/80 to-white">
                      <td colSpan={7} className="px-5 py-5">
                        {loadingScorecard ? (
                          <div className="flex items-center justify-center py-6">
                            <svg className="w-6 h-6 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </div>
                        ) : scorecard ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-slate-900">Performance Scorecard</h4>
                              <div className={`text-2xl font-bold ${getScoreColor(scorecard.totalScore)}`}>
                                {scorecard.totalScore}
                                <span className="text-sm font-normal text-slate-400">/100</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              {scorecardMetrics.map((metric) => {
                                const pct = Math.round((metric.value / metric.max) * 100);
                                return (
                                  <div
                                    key={metric.label}
                                    className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm"
                                  >
                                    <div className="flex items-center gap-2.5 mb-3">
                                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                        {metric.icon}
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-slate-700">{metric.label}</p>
                                        <p className="text-[10px] text-slate-400">{metric.subtitle}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-end justify-between mb-2">
                                      <span className={`text-xl font-bold ${getScoreColor(pct)}`}>{metric.value}</span>
                                      <span className="text-xs text-slate-400">/{metric.max}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                                      <div
                                        className={`${getScoreBarColor(pct)} h-1.5 rounded-full transition-all duration-500`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 py-4 text-slate-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            <p className="text-sm">Unable to load scorecard</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
