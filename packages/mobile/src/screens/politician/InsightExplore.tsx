// /politician → Explore tab — shows the politician's admin-assigned
// booths (server already enforces scope via /booths GET).  If the
// admin hasn't assigned anything, friendly CTA appears.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { COLORS } from '../../utils/constants';
import { FONTS } from '../../utils/theme';
import { InsightAppBar } from '../../components/politician/InsightAppBar';
import {
  Card,
  Section,
  Chip,
  Eyebrow,
  ScopeCrumb,
} from '../../components/politician/InsightAtoms';
import { usePoliticianScope } from '../../components/politician/usePoliticianScope';
import type { RootStackParamList, InsightTabParamList } from '../../types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<InsightTabParamList, 'InsightExplore'>,
  StackNavigationProp<RootStackParamList>
>;

interface BoothRow {
  _id: string;
  partNumber: number;
  name: string;
  assemblyConstituency: string;
  district: string;
  totalVoters?: number;
}

const InsightExplore: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const scope = usePoliticianScope();
  const [booths, setBooths] = useState<BoothRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    if (!scope.loading) load();
  }, [scope.loading, load]);

  return (
    <View style={styles.root}>
      <InsightAppBar
        title={scope.hasAssignedBooths ? 'Your booths' : 'Explore'}
        hi={scope.hasAssignedBooths ? 'आपके बूथ' : 'खोज'}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={COLORS.indigo}
          />
        }>
        <ScopeCrumb
          trail={[
            { lvl: 'STATE', label: 'Uttar Pradesh' },
            { lvl: 'DISTRICT', label: scope.district || '—' },
            {
              lvl: 'AC',
              label: scope.assemblyConstituency || 'Your seat',
            },
            { lvl: 'BOOTH', label: `${booths.length} assigned` },
          ]}
        />

        <View style={styles.body}>
        {scope.isEmpty && !scope.loading ? (
          <Card padding={18}>
            <Eyebrow color={COLORS.warning}>No scope assigned · पहुँच नहीं</Eyebrow>
            <Text style={styles.emptyTitle}>
              Ask your campaign admin to assign booths to you.
            </Text>
            <Text style={styles.emptyBody}>
              Insight Pro shows only the booths your subscription covers. Once your
              admin curates that list, your booths will show up here.
            </Text>
          </Card>
        ) : (
          <>
            {/* Drill-by-region entry point — gives access to screens 04 → 05 → 06
                (Districts → ACs → Booths) when the politician wants the full
                geography view rather than the flat booth list below. */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('InsightDistricts')}>
              <View style={styles.drillCta}>
                <View style={styles.drillIconWrap}>
                  <Icon name="compass-outline" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.drillTitle}>Drill by region</Text>
                  <Text style={styles.drillSub}>
                    State → District → AC → Booth
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color="rgba(255,255,255,0.6)" />
              </View>
            </TouchableOpacity>

            <Card padding={14}>
              <Section
                title={`Booth list · ${booths.length}`}
                hi="बूथ सूची"
                right={
                  <Chip tone="neutral">
                    {`${scope.assignedBoothIds.length || booths.length} assigned`}
                  </Chip>
                }
              />
              <View style={{ marginTop: 12 }}>
                {booths.length === 0 && !loading ? (
                  <Text style={styles.emptyRow}>
                    {scope.assignedBoothIds.length > 0
                      ? 'Your assigned booths haven\'t been imported yet. Ask admin to upload the voter roll.'
                      : 'No booths to show.'}
                  </Text>
                ) : (
                  booths.map((b, i) => (
                    <TouchableOpacity
                      key={b._id}
                      activeOpacity={0.7}
                      onPress={() =>
                        navigation.navigate('InsightVoterList', {
                          boothId: b._id,
                          boothName: b.name,
                          partNumber: b.partNumber,
                          assemblyConstituency: b.assemblyConstituency,
                        })
                      }
                      style={[
                        styles.boothRow,
                        i === 0 ? null : styles.boothRowDivider,
                      ]}>
                      <View style={styles.boothBullet} />
                      <Text style={styles.boothCode}>
                        B-{b.partNumber.toString().padStart(3, '0')}
                      </Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.boothName} numberOfLines={1}>
                          {b.name}
                        </Text>
                        <Text style={styles.boothMeta} numberOfLines={1}>
                          {b.assemblyConstituency}
                          {b.district ? ' · ' + b.district : ''}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={14} color={COLORS.muted} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </Card>
          </>
        )}
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { paddingBottom: 24 },
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
  emptyRow: {
    fontFamily: FONTS.ui,
    fontSize: 12,
    color: COLORS.muted,
    paddingVertical: 12,
    textAlign: 'center',
  },
  boothBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.indigo,
  },
  body: {
    padding: 14,
    gap: 12,
  },
  drillCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.indigoDeep,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#0B1426',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  drillIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    color: '#fff',
    letterSpacing: -0.2,
  },
  drillSub: {
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
    letterSpacing: 0.4,
  },
  boothRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  boothRowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairlineSoft,
  },
  boothCode: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.mutedDeep,
    letterSpacing: 0.4,
    width: 56,
  },
  boothName: {
    fontFamily: FONTS.uiSemiBold,
    fontSize: 13,
    color: COLORS.ink,
  },
  boothMeta: {
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    color: COLORS.muted,
    marginTop: 2,
    letterSpacing: 0.4,
  },
});

export default InsightExplore;
