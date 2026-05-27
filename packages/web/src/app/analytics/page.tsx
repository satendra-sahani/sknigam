'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '@/lib/api';
import {
  FiltersButton,
  ActiveChips,
  SharedVoterFiltersModal,
} from '@/components/filters';
import {
  buildVoterQuery,
  describeVoterFilters,
  clearVoterChip,
  emptyVoterFilters,
  type VoterFilterState,
  type VoterChip,
} from '@/lib/voterFilters';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

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
  verified?: number;
}

interface BoothProgress {
  _id: string;
  partNumber: number;
  name: string;
  assemblyConstituency: string;
  total: number;
  verified: number;
}

const PALETTE = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#a855f7', '#ec4899', '#64748b', '#0ea5e9'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user?.role === 'politician') router.replace('/politician/insights');
  }, [user, router]);

  const [applied, setApplied] = useState<VoterFilterState>(emptyVoterFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [caste, setCaste] = useState<Bucket[]>([]);
  const [religion, setReligion] = useState<Bucket[]>([]);
  const [age, setAge] = useState<Bucket[]>([]);
  const [candidates, setCandidates] = useState<Bucket[]>([]);
  const [intent, setIntent] = useState<Bucket[]>([]);
  const [grievances, setGrievances] = useState<Bucket[]>([]);
  const [booths, setBooths] = useState<BoothProgress[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildVoterQuery(applied);
      const [ov, c, r, a, cd, vi, g, bp] = await Promise.all([
        api.get('/analytics/overview', { params }),
        api.get('/analytics/caste', { params }),
        api.get('/analytics/religion', { params }),
        api.get('/analytics/age-distribution', { params }),
        api.get('/analytics/candidate-share', { params }),
        api.get('/analytics/voting-intention', { params }),
        api.get('/analytics/grievances', { params }),
        api.get('/analytics/booth-progress', { params }),
      ]);
      setOverview(ov.data.data);
      setCaste(c.data.data);
      setReligion(r.data.data);
      setAge(a.data.data);
      setCandidates(cd.data.data);
      setIntent(vi.data.data);
      setGrievances(g.data.data);
      setBooths(bp.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    load();
  }, [load]);

  const boothBarData = useMemo(() => {
    const top = booths.slice(0, 20);
    return {
      labels: top.map((b) => `Part ${b.partNumber}`),
      datasets: [
        {
          label: 'Verified',
          data: top.map((b) => b.verified),
          backgroundColor: '#dc2626',
          stack: 's',
        },
        {
          label: 'Pending',
          data: top.map((b) => b.total - b.verified),
          backgroundColor: '#e2e8f0',
          stack: 's',
        },
      ],
    };
  }, [booths]);

  const activeChips = useMemo(() => describeVoterFilters(applied), [applied]);

  function clearChip(chip: VoterChip) {
    setApplied((s) => clearVoterChip(s, chip));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">
            Caste, age, candidate share and grievance insights
            {activeChips.length > 0 && ` · ${activeChips.length} filter${activeChips.length === 1 ? '' : 's'} applied`}
          </p>
        </div>
        <FiltersButton onClick={() => setFiltersOpen(true)} count={activeChips.length} />
      </div>

      <ActiveChips
        chips={activeChips}
        onRemove={clearChip}
        onClearAll={() => setApplied(emptyVoterFilters)}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {overview ? (
          <>
            <StatCard label="Total Voters" value={overview.totalVoters.toLocaleString('en-IN')} tone="slate" />
            <StatCard label="Verified" value={overview.verified.toLocaleString('en-IN')} tone="green" />
            <StatCard label="Pending" value={overview.unverified.toLocaleString('en-IN')} tone="amber" />
            <StatCard label="Verification %" value={`${overview.verificationRate}%`} tone="red" />
            <StatCard label="Booths" value={overview.totalBooths.toLocaleString('en-IN')} tone="slate" />
          </>
        ) : (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200/60 p-4"
              style={{ animation: 'fadeInUp 0.35s ease-out both', animationDelay: `${i * 50}ms` }}>
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-7 w-24 mt-2" />
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Age Distribution" empty={age.length === 0} loading={loading}>
          <Bar
            data={{
              labels: age.map((r) => r.key),
              datasets: [{ label: 'Voters', data: age.map((r) => r.count), backgroundColor: '#dc2626' }],
            }}
            options={{ plugins: { legend: { display: false } } }}
          />
        </ChartCard>

        <ChartCard title="Voting Intention" empty={intent.length === 0} loading={loading}>
          <Doughnut
            data={{
              labels: intent.map((r) => r.key),
              datasets: [{ data: intent.map((r) => r.count), backgroundColor: PALETTE }],
            }}
          />
        </ChartCard>

        <ChartCard title="Caste (Top 10)" empty={caste.length === 0} loading={loading}>
          <Bar
            data={{
              labels: caste.slice(0, 10).map((r) => r.key),
              datasets: [{ label: 'Voters', data: caste.slice(0, 10).map((r) => r.count), backgroundColor: '#6366f1' }],
            }}
            options={{
              indexAxis: 'y' as const,
              plugins: { legend: { display: false } },
            }}
          />
        </ChartCard>

        <ChartCard title="Religion" empty={religion.length === 0} loading={loading}>
          <Doughnut
            data={{
              labels: religion.map((r) => r.key),
              datasets: [{ data: religion.map((r) => r.count), backgroundColor: PALETTE }],
            }}
          />
        </ChartCard>

        <ChartCard title="Candidate / Party Support" empty={candidates.length === 0} loading={loading}>
          <Bar
            data={{
              labels: candidates.slice(0, 10).map((r) => r.key),
              datasets: [
                { label: 'Voters', data: candidates.slice(0, 10).map((r) => r.count), backgroundColor: '#22c55e' },
              ],
            }}
            options={{ indexAxis: 'y' as const, plugins: { legend: { display: false } } }}
          />
        </ChartCard>

        <ChartCard title="Grievances" empty={grievances.length === 0} loading={loading}>
          <Bar
            data={{
              labels: grievances.map((r) => r.key),
              datasets: [{ label: 'Voters', data: grievances.map((r) => r.count), backgroundColor: '#f97316' }],
            }}
            options={{ plugins: { legend: { display: false } } }}
          />
        </ChartCard>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Booth Progress (Top 20)</h2>
          <span className="text-xs text-slate-500">{booths.length} booths total</span>
        </div>
        {booths.length === 0 ? (
          <p className="text-xs text-slate-400">No booth data.</p>
        ) : (
          <div className="h-72">
            <Bar data={boothBarData} options={{ maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }} />
          </div>
        )}
      </div>

      <SharedVoterFiltersModal
        open={filtersOpen}
        title="Filter analytics"
        subtitle="Scope every chart to a location, voter attribute, or visit window"
        initial={applied}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => {
          setApplied(next);
          setFiltersOpen(false);
        }}
      />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'slate' | 'red' | 'green' | 'amber' }) {
  const tones: Record<string, string> = {
    slate: 'text-slate-900',
    red: 'text-red-600',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
  empty,
  loading,
}: {
  title: string;
  children: React.ReactNode;
  empty: boolean;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-5">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">{title}</h2>
      <div className="h-64 flex items-end justify-center">
        {loading ? (
          <div className="w-full h-full flex items-end gap-2 px-2 pb-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="skeleton flex-1 rounded-t"
                style={{
                  height: `${30 + ((i * 17) % 60)}%`,
                  animation: 'fadeInUp 0.35s ease-out both',
                  animationDelay: `${i * 40}ms`,
                }}
              />
            ))}
          </div>
        ) : empty ? (
          <p className="text-xs text-slate-400 m-auto">No data</p>
        ) : (
          <div className="w-full h-full">{children}</div>
        )}
      </div>
    </div>
  );
}
