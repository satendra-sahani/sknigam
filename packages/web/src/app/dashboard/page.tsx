'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

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

export default function DashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/analytics/overview');
        setOverview(res.data.data);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to load overview');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: 'Booths', href: '/booths', desc: 'Manage polling booths across constituencies' },
    { label: 'Voters', href: '/voters', desc: 'Browse and verify the voter roll' },
    { label: 'Staff', href: '/staff', desc: 'Onboard and manage field staff' },
    { label: 'Assignments', href: '/assignments', desc: 'Assign staff to booths and voters' },
    { label: 'Analytics', href: '/analytics', desc: 'Caste, age, and candidate insights' },
    { label: 'Subscriptions', href: '/subscriptions', desc: 'Politician subscription plans' },
    { label: 'Audit Log', href: '/audit-log', desc: 'Searchable activity trail' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm flex items-center gap-4 animate-count">
        <img
          src="/white-background.png"
          alt="Pollstics"
          className="w-14 h-14 rounded-xl object-contain flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-slate-900">Welcome</h1>
          {user ? (
            <p className="mt-1 text-sm text-slate-500">
              Signed in as <span className="font-medium text-slate-700">{user?.name}</span>
              {user?.role && <> &middot; {roleLabels[user.role] || user.role}</>}
              {user?.assemblyConstituency && <> &middot; {user.assemblyConstituency}</>}
            </p>
          ) : (
            <div className="skeleton h-3 w-64 mt-2" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} delay={i * 60} />)
        ) : (
          <>
            <Stat label="Voters" value={overview?.totalVoters.toLocaleString('en-IN') || '0'} tone="slate" />
            <Stat label="Verified" value={overview?.verified.toLocaleString('en-IN') || '0'} tone="emerald" />
            <Stat label="Pending" value={overview?.unverified.toLocaleString('en-IN') || '0'} tone="amber" />
            <Stat label="Verification" value={`${overview?.verificationRate ?? 0}%`} tone="red" />
            <Stat label="Booths" value={overview?.totalBooths.toLocaleString('en-IN') || '0'} tone="slate" />
            <Stat label="Assignments" value={overview?.activeAssignments.toLocaleString('en-IN') || '0'} tone="sky" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} delay={i * 80} />)
          : cards.map((c) => (
              <a
                key={c.href}
                href={c.href}
                className="block bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md hover:border-red-200 transition animate-count">
                <p className="text-sm font-semibold text-slate-900">{c.label}</p>
                <p className="mt-1 text-xs text-slate-500">{c.desc}</p>
              </a>
            ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'slate' | 'emerald' | 'amber' | 'red' | 'sky' }) {
  const tones: Record<string, string> = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    sky: 'text-sky-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4 animate-count">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

function StatSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="bg-white rounded-xl border border-slate-200/60 p-4"
      style={{ animation: `fadeInUp 0.35s ease-out both`, animationDelay: `${delay}ms` }}
    >
      <div className="skeleton h-3 w-16" />
      <div className="skeleton h-7 w-24 mt-2" />
    </div>
  );
}

function CardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm"
      style={{ animation: `fadeInUp 0.4s ease-out both`, animationDelay: `${delay}ms` }}
    >
      <div className="skeleton h-4 w-28" />
      <div className="skeleton h-3 w-full mt-3" />
      <div className="skeleton h-3 w-3/4 mt-2" />
    </div>
  );
}
