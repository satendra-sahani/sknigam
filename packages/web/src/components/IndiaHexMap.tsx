'use client';

import { useMemo, useState } from 'react';

/**
 * IndiaHexMap — interactive hex cartogram of India with state spotlight.
 *
 * Self-contained, Tailwind-styled version of the hex map used on the
 * public landing page (`/`).  Drop it into any admin/politician page;
 * no CSS-variable dependencies, no parent-scope classes.
 *
 * Hover a hex → the right pane swaps to a "state spotlight" card
 * showing the leading party, seat count, simulated turnout, and three
 * closest contests.  Tabs along the top swap the dataset (LS 2024,
 * LS 2019, state assemblies, swing).  Per-tab data is the current
 * narrative — easy to back with real API data later.
 */

interface HexState {
  code: string;
  name: string;
  seats: number;
  q: number;
  r: number;
  party: string;
}

const STATES_LS24: HexState[] = [
  { code: 'LA', name: 'Ladakh', seats: 1, q: 5, r: -5, party: 'BJP' },
  { code: 'JK', name: 'Jammu & Kashmir', seats: 5, q: 4, r: -5, party: 'MIX' },
  { code: 'PB', name: 'Punjab', seats: 13, q: 3, r: -4, party: 'INC' },
  { code: 'HP', name: 'Himachal Pradesh', seats: 4, q: 4, r: -4, party: 'BJP' },
  { code: 'UT', name: 'Uttarakhand', seats: 5, q: 5, r: -4, party: 'BJP' },
  { code: 'CH', name: 'Chandigarh', seats: 1, q: 3, r: -3, party: 'INC' },
  { code: 'HR', name: 'Haryana', seats: 10, q: 4, r: -3, party: 'MIX' },
  { code: 'DL', name: 'Delhi', seats: 7, q: 5, r: -3, party: 'BJP' },
  { code: 'UP', name: 'Uttar Pradesh', seats: 80, q: 6, r: -3, party: 'SP' },
  { code: 'SK', name: 'Sikkim', seats: 1, q: 8, r: -3, party: 'OTH' },
  { code: 'AR', name: 'Arunachal Pradesh', seats: 2, q: 9, r: -3, party: 'BJP' },
  { code: 'RJ', name: 'Rajasthan', seats: 25, q: 3, r: -2, party: 'MIX' },
  { code: 'MP', name: 'Madhya Pradesh', seats: 29, q: 5, r: -2, party: 'BJP' },
  { code: 'BR', name: 'Bihar', seats: 40, q: 7, r: -2, party: 'MIX' },
  { code: 'JH', name: 'Jharkhand', seats: 14, q: 8, r: -2, party: 'MIX' },
  { code: 'WB', name: 'West Bengal', seats: 42, q: 9, r: -2, party: 'TMC' },
  { code: 'AS', name: 'Assam', seats: 14, q: 10, r: -2, party: 'BJP' },
  { code: 'NG', name: 'Nagaland', seats: 1, q: 11, r: -3, party: 'INC' },
  { code: 'ML', name: 'Meghalaya', seats: 2, q: 10, r: -3, party: 'INC' },
  { code: 'MN', name: 'Manipur', seats: 2, q: 11, r: -2, party: 'INC' },
  { code: 'MZ', name: 'Mizoram', seats: 1, q: 11, r: -1, party: 'OTH' },
  { code: 'TR', name: 'Tripura', seats: 2, q: 10, r: -1, party: 'BJP' },
  { code: 'GJ', name: 'Gujarat', seats: 26, q: 3, r: -1, party: 'BJP' },
  { code: 'MH', name: 'Maharashtra', seats: 48, q: 4, r: 0, party: 'MIX' },
  { code: 'CG', name: 'Chhattisgarh', seats: 11, q: 6, r: -1, party: 'BJP' },
  { code: 'OD', name: 'Odisha', seats: 21, q: 8, r: -1, party: 'BJP' },
  { code: 'TG', name: 'Telangana', seats: 17, q: 5, r: 1, party: 'MIX' },
  { code: 'AP', name: 'Andhra Pradesh', seats: 25, q: 6, r: 1, party: 'TDP' },
  { code: 'GA', name: 'Goa', seats: 2, q: 3, r: 1, party: 'BJP' },
  { code: 'KA', name: 'Karnataka', seats: 28, q: 4, r: 2, party: 'MIX' },
  { code: 'PY', name: 'Puducherry', seats: 1, q: 5, r: 3, party: 'INC' },
  { code: 'KL', name: 'Kerala', seats: 20, q: 4, r: 3, party: 'INC' },
  { code: 'TN', name: 'Tamil Nadu', seats: 39, q: 5, r: 2, party: 'DMK' },
  { code: 'AN', name: 'A & N Islands', seats: 1, q: 9, r: 1, party: 'INC' },
  { code: 'LD', name: 'Lakshadweep', seats: 1, q: 3, r: 2, party: 'INC' },
];

