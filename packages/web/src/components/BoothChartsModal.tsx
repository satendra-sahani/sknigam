'use client';

import { useState } from 'react';
import BoothCharts from './BoothCharts';
import type { Booth } from '@/app/booths/page';

/**
 * Full-screen drill-down for a single booth's analytics.  Shows every chart
 * the /analytics page has, but $match'd to this booth only.  Date range
 * controls are local to the modal — changing them refetches charts without
 * touching the parent page's filter state.
 */
export default function BoothChartsModal({ booth, onClose }: { booth: Booth; onClose: () => void }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-slate-50 rounded-2xl shadow-modal w-full max-w-6xl max-h-[92vh] flex flex-col">
        <div className="p-5 border-b border-slate-200 bg-white rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              📊 Charts · {booth.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Part {booth.partNumber} · {booth.assemblyConstituency} · {booth.district}
              {' · '}
              <span className="text-slate-700 font-medium">
                {booth.totalVoters.toLocaleString('en-IN')} voters
              </span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">From (visit date)</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">To (visit date)</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900">
              Clear dates
            </button>
          )}
          <div className="ml-auto text-[11px] text-slate-500">
            Date filter applies to <span className="font-semibold">voter visit date</span> (when the voter was canvassed).
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <BoothCharts
            scope={{
              boothId: booth._id,
              dateFrom: dateFrom || undefined,
              dateTo: dateTo || undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
