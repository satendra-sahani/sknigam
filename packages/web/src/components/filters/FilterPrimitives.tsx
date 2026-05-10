'use client';

import React from 'react';

/* Filter-modal building blocks — sectioning + labelled inputs.  Pages compose
 * them inside a FiltersModal so every page picks the same typography / spacing
 * / focus rings without re-implementing.
 */

export function FilterSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-2.5">
        <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

export function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
      {children}
    </span>
  );
}

export function FilterInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
    />
  );
}

export function LabeledFilterInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <FilterLabel>{props.label}</FilterLabel>
      <FilterInput {...props} />
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function LabeledFilterSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}) {
  return (
    <div>
      <FilterLabel>{label}</FilterLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A row of pill toggles for a multi-select filter (e.g. grievances). */
export function ChipMulti({
  options,
  selected,
  onToggle,
}: {
  options: SelectOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onToggle(o.value)}
            className={`px-3 py-1.5 text-xs rounded-full border transition font-medium ${
              on
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}>
            {on && (
              <svg
                className="inline-block mr-1"
                width="9"
                height="9"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <path d="M2 5l2 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Min/max numeric range with a "to" separator (used for age ranges, etc). */
export function NumberRange({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder = 'min',
  maxPlaceholder = 'max',
}: {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
}) {
  return (
    <div>
      <FilterLabel>{label}</FilterLabel>
      <div className="flex items-center gap-2">
        <FilterInput value={minValue} onChange={onMinChange} placeholder={minPlaceholder} type="number" />
        <span className="text-xs text-slate-400">to</span>
        <FilterInput value={maxValue} onChange={onMaxChange} placeholder={maxPlaceholder} type="number" />
      </div>
    </div>
  );
}
