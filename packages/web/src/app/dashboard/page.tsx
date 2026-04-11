'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import KPITile from '@/components/KPITile';
import HourlyChart from '@/components/HourlyChart';
import AlertsPanel from '@/components/AlertsPanel';
import toast from 'react-hot-toast';

interface KPIs {
  overallTurnoutPercent: number;
  boothsReporting: number;
  totalBooths: number;
  staffCheckedIn: number;
  totalStaff: number;
  openIncidents: number;
  pendingApprovals: number;
}

interface HourlyData {
  hour: string;
  cumulativeVoters: number;
  cumulativePercent: number;
}

interface Alert {
  id: string;
  type: string;
  severity: 'critical' | 'attention' | 'info';
  message: string;
  timestamp: string;
  data?: any;
}

interface RecentSubmission {
  id: string;
  boothName: string;
  count: number;
  submittedBy: string;
  timestamp: string;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [prevKpis, setPrevKpis] = useState<KPIs | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const alertIdCounter = useRef(0);
  const { on } = useSocket();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchKPIs = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/kpis');
      const data = response.data.data as KPIs;
      setPrevKpis(kpis);
      setKpis(data);

      const newAlerts: Alert[] = [];

      if (data.openIncidents > 0) {
        newAlerts.push({
          id: `incident-${++alertIdCounter.current}`,
          type: 'incident',
          severity: data.openIncidents >= 5 ? 'critical' : 'attention',
          message: `${data.openIncidents} open incident${data.openIncidents !== 1 ? 's' : ''} requiring attention`,
          timestamp: new Date().toISOString(),
        });
      }

