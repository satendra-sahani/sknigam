'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Props {
  onClose: () => void;
  onSaved: () => void;
  /** When set, the booth is pre-selected and the booth picker is hidden —
   *  used by the /explore page's per-row "Assign" button so the admin
   *  doesn't have to re-find the booth they just clicked. */
  defaultBoothId?: string;
  /** Human-readable label shown in place of the hidden booth dropdown
   *  (e.g. "Part 42 · Primary School, Deoria").  Pure display — the real
   *  targeting value is `defaultBoothId`. */
  defaultBoothLabel?: string;
}

interface StaffOption {
  _id: string;
  name: string;
  phone: string;
  assemblyConstituency?: string;
}

interface BoothOption {
  _id: string;
  name: string;
  partNumber: number;
  assemblyConstituency: string;
  totalVoters: number;
}

export default function AssignmentFormModal({
  onClose,
  onSaved,
  defaultBoothId,
  defaultBoothLabel,
}: Props) {
  const [staffId, setStaffId] = useState('');
  const [boothId, setBoothId] = useState(defaultBoothId ?? '');
  const boothPreselected = Boolean(defaultBoothId);
  const [serialFrom, setSerialFrom] = useState('');
  const [serialTo, setSerialTo] = useState('');
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [boothList, setBoothList] = useState<BoothOption[]>([]);
  const [boothSearch, setBoothSearch] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Skip the /booths fetch when a booth is preselected — the full
        // list isn't needed for rendering and shaves ~50–500 KB off the
        // modal open on large constituencies.
        const [staffRes, boothRes] = await Promise.all([
          api.get('/staff', { params: { limit: 200, isActive: 'true' } }),
          boothPreselected
            ? Promise.resolve(null)
            : api.get('/booths', { params: { limit: 200 } }),
        ]);
        setStaffList(staffRes.data.data.staff);
        if (boothRes) setBoothList(boothRes.data.data.booths);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to load options');
      } finally {
        setLoadingOptions(false);
      }
    })();
  }, [boothPreselected]);

  const filteredBooths = boothSearch
    ? boothList.filter((b) => {
        const q = boothSearch.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          String(b.partNumber).includes(q) ||
          b.assemblyConstituency.toLowerCase().includes(q)
        );
      })
    : boothList;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffId || !boothId) {
      toast.error('Staff and booth are required');
      return;
    }
    const from = serialFrom ? parseInt(serialFrom, 10) : undefined;
    const to = serialTo ? parseInt(serialTo, 10) : undefined;
    if (from !== undefined && to !== undefined && from > to) {
      toast.error('Serial range start must be ≤ end');
      return;
    }
    setSaving(true);
    try {
      await api.post('/voter-assignments', {
        staffId,
        boothId,
        voterSerialFrom: from,
        voterSerialTo: to,
      });
      toast.success('Assignment created');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-modal w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">New Assignment</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {loadingOptions ? (
            <p className="text-sm text-slate-500">Loading staff and booths…</p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Staff *</label>
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                >
                  <option value="">— Select staff —</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} · {s.phone}
                      {s.assemblyConstituency ? ` · ${s.assemblyConstituency}` : ''}
                    </option>
                  ))}
                </select>
                {staffList.length === 0 && (
                  <p className="mt-1 text-xs text-slate-400">No active staff — create one first.</p>
                )}
              </div>

              {boothPreselected ? (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Booth</label>
                  <div className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    {defaultBoothLabel || 'Selected booth'}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Pre-selected from the list — close this dialog and pick a different row to change the booth.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Filter Booths</label>
                    <input
                      value={boothSearch}
                      onChange={(e) => setBoothSearch(e.target.value)}
                      placeholder="Search by name, part number or constituency"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Booth *</label>
                    <select
                      value={boothId}
                      onChange={(e) => setBoothId(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    >
                      <option value="">— Select booth —</option>
                      {filteredBooths.map((b) => (
                        <option key={b._id} value={b._id}>
                          Part {b.partNumber} · {b.name} · {b.assemblyConstituency} ({b.totalVoters.toLocaleString('en-IN')} voters)
                        </option>
                      ))}
                    </select>
                    {boothList.length === 0 && (
                      <p className="mt-1 text-xs text-slate-400">No booths — create one first.</p>
                    )}
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Serial From</label>
                  <input
                    type="number"
                    min={1}
                    value={serialFrom}
                    onChange={(e) => setSerialFrom(e.target.value)}
                    placeholder="optional"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Serial To</label>
                  <input
                    type="number"
                    min={1}
                    value={serialTo}
                    onChange={(e) => setSerialTo(e.target.value)}
                    placeholder="optional"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Leave serial range empty to assign the full booth.
              </p>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || loadingOptions}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition"
          >
            {saving ? 'Saving…' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
}
