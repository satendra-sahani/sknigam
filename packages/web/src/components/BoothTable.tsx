'use client';

import { useState } from 'react';

interface Booth {
  _id: string;
  name: string;
  partNumber: number;
  zone: string;
  village?: string;
  totalRegisteredVoters: number;
  assignedStaff?: any[];
}

interface BoothTableProps {
  booths: Booth[];
  assignments?: any[];
  onAssign?: (boothId: string) => void;
  onEdit?: (boothId: string) => void;
  loading?: boolean;
}

type SortField = 'partNumber' | 'name' | 'zone' | 'totalRegisteredVoters';
type SortDir = 'asc' | 'desc';

export default function BoothTable({
  booths,
  assignments = [],
  onAssign,
  onEdit,
  loading = false,
}: BoothTableProps) {
  const [sortField, setSortField] = useState<SortField>('partNumber');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getAssignedStaff = (boothId: string) => {
    return assignments.filter(
      (a: any) => (typeof a.boothId === 'object' ? a.boothId?._id : a.boothId) === boothId && a.isActive
    );
  };

  const sortedBooths = [...booths].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="inline-flex flex-col ml-1 -space-y-1">
      <svg
        className={`w-3 h-3 ${sortField === field && sortDir === 'asc' ? 'text-indigo-600' : 'text-slate-300'}`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 8l-6 6h12z" />
      </svg>
      <svg
        className={`w-3 h-3 ${sortField === field && sortDir === 'desc' ? 'text-indigo-600' : 'text-slate-300'}`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 16l-6-6h12z" />
      </svg>
    </span>
  );

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/60">
              {['Part No', 'Booth Name', 'Zone', 'Village', 'Voters', 'Assigned Staff', 'Actions'].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-100">
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-5 py-4">
                    <div className="h-4 bg-slate-200/70 rounded-lg animate-pulse" style={{ width: `${50 + Math.random() * 50}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty state
  if (booths.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5Z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No booths found</h3>
          <p className="text-sm text-slate-500">No booths match your current search or filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/60">
              <th
                onClick={() => toggleSort('partNumber')}
                className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-700 select-none"
              >
                <span className="inline-flex items-center">
                  Part No
                  <SortIcon field="partNumber" />
                </span>
              </th>
              <th
                onClick={() => toggleSort('name')}
                className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-700 select-none"
              >
                <span className="inline-flex items-center">
                  Booth Name
                  <SortIcon field="name" />
                </span>
              </th>
              <th
                onClick={() => toggleSort('zone')}
                className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-700 select-none"
              >
                <span className="inline-flex items-center">
                  Zone
                  <SortIcon field="zone" />
                </span>
              </th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Village
              </th>
              <th
                onClick={() => toggleSort('totalRegisteredVoters')}
                className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-700 select-none"
              >
                <span className="inline-flex items-center">
                  Registered Voters
                  <SortIcon field="totalRegisteredVoters" />
                </span>
              </th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Assigned Staff
              </th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedBooths.map((booth) => {
              const staff = getAssignedStaff(booth._id);
              const isUnassigned = staff.length === 0;

              return (
                <tr
                  key={booth._id}
                  className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors duration-150"
                >
                  <td className="px-5 py-4 font-mono text-sm text-slate-700 font-medium">
                    {booth.partNumber}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {booth.name}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {booth.zone}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {booth.village || <span className="text-slate-300">&mdash;</span>}
                  </td>
                  <td className="px-5 py-4 text-slate-700 font-medium tabular-nums">
                    {booth.totalRegisteredVoters.toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    {isUnassigned ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium bg-rose-50 text-rose-600 border border-rose-100">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                        Unassigned
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {staff.map((s: any) => {
                          const staffName = typeof s.staffId === 'object' ? s.staffId?.name : s.staffId;
                          const displayName = typeof staffName === 'string' ? staffName : 'Staff';
                          return (
                            <span
                              key={s._id}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"
                            >
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                                {getInitials(displayName)}
                              </span>
                              {displayName}
                              <span className="text-emerald-500 font-normal">({s.type})</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {onAssign && (
                        <button
                          onClick={() => onAssign(booth._id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                          </svg>
                          Assign
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(booth._id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                          Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
