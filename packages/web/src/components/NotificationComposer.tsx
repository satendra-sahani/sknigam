'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface NotificationComposerProps {
  onSent: () => void;
}

type TargetMode = 'all' | 'zone' | 'role' | 'individual';

const MAX_MESSAGE_LENGTH = 500;

const typeOptions = [
  { value: 'system', label: 'System', icon: 'cog' },
  { value: 'zone_broadcast', label: 'Zone Broadcast', icon: 'broadcast' },
  { value: 'report_update', label: 'Report Update', icon: 'document' },
  { value: 'incident_update', label: 'Incident Update', icon: 'alert' },
  { value: 'urgent', label: 'Urgent', icon: 'urgent' },
];

function TypeOptionIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'cog':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'broadcast':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      );
    case 'document':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'alert':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    case 'urgent':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    default:
      return null;
  }
}

export default function NotificationComposer({ onSent }: NotificationComposerProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('system');
  const [targetMode, setTargetMode] = useState<TargetMode>('all');
  const [targetZone, setTargetZone] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState<string[]>([]);

  useEffect(() => {
    fetchStaffAndZones();
  }, []);

  const fetchStaffAndZones = async () => {
    try {
      const response = await api.get('/staff', { params: { limit: 500 } });
      const staffData = response.data.data.staff || [];
      setStaffList(staffData);
      const uniqueZones = [...new Set(staffData.map((s: any) => s.zone).filter(Boolean))] as string[];
      setZones(uniqueZones);
    } catch {
      // Silently fail
    }
  };

  const recipientCount = useMemo(() => {
    if (targetMode === 'all') return staffList.length;
    if (targetMode === 'zone' && targetZone) return staffList.filter((s) => s.zone === targetZone).length;
    if (targetMode === 'role' && targetRole) return staffList.filter((s) => s.role === targetRole).length;
    if (targetMode === 'individual') return recipients.length;
    return null;
  }, [targetMode, targetZone, targetRole, recipients, staffList]);

  const filteredStaff = useMemo(() => {
    if (!staffSearch.trim()) return staffList;
    const q = staffSearch.toLowerCase();
    return staffList.filter(
      (s) => s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    );
  }, [staffList, staffSearch]);

  const toggleRecipient = (id: string) => {
    setRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setLoading(true);
    try {
      const payload: any = { title, message, type };

      if (targetMode === 'zone' && targetZone) {
        payload.targetZone = targetZone;
      } else if (targetMode === 'role' && targetRole) {
        payload.targetRole = targetRole;
      } else if (targetMode === 'individual' && recipients.length > 0) {
        payload.recipients = recipients;
      }

      await api.post('/notifications', payload);
      toast.success('Notification sent successfully');
      setTitle('');
      setMessage('');
      setType('system');
      setTargetMode('all');
      setTargetZone('');
      setTargetRole('');
      setRecipients([]);
      setStaffSearch('');
      onSent();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const targetModes: { value: TargetMode; label: string; desc: string }[] = [
    { value: 'all', label: 'All Staff', desc: 'Everyone' },
    { value: 'zone', label: 'By Zone', desc: 'Zone members' },
    { value: 'role', label: 'By Role', desc: 'Role group' },
    { value: 'individual', label: 'Individual', desc: 'Select people' },
  ];

  return (
    <div className="sticky top-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-800">Compose Notification</h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
            required
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder="Write your message..."
            rows={4}
            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
            required
          />
          <div className="flex justify-end mt-1">
            <span className={`text-xs ${message.length > MAX_MESSAGE_LENGTH * 0.9 ? 'text-amber-500' : 'text-slate-400'}`}>
              {message.length}/{MAX_MESSAGE_LENGTH}
            </span>
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
          <div className="relative">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors appearance-none"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <TypeOptionIcon icon={typeOptions.find((o) => o.value === type)?.icon || 'cog'} />
            </div>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Recipient Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Recipients</label>
          <div className="grid grid-cols-2 gap-2">
            {targetModes.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setTargetMode(mode.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  targetMode === mode.value
                    ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className={`text-sm font-medium ${targetMode === mode.value ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {mode.label}
                </p>
                <p className={`text-xs mt-0.5 ${targetMode === mode.value ? 'text-indigo-500' : 'text-slate-400'}`}>
                  {mode.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Zone Selector */}
        {targetMode === 'zone' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Zone</label>
            <select
              value={targetZone}
              onChange={(e) => setTargetZone(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
            >
              <option value="">-- Select Zone --</option>
              {zones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        )}

        {/* Role Selector */}
        {targetMode === 'role' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Role</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
            >
              <option value="">-- Select Role --</option>
              <option value="super_admin">Super Admin</option>
              <option value="zone_incharge">Zone Incharge</option>
              <option value="booth_supervisor">Booth Supervisor</option>
              <option value="data_entry_operator">Data Entry Operator</option>
              <option value="observer">Observer</option>
            </select>
          </div>
        )}

        {/* Individual Selector */}
        {targetMode === 'individual' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Staff Members</label>
            <div className="relative mb-2">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search staff..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
              />
            </div>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {filteredStaff.map((s) => (
                <label
                  key={s._id}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={recipients.includes(s._id)}
                    onChange={() => toggleRecipient(s._id)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.role?.replace(/_/g, ' ')}</p>
                  </div>
                </label>
              ))}
              {filteredStaff.length === 0 && (
                <p className="px-3 py-4 text-xs text-center text-slate-400">No staff found</p>
              )}
            </div>
          </div>
        )}

        {/* Recipient Count Preview */}
        {recipientCount !== null && recipientCount > 0 && (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200/60 rounded-xl p-3">
            <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm text-indigo-700">
              Will send to <span className="font-bold">{recipientCount}</span> recipient{recipientCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Send Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-xl hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send Notification
            </>
          )}
        </button>
      </form>
    </div>
  );
}
