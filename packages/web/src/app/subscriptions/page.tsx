'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonTable } from '@/components/Skeleton';
import SubscriptionAdminModal from '@/components/SubscriptionAdminModal';
import SubscriptionReassignModal from '@/components/SubscriptionReassignModal';
import StaffPasswordModal from '@/components/StaffPasswordModal';

interface Tier {
  key: 'basic' | 'standard' | 'premium';
  name: string;
  amount: number;
  durationDays: number;
  features: string[];
}

interface Subscription {
  _id: string;
  tier: Tier['key'];
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  assemblyConstituency: string;
  startDate: string;
  endDate: string;
  amount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt?: string;
  createdAt: string;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  // Politicians get their own /politician home — they shouldn't be
  // managing subscriptions from the admin app.
  useEffect(() => {
    if (user?.role === 'politician') router.replace('/politician');
  }, [user, router]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [keyId, setKeyId] = useState<string | null>(null);
  const [mine, setMine] = useState<Subscription | null>(null);
  const [all, setAll] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [constituency, setConstituency] = useState('');
  const [adminCreateOpen, setAdminCreateOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<{
    subscriptionId: string;
    politician: { _id: string; name?: string; email?: string };
    currentConstituency: string;
    currentDistrict?: string;
    currentBoothIds: string[];
  } | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const isAdmin = user?.role === 'super_admin';
  const isPolitician = user?.role === 'politician';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tiersRes = await api.get('/subscriptions/tiers');
      setTiers(tiersRes.data.data.tiers);
      setPaymentEnabled(tiersRes.data.data.paymentEnabled);
      setKeyId(tiersRes.data.data.keyId);

      if (isPolitician) {
        const mineRes = await api.get('/subscriptions/mine');
        setMine(mineRes.data.data);
        setConstituency(user?.assemblyConstituency || '');
      } else if (isAdmin) {
        const allRes = await api.get('/subscriptions', { params: { limit: 50 } });
        setAll(allRes.data.data.subscriptions);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isPolitician, user?.assemblyConstituency]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubscribe(t: Tier) {
    if (!isPolitician) {
      toast.error('Only politicians can subscribe from this screen');
      return;
    }
    if (!constituency.trim()) {
      toast.error('Please set your constituency first');
      return;
    }
    setBusy(t.key);
    try {
      const res = await api.post('/subscriptions/order', {
        tier: t.key,
        assemblyConstituency: constituency.trim(),
      });
      const { subscription, razorpay } = res.data.data;

      if (!razorpay.paymentEnabled || !window.Razorpay || !razorpay.keyId) {
        await api.post('/subscriptions/verify', {
          razorpayOrderId: razorpay.orderId,
          razorpayPaymentId: `mock_${Date.now()}`,
          razorpaySignature: 'mock',
        });
        toast.success('Subscription activated (mock mode)');
        await load();
        return;
      }

      const rzp = new window.Razorpay({
        key: razorpay.keyId,
        amount: razorpay.amount,
        currency: razorpay.currency,
        name: 'POLLSTICS',
        description: `${t.name} subscription`,
        order_id: razorpay.orderId,
        handler: async (response: any) => {
          try {
            await api.post('/subscriptions/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            toast.success('Payment confirmed, subscription is active');
            await load();
          } catch (err: any) {
            toast.error(err.response?.data?.error || 'Payment verification failed');
          }
        },
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#dc2626' },
        modal: {
          ondismiss: () => toast('Payment cancelled', { icon: 'ℹ️' }),
        },
      });
      rzp.open();
      // Mark subscription id to allow later reconciliation if needed
      void subscription;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Order failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel(sub: Subscription) {
    if (!confirm(`Cancel ${sub.tier} subscription?`)) return;
    try {
      await api.put(`/subscriptions/${sub._id}/cancel`);
      toast.success('Subscription cancelled');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Cancel failed');
    }
  }

  return (
    <div className="space-y-4">
      {paymentEnabled && <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />}

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Subscriptions</h1>
          <p className="text-sm text-slate-500">
            {isPolitician
              ? 'Pick a plan to unlock voter insights for your constituency'
              : 'Manage politician subscriptions'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setAdminCreateOpen(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-sm self-start">
            + Add Politician
          </button>
        )}
      </div>

      {!paymentEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
          Razorpay is not configured on the server — subscriptions will be created in mock mode and auto-activated.
        </div>
      )}

      {isPolitician && mine && (
        <div className={`rounded-xl border p-5 ${mine.status === 'active' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200/60'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Current Subscription</p>
              <p className="text-lg font-semibold text-slate-900 capitalize">{mine.tier}</p>
              <p className="text-xs text-slate-500 mt-1">
                {mine.assemblyConstituency} · ₹{mine.amount.toLocaleString('en-IN')} ·{' '}
                {new Date(mine.startDate).toLocaleDateString('en-IN')} → {new Date(mine.endDate).toLocaleDateString('en-IN')}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                mine.status === 'active'
                  ? 'bg-emerald-600 text-white'
                  : mine.status === 'pending'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}>
              {mine.status.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {isPolitician && (
        <div className="bg-white rounded-xl border border-slate-200/60 p-4">
          <label className="block text-xs font-medium text-slate-600 mb-1">Assembly Constituency</label>
          <input
            value={constituency}
            onChange={(e) => setConstituency(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
          />
        </div>
      )}

      {isPolitician && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading && tiers.length === 0 &&
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`plan-sk-${i}`}
                className="rounded-2xl border border-slate-200/60 p-6 bg-white"
                style={{ animation: 'fadeInUp 0.4s ease-out both', animationDelay: `${i * 80}ms` }}>
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-8 w-40 mt-3" />
                <div className="space-y-2 mt-5">
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-5/6" />
                  <div className="skeleton h-3 w-4/6" />
                  <div className="skeleton h-3 w-5/6" />
                </div>
                <div className="skeleton h-9 w-full mt-5 rounded-lg" />
              </div>
            ))}
          {tiers.map((t) => {
            const isCurrent = mine?.tier === t.key && mine?.status === 'active';
            return (
              <div
                key={t.key}
                className={`rounded-2xl border p-6 bg-white ${
                  t.key === 'standard' ? 'border-red-300 shadow-lg' : 'border-slate-200/60'
                }`}>
                {t.key === 'standard' && (
                  <span className="inline-block mb-3 text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-slate-900">{t.name}</h3>
                <p className="mt-1">
                  <span className="text-3xl font-bold text-slate-900">₹{t.amount.toLocaleString('en-IN')}</span>
                  <span className="text-sm text-slate-500"> / {t.durationDays} days</span>
                </p>
                <ul className="mt-4 space-y-2">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  disabled={busy === t.key || isCurrent}
                  onClick={() => handleSubscribe(t)}
                  className={`mt-5 w-full py-2 rounded-lg text-sm font-semibold transition ${
                    isCurrent
                      ? 'bg-emerald-100 text-emerald-700 cursor-default'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  } disabled:opacity-60`}>
                  {isCurrent ? 'Current Plan' : busy === t.key ? 'Opening checkout…' : `Choose ${t.name}`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">All Subscriptions</h2>
            <span className="text-xs text-slate-500">{all.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Politician</th>
                  <th className="px-4 py-3 text-left font-medium">Constituency</th>
                  <th className="px-4 py-3 text-left font-medium">Tier</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Expires</th>
                  <th className="px-4 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <SkeletonTable
                    rows={5}
                    columns={[{ w: '140px', lines: 2 }, '130px', '90px', { w: '80px', alignRight: true }, '80px', '110px', { w: '70px', alignRight: true }]}
                  />
                )}
                {!loading && all.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No subscriptions yet.
                    </td>
                  </tr>
                )}
                {!loading &&
                  all.map((s) => {
                    const pol = s as any as {
                      politicianId:
                        | {
                            _id: string;
                            name: string;
                            email: string;
                            district?: string;
                            assignedBoothIds?: any[];
                          }
                        | string;
                    };
                    const politicianId =
                      typeof pol.politicianId === 'object'
                        ? pol.politicianId._id
                        : (pol.politicianId as string);
                    const politicianName =
                      typeof pol.politicianId === 'object' ? pol.politicianId.name : '—';
                    const politicianEmail =
                      typeof pol.politicianId === 'object' ? pol.politicianId.email : '';
                    const politicianDistrict =
                      typeof pol.politicianId === 'object' ? pol.politicianId.district : undefined;
                    const politicianBoothIds: string[] =
                      typeof pol.politicianId === 'object' &&
                      Array.isArray(pol.politicianId.assignedBoothIds)
                        ? pol.politicianId.assignedBoothIds.map((x: any) => String(x))
                        : [];
                    const canReassign = s.status === 'active' || s.status === 'pending';
                    return (
                      <tr key={s._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{politicianName}</p>
                          <p className="text-xs text-slate-400">{politicianEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{s.assemblyConstituency}</td>
                        <td className="px-4 py-3 capitalize text-slate-700">{s.tier}</td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          ₹{s.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              s.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : s.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {new Date(s.endDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-3">
                            {politicianId && (
                              <button
                                onClick={() =>
                                  setPasswordTarget({
                                    id: politicianId,
                                    name: politicianName,
                                  })
                                }
                                className="text-slate-500 hover:text-slate-700 text-sm"
                                title="Update password">
                                Password
                              </button>
                            )}
                            {canReassign && politicianId ? (
                              <button
                                onClick={() =>
                                  setReassignTarget({
                                    subscriptionId: s._id,
                                    politician: {
                                      _id: politicianId,
                                      name: politicianName,
                                      email: politicianEmail,
                                    },
                                    currentConstituency: s.assemblyConstituency,
                                    currentDistrict: politicianDistrict,
                                    currentBoothIds: politicianBoothIds,
                                  })
                                }
                                className="text-slate-700 hover:text-slate-900 text-sm font-medium">
                                Reassign
                              </button>
                            ) : null}
                            {s.status === 'active' && (
                              <button
                                onClick={() => handleCancel(s)}
                                className="text-slate-500 hover:text-rose-600 text-sm">
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isPolitician && !isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200/60 p-6 text-sm text-slate-500">
          You don't have access to subscriptions.
        </div>
      )}

      {adminCreateOpen && (
        <SubscriptionAdminModal
          tiers={tiers}
          onClose={() => setAdminCreateOpen(false)}
          onCreated={() => {
            setAdminCreateOpen(false);
            load();
          }}
        />
      )}

      {reassignTarget && (
        <SubscriptionReassignModal
          subscriptionId={reassignTarget.subscriptionId}
          politician={reassignTarget.politician}
          currentConstituency={reassignTarget.currentConstituency}
          currentDistrict={reassignTarget.currentDistrict}
          currentBoothIds={reassignTarget.currentBoothIds}
          onClose={() => setReassignTarget(null)}
          onSaved={() => {
            setReassignTarget(null);
            load();
          }}
        />
      )}

      {passwordTarget && (
        <StaffPasswordModal
          staffId={passwordTarget.id}
          staffName={passwordTarget.name}
          apiPath={`/subscriptions/politician/${passwordTarget.id}/password`}
          onClose={() => setPasswordTarget(null)}
          onSaved={() => setPasswordTarget(null)}
        />
      )}
    </div>
  );
}
