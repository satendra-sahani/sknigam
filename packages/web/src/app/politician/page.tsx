// /politician — Home dashboard (web).
//
// Read-only.  Shows ONLY data the server returns for this politician's
// admin-assigned booths.  Every section disappears gracefully if the
// API returns nothing — no demo/fake content under the politician's
// name.
//
// Endpoints (all server-side scoped to assigned booths):
//   GET /api/analytics/overview        — voter / booth totals
//   GET /api/voters/stats/summary      — verified / male / female
//   GET /api/analytics/caste           — caste breakdown
//   GET /api/analytics/voting-intention — voting intention
//   GET /api/booths                    — assigned booth list

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import PoliticianShell from '@/components/politician/Shell';
import {
  Card,
  Section,
  KPI,
  LeanBadge,
  Eyebrow,
  Chip,
  Progress,
} from '@/components/politician/Atoms';
import { BarList } from '@/components/politician/Charts';
import { T, C_PALETTE } from '@/components/politician/tokens';
import { usePoliticianScope } from '@/components/politician/usePoliticianScope';

interface BucketRow {
  key: string;
  count: number;
  verified?: number;
}

interface BoothRow {
  _id: string;
  partNumber: number;
  name: string;
  assemblyConstituency: string;
}

interface Summary {
  total: number;
  verified: number;
  male: number;
  female: number;
  verificationRate: number;
}

interface Overview {
  totalVoters: number;
  verified: number;
  totalBooths: number;
}

const ZERO_SUMMARY: Summary = {
  total: 0,
  verified: 0,
  male: 0,
  female: 0,
  verificationRate: 0,
};

