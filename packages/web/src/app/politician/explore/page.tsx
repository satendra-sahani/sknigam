// /politician/explore — politician's assigned booths.
//
// Politicians are pre-scoped to a fixed list of booths by admin
// (User.assignedBoothIds).  There's no drill flow to expose — every
// API call already returns only those booths.  This page just lists
// them, plus a friendly empty state when scope is unset.

'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import PoliticianShell from '@/components/politician/Shell';
import {
  Card,
  Section,
  Chip,
  Eyebrow,
  ScopeCrumb,
} from '@/components/politician/Atoms';
import { T } from '@/components/politician/tokens';
import { usePoliticianScope } from '@/components/politician/usePoliticianScope';

interface BoothRow {
  _id: string;
  partNumber: number;
  name: string;
  assemblyConstituency: string;
  district?: string;
  totalVoters?: number;
}

export default function PoliticianExplore() {
  const scope = usePoliticianScope();
  const [booths, setBooths] = useState<BoothRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/booths', { params: { limit: 200 } });
      setBooths((res.data?.data?.booths || []) as BoothRow[]);
    } catch {
      setBooths([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!scope.loading) void load();
  }, [scope.loading, load]);

  // Empty-scope CTA — admin hasn't assigned anything.
  if (!scope.loading && scope.isEmpty) {
    return (
      <PoliticianShell title="Explore · खोज">
        <Card p={20}>
          <Eyebrow color={T.warning}>No scope assigned · पहुँच नहीं</Eyebrow>
          <div
            style={{
              marginTop: 8,
              fontSize: 17,
              fontWeight: 700,
              color: T.ink,
              letterSpacing: -0.2,
            }}>
            Ask your campaign admin to assign booths to you.
          </div>
          <p
            style={{
              marginTop: 8,
              fontSize: 12.5,
              color: T.mutedDeep,
              lineHeight: 1.5,
              maxWidth: 620,
            }}>
            Insight Pro shows only the booths your subscription covers. Once
            your admin curates that list, your booths will show up here.
          </p>
        </Card>
      </PoliticianShell>
    );
  }

  return (
    <PoliticianShell
      title={scope.hasAssignedBooths ? 'Your booths · आपके बूथ' : 'Explore · खोज'}
      topRight={loading ? <Eyebrow color={T.muted}>Loading…</Eyebrow> : null}>
      <ScopeCrumb
        trail={[
          { lvl: 'STATE', label: 'Uttar Pradesh' },
          { lvl: 'DISTRICT', label: scope.district || '—' },
          {
            lvl: 'AC',
            label: scope.assemblyConstituency || 'Your seat',
          },
          { lvl: 'BOOTH', label: `${booths.length} assigned`, active: true },
        ]}
      />

      <Card p={16}>
        <Section
          title={`Booth list · ${booths.length}`}
          hi="बूथ सूची"
          right={
            <Chip tone="neutral">
              <span style={{ fontFamily: T.fontMono, letterSpacing: 0.4 }}>
                {scope.assignedBoothIds.length || booths.length} assigned
              </span>
            </Chip>
          }
        />
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${T.hairlineSoft}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}>
          {booths.length === 0 && !loading ? (
            <div
              style={{
                padding: 24,
                fontSize: 12.5,
                color: T.muted,
                textAlign: 'center',
                lineHeight: 1.5,
              }}>
              {scope.assignedBoothIds.length > 0
                ? "Your assigned booths haven't been imported yet. Ask admin to upload the voter roll for these booths."
                : 'No booths to show.'}
            </div>
          ) : (
            booths.map((b, i) => (
              <div
                key={b._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: T.paper,
                  borderTop: i === 0 ? 'none' : `1px solid ${T.hairlineSoft}`,
                }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    background: T.indigo,
                  }}
                />
                <span
                  style={{
                    width: 64,
                    fontFamily: T.fontMono,
                    fontSize: 11.5,
                    color: T.mutedDeep,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}>
                  B-{b.partNumber.toString().padStart(3, '0')}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: T.ink,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                    {b.name}
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      fontFamily: T.fontMono,
                      color: T.muted,
                      letterSpacing: 0.4,
                      marginTop: 2,
                    }}>
                    {b.assemblyConstituency}
                    {b.district ? ' · ' + b.district : ''}
                    {typeof b.totalVoters === 'number' && b.totalVoters > 0
                      ? ' · ' + b.totalVoters.toLocaleString('en-IN') + ' voters'
                      : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </PoliticianShell>
  );
}
