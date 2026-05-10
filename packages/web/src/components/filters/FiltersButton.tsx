'use client';

import React from 'react';

/** Standard "Filters" trigger pill with active-count badge. */
export function FiltersButton({
  onClick,
  count,
  label = 'Filters',
}: {
  onClick: () => void;
  count: number;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 transition shadow-sm">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M2.5 4h11M4.5 8h7M6.5 12h3" />
      </svg>
      {label}
      {count > 0 && (
        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-900 text-white font-semibold">
          {count}
        </span>
      )}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Active filter chips row                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

export interface ActiveChip<K extends string> {
  key: K;
  label: string;
}

export function ActiveChips<K extends string>({
  chips,
  onRemove,
  onClearAll,
}: {
  chips: ActiveChip<K>[];
  onRemove: (chip: ActiveChip<K>) => void;
  onClearAll: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip, i) => (
        <span
          key={`${chip.key}-${i}`}
          className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-slate-900 text-white shadow-sm">
          {chip.label}
          <button
            aria-label={`Remove ${chip.label}`}
            onClick={() => onRemove(chip)}
            className="ml-0.5 w-4 h-4 inline-flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 2l4 4M6 2L2 6" />
            </svg>
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="ml-1 text-xs text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline">
        Clear all
      </button>
    </div>
  );
}
