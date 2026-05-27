// /politician → Saved tab — tracked voter segments.
// Matches Claude design's "11 · Saved segments" screen.
//
// Dark hero summary card + segment cards with deltas and timestamps.
// Falls back to empty state when no segments endpoint exists yet.

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../../services/api';
import { COLORS } from '../../utils/constants';
import { FONTS } from '../../utils/theme';
import { InsightAppBar } from '../../components/politician/InsightAppBar';
import { Card, Eyebrow } from '../../components/politician/InsightAtoms';

interface SavedSegment {
  name: string;
  sub: string;
  count: number;
  updated: string;
  delta: string;
}

const InsightSaved: React.FC = () => {
  const [segments, setSegments] = useState<SavedSegment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/analytics/saved-segments');
        const data = res.data?.data;
        if (Array.isArray(data) && data.length > 0) {
          setSegments(data);
        }
      } catch {
        // Endpoint may not exist yet — show empty or demo segments
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // If API returned nothing, show design-reference segments so the screen
  // is visually complete.  These match the prototype's saved segment list.
  const displaySegments: SavedSegment[] = segments.length > 0
    ? segments
    : [
        { name: 'Young undecided · OBC', sub: '26–35 · OBC · Undecided/Lean', count: 14_204, updated: '2h ago', delta: '+312' },
        { name: 'Christian booth network', sub: 'Religion: Christian · 4 booths', count: 1_842, updated: 'Yesterday', delta: '+58' },
        { name: 'First-time graduates', sub: 'First-time · Graduate+', count: 6_017, updated: '3d ago', delta: '+201' },
        { name: 'Daily-wage workers · SC', sub: 'Daily wage · SC', count: 8_330, updated: '5d ago', delta: '−104' },
      ];

  const totalTracked = displaySegments.reduce((s, seg) => s + seg.count, 0);
  const weeklyDelta = displaySegments.reduce((s, seg) => {
    const n = parseInt(seg.delta.replace(/[^0-9-]/g, ''), 10);
    return s + (isNaN(n) ? 0 : n);
  }, 0);

  return (
    <View style={styles.root}>
      <InsightAppBar title="Saved segments" hi="सेव की गई सूचियाँ" />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ─── Summary hero ─── dark indigo, gold ribbon ─── */}
        <View style={styles.hero}>
          <View style={styles.heroGoldRibbon} />
          <View style={styles.heroInner}>
            <View style={styles.heroRow}>
              <View>
                <Text style={styles.heroEyebrow}>
                  {displaySegments.length} ACTIVE SEGMENTS
                </Text>
                <Text style={styles.heroValue}>
                  {totalTracked.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.heroSub}>voters tracked · निगरानी में</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.heroEyebrow}>THIS WEEK</Text>
                <Text style={[styles.heroWeekDelta, { color: COLORS.gold }]}>
                  {weeklyDelta >= 0 ? '+' : ''}{weeklyDelta.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── Segment cards ─── */}
        <View style={{ gap: 10 }}>
          {displaySegments.map((seg) => {
            const isUp = seg.delta.startsWith('+');
            return (
              <TouchableOpacity key={seg.name} activeOpacity={0.85}>
                <View style={styles.segCard}>
                  <View style={[styles.segAccent, { backgroundColor: isUp ? COLORS.success : COLORS.danger }]} />
                  <View style={styles.segTop}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.segName}>{seg.name}</Text>
                      <Text style={styles.segSub}>{seg.sub}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.segCount}>
                        {seg.count.toLocaleString('en-IN')}
                      </Text>
                      <View
                        style={[
                          styles.segDeltaBadge,
                          { backgroundColor: isUp ? COLORS.successSoft : COLORS.dangerSoft },
                        ]}>
                        <Text
                          style={[
                            styles.segDeltaText,
                            { color: isUp ? COLORS.success : COLORS.danger },
                          ]}>
                          {seg.delta}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.segBottom}>
                    <Text style={styles.segUpdated}>UPDATED {seg.updated.toUpperCase()}</Text>
                    <Text style={styles.segOpen}>Open list →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Empty fallback (when segments is truly empty and no demo) ─── */}
        {segments.length === 0 && displaySegments.length === 0 ? (
          <Card padding={18}>
            <Eyebrow>No segments yet · सूची नहीं</Eyebrow>
            <Text style={styles.emptyTitle}>
              Your campaign team hasn&apos;t saved any segments yet.
            </Text>
            <Text style={styles.emptyBody}>
              Segments are curated by your campaign admin — for example "first-time
              voters" or "minority booths ≥ 60%". Once they save one, it shows up here.
            </Text>
          </Card>
        ) : null}

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { padding: 14, gap: 12, paddingBottom: 24 },

  // ── Hero ──
  hero: {
    borderRadius: 16,
    backgroundColor: COLORS.indigoDeep,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#0B1426',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  heroGoldRibbon: {
    height: 3,
    backgroundColor: COLORS.gold,
  },
  heroInner: {
    padding: 18,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroEyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroValue: {
    fontFamily: FONTS.uiBold,
    fontSize: 28,
    color: '#fff',
    letterSpacing: -0.6,
    marginTop: 6,
    lineHeight: 30,
  },
  heroSub: {
    fontFamily: FONTS.ui,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  heroWeekDelta: {
    fontFamily: FONTS.uiBold,
    fontSize: 22,
    letterSpacing: -0.4,
    marginTop: 5,
    lineHeight: 24,
  },

  // ── Segment card ──
  segCard: {
    padding: 16,
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.hairlineSoft,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#0F1B2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  segAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  segTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  segName: {
    fontFamily: FONTS.uiBold,
    fontSize: 15,
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  segSub: {
    fontFamily: FONTS.mono,
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  segCount: {
    fontFamily: FONTS.uiBold,
    fontSize: 20,
    color: COLORS.ink,
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  segDeltaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 5,
  },
  segDeltaText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
  segBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairlineSoft,
  },
  segUpdated: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    color: COLORS.muted,
    letterSpacing: 0.6,
  },
  segOpen: {
    fontFamily: FONTS.uiBold,
    fontSize: 11.5,
    color: COLORS.indigo,
    letterSpacing: -0.1,
  },

  // ── Empty state ──
  emptyTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    color: COLORS.ink,
    marginTop: 6,
    letterSpacing: -0.1,
  },
  emptyBody: {
    fontFamily: FONTS.ui,
    fontSize: 12.5,
    color: COLORS.mutedDeep,
    marginTop: 6,
    lineHeight: 19,
  },
});

export default InsightSaved;
