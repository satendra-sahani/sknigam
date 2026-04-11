'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  boothId: string;
  boothName?: string;
  boothPartNumber?: number;
  boothZone?: string;
  onSuccess: () => void;
}

interface StaffOption {
  _id: string;
  name: string;
  role: string;
  zone?: string;
}

export default function AssignmentModal({
  isOpen,
  onClose,
  boothId,
  boothName,
  boothPartNumber,
  boothZone,
  onSuccess,
}: AssignmentModalProps) {
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [assignmentType, setAssignmentType] = useState('primary');
  const [loading, setLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setSelectedStaff('');
      setSearchQuery('');
      setAssignmentType('primary');
      fetchStaff();
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  const fetchStaff = async () => {
    setStaffLoading(true);
    try {
      const response = await api.get('/staff', { params: { limit: 200, isActive: true } });
      setStaffList(response.data.data.staff || []);
    } catch {
      toast.error('Failed to load staff list');
    } finally {
      setStaffLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStaff) {
      toast.error('Please select a staff member');
      return;
    }

    setLoading(true);
    try {
      await api.post('/booth-assignments', {
        boothId,
        staffId: selectedStaff,
        type: assignmentType,
      });
      toast.success('Staff assigned successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to assign staff';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.zone && s.zone.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeStyle = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('agent') || r.includes('booth')) return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    if (r.includes('supervisor') || r.includes('lead')) return 'bg-violet-50 text-violet-700 border-violet-100';
    if (r.includes('volunteer')) return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        style={{ opacity: isAnimating ? 1 : 0 }}
      />

      {/* Slide-over panel */}
      <div
        className="relative w-full max-w-[480px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: isAnimating ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Assign Staff to Booth</h2>
              {boothName && (
                <p className="text-sm text-slate-500 mt-0.5">{boothName}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors -mr-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Booth Info Card */}
        <div className="flex-shrink-0 px-6 pt-5">
          <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5Z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{boothName || 'Booth'}</p>
                <div className="flex items-center gap-3 mt-1">
                  {boothPartNumber !== undefined && (
                    <span className="text-xs text-slate-500 font-mono">#{boothPartNumber}</span>
                  )}
                  {boothZone && (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-600">
                      {boothZone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assignment Type */}
        <div className="flex-shrink-0 px-6 pt-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">Assignment Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAssignmentType('primary')}
              className={`relative flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                assignmentType === 'primary'
                  ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                assignmentType === 'primary' ? 'bg-indigo-100' : 'bg-slate-100'
              }`}>
                <svg className={`w-4 h-4 ${assignmentType === 'primary' ? 'text-indigo-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${assignmentType === 'primary' ? 'text-indigo-900' : 'text-slate-700'}`}>Primary</p>
                <p className="text-xs text-slate-500">Main agent</p>
              </div>
              {assignmentType === 'primary' && (
                <div className="absolute top-2 right-2">
                  <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAssignmentType('backup')}
              className={`relative flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                assignmentType === 'backup'
                  ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                assignmentType === 'backup' ? 'bg-indigo-100' : 'bg-slate-100'
              }`}>
                <svg className={`w-4 h-4 ${assignmentType === 'backup' ? 'text-indigo-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${assignmentType === 'backup' ? 'text-indigo-900' : 'text-slate-700'}`}>Backup</p>
                <p className="text-xs text-slate-500">Standby agent</p>
              </div>
              {assignmentType === 'backup' && (
                <div className="absolute top-2 right-2">
                  <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Staff Search + List */}
        <div className="flex-1 flex flex-col min-h-0 px-6 pt-5 pb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Staff Member</label>
          {/* Search */}
          <div className="relative mb-3 flex-shrink-0">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff by name, role, or zone..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* Staff List */}
          <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1.5">
            {staffLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                      <div className="h-3 bg-slate-200 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">No staff found</p>
                <p className="text-xs text-slate-500 mt-0.5">Try adjusting your search</p>
              </div>
            ) : (
              filteredStaff.map((staff) => {
                const isSelected = selectedStaff === staff._id;
                return (
                  <button
                    key={staff._id}
                    type="button"
                    onClick={() => setSelectedStaff(staff._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500/20'
                        : 'border-transparent bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      isSelected
                        ? 'bg-indigo-200 text-indigo-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {getInitials(staff.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                        {staff.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${getRoleBadgeStyle(staff.role)}`}>
                          {staff.role}
                        </span>
                        {staff.zone && (
                          <span className="text-xs text-slate-500">{staff.zone}</span>
                        )}
                      </div>
                    </div>

                    {/* Select indicator */}
                    {isSelected ? (
                      <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-100 px-6 py-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !selectedStaff}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Assigning...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                  </svg>
                  Assign Staff
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
