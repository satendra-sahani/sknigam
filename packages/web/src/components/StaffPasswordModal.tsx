'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

/**
 * Super-admin "Update password" modal for the /staff page.  POSTs to
 * `/api/staff/:id/password` — the server resets failed-login counts and
 * lockedUntil so the staff member can sign in straight away.
 */
export interface StaffPasswordModalProps {
  staffId: string;
  staffName: string;
  onClose: () => void;
  onSaved?: () => void;
  /** Override the API endpoint. Defaults to `/staff/${staffId}/password`. */
  apiPath?: string;
}

export default function StaffPasswordModal({
  staffId,
  staffName,
  onClose,
  onSaved,
  apiPath,
}: StaffPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const issue = (() => {
    if (!password || password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirm) return 'Passwords do not match';
    return null;
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (issue) return;
    setSaving(true);
    try {
      await api.post(apiPath || `/staff/${staffId}/password`, { password });
      toast.success('Password updated');
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-[460px] max-w-[92vw] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Update password</h2>
            <p className="text-xs text-slate-500 mt-0.5">Reset the password for {staffName}.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
              New password
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 pr-16"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold tracking-wide text-slate-500 hover:text-slate-900 px-2 py-1">
                {show ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
              Confirm
            </label>
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Type the password again"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400"
            />
          </div>
          {issue && password.length > 0 && (
            <p className="text-xs text-rose-600 font-medium">{issue}</p>
          )}
          <p className="text-xs text-slate-500">
            Failed-login counter and any lockout will be reset. The staff member can sign in
            with the new password immediately.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-600 hover:text-slate-900 font-medium">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!!issue || saving}
            className="px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm">
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}
