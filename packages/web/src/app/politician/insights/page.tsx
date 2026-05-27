// /politician/insights — read-only analytics for the politician's
// admin-assigned booth slice.  All data is fetched from the server
// (already scoped via getPoliticianScope on every endpoint); sections
// only appear if their endpoint returned rows.  No demo content.

'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import PoliticianShell from '@/components/politician/Shell';
import {
  Card,
  Section,
  ScopeCrumb,
  Eyebrow,
} from '@/components/politician/Atoms';
import { BarList, StackBar } from '@/components/politician/Charts';
import { T, C_PALETTE } from '@/components/politician/tokens';
import { useAuth } from '@/hooks/useAuth';
import { usePoliticianScope } from '@/components/politician/usePoliticianScope';

interface BucketRow {
  key: string;
  count: number;
  verified?: number;
}

export default function PoliticianInsights() {
  const { user } = useAuth();
  const scope = usePoliticianScope();
  const seat = user?.assemblyConstituency || '—';
  const district = user?.district || '—';

  const [castes, setCastes] = useState<BucketRow[]>([]);
  const [intentions, setIntentions] = useState<BucketRow[]>([]);
  const [religions, setReligions] = useState<BucketRow[]>([]);
  const [genders, setGenders] = useState<BucketRow[]>([]);
  const [ages, setAges] = useState<BucketRow[]>([]);
  const [grievances, setGrievances] = useState<BucketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (scope.loading) return;
    (async () => {
      setLoading(true);
      try {
        const [ca, vi, re, ge, ag, gr] = await Promise.allSettled([
          api.get('/analytics/caste'),
          api.get('/analytics/voting-intention'),
          api.get('/analytics/religion'),
          api.get('/analytics/gender'),
          api.get('/analytics/age-distribution'),
          api.get('/analytics/grievances'),
        ]);
        if (ca.status === 'fulfilled') setCastes(ca.value.data?.data ?? []);
        if (vi.status === 'fulfilled') setIntentions(vi.value.data?.data ?? []);
        if (re.status === 'fulfilled') setReligions(re.value.data?.data ?? []);
        if (ge.status === 'fulfilled') setGenders(ge.value.data?.data ?? []);
        if (ag.status === 'fulfilled') setAges(ag.value.data?.data ?? []);
        if (gr.status === 'fulfilled') setGrievances(gr.value.data?.data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [scope.loading]);

  const totalSample = castes.reduce((s, r) => s + r.count, 0);

  const male = genders.find((g) => g.key === 'M')?.count || 0;
  const female = genders.find((g) => g.key === 'F')?.count || 0;
  const trans = genders.find((g) => g.key === 'T')?.count || 0;
  const totalGender = male + female + trans;
  const genderSegments =
    totalGender > 0
      ? [
          { key: 'M', value: male, color: C_PALETTE.M, label: 'Male' },
          { key: 'F', value: female, color: C_PALETTE.F, label: 'Female' },
          ...(trans > 0
            ? [{ key: 'T', value: trans, color: T.success, label: 'Other' }]
            : []),
        ]
      : [];

  const rows = (data: BucketRow[]) =>
    data.slice(0, 8).map((d) => ({
      label: d.key || 'Unknown',
      value: d.count,
    }));

  const anyData =
    castes.length || intentions.length || religions.length || ages.length || grievances.length || totalGender;

  return (
    <PoliticianShell
      title="Insights · विश्लेषण"
      topRight={
        <span
          style={{
            fontSize: 11,
            fontFamily: T.fontMono,
            color: T.muted,
            letterSpacing: 0.6,
            fontWeight: 600,
          }}>
          {totalSample > 0
            ? `SAMPLE n=${totalSample.toLocaleString('en-IN')}`
            : '—'}
        </span>
      }>
      <ScopeCrumb
        trail={[
          { lvl: 'STATE', label: 'Uttar Pradesh' },
          { lvl: 'DISTRICT', label: district },
          { lvl: 'AC', label: seat, active: true },
        ]}
      />

      {!loading && !scope.loading && !anyData ? (
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
            No analytics for your assigned booths yet.
          </div>
          <p
            style={{
              fontSize: 12.5,
              color: T.mutedDeep,
              marginTop: 6,
              lineHeight: 1.5,
              maxWidth: 640,
            }}>
            Once voters are imported and visited, breakdowns by caste,
            religion, age, gender, voting intention and grievances will
            appear here.
          </p>
        </Card>
      ) : null}

      {/* Gender mix */}
      {totalGender > 0 ? (
        <Card p={14}>
          <Section
            title="Gender mix"
            hi="लिंग वितरण"
            right={
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: 11,
                  color: T.muted,
                  letterSpacing: 0.4,
                }}>
                {totalGender.toLocaleString('en-IN')} voters
              </span>
            }
          />
          <div style={{ marginTop: 12 }}>
            <StackBar segments={genderSegments} height={14} />
          </div>
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
            }}>
            {genderSegments.map((s) => (
              <div
                key={s.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: T.fontUI,
                  fontWeight: 600,
                  fontSize: 12,
                  color: T.mutedDeep,
                }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: s.color,
                    borderRadius: 2,
                  }}
                />
                {s.label}{' '}
                <span style={{ fontFamily: T.fontMono, color: T.muted }}>
                  {Math.round((s.value / totalGender) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Voting intention */}
      {intentions.length > 0 ? (
        <Card p={14}>
          <Section title="Voting intention" hi="मतदान रुझान" />
          <div style={{ marginTop: 12 }}>
            <BarList
              rows={rows(intentions)}
              accent={T.indigo}
              max={Math.max(...intentions.map((i) => i.count), 1)}
            />
          </div>
        </Card>
      ) : null}

      {/* Caste */}
      {castes.length > 0 ? (
        <Card p={14}>
          <Section title="Caste breakdown" hi="जाति वितरण" />
          <div style={{ marginTop: 12 }}>
            <BarList
              rows={rows(castes)}
              accent={T.brass}
              max={Math.max(...castes.map((c) => c.count), 1)}
            />
          </div>
        </Card>
      ) : null}

      {/* Religion */}
      {religions.length > 0 ? (
        <Card p={14}>
          <Section title="Religion" hi="धर्म" />
          <div style={{ marginTop: 12 }}>
            <BarList
              rows={rows(religions)}
              accent={T.info}
              max={Math.max(...religions.map((r) => r.count), 1)}
            />
          </div>
        </Card>
      ) : null}

      {/* Age distribution */}
      {ages.length > 0 ? (
        <Card p={14}>
          <Section title="Age distribution" hi="आयु वितरण" />
          <div style={{ marginTop: 12 }}>
            <BarList
              rows={rows(ages)}
              accent={T.indigoDeep}
              max={Math.max(...ages.map((a) => a.count), 1)}
            />
          </div>
        </Card>
      ) : null}

      {/* Grievances */}
      {grievances.length > 0 ? (
        <Card p={14}>
          <Section title="Top grievances" hi="शिकायतें" />
          <div style={{ marginTop: 12 }}>
            <BarList
              rows={rows(grievances)}
              accent={T.danger}
              max={Math.max(...grievances.map((g) => g.count), 1)}
            />
          </div>
        </Card>
      ) : null}
    </PoliticianShell>
  );
}
