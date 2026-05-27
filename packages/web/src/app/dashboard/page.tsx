'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

/**
 * POLLSTICS · Insight — light-theme home.
 *
 *   Greeting + name + role chip
 *   ──────────────────────────
 *   [ Voters ] [ Verified ] [ Pending ] [ Booths ]
 *   ──────────────────────────
 *   Outreach progress card (full width)
 *   ──────────────────────────
 *   Caste distribution donut · Voting intention donut · Top grievances bar
 *   ──────────────────────────
 *   Alerts (only when there's a real signal)
 *   Quick actions (still discoverable but small)
 *
 * Every value is pulled from the same /analytics endpoints the existing
 * dashboard used — no backend changes.
 */

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  staff: 'Field Staff',
  politician: 'Politician',
};

interface Overview {
  totalVoters: number;
  verified: number;
  unverified: number;
  verificationRate: number;
  totalBooths: number;
  activeAssignments: number;
}

interface Bucket {
  key: string;
  count: number;
}

const DONUT_PALETTE = ['#1F3A8A', '#B7873A', '#1F7A4E', '#205B9C', '#C6850D', '#7A5818', '#4F5867', '#0F1B2D'];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [castes, setCastes] = useState<Bucket[]>([]);
  const [intentions, setIntentions] = useState<Bucket[]>([]);
  const [grievances, setGrievances] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);

  // Defence-in-depth: politicians have their own surface at /politician.
  // The sidebar wouldn't link them here, but if one ever lands on /dashboard
  // via a bookmark or hand-typed URL, bounce them to the Insight surface.
  useEffect(() => {
    if (user && user.role === 'politician') {
      router.replace('/politician');
    }
  }, [user, router]);

  useEffect(() => {
    (async () => {
      try {
        const [ov, c, vi, g] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/caste'),
          api.get('/analytics/voting-intention'),
          api.get('/analytics/grievances'),
        ]);
        setOverview(ov.data.data);
        setCastes(c.data.data);
        setIntentions(vi.data.data);
        setGrievances(g.data.data);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to load overview');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return { en: 'Good morning', hi: 'सुप्रभात' };
    if (h < 17) return { en: 'Good afternoon', hi: 'नमस्कार' };
    return { en: 'Good evening', hi: 'शुभ संध्या' };
  }, []);

  const seatCode = useMemo(() => {
    if (!user) return '';
    const parts = [user.assemblyConstituency, user.district].filter(Boolean) as string[];
    return parts.join(' · ').toUpperCase();
  }, [user]);

  const pct = overview?.verificationRate ?? 0;
  const pending = overview?.unverified ?? 0;
  const verified = overview?.verified ?? 0;
  const total = overview?.totalVoters ?? 0;

  // Synthesise alerts from real numbers so it never looks like fluff.
  const alerts: Array<{ tone: 'danger' | 'warning' | 'success' | 'info'; kicker: string; en: string }> = [];
  if (!loading && total === 0) {
    alerts.push({
      tone: 'warning',
      kicker: 'NO VOTERS',
      en: 'The voter database is empty — import a voter roll from /booths or /voters to begin.',
    });
  }
  if (!loading && overview?.activeAssignments === 0 && total > 0) {
    alerts.push({
      tone: 'warning',
      kicker: 'NO ASSIGNMENTS',
      en: 'No active booth assignments — assign field staff under /assignments.',
    });
  }
  if (!loading && pct >= 75) {
    alerts.push({ tone: 'success', kicker: 'STRONG COVERAGE', en: `${pct}% of voters verified — outreach is on track.` });
  } else if (!loading && pct < 25 && total > 0) {
    alerts.push({
      tone: 'danger',
      kicker: 'LAGGING',
      en: `Only ${pct}% verified — push staff to accelerate canvassing.`,
    });
  }

  // Donut data
  const casteDonut = {
    labels: castes.slice(0, 8).map((c) => c.key || 'Unknown'),
    datasets: [
      {
        data: castes.slice(0, 8).map((c) => c.count),
        backgroundColor: DONUT_PALETTE,
        borderWidth: 1,
        borderColor: '#fff',
      },
    ],
  };
  const intentDonut = {
    labels: intentions.map((c) => c.key || 'Unknown'),
    datasets: [
      {
        data: intentions.map((c) => c.count),
        backgroundColor: ['#1F7A4E', '#C6850D', '#B8331F', '#205B9C', '#4F5867'],
        borderWidth: 1,
        borderColor: '#fff',
      },
    ],
  };

  return (
    <div className="space-y-5">
      {/* Greeting block */}
      <div>
        <p className="text-[11px] font-mono font-bold uppercase tracking-[0.15em] text-slate-500">
          {greeting.en} <span className="font-normal" style={{ fontFamily: '"IBM Plex Sans Devanagari", system-ui' }}>· {greeting.hi}</span>
        </p>
        <h1 className="mt-1 text-[28px] font-bold text-slate-900 leading-tight tracking-tight">
          {user?.name || 'Welcome'}
        </h1>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {user?.role && (
            <span className="px-2 py-0.5 text-[10.5px] font-mono font-bold tracking-wide rounded bg-indigo-50 text-indigo-900">
              {(roleLabels[user.role] || user.role).toUpperCase()}
            </span>
          )}
          {seatCode && <span className="font-mono text-[11px] tracking-wider text-slate-500">{seatCode}</span>}
        </div>
      </div>

      {/* 4-up KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Voters"
          hi="मतदाता"
          loading={loading}
          value={total.toLocaleString('en-IN')}
          sub={total ? `${total >= 1000 ? (total / 1000).toFixed(1) + 'K' : total} enrolled` : 'no records yet'}
        />
        <Kpi
          label="Verified"
          hi="सत्यापित"
          loading={loading}
          tone="indigoSoft"
          value={`${pct}%`}
          accent="#1F3A8A"
          sub={`${verified.toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')}`}
        />
        <Kpi
          label="Pending"
          hi="बाकी"
          loading={loading}
          value={pending.toLocaleString('en-IN')}
          accent={pending === 0 ? '#1F7A4E' : '#B7873A'}
          sub={pending === 0 ? 'all reached' : 'voters remaining'}
        />
        <Kpi
          label="Booths"
          hi="बूथ"
          loading={loading}
          value={(overview?.totalBooths ?? 0).toLocaleString('en-IN')}
          sub={`${overview?.activeAssignments ?? 0} active assignments`}
        />
      </div>

      {/* Outreach progress card */}
      <Card>
        <div className="flex items-baseline justify-between">
          <div>
            <h3 className="text-[13px] font-bold text-slate-900">Outreach progress</h3>
            <p className="text-[11px] text-slate-500" style={{ fontFamily: '"IBM Plex Sans Devanagari", system-ui' }}>
              आउटरीच प्रगति
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">Updated live</span>
        </div>

        <div className="mt-3 h-2 bg-[#E9E3D4] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, pct)}%`, background: '#1F3A8A' }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>{verified.toLocaleString('en-IN')} done</span>
          <span>{total.toLocaleString('en-IN')} total</span>
        </div>

        <div className="mt-3 flex items-center gap-5 text-[11px]">
          <LegendDot color="#1F7A4E" en="Done" hi="पूर्ण" />
          <LegendDot color="#B7873A" en="Active" hi="चालू" />
          <LegendDot color="#B8331F" en="Lagging" hi="पिछड़ा" />
        </div>
      </Card>

      {/* Three insight cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <SectionHeader title="Caste distribution" hi="जाति वितरण" right={`${castes.length} groups`} />
          <div className="mt-3 h-56 flex items-center justify-center">
            {castes.length === 0 ? (
              <Empty />
            ) : (
              <Doughnut
                data={casteDonut}
                options={{
                  plugins: {
                    legend: { position: 'right' as const, labels: { boxWidth: 10, font: { size: 11 } } },
                  },
                }}
              />
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Voting intention" hi="मतदान का इरादा" />
          <div className="mt-3 h-56 flex items-center justify-center">
            {intentions.length === 0 ? (
              <Empty />
            ) : (
              <Doughnut
                data={intentDonut}
                options={{
                  plugins: {
                    legend: { position: 'right' as const, labels: { boxWidth: 10, font: { size: 11 } } },
                  },
                }}
              />
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Top grievances" hi="शिकायतें" />
          <div className="mt-3 space-y-2">
            {grievances.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs text-slate-400">No grievances logged yet</div>
            ) : (
              grievances.slice(0, 6).map((g, i) => {
                const max = Math.max(...grievances.map((x) => x.count));
                const pctG = max > 0 ? Math.round((g.count / max) * 100) : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-700 font-medium">{g.key === 'LawAndOrder' ? 'Law & Order' : g.key}</span>
                      <span className="font-mono text-slate-500">{g.count.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-1.5 bg-[#E9E3D4] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pctG}%`, background: '#B7873A' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <SectionHeader title={`Alerts · ${alerts.length} ${alerts.length === 1 ? 'item' : 'items'}`} hi="अलर्ट" />
          {alerts.map((a, i) => (
            <Alert key={i} {...a} />
          ))}
        </div>
      )}

      {/* Quick actions row */}
      <div>
        <SectionHeader title="Quick actions" hi="त्वरित क्रियाएँ" />
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="bg-white rounded-xl border border-slate-200/60 p-3 hover:border-indigo-200 hover:shadow-sm transition flex flex-col gap-1">
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">{l.kicker}</span>
              <span className="text-sm font-semibold text-slate-900">{l.label}</span>
              <span className="text-[11px] text-slate-500">{l.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  { kicker: 'OPS', label: 'Booths', href: '/booths', desc: 'Polling booths & charts' },
  { kicker: 'OPS', label: 'Voters', href: '/voters', desc: 'Search & verify voters' },
  { kicker: 'OPS', label: 'Staff', href: '/staff', desc: 'Field worker accounts' },
  { kicker: 'OPS', label: 'Assignments', href: '/assignments', desc: 'Booth-to-staff mapping' },
  { kicker: 'ANALYTICS', label: 'Analytics', href: '/analytics', desc: 'Charts & breakdowns' },
  { kicker: 'BILLING', label: 'Subscriptions', href: '/subscriptions', desc: 'Razorpay tiers' },
];

/* ── Building blocks ───────────────────────────────────────────────── */

function Kpi({
  label,
  hi,
  value,
  sub,
  tone = 'paper',
  accent,
  loading,
}: {
  label: string;
  hi: string;
  value: string;
  sub: string;
  tone?: 'paper' | 'indigoSoft';
  accent?: string;
  loading?: boolean;
}) {
  const paper = tone === 'paper';
  return (
    <div
      className="rounded-xl p-3.5"
      style={{
        background: paper ? '#fff' : '#E8ECF8',
        border: paper ? '1px solid #EFEAE0' : '1px solid transparent',
      }}>
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-500">
        {label} <span className="font-normal" style={{ fontFamily: '"IBM Plex Sans Devanagari", system-ui', letterSpacing: 0 }}>· {hi}</span>
      </p>
      {loading ? (
        <div className="skeleton h-7 w-20 mt-1" />
      ) : (
        <p className="mt-1 text-[22px] font-bold tracking-tight leading-tight" style={{ color: accent || '#0F1B2D' }}>
          {value}
        </p>
      )}
      <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-4">
      {children}
    </div>
  );
}

function SectionHeader({ title, hi, right }: { title: string; hi?: string; right?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <div>
        <h3 className="text-[12px] font-bold text-slate-900">{title}</h3>
        {hi && (
          <p className="text-[11px] text-slate-500" style={{ fontFamily: '"IBM Plex Sans Devanagari", system-ui' }}>
            {hi}
          </p>
        )}
      </div>
      {right && <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">{right}</span>}
    </div>
  );
}

function LegendDot({ color, en, hi }: { color: string; en: string; hi: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-600">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="font-semibold">{en}</span>
      <span className="text-slate-400" style={{ fontFamily: '"IBM Plex Sans Devanagari", system-ui' }}>
        · {hi}
      </span>
    </span>
  );
}

function Alert({ tone, kicker, en }: { tone: 'danger' | 'warning' | 'success' | 'info'; kicker: string; en: string }) {
  const map: Record<typeof tone, string> = {
    danger: '#B8331F',
    warning: '#C6850D',
    success: '#1F7A4E',
    info: '#205B9C',
  };
  const c = map[tone];
  return (
    <div
      className="bg-white rounded-lg p-3 border border-slate-200/60"
      style={{ borderLeft: `3px solid ${c}` }}>
      <p className="text-[9.5px] font-mono font-bold tracking-[0.1em] uppercase" style={{ color: c }}>
        {kicker}
      </p>
      <p className="mt-1 text-[12.5px] text-slate-900 font-medium leading-snug">{en}</p>
    </div>
  );
}

function Empty() {
  return <span className="text-xs text-slate-400">No data yet</span>;
}