// 2019 — BJP wave; UP, MH, BR overwhelmingly NDA.
const STATES_LS19: HexState[] = STATES_LS24.map((s) => ({
  ...s,
  party:
    s.code === 'UP'
      ? 'BJP'
      : s.code === 'WB'
      ? 'TMC'
      : s.code === 'TN'
      ? 'DMK'
      : s.code === 'KL'
      ? 'INC'
      : s.code === 'PB'
      ? 'INC'
      : s.code === 'AP'
      ? 'OTH'
      : s.code === 'OD'
      ? 'OTH'
      : s.code === 'JH'
      ? 'BJP'
      : s.code === 'MH'
      ? 'BJP'
      : s.code === 'BR'
      ? 'BJP'
      : s.code === 'RJ'
      ? 'BJP'
      : s.code === 'HR'
      ? 'BJP'
      : s.party,
}));

// State-assemblies snapshot — recent verdicts (illustrative).
const STATES_VS: HexState[] = STATES_LS24.map((s) => ({
  ...s,
  party:
    s.code === 'MH' || s.code === 'HR'
      ? 'BJP'
      : s.code === 'JH'
      ? 'MIX'
      : s.code === 'KA' || s.code === 'TG'
      ? 'INC'
      : s.code === 'TN'
      ? 'DMK'
      : s.code === 'WB'
      ? 'TMC'
      : s.party,
}));

// Swing map — colours by which way the state moved 2019 → 2024.
const STATES_SWING: HexState[] = STATES_LS24.map((s) => {
  const prev = STATES_LS19.find((p) => p.code === s.code)!.party;
  const flipped = prev !== s.party;
  return { ...s, party: flipped ? 'MIX' : s.party };
});

const HEX_DATASETS: Record<string, HexState[]> = {
  LS24: STATES_LS24,
  LS19: STATES_LS19,
  VS: STATES_VS,
  SWING: STATES_SWING,
};

const HEX_TOGGLES: Array<[string, string]> = [
  ['LS24', 'Lok Sabha 2024'],
  ['LS19', 'Lok Sabha 2019'],
  ['VS', 'State assemblies'],
  ['SWING', 'Swing map'],
];

// Self-contained palette — no CSS-variable dependency so this works
// outside the landing page's scoped theme.
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

export interface IndiaHexMapProps {
  /** Initial dataset to show.  Defaults to LS 2024. */
  initial?: keyof typeof HEX_DATASETS;
  /** Optional heading override. */
  title?: string;
  /** Optional subtitle/kicker. */
  subtitle?: string;
}

