'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '@/lib/api';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export interface ChartScope {
  boothId?: string;
  assemblyConstituency?: string;
  district?: string;
  dateFrom?: string;
  dateTo?: string;
}

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

const PALETTE = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#a855f7', '#ec4899', '#64748b', '#0ea5e9'];

/**
 * Renders the same chart deck the main /analytics page shows, but scoped
 * to any combination of boothId / assemblyConstituency / date range the
 * caller passes.  Used by both the /booths "Charts" view-mode and the
 * per-row drill-down modal so the chart styling stays identical.
 */
export default function BoothCharts({ scope }: { scope: ChartScope }) {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [caste, setCaste] = useState<Bucket[]>([]);
  const [religion, setReligion] = useState<Bucket[]>([]);
  const [age, setAge] = useState<Bucket[]>([]);
  const [candidates, setCandidates] = useState<Bucket[]>([]);
  const [intent, setIntent] = useState<Bucket[]>([]);
  const [grievances, setGrievances] = useState<Bucket[]>([]);
  const [gender, setGender] = useState<Bucket[]>([]);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (scope.boothId) p.boothId = scope.boothId;
    if (scope.assemblyConstituency) p.assemblyConstituency = scope.assemblyConstituency;
    if (scope.district) p.district = scope.district;
    if (scope.dateFrom) p.dateFrom = scope.dateFrom;
    if (scope.dateTo) p.dateTo = scope.dateTo;
    return p;
  }, [scope.boothId, scope.assemblyConstituency, scope.district, scope.dateFrom, scope.dateTo]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, c, r, a, cd, vi, g, gn] = await Promise.all([
        api.get('/analytics/overview', { params }),
        api.get('/analytics/caste', { params }),
        api.get('/analytics/religion', { params }),
        api.get('/analytics/age-distribution', { params }),
        api.get('/analytics/candidate-share', { params }),
        api.get('/analytics/voting-intention', { params }),
        api.get('/analytics/grievances', { params }),
        api.get('/analytics/gender', { params }),
      ]);
      setOverview(ov.data.data);
      setCaste(c.data.data);
      setReligion(r.data.data);
      setAge(a.data.data);
      setCandidates(cd.data.data);
      setIntent(vi.data.data);
      setGrievances(g.data.data);
      setGender(gn.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load charts');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const showingLabel =
    scope.dateFrom || scope.dateTo
      ? `${scope.dateFrom || '…'} → ${scope.dateTo || 'today'}`
      : 'all time';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {overview && !loading ? (
          <>
            <StatCard label="Voters in scope" value={overview.totalVoters.toLocaleString('en-IN')} tone="slate" />
            <StatCard label="Verified" value={overview.verified.toLocaleString('en-IN')} tone="green" />
            <StatCard label="Pending" value={overview.unverified.toLocaleString('en-IN')} tone="amber" />
            <StatCard label="Verification %" value={`${overview.verificationRate}%`} tone="red" />
            <StatCard label="Window" value={showingLabel} tone="slate" small />
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
            options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}
          />
        </ChartCard>

        <ChartCard title="Voting Intention" empty={intent.length === 0} loading={loading}>
          <Doughnut
            data={{
              labels: intent.map((r) => r.key),
              datasets: [{ data: intent.map((r) => r.count), backgroundColor: PALETTE }],
            }}
            options={{ maintainAspectRatio: false }}
          />
        </ChartCard>

        <ChartCard title="Caste (Top 10)" empty={caste.length === 0} loading={loading}>
          <Bar
            data={{
              labels: caste.slice(0, 10).map((r) => r.key),
              datasets: [{ label: 'Voters', data: caste.slice(0, 10).map((r) => r.count), backgroundColor: '#6366f1' }],
            }}
            options={{
              maintainAspectRatio: false,
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
            options={{ maintainAspectRatio: false }}
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
            options={{ maintainAspectRatio: false, indexAxis: 'y' as const, plugins: { legend: { display: false } } }}
          />
        </ChartCard>

        <ChartCard title="Grievances / Problems" empty={grievances.length === 0} loading={loading}>
          <Bar
            data={{
              labels: grievances.map((r) => r.key),
              datasets: [{ label: 'Voters', data: grievances.map((r) => r.count), backgroundColor: '#f97316' }],
            }}
            options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}
          />
        </ChartCard>

        <ChartCard title="Gender" empty={gender.length === 0} loading={loading}>
          <Doughnut
            data={{
              labels: gender.map((r) => (r.key === 'M' ? 'Male' : r.key === 'F' ? 'Female' : r.key === 'T' ? 'Transgender' : r.key)),
              datasets: [{ data: gender.map((r) => r.count), backgroundColor: ['#0ea5e9', '#ec4899', '#a855f7', '#64748b'] }],
            }}
            options={{ maintainAspectRatio: false }}
          />
        </ChartCard>

        <ChartCard title="Verification Progress" empty={!overview || overview.totalVoters === 0} loading={loading}>
          {overview && (
            <Doughnut
              data={{
                labels: ['Verified', 'Pending'],
                datasets: [
                  {
                    data: [overview.verified, overview.unverified],
                    backgroundColor: ['#22c55e', '#e2e8f0'],
                  },
                ],
              }}
              options={{ maintainAspectRatio: false }}
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  small,
}: {
  label: string;
  value: string;
  tone: 'slate' | 'red' | 'green' | 'amber';
  small?: boolean;
}) {
  const tones: Record<string, string> = {
    slate: 'text-slate-900',
    red: 'text-red-600',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 ${small ? 'text-sm font-semibold' : 'text-2xl font-bold'} ${tones[tone]}`}>{value}</p>
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
          <p className="text-xs text-slate-400 m-auto">No data in this scope</p>
        ) : (
          <div className="w-full h-full">{children}</div>
        )}
      </div>
    </div>
  );
}