      if (data.totalBooths > 0) {
        const reportingPct = (data.boothsReporting / data.totalBooths) * 100;
        if (reportingPct < 50) {
          newAlerts.push({
            id: `reporting-${++alertIdCounter.current}`,
            type: 'reporting',
            severity: reportingPct < 25 ? 'critical' : 'attention',
            message: `Only ${data.boothsReporting}/${data.totalBooths} booths reporting (${reportingPct.toFixed(0)}%)`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (data.totalStaff > 0) {
        const checkedInPct = (data.staffCheckedIn / data.totalStaff) * 100;
        if (checkedInPct < 70) {
          newAlerts.push({
            id: `checkin-${++alertIdCounter.current}`,
            type: 'checkin',
            severity: checkedInPct < 40 ? 'critical' : 'attention',
            message: `Staff check-in at ${checkedInPct.toFixed(0)}% (${data.staffCheckedIn}/${data.totalStaff})`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (data.pendingApprovals > 10) {
        newAlerts.push({
          id: `approvals-${++alertIdCounter.current}`,
          type: 'approval',
          severity: 'info',
          message: `${data.pendingApprovals} voter count submissions pending approval`,
          timestamp: new Date().toISOString(),
        });
      }

      if (data.overallTurnoutPercent > 0 && data.overallTurnoutPercent < 20) {
        newAlerts.push({
          id: `turnout-${++alertIdCounter.current}`,
          type: 'turnout',
          severity: 'attention',
          message: `Low turnout detected: ${data.overallTurnoutPercent}%`,
          timestamp: new Date().toISOString(),
        });
      }

      setAlerts(newAlerts);
    } catch (err: any) {
      console.error('Failed to fetch KPIs:', err);
    }
  }, [kpis]);

  const fetchHourly = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/hourly-turnout');
      setHourlyData(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch hourly data:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchKPIs(), fetchHourly()]);
      setLoading(false);
    };
    loadData();

    const interval = setInterval(() => {
      fetchKPIs();
      fetchHourly();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Socket.io real-time listeners
  useEffect(() => {
    const unsubKpi = on('kpi-update', (data: Partial<KPIs>) => {
      setKpis((prev) => (prev ? { ...prev, ...data } : null));
    });

    const unsubIncident = on('incident-reported', () => {
      fetchKPIs();
      toast('New incident reported', { icon: '\u26A0\uFE0F' });
    });

    const unsubVoterCount = on('voter-count-submitted', (data: any) => {
      fetchKPIs();
      fetchHourly();
      if (data) {
        const submission: RecentSubmission = {
          id: `sub-${Date.now()}`,
          boothName: data.boothName || 'Unknown Booth',
          count: data.count || 0,
          submittedBy: data.submittedBy || 'Staff',
          timestamp: new Date().toISOString(),
        };
        setRecentSubmissions((prev) => [submission, ...prev].slice(0, 5));
      }
    });

    const unsubStaff = on('staff-checked-in', () => {
      fetchKPIs();
    });

    const unsubAlert = on('alert-triggered', (data: any) => {
      const newAlert: Alert = {
        id: `rt-${++alertIdCounter.current}`,
        type: data.type || 'system',
        severity: data.severity === 'critical' ? 'critical' : data.severity === 'high' ? 'critical' : 'attention',
        message: data.message || `Alert: ${data.type}`,
        timestamp: new Date().toISOString(),
        data,
      };
      setAlerts((prev) => [newAlert, ...prev]);
      toast(newAlert.message, { icon: '\uD83D\uDEA8' });
    });

    return () => {
      unsubKpi?.();
      unsubIncident?.();
      unsubVoterCount?.();
      unsubStaff?.();
      unsubAlert?.();
    };
  }, [on, fetchKPIs, fetchHourly]);

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const getTurnoutColor = (pct: number): 'emerald' | 'amber' | 'rose' => {
    if (pct >= 60) return 'emerald';
    if (pct >= 30) return 'amber';
    return 'rose';
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 p-1">
        {/* Header skeleton */}
        <div className="animate-pulse">
          <div className="h-7 w-40 bg-slate-200 rounded-lg" />
          <div className="h-4 w-56 bg-slate-100 rounded mt-2" />
        </div>
        {/* KPI skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200/60 p-6 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 to-slate-100" />
              <div className="animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="h-3 w-20 bg-slate-200 rounded" />
                    <div className="h-8 w-24 bg-slate-200 rounded" />
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                  </div>
                  <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Chart + alerts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 p-6">
            <div className="animate-pulse">
              <div className="h-5 w-48 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-32 bg-slate-100 rounded mb-6" />
              <div className="h-80 bg-slate-50 rounded-xl" />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
            <div className="animate-pulse">
              <div className="h-5 w-28 bg-slate-200 rounded mb-6" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-50 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Page Header */}
      <div
        className="flex items-center justify-between"
        style={{
          animation: mounted ? 'fadeInUp 0.5s ease-out forwards' : 'none',
        }}
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time election monitoring</p>
        </div>
        <button
          onClick={() => { fetchKPIs(); fetchHourly(); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 text-slate-700 transition-all duration-200 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Refresh
        </button>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            title: 'Overall Turnout',
            value: kpis?.overallTurnoutPercent ?? 0,
            suffix: '%',
            color: getTurnoutColor(kpis?.overallTurnoutPercent ?? 0),
            previousValue: prevKpis?.overallTurnoutPercent,
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            ),
          },
          {
            title: 'Booths Reporting',
            value: kpis?.boothsReporting ?? 0,
            subtitle: `of ${kpis?.totalBooths ?? 0} total`,
            color: (
              kpis && kpis.totalBooths > 0 && kpis.boothsReporting / kpis.totalBooths >= 0.7
                ? 'emerald'
                : kpis && kpis.totalBooths > 0 && kpis.boothsReporting / kpis.totalBooths >= 0.4
                ? 'amber'
                : 'rose'
            ) as 'emerald' | 'amber' | 'rose',
            previousValue: prevKpis?.boothsReporting,
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
            ),
          },
          {
            title: 'Staff Checked In',
            value: kpis?.staffCheckedIn ?? 0,
            subtitle: `of ${kpis?.totalStaff ?? 0} total`,
            color: (
              kpis && kpis.totalStaff > 0 && kpis.staffCheckedIn / kpis.totalStaff >= 0.8
                ? 'emerald'
                : kpis && kpis.totalStaff > 0 && kpis.staffCheckedIn / kpis.totalStaff >= 0.5
                ? 'amber'
                : 'rose'
            ) as 'emerald' | 'amber' | 'rose',
            previousValue: prevKpis?.staffCheckedIn,
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            ),
          },
          {
            title: 'Open Incidents',
            value: kpis?.openIncidents ?? 0,
            color: (kpis && kpis.openIncidents > 0 ? 'rose' : 'emerald') as 'rose' | 'emerald',
            previousValue: prevKpis?.openIncidents,
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            ),
          },
          {
            title: 'Pending Approvals',
            value: kpis?.pendingApprovals ?? 0,
            color: (kpis && kpis.pendingApprovals > 10 ? 'amber' : 'sky') as 'amber' | 'sky',
            previousValue: prevKpis?.pendingApprovals,
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
        ].map((tile, index) => (
          <div
            key={tile.title}
            style={{
              animation: mounted ? `fadeInUp 0.5s ease-out ${0.1 + index * 0.08}s both` : 'none',
            }}
          >
            <KPITile
              title={tile.title}
              value={tile.value}
              subtitle={tile.subtitle}
              suffix={tile.suffix}
              color={tile.color}
              icon={tile.icon}
              previousValue={tile.previousValue}
            />
          </div>
        ))}
      </div>

      {/* Chart + Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-2"
          style={{
            animation: mounted ? 'fadeInUp 0.5s ease-out 0.5s both' : 'none',
          }}
        >
          <HourlyChart data={hourlyData} />
        </div>
        <div
          style={{
            animation: mounted ? 'fadeInUp 0.5s ease-out 0.6s both' : 'none',
          }}
        >
          <AlertsPanel alerts={alerts} onDismiss={dismissAlert} />
        </div>
      </div>

      {/* Recent Activity */}
      {recentSubmissions.length > 0 && (
        <div
          className="bg-white rounded-2xl border border-slate-200/60 p-6 transition-all duration-200"
          style={{
            animation: mounted ? 'fadeInUp 0.5s ease-out 0.7s both' : 'none',
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSubmissions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{sub.boothName}</p>
                    <p className="text-xs text-slate-500">{sub.submittedBy} submitted {sub.count} voter count</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {new Date(sub.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