export default function PoliticianHome() {
  const { user } = useAuth();
  const scope = usePoliticianScope();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [summary, setSummary] = useState<Summary>(ZERO_SUMMARY);
  const [castes, setCastes] = useState<BucketRow[]>([]);
  const [intentions, setIntentions] = useState<BucketRow[]>([]);
  const [booths, setBooths] = useState<BoothRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, sum, ca, vi, bo] = await Promise.allSettled([
        api.get('/analytics/overview'),
        api.get('/voters/stats/summary'),
        api.get('/analytics/caste'),
        api.get('/analytics/voting-intention'),
        api.get('/booths', { params: { limit: 5 } }),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value.data?.data ?? null);
      if (sum.status === 'fulfilled') setSummary(sum.value.data?.data ?? ZERO_SUMMARY);
      if (ca.status === 'fulfilled') setCastes(ca.value.data?.data ?? []);
      if (vi.status === 'fulfilled') setIntentions(vi.value.data?.data ?? []);
      if (bo.status === 'fulfilled') setBooths(bo.value.data?.data?.booths ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!scope.loading) {
      void load();
    }
  }, [scope.loading, load]);

  const hour = new Date().getHours();
  const greetEn =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetHi = hour < 12 ? 'सुप्रभात' : hour < 17 ? 'नमस्ते' : 'शुभ संध्या';

  const name = user?.name || 'Politician';
  const seat = user?.assemblyConstituency
    ? `${user.assemblyConstituency}${user.district ? ' · ' + user.district : ''}`
    : '—';
  const party = (user as any)?.partyAffiliation || '';

  const totalVoters = overview?.totalVoters ?? summary.total ?? 0;
  const verified = overview?.verified ?? summary.verified ?? 0;
  const verifiedPct = totalVoters > 0 ? Math.round((verified / totalVoters) * 100) : 0;
  const totalBooths =
    scope.assignedBoothIds.length || overview?.totalBooths || booths.length || 0;
  const male = summary.male ?? 0;
  const female = summary.female ?? 0;
  const malePct = totalVoters > 0 ? Math.round((male / totalVoters) * 100) : 0;
  const femalePct = totalVoters > 0 ? Math.round((female / totalVoters) * 100) : 0;

  // Build the caste bar rows; map known buckets to Civic colors so the
  // legend stays on-palette.  Unknown buckets fall back to mutedDeep.
  const casteColorFor = (k: string): string =>
    (C_PALETTE as any)[k.toUpperCase()] || T.mutedDeep;

  const casteRows = castes.slice(0, 8).map((c) => ({
    label: c.key || 'Unknown',
    value: c.count,
    color: casteColorFor(c.key || ''),
  }));
  const intentionRows = intentions.slice(0, 8).map((i) => ({
    label: i.key || 'Unknown',
    value: i.count,
  }));

  const hasAnyData =
    totalVoters > 0 || castes.length > 0 || intentions.length > 0 || booths.length > 0;

  return (
    <PoliticianShell>
      {/* Greeting block — pure user data, no fixtures */}
      <div style={{ padding: '4px 2px 0' }}>
        <div
          style={{
            fontSize: 10,
            fontFamily: T.fontMono,
            color: T.muted,
            letterSpacing: 1,
            textTransform: 'uppercase',
            fontWeight: 700,
          }}>
          {greetEn} ·{' '}
          <span style={{ fontFamily: T.fontHi, letterSpacing: 0 }}>{greetHi}</span>
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: -0.4,
            lineHeight: 1.1,
            color: T.ink,
          }}>
          {name}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 11.5,
            color: T.mutedDeep,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}>
          {party ? <LeanBadge lean={party} /> : null}
          {seat !== '—' ? (
            <span style={{ fontFamily: T.fontMono, letterSpacing: 0.4 }}>{seat}</span>
          ) : null}
        </div>
        <div style={{ marginTop: 10 }}>
          {scope.loading ? (
            <Chip tone="neutral">
              <span style={{ fontFamily: T.fontMono, letterSpacing: 0.4 }}>Loading…</span>
            </Chip>
          ) : scope.hasAssignedBooths ? (
            <Chip tone="success">
              <span style={{ fontFamily: T.fontMono, letterSpacing: 0.4 }}>
                {scope.assignedBoothIds.length} booths assigned
              </span>
            </Chip>
          ) : scope.isEmpty ? (
            <Chip tone="warning">
              <span style={{ fontFamily: T.fontMono, letterSpacing: 0.4 }}>
                No scope · ask admin
              </span>
            </Chip>
          ) : (
            <Chip tone="neutral">
              <span style={{ fontFamily: T.fontMono, letterSpacing: 0.4 }}>
                AC-wide view
              </span>
            </Chip>
          )}
        </div>
      </div>

      {/* Empty-scope CTA */}
      {!scope.loading && scope.isEmpty ? (
        <Card p={14} style={{ borderColor: T.warning, background: T.warningSoft }}>
          <Eyebrow color={T.warning}>Scope not assigned · पहुँच नहीं</Eyebrow>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: T.ink,
              marginTop: 6,
              letterSpacing: -0.1,
            }}>
            Your campaign admin hasn&apos;t assigned any booths to you yet.
          </div>
          <p
            style={{
              fontSize: 11.5,
              color: T.mutedDeep,
              marginTop: 6,
              lineHeight: 1.5,
            }}>
            Insight Pro shows only the booths your subscription covers.
          </p>
        </Card>
      ) : null}

      {/* KPI 2x2 — derived from real analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <KPI
          label="Voters in scope"
          hi="मतदाता"
          value={totalVoters.toLocaleString('en-IN')}
          sub={
            totalVoters > 0
              ? `${totalBooths} booth${totalBooths === 1 ? '' : 's'}`
              : 'No voters imported'
          }
        />
        <KPI
          label="Verified"
          hi="सत्यापित"
          value={totalVoters > 0 ? `${verifiedPct}%` : '—'}
          sub={
            totalVoters > 0
              ? `${verified.toLocaleString('en-IN')} of ${totalVoters.toLocaleString('en-IN')}`
              : 'No data yet'
          }
          accent={verifiedPct >= 50 ? '#1F7A4E' : undefined}
        />
        <KPI
          label="Booths"
          hi="बूथ"
          value={totalBooths.toLocaleString('en-IN')}
          sub={
            scope.hasAssignedBooths
              ? 'assigned by admin'
              : scope.assemblyConstituency
              ? 'in your AC'
              : 'No booths'
          }
          accent={T.indigo}
          tone="indigoSoft"
        />
        <KPI
          label="Gender mix"
          hi="लिंग"
          value={totalVoters > 0 ? `${malePct}/${femalePct}` : '—'}
          sub={totalVoters > 0 ? 'male / female %' : 'No data yet'}
        />
      </div>

      {/* Verification coverage — only when we have voters */}
      {totalVoters > 0 ? (
        <Card p={14}>
          <Section
            title="Verification coverage"
            hi="सत्यापन प्रगति"
            right={
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  color: verifiedPct >= 50 ? '#1F7A4E' : T.muted,
                }}>
                {verifiedPct}%
              </span>
            }
          />
          <div style={{ marginTop: 12 }}>
            <Progress
              value={verifiedPct}
              tone={verifiedPct >= 50 ? 'success' : 'indigo'}
              height={8}
            />
          </div>
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: T.fontMono,
              fontSize: 10.5,
              color: T.mutedDeep,
              letterSpacing: 0.4,
            }}>
            <span>{verified.toLocaleString('en-IN')} verified</span>
            <span>{(totalVoters - verified).toLocaleString('en-IN')} pending</span>
          </div>
        </Card>
      ) : null}

      {/* Caste breakdown — only when the API returned rows */}
      {casteRows.length > 0 ? (
        <Card p={14}>
          <Section title="Caste breakdown" hi="जाति वितरण" />
          <div style={{ marginTop: 12 }}>
            <BarList
              rows={casteRows.map((r) => ({ label: r.label, value: r.value }))}
              accent={T.brass}
              max={Math.max(...casteRows.map((r) => r.value), 1)}
            />
          </div>
        </Card>
      ) : null}

      {/* Voting intention — only when the API returned rows */}
      {intentionRows.length > 0 ? (
        <Card p={14}>
          <Section title="Voting intention" hi="मतदान रुझान" />
          <div style={{ marginTop: 12 }}>
            <BarList
              rows={intentionRows}
              accent={T.indigo}
              max={Math.max(...intentionRows.map((r) => r.value), 1)}
            />
          </div>
        </Card>
      ) : null}

      {/* Assigned booths preview — only when there are booths */}
      {booths.length > 0 ? (
        <Card p={14}>
          <Section
            title="Your booths"
            hi="आपके बूथ"
            right={
              totalBooths > booths.length ? (
                <Link
                  href="/politician/explore"
                  style={{
                    fontFamily: T.fontUI,
                    fontWeight: 600,
                    fontSize: 11,
                    color: T.indigo,
                    textDecoration: 'none',
                  }}>
                  +{totalBooths - booths.length} more →
                </Link>
              ) : null
            }
          />
          <div style={{ marginTop: 12 }}>
            {booths.slice(0, 5).map((b, i) => (
              <div
                key={b._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 0',
                  borderTop: i === 0 ? 'none' : `1px solid ${T.hairlineSoft}`,
                }}>
                <span
                  style={{
                    fontFamily: T.fontMono,
                    fontWeight: 700,
                    fontSize: 11,
                    color: T.mutedDeep,
                    letterSpacing: 0.4,
                    width: 56,
                  }}>
                  B-{b.partNumber.toString().padStart(3, '0')}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: T.fontUI,
                      fontWeight: 600,
                      fontSize: 13,
                      color: T.ink,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                    {b.name}
                  </div>
                  <div
                    style={{
                      fontFamily: T.fontMono,
                      fontSize: 10.5,
                      color: T.muted,
                      letterSpacing: 0.4,
                      marginTop: 2,
                    }}>
                    {b.assemblyConstituency}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Friendly empty state — appears when scope is set but the
          assigned booths haven't been imported yet.  Better than
          painting fake numbers under the politician's name. */}
      {!loading && !scope.loading && !scope.isEmpty && !hasAnyData ? (
        <Card p={18}>
          <Eyebrow>No data yet · डेटा नहीं</Eyebrow>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: T.ink,
              marginTop: 6,
              letterSpacing: -0.1,
            }}>
            Your assigned booths haven&apos;t been imported yet.
          </div>
          <p
            style={{
              fontSize: 12.5,
              color: T.mutedDeep,
              marginTop: 6,
              lineHeight: 1.5,
            }}>
            Once your admin uploads the voter roll for the booths assigned to
            you, charts and totals will appear here. Until then, nothing else
            to show.
          </p>
        </Card>
      ) : null}
    </PoliticianShell>
  );
}