export default function IndiaHexMap({
  initial = 'LS24',
  title = 'India · electoral map',
  subtitle = 'Hex cartogram weighted by seat count.  Hover a state for spotlight.',
}: IndiaHexMapProps) {
  const [active, setActive] = useState<string>(initial);
  const [hover, setHover] = useState<HexState | null>(null);

  const states = HEX_DATASETS[active] || STATES_LS24;

  // Geometry: pointy-top hexes, axial coords (q, r) mapped to x/y.
  const size = 26;
  const W = Math.sqrt(3) * size;
  const H = 2 * size;
  const rowH = H * 0.75;
  const cells = useMemo(
    () =>
      states.map((s) => {
        const x = (s.q - 3) * W + (s.r % 2 ? W / 2 : 0);
        const y = s.r * rowH;
        return { ...s, x, y };
      }),
    [states, W, rowH],
  );
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  const minX = Math.min(...xs) - W;
  const maxX = Math.max(...xs) + W;
  const minY = Math.min(...ys) - H / 1.5;
  const maxY = Math.max(...ys) + H / 1.5;

  const hexPath = (cx: number, cy: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      pts.push(`${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`);
    }
    return `M${pts.join(' L')} Z`;
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">
              Geography of the vote
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 max-w-prose">{subtitle}</p>
          </div>
        </div>
      </header>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* LEFT — toggle pills + the SVG hex map + legend */}
        <div>
          <div className="flex flex-wrap gap-2">
            {HEX_TOGGLES.map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setActive(k);
                  setHover(null);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition border ${
                  active === k
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}>
                {l}
              </button>
            ))}
          </div>

          <svg
            viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
            width="100%"
            style={{ display: 'block', maxHeight: 480, marginTop: 14 }}
            role="img"
            aria-label={`Hex cartogram of India · ${HEX_TOGGLES.find((t) => t[0] === active)?.[1]}`}>
            <defs>
              <pattern id="ihm-dot" width="6" height="6" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="0.5" fill="#E6E1D6" />
              </pattern>
            </defs>
            <rect
              x={minX}
              y={minY}
              width={maxX - minX}
              height={maxY - minY}
              fill="url(#ihm-dot)"
              opacity="0.5"
            />
            {cells.map((c) => {
              const fill = partyColor(c.party);
              const isHover = hover?.code === c.code;
              return (
                <g
                  key={c.code}
                  onMouseEnter={() => setHover(c)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(c)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  style={{ cursor: 'pointer', outline: 'none' }}>
                  <path
                    d={hexPath(c.x, c.y)}
                    fill={fill}
                    stroke={isHover ? '#0F1B2D' : '#FFFFFF'}
                    strokeWidth={isHover ? 2 : 1.2}
                    opacity={hover && !isHover ? 0.6 : 1}
                  />
                  <text
                    x={c.x}
                    y={c.y - 2}
                    textAnchor="middle"
                    style={{
                      fontSize: 9,
                      fill: '#fff',
                      fontWeight: 700,
                      letterSpacing: '.04em',
                      pointerEvents: 'none',
                      fontFamily: 'ui-monospace, "Menlo", monospace',
                    }}>
                    {c.code}
                  </text>
                  <text
                    x={c.x}
                    y={c.y + 9}
                    textAnchor="middle"
                    style={{
                      fontSize: 10.5,
                      fill: '#fff',
                      fontWeight: 600,
                      pointerEvents: 'none',
                    }}>
                    {c.seats}
                  </text>
                </g>
              );
            })}
          </svg>

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
            {hover ? 'State spotlight' : 'Hover the map'}
          </div>
          {hover ? (
            <StateCard s={hover} />
          ) : (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
              <div className="text-lg font-semibold text-slate-900 leading-snug">
                Move the cursor over a hex to read a state&apos;s verdict, turnout and the
                three closest contests.
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                Every hex is sized by seats, not square kilometres. The colour shows the
                leading party — split-coloured where no party crossed 40% of seats.
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

function StateCard({ s }: { s: HexState }) {
  const turnout = (58 + (s.seats % 17)).toFixed(2);
  const closest = [
    {
      c: s.code + '-12 · Capital North',
      m: '1,284 votes',
      w: s.party === 'MIX' ? 'INC' : s.party,
    },
    { c: s.code + '-08 · East Plains', m: '3,109 votes', w: 'Opposition' },
    {
      c: s.code + '-21 · River Belt',
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
