'use client';

import React, { useEffect } from 'react';

/**
 * Reusable filters modal shell — provides the consistent visual chrome
 * (backdrop, slide-in panel, sticky header/footer, body scroll lock,
 * Esc-to-close) so every list page uses the same look.  The actual filter
 * inputs are passed as `children`, and each page owns its own draft state
 * via parent.
 */
export interface FiltersModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  applyCount?: number;
  applyLabel?: string;
  cancelLabel?: string;
  resetLabel?: string;
  children: React.ReactNode;
}

export function FiltersModal({
  open,
  title,
  subtitle,
  onClose,
  onApply,
  onReset,
  applyCount,
  applyLabel = 'Apply',
  cancelLabel = 'Cancel',
  resetLabel = 'Reset all',
  children,
}: FiltersModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end md:items-center md:justify-center bg-slate-900/50 backdrop-blur-sm filters-fade"
      onClick={onClose}>
      <div
        className="bg-white w-full md:w-[760px] md:max-w-[92vw] md:rounded-2xl md:max-h-[90vh] flex flex-col shadow-2xl border-t md:border border-slate-200 filters-slide"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">{children}</div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onReset}
            className="text-sm text-slate-600 hover:text-slate-900 font-medium">
            {resetLabel}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900">
              {cancelLabel}
            </button>
            <button
              onClick={onApply}
              className="px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition shadow-sm">
              {applyLabel}
              {typeof applyCount === 'number' && applyCount > 0 ? ` (${applyCount})` : ''}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes filtersFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes filtersSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .filters-fade { animation: filtersFadeIn 0.18s ease-out; }
        .filters-slide { animation: filtersSlideUp 0.24s cubic-bezier(0.2, 0.7, 0.2, 1); }
      `}</style>
    </div>
  );
}

export default FiltersModal;
