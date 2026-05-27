'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { UP_DISTRICTS } from '@/lib/voterReferenceData';
import SearchableSelect from './SearchableSelect';

/**
 * Super-admin "Reassign politician scope" modal for /subscriptions.
 *
 * Used to change a politician's AC + assigned booth list AFTER they've
 * been onboarded.  Loads the politician's current user.assignedBoothIds
 * and the subscription's current AC, lets admin pick a new district →
 * Vidhan Sabha → booth set, then PUTs to
 * `/api/subscriptions/:id/reassign`.  Updates both the subscription and
 * the politician's user document in one server-side round trip so the
 * politician's read-side `getPoliticianScope` flips immediately.
 */

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

interface PoliticianRef {
  _id: string;
  name?: string;
  email?: string;
}

export interface SubscriptionReassignModalProps {
  /** Subscription _id being re-scoped. */
  subscriptionId: string;
  /** Politician on this subscription — shown for context, not editable. */
  politician: PoliticianRef;
  /** Current AC on the subscription — used as the pre-selection. */
  currentConstituency: string;
  /** Current district on the politician's user doc, if known. */
  currentDistrict?: string;
  /**
   * Politician's existing `assignedBoothIds`.  Supplied by the calling
   * page (it already populates this on the subscription row) so the
   * modal can pre-tick checkboxes without an extra request.
   */
  currentBoothIds?: string[];
  onClose: () => void;
  onSaved: () => void;
}

export default function SubscriptionReassignModal({
  subscriptionId,
  politician,
  currentConstituency,
  currentDistrict,
  currentBoothIds,
  onClose,
  onSaved,
}: SubscriptionReassignModalProps) {
  // — Location (pre-filled from current scope so the modal opens
  //   showing exactly what the politician sees today).
  const [district, setDistrict] = useState<string>(currentDistrict || '');
  const [constituency, setConstituency] = useState<string>(currentConstituency || '');

  // — AC list (cascades off district)
  const [constituencies, setConstituencies] = useState<ConstituencyRow[]>([]);
  const [constituenciesLoading, setConstituenciesLoading] = useState(false);

  // — Booths in selected AC + the politician's current assigned set
  //   (so checkboxes start in the right state).  Pre-tick whatever
  //   the caller passed in — usually direct from the populated
  //   subscriptions response, so no extra round-trip is needed.
  const [booths, setBooths] = useState<BoothRow[]>([]);
  const [boothsLoading, setBoothsLoading] = useState(false);
  const [selectedBoothIds, setSelectedBoothIds] = useState<string[]>(
    Array.isArray(currentBoothIds) ? currentBoothIds.map(String) : [],
  );
  const [boothSearch, setBoothSearch] = useState('');

  const [saving, setSaving] = useState(false);

  // Esc + scroll lock
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

  // AC list comes from the hierarchy endpoint scoped to the picked
  // district.  Empty district → all UP constituencies.
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

  // Refetch ACs whenever district changes.  Do NOT auto-clear the
  // constituency if it's still in the new list (e.g. district hadn't
  // changed yet, modal just opened).
  useEffect(() => {
    void fetchConstituencies(district);
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

  // Refetch booths when the chosen AC changes.  We deliberately do
  // NOT clear `selectedBoothIds` here when the booth list refreshes
  // for the SAME AC (e.g. on modal open) so the politician's existing
  // selection stays checked.  When the admin actually changes the AC,
  // the next effect handles wiping the stale selection.
  useEffect(() => {
    void fetchBooths(constituency);
  }, [constituency, fetchBooths]);

  // Wipe the booth selection only when the admin moves to a DIFFERENT
  // AC from the one the subscription currently uses.  This prevents
  // carrying booth IDs that don't belong to the new AC.
  useEffect(() => {
    if (constituency && constituency !== currentConstituency) {
      setSelectedBoothIds([]);
    }
  }, [constituency, currentConstituency]);

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

  function selectAll() {
    setSelectedBoothIds(filteredBooths.map((b) => b._id));
  }
  function clearAll() {
    setSelectedBoothIds([]);
  }

  const issue = (() => {
    if (!district.trim()) return 'District is required';
    if (!constituency.trim()) return 'Vidhan Sabha is required';
    return null;
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (issue) return;
    setSaving(true);
    try {
      await api.put(`/subscriptions/${subscriptionId}/reassign`, {
        assemblyConstituency: constituency.trim(),
        district: district.trim() || undefined,
        boothIds: selectedBoothIds,
      });
      toast.success(
        selectedBoothIds.length > 0
          ? `Reassigned to ${selectedBoothIds.length} booth${selectedBoothIds.length === 1 ? '' : 's'} in ${constituency}`
          : `Reassigned · AC-wide in ${constituency}`,
      );
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Reassign failed');
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
        className="bg-white w-full md:w-[760px] md:max-w-[94vw] md:rounded-2xl md:max-h-[90vh] flex flex-col shadow-2xl border-t md:border border-slate-200">
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Reassign politician scope</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {politician.name ? (
                <>
                  <span className="font-medium text-slate-700">{politician.name}</span>
                  {politician.email ? ` · ${politician.email}` : ''}
                </>
              ) : (
                'Update AC and booth list'
              )}
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
          {/* Current scope banner */}
          <section className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Current scope</p>
            <p className="text-sm text-slate-900 mt-1">
              {currentConstituency || '—'}
              {currentDistrict ? ` · ${currentDistrict}` : ''}
              <span className="text-slate-500 ml-2">
                ·{' '}
                {selectedBoothIds.length > 0
                  ? `${selectedBoothIds.length} booth${selectedBoothIds.length === 1 ? '' : 's'} pinned`
                  : 'AC-wide (no explicit booths)'}
              </span>
            </p>
          </section>

          {/* Location cascade */}
          <section>
            <h3 className="text-[13px] font-semibold text-slate-900 mb-2.5">Move to</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
                  Vidhan Sabha
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
              </div>
            </div>
          </section>

          {/* Booth scoping */}
          <section>
            <div className="flex items-baseline justify-between mb-2.5">
              <h3 className="text-[13px] font-semibold text-slate-900">Scope to booths</h3>
              <div className="text-[11px] text-slate-500 flex items-center gap-3">
                <span>
                  {constituency
                    ? `${selectedBoothIds.length} of ${booths.length} selected`
                    : 'Pick a Vidhan Sabha first'}
                </span>
                {constituency && booths.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-slate-700 hover:text-slate-900 font-semibold">
                      All
                    </button>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-slate-700 hover:text-slate-900 font-semibold">
                      None
                    </button>
                  </>
                ) : null}
              </div>
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
                      No booths match this AC.
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
                  Leave empty to scope the politician to the entire AC. Otherwise their reads
                  are filtered to exactly the booths you tick here.
                </p>
              </>
            ) : (
              <div className="text-xs text-slate-400 px-3 py-4 border border-dashed border-slate-200 rounded-lg">
                Pick a Vidhan Sabha above to load its booths.
              </div>
            )}
          </section>

          {issue && (
            <p className="text-xs text-rose-600 font-medium">{issue}</p>
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
            {saving ? 'Saving…' : 'Save reassignment'}
          </button>
        </div>
      </form>
    </div>
  );
}
