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
      <div className="bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Welcome to POLLSTICS</h1>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as <span className="font-medium text-slate-700">{user?.name}</span>
          {user?.role && <> &middot; {roleLabels[user.role] || user.role}</>}
          {user?.assemblyConstituency && <> &middot; {user.assemblyConstituency}</>}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Voters" value={loading ? '…' : overview?.totalVoters.toLocaleString('en-IN') || '0'} tone="slate" />
        <Stat label="Verified" value={loading ? '…' : overview?.verified.toLocaleString('en-IN') || '0'} tone="emerald" />
        <Stat label="Pending" value={loading ? '…' : overview?.unverified.toLocaleString('en-IN') || '0'} tone="amber" />
        <Stat label="Verification" value={loading ? '…' : `${overview?.verificationRate ?? 0}%`} tone="red" />
        <Stat label="Booths" value={loading ? '…' : overview?.totalBooths.toLocaleString('en-IN') || '0'} tone="slate" />
        <Stat label="Assignments" value={loading ? '…' : overview?.activeAssignments.toLocaleString('en-IN') || '0'} tone="sky" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <a
            key={c.href}
            href={c.href}
            className="block bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md hover:border-red-200 transition">
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
    <div className="bg-white rounded-xl border border-slate-200/60 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}
