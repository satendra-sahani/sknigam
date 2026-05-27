'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * SearchableSelect — Tailwind combobox.
 *
 * Replaces a native <select> when the option list is long enough that
 * scrolling is painful (e.g. UP's 75 districts or 403 ACs).  The
 * trigger looks like an admin-styled select; clicking it opens a
 * popover with a search input that filters the option list in real
 * time.  Keyboard support: ↑/↓ to move, Enter to pick, Escape to
 * close.  Click outside also closes.
 *
 * Stateless — the parent owns `value` and is told about changes via
 * `onChange`.  Disabled prop short-circuits everything.
 */

export interface SearchableSelectOption {
  /** Value passed to onChange. */
  value: string;
  /** Primary label shown in the list. */
  label: string;
  /** Optional secondary text rendered muted. */
  sub?: string;
  /** Optional prefix (e.g. a mono "#173" code). */
  prefix?: string;
}

export interface SearchableSelectProps {
  value: string;
  options: SearchableSelectOption[];
  placeholder?: string;
  /** Custom text shown in the trigger when value is empty. */
  emptyLabel?: string;
  /** Placeholder for the search box inside the dropdown. */
  searchPlaceholder?: string;
  /** Disable interaction (greys out the trigger). */
  disabled?: boolean;
  /** Message shown when no options match the filter. */
  noMatchLabel?: string;
  /** Optional aria-label for the trigger. */
  ariaLabel?: string;
  onChange: (value: string) => void;
}

export default function SearchableSelect({
  value,
  options,
  placeholder,
  emptyLabel,
  searchPlaceholder = 'Type to search…',
  disabled = false,
  noMatchLabel = 'No matches',
  ariaLabel,
  onChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the currently-selected option for the trigger label.
  const current = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  // Substring filter on label + sub + prefix.  Case-insensitive.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay =
        `${o.prefix || ''} ${o.label} ${o.sub || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  // Reset the highlighted row when the filtered list changes.
  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  // Click outside to close.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Auto-focus the search input when the popover opens.
  useEffect(() => {
    if (open) {
      // Defer so the input is in the DOM.
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
    }
  }, [open]);

  const pick = useCallback(
    (opt: SearchableSelectOption) => {
      onChange(opt.value);
      setOpen(false);
    },
    [onChange],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[activeIdx];
      if (opt) pick(opt);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full text-left px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-2 ${
          open ? 'border-slate-400 ring-2 ring-slate-900/15' : 'border-slate-200'
        } bg-white`}>
        <span className="flex-1 truncate">
          {current ? (
            <span className="flex items-baseline gap-1.5">
              {current.prefix ? (
                <span className="text-slate-500 font-mono text-xs">{current.prefix}</span>
              ) : null}
              <span className="text-slate-900">{current.label}</span>
              {current.sub ? (
                <span className="text-slate-400 text-xs">· {current.sub}</span>
              ) : null}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder || emptyLabel || 'Select…'}</span>
          )}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-2 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 placeholder:text-slate-400"
              />
            </div>
          </div>
          <ul
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
            style={{ scrollbarWidth: 'thin' }}>
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-xs text-slate-400 text-center">
                {noMatchLabel}
              </li>
            ) : (
              filtered.map((opt, i) => {
                const isActive = i === activeIdx;
                const isSelected = opt.value === value;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => pick(opt)}
                    className={`px-3 py-2 cursor-pointer flex items-baseline gap-2 ${
                      isActive ? 'bg-slate-100' : ''
                    } ${isSelected ? 'font-semibold' : ''}`}>
                    {opt.prefix ? (
                      <span className="font-mono text-xs text-slate-500 w-12 flex-shrink-0">
                        {opt.prefix}
                      </span>
                    ) : null}
                    <span className="flex-1 text-sm text-slate-900 truncate">
                      {opt.label}
                    </span>
                    {opt.sub ? (
                      <span className="text-xs text-slate-400 truncate">
                        {opt.sub}
                      </span>
                    ) : null}
                    {isSelected ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-emerald-600 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
