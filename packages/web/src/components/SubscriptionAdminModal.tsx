'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { UP_DISTRICTS } from '@/lib/voterReferenceData';
import SearchableSelect from './SearchableSelect';

/**
 * Super-admin "Add politician" + subscription modal for /subscriptions.
 *
 * Creates a politician account, sets an initial email/password, picks a
 * tier (amount auto-fills from tier — admin can override), an
 * assembly-constituency, optional district, and optionally pre-scopes
 * the politician to a list of booths in their AC.  POSTs to
 * `/api/subscriptions/admin/create` — the server creates the User + the
 * Subscription in one shot, status = active, no Razorpay round-trip.
 */

interface Tier {
  key: 'basic' | 'standard' | 'premium';
  name: string;
  amount: number;
  durationDays: number;
}

interface BoothRow {
  _id: string;
  name: string;
  partNumber: number;
  assemblyConstituency: string;
}

interface ConstituencyRow {
  number: number;
  assemblyConstituency: string;
  district: string;
  reserved?: 'SC' | 'ST';
}

export interface SubscriptionAdminModalProps {
  tiers: Tier[];
  onClose: () => void;
  onCreated: () => void;
}

export default function SubscriptionAdminModal({ tiers, onClose, onCreated }: SubscriptionAdminModalProps) {
  // — Account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [partyAffiliation, setPartyAffiliation] = useState('');

  // — Location
  const [district, setDistrict] = useState('');
  const [constituency, setConstituency] = useState('');

  // — Plan
  const [tierKey, setTierKey] = useState<Tier['key']>(tiers[0]?.key || 'basic');
  const selectedTier = useMemo(() => tiers.find((t) => t.key === tierKey), [tiers, tierKey]);
  const [amount, setAmount] = useState<string>(String(selectedTier?.amount ?? ''));
  const [durationDays, setDurationDays] = useState<string>(String(selectedTier?.durationDays ?? ''));

  // — AC list for the picked district (cascades off district selection)
  const [constituencies, setConstituencies] = useState<ConstituencyRow[]>([]);
  const [constituenciesLoading, setConstituenciesLoading] = useState(false);

  // — Booth scoping (fetched once constituency is set)
  const [booths, setBooths] = useState<BoothRow[]>([]);
  const [boothsLoading, setBoothsLoading] = useState(false);
  const [selectedBoothIds, setSelectedBoothIds] = useState<string[]>([]);
  const [boothSearch, setBoothSearch] = useState('');

  const [saving, setSaving] = useState(false);

  // Esc + scroll lock + tier-default sync
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

  // When tier changes, refresh the suggested amount + duration.
  useEffect(() => {
    if (!selectedTier) return;
    setAmount(String(selectedTier.amount));
    setDurationDays(String(selectedTier.durationDays));
  }, [selectedTier]);

  // Pull the official AC list — filtered by district when one is picked.
  // The hierarchy endpoint already merges the canonical UP_CONSTITUENCIES
  // list with any live booth/voter counts, so we get every seat in the
  // district even before any booths have been imported.
  const fetchConstituencies = useCallback(async (dist: string) => {
    setConstituenciesLoading(true);
    try {
      const res = await api.get('/analytics/hierarchy/constituencies', {
        params: dist ? { district: dist } : undefined,
      });
      const rows: ConstituencyRow[] = (res.data?.data || []).map((r: any) => ({
        number: r.number,
        assemblyConstituency: r.assemblyConstituency,
        district: r.district,
        reserved: r.reserved,
      }));
      setConstituencies(rows);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load constituencies');
      setConstituencies([]);
    } finally {
      setConstituenciesLoading(false);
    }
  }, []);

  // Refetch ACs whenever the picked district changes. We also clear the
  // downstream constituency + booth picks so the form can't end up with a
  // stale selection that doesn't belong to the new district.
  useEffect(() => {
    void fetchConstituencies(district);
    setConstituency('');
    setSelectedBoothIds([]);
    setBooths([]);
  }, [district, fetchConstituencies]);

  const fetchBooths = useCallback(async (ac: string) => {
    if (!ac.trim()) {
      setBooths([]);
      return;
    }
    setBoothsLoading(true);
    try {
      const res = await api.get('/booths', { params: { assemblyConstituency: ac.trim(), limit: 200 } });
      setBooths(res.data.data.booths || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load booths for that AC');
    } finally {
      setBoothsLoading(false);
    }
  }, []);

  // Fetch booths whenever AC changes; clear the booth picks too so we
  // never carry IDs from a different AC over.
  useEffect(() => {
    setSelectedBoothIds([]);
    void fetchBooths(constituency);
  }, [constituency, fetchBooths]);

  const filteredBooths = useMemo(() => {
    const q = boothSearch.trim().toLowerCase();
    if (!q) return booths;
    return booths.filter(
      (b) => b.name.toLowerCase().includes(q) || String(b.partNumber).includes(q),
    );
  }, [booths, boothSearch]);

  function toggleBooth(id: string) {
    setSelectedBoothIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const issue = (() => {
    if (!name.trim()) return 'Name is required';
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Invalid email';
    if (!phone.trim()) return 'Phone is required';
    if (!/^[0-9]{10,15}$/.test(phone.trim())) return 'Phone must be 10–15 digits';
    if (!password || password.length < 6) return 'Password must be at least 6 characters';
    if (!district.trim()) return 'District is required';
    if (!constituency.trim()) return 'Vidhan Sabha (Assembly Constituency) is required';
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return 'Amount must be a positive number';
    const dur = Number(durationDays);
    if (!Number.isFinite(dur) || dur <= 0) return 'Duration must be a positive number';
    return null;
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (issue) return;
    setSaving(true);
    try {
      await api.post('/subscriptions/admin/create', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        partyAffiliation: partyAffiliation.trim() || undefined,
        assemblyConstituency: constituency.trim(),
        district: district.trim() || undefined,
        tier: tierKey,
        amount: Number(amount),
        durationDays: Number(durationDays),
        boothIds: selectedBoothIds,
      });
      toast.success('Politician created and subscription activated');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create politician');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch md:items-center justify-end md:justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full md:w-[800px] md:max-w-[94vw] md:rounded-2xl md:max-h-[90vh] flex flex-col shadow-2xl border-t md:border border-slate-200">
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add politician</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Create an account and activate a subscription in one step. No Razorpay round-trip.
            </p>
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

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Account */}
          <section>
            <h3 className="text-[13px] font-semibold text-slate-900 mb-2.5">Account</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldText label="Full name" value={name} onChange={setName} placeholder="e.g. Aman Verma" />
              <FieldText label="Phone" value={phone} onChange={setPhone} placeholder="10-digit mobile" />
              <FieldText label="Email" value={email} onChange={setEmail} placeholder="name@example.in" type="email" />
              <FieldText label="Party affiliation (optional)" value={partyAffiliation} onChange={setPartyAffiliation} placeholder="BJP / INC / SP …" />
              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold tracking-wide text-slate-500 hover:text-slate-900 px-2 py-1">
                    {showPwd ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Politician will use this email + password to sign in. They can change it later.
                </p>
              </div>
            </div>
          </section>

          {/* Location — district → vidhan sabha (AC) → booths */}
          <section>
            <h3 className="text-[13px] font-semibold text-slate-900 mb-2.5">Location</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Step 1 — district (searchable) */}
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
                  District
                </label>
                <SearchableSelect
                  value={district}
                  ariaLabel="District"
                  placeholder="Select district…"
                  searchPlaceholder="Type a district name…"
                  noMatchLabel="No district matches"
                  options={UP_DISTRICTS.map((d) => ({ value: d, label: d }))}
                  onChange={setDistrict}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Pick a district to load its Vidhan Sabha seats.
                </p>
              </div>

              {/* Step 2 — vidhan sabha (AC, searchable) */}
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
                  Vidhan Sabha (Assembly Constituency)
                </label>
                <SearchableSelect
                  value={constituency}
                  ariaLabel="Vidhan Sabha"
                  disabled={!district || constituenciesLoading}
                  placeholder={
                    !district
                      ? 'Pick a district first'
                      : constituenciesLoading
                      ? 'Loading…'
                      : constituencies.length === 0
                      ? 'No constituencies found'
                      : 'Select Vidhan Sabha…'
                  }
                  searchPlaceholder="Type a seat name or AC number…"
                  noMatchLabel="No seat matches"
                  options={constituencies.map((c) => ({
                    value: c.assemblyConstituency,
                    label: c.assemblyConstituency,
                    prefix: c.number ? `#${c.number}` : undefined,
                    sub: c.reserved ? `(${c.reserved})` : undefined,
                  }))}
                  onChange={setConstituency}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {constituency
                    ? 'Booths in this seat appear below.'
                    : 'Choose a seat to scope booths to this politician.'}
                </p>
              </div>
            </div>
          </section>

          {/* Subscription */}
          <section>
            <h3 className="text-[13px] font-semibold text-slate-900 mb-2.5">Subscription</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
                  Tier
                </label>
                <select
                  value={tierKey}
                  onChange={(e) => setTierKey(e.target.value as Tier['key'])}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400">
                  {tiers.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.name} (₹{t.amount.toLocaleString('en-IN')} · {t.durationDays}d)
                    </option>
                  ))}
                </select>
              </div>
              <FieldText
                label="Amount (₹)"
                value={amount}
                onChange={setAmount}
                placeholder="49000"
                type="number"
              />
              <FieldText
                label="Duration (days)"
                value={durationDays}
                onChange={setDurationDays}
                placeholder="365"
                type="number"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Amount and duration default to the picked tier. Override either to comp / pro-rate.
            </p>
          </section>

          {/* Step 3 — Booths */}
          <section>
            <div className="flex items-baseline justify-between mb-2.5">
              <h3 className="text-[13px] font-semibold text-slate-900">Scope to booths (optional)</h3>
              <span className="text-[11px] text-slate-500">
                {constituency
                  ? `${selectedBoothIds.length} of ${booths.length} selected`
                  : !district
                  ? 'Pick a district first'
                  : 'Pick a Vidhan Sabha first'}
              </span>
            </div>
            {constituency.trim() ? (
              <>
                <input
                  value={boothSearch}
                  onChange={(e) => setBoothSearch(e.target.value)}
                  placeholder="Filter by name or part #"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 mb-2"
                />
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {boothsLoading ? (
                    <div className="px-3 py-4 text-xs text-slate-400">Loading booths…</div>
                  ) : filteredBooths.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-slate-400">
                      No booths match this AC. Either the AC name is misspelled, or you haven&apos;t
                      imported any booths yet.
                    </div>
                  ) : (
                    filteredBooths.map((b) => {
                      const on = selectedBoothIds.includes(b._id);
                      return (
                        <label
                          key={b._id}
                          className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleBooth(b._id)}
                            className="accent-slate-900"
                          />
                          <span className="font-mono text-xs text-slate-500 w-12">
                            #{b.partNumber}
                          </span>
                          <span className="flex-1 text-slate-900 truncate">{b.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Leave empty to scope to the entire AC. Selected booths get stored on the politician
                  account as their preferred set.
                </p>
              </>
            ) : (
              <div className="text-xs text-slate-400 px-3 py-4 border border-dashed border-slate-200 rounded-lg">
                {!district
                  ? 'Pick a district, then a Vidhan Sabha, to load its booths.'
                  : 'Pick a Vidhan Sabha above to load its booths.'}
              </div>
            )}
          </section>

          {issue && (
            <p className="text-xs text-rose-600 font-medium">
              {issue}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
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
            {saving ? 'Creating…' : 'Create & activate'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldText({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 placeholder:text-slate-400"
      />
    </div>
  );
}
