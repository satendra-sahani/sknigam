'use client';

import { useMemo, useState } from 'react';
import { INDIA_GEO_STATES, INDIA_GEO_VIEWBOX, IndiaGeoState } from './indiaGeo';

/**
 * IndiaGeoMap — REAL geographical India map (not a hex cartogram).
 *
 * Renders each of the 28 states + 8 UTs as a proper SVG polygon from
 * real OpenStreetMap coastline data (via Highcharts' India GeoJSON),
 * re-projected into an 800×900 viewport.  Same hover-spotlight UX as
 * the hex map: cursor on a state fills it with its leading-party
 * colour, dims the rest, and swaps the right pane to a State Spotlight
 * card with leading party, seats, simulated turnout, and three closest
 * contests.
 *
 * Self-contained — no CSS-variable / theme dependency.  Drops in
 * anywhere.
 */

interface StateSpec {
  code: string;
  name: string;
  seats: number;
  party: string;
}

// Verdict / seat data keyed by the same 2-letter codes the hex map
// uses.  When the hover spotlight cares about more than the polygon
// shape, it reaches in here.
const STATE_DATA_LS24: Record<string, StateSpec> = {
  JK: { code: 'JK', name: 'Jammu & Kashmir', seats: 5, party: 'MIX' },
  LA: { code: 'LA', name: 'Ladakh', seats: 1, party: 'BJP' },
  HP: { code: 'HP', name: 'Himachal Pradesh', seats: 4, party: 'BJP' },
  PB: { code: 'PB', name: 'Punjab', seats: 13, party: 'INC' },
  UT: { code: 'UT', name: 'Uttarakhand', seats: 5, party: 'BJP' },
  CH: { code: 'CH', name: 'Chandigarh', seats: 1, party: 'INC' },
  HR: { code: 'HR', name: 'Haryana', seats: 10, party: 'MIX' },
  DL: { code: 'DL', name: 'Delhi', seats: 7, party: 'BJP' },
  UP: { code: 'UP', name: 'Uttar Pradesh', seats: 80, party: 'SP' },
  RJ: { code: 'RJ', name: 'Rajasthan', seats: 25, party: 'MIX' },
  MP: { code: 'MP', name: 'Madhya Pradesh', seats: 29, party: 'BJP' },
  GJ: { code: 'GJ', name: 'Gujarat', seats: 26, party: 'BJP' },
  MH: { code: 'MH', name: 'Maharashtra', seats: 48, party: 'MIX' },
  GA: { code: 'GA', name: 'Goa', seats: 2, party: 'BJP' },
  DH: { code: 'DH', name: 'Dadra & N. Haveli', seats: 2, party: 'BJP' },
  BR: { code: 'BR', name: 'Bihar', seats: 40, party: 'MIX' },
  JH: { code: 'JH', name: 'Jharkhand', seats: 14, party: 'MIX' },
  WB: { code: 'WB', name: 'West Bengal', seats: 42, party: 'TMC' },
  CG: { code: 'CG', name: 'Chhattisgarh', seats: 11, party: 'BJP' },
  OD: { code: 'OD', name: 'Odisha', seats: 21, party: 'BJP' },
  SK: { code: 'SK', name: 'Sikkim', seats: 1, party: 'OTH' },
  AS: { code: 'AS', name: 'Assam', seats: 14, party: 'BJP' },
  AR: { code: 'AR', name: 'Arunachal Pradesh', seats: 2, party: 'BJP' },
  ML: { code: 'ML', name: 'Meghalaya', seats: 2, party: 'INC' },
  MN: { code: 'MN', name: 'Manipur', seats: 2, party: 'INC' },
  MZ: { code: 'MZ', name: 'Mizoram', seats: 1, party: 'OTH' },
  NG: { code: 'NG', name: 'Nagaland', seats: 1, party: 'INC' },
  TR: { code: 'TR', name: 'Tripura', seats: 2, party: 'BJP' },
  TG: { code: 'TG', name: 'Telangana', seats: 17, party: 'MIX' },
  AP: { code: 'AP', name: 'Andhra Pradesh', seats: 25, party: 'TDP' },
  KA: { code: 'KA', name: 'Karnataka', seats: 28, party: 'MIX' },
  KL: { code: 'KL', name: 'Kerala', seats: 20, party: 'INC' },
  TN: { code: 'TN', name: 'Tamil Nadu', seats: 39, party: 'DMK' },
  PY: { code: 'PY', name: 'Puducherry', seats: 1, party: 'INC' },
  AN: { code: 'AN', name: 'A & N Islands', seats: 1, party: 'INC' },
  LD: { code: 'LD', name: 'Lakshadweep', seats: 1, party: 'INC' },
};

const PARTY_COLORS: Record<string, string> = {
  BJP: '#E8731C',
  INC: '#1B66C9',
  SP: '#C8232C',
  TMC: '#1D8A5B',
  DMK: '#1A1A1A',
  TDP: '#E7B32A',
  MIX: '#B8331F',
  OTH: '#6B7383',
};

const partyColor = (p: string) => PARTY_COLORS[p] || PARTY_COLORS.OTH;

const LEGEND: Array<[string, string]> = [
  ['BJP', 'BJP'],
  ['INC', 'Congress'],
  ['SP', 'SP'],
  ['TMC', 'TMC'],
  ['DMK', 'DMK'],
  ['TDP', 'TDP'],
  ['MIX', 'Split / Coalition'],
  ['OTH', 'Regional / Other'],
];

const NATIONAL_STATS: Array<[string, string]> = [
  ['States polled', '28 + 8 UTs'],
  ['Constituencies', '543'],
  ['Voters', '64.2 cr'],
  ['Turnout', '65.79 %'],
  ['Women voters', '31.2 cr'],
  ['NOTA', '0.99 %'],
];

export interface IndiaGeoMapProps {
  title?: string;
  subtitle?: string;
}

export default function IndiaGeoMap({
  title = 'India · geographical map',
  subtitle = 'Hover any state for the spotlight — leading party, seats, turnout and three closest contests.',
}: IndiaGeoMapProps) {
  const [hover, setHover] = useState<IndiaGeoState | null>(null);

  const hoveredSpec = hover ? STATE_DATA_LS24[hover.code] : null;

  // Render order: large states first so smaller ones (UTs, NE states)
  // sit on top in the unlikely case of overlap.
  const ordered = useMemo(() => {
    return [...INDIA_GEO_STATES].sort((a, b) => b.d.length - a.d.length);
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="px-6 py-5 border-b border-slate-100">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">
          Geography of the vote
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500 max-w-prose">{subtitle}</p>
      </header>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* LEFT — the SVG map + legend */}
        <div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <svg
              viewBox={INDIA_GEO_VIEWBOX}
              width="100%"
              role="img"
              aria-label="Map of India coloured by leading party in each state"
              style={{ display: 'block', maxHeight: 560 }}>
              {/* Dot backdrop, same texture as the hex card */}
              <defs>
                <pattern id="igm-dot" width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="4" cy="4" r="0.6" fill="#E6E1D6" />
                </pattern>
              </defs>
              <rect width="800" height="900" fill="url(#igm-dot)" opacity="0.45" />

              {ordered.map((s) => {
                const spec = STATE_DATA_LS24[s.code];
                const fill = spec ? partyColor(spec.party) : '#CBD5E1';
                const isHover = hover?.code === s.code;
                return (
                  <path
                    key={s.code}
                    d={s.d}
                    fill={fill}
                    stroke={isHover ? '#0F1B2D' : '#FFFFFF'}
                    strokeWidth={isHover ? 1.6 : 0.6}
                    opacity={hover && !isHover ? 0.55 : 1}
                    style={{ cursor: 'pointer', transition: 'opacity 120ms ease, stroke-width 120ms ease' }}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(s)}
                    onBlur={() => setHover(null)}
                    tabIndex={0}
                  >
                    <title>{s.name}</title>
                  </path>
                );
              })}
            </svg>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
            {LEGEND.map(([k, l]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ background: partyColor(k) }}
                />
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT — state spotlight + national stats */}
        <div className="flex flex-col gap-4">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-rose-600">
            {hoveredSpec ? 'State spotlight' : 'Hover the map'}
          </div>
          {hoveredSpec ? (
            <StateCard s={hoveredSpec} />
          ) : (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
              <div className="text-lg font-semibold text-slate-900 leading-snug">
                Move the cursor over a state to read its verdict, turnout and the three
                closest contests.
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                Coastlines and state boundaries are from OpenStreetMap (via Highcharts).
                Each state is filled with its leading-party colour; the colour fades the
                rest while you focus on one.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {NATIONAL_STATS.map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  {k}
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900 tabular-nums">
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StateCard({ s }: { s: StateSpec }) {
  const turnout = (58 + (s.seats % 17)).toFixed(2);
  const closest = [
    {
      c: `${s.code}-12 · Capital North`,
      m: '1,284 votes',
      w: s.party === 'MIX' ? 'INC' : s.party,
    },
    { c: `${s.code}-08 · East Plains`, m: '3,109 votes', w: 'Opposition' },
    {
      c: `${s.code}-21 · River Belt`,
      m: '5,402 votes',
      w: s.party === 'MIX' ? 'BJP' : s.party,
    },
  ];
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold text-slate-900">{s.name}</div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          STATE · {s.code}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {[
          ['Seats', String(s.seats), '#0F1B2D'],
          ['Leading', s.party, partyColor(s.party)],
          ['Turnout', `${turnout}%`, '#0F1B2D'],
        ].map(([k, v, c]) => (
          <div key={k}>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              {k}
            </div>
            <div
              className="mt-1 text-lg font-semibold tabular-nums"
              style={{ color: c }}>
              {v}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-[10px] font-mono uppercase tracking-wider text-slate-500">
        Closest contests
      </div>
      <div className="mt-2 divide-y divide-slate-100 border-t border-slate-100">
        {closest.map((c, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between py-2 text-sm text-slate-700">
            <span>{c.c}</span>
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-xs tabular-nums text-slate-400">{c.m}</span>
              <span className="font-semibold text-slate-900">{c.w}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
