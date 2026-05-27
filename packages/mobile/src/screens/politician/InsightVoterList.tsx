// /politician → Voter list (07 of the Insight canvas).
//
// Lists voters within the politician's scope (server enforces this).
// Optionally filtered to a single booth via route params.  Top-of-page
// shows active filter chips; below that a big indigo "result band"
// with the count.  Bottom-right FAB opens the filter sheet (08).
// Tapping a voter pushes the profile screen (09).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import api from '../../services/api';
import { COLORS } from '../../utils/constants';
import { FONTS } from '../../utils/theme';
import { InsightAppBar } from '../../components/politician/InsightAppBar';
import {
  Card,
  ScopeCrumb,
  SentDot,
  Eyebrow,
} from '../../components/politician/InsightAtoms';
import InsightFilterSheet, {
  FilterState,
  emptyFilters,
  describeFilters,
} from './InsightFilterSheet';
import type { RootStackParamList, VoterData } from '../../types';

type Nav = StackNavigationProp<RootStackParamList, 'InsightVoterList'>;
type Rt = RouteProp<RootStackParamList, 'InsightVoterList'>;

interface Props {
  navigation: Nav;
  route: Rt;
}

interface VoterRow extends VoterData {
  visitDate?: string;
}

const InsightVoterListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { boothId, boothName, partNumber, assemblyConstituency } = route.params || {};

  const [filters, setFilters] = useState<FilterState>(emptyFilters());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [voters, setVoters] = useState<VoterRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build the query parameters for /voters.  Server already enforces
  // politician booth scope; we just layer on the user-picked filters
  // and the booth/AC narrowing from route params.
  const params = useMemo(() => {
    const p: any = { limit: 60 };
    if (boothId) p.boothId = boothId;
    if (assemblyConstituency) p.assemblyConstituency = assemblyConstituency;
    if (filters.gender.length === 1) p.gender = filters.gender[0];
    if (filters.caste.length === 1) p.caste = filters.caste[0];
    if (filters.subCaste.length === 1) p.subCaste = filters.subCaste[0];
    if (filters.religion.length === 1) p.religion = filters.religion[0];
    if (filters.votingIntention.length === 1) p.votingIntention = filters.votingIntention[0];
    if (filters.educationLevel.length === 1) p.educationLevel = filters.educationLevel[0];
    if (filters.verificationStatus !== undefined) {
      p.verificationStatus = filters.verificationStatus ? 'true' : 'false';
    }
    if (filters.ageMin !== undefined) p.ageMin = filters.ageMin;
    if (filters.ageMax !== undefined) p.ageMax = filters.ageMax;
    if (filters.search) p.search = filters.search;
    return p;
  }, [boothId, assemblyConstituency, filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/voters', { params });
      const data = res.data?.data;
      setVoters(data?.voters || []);
      setTotal(data?.pagination?.total ?? data?.voters?.length ?? 0);
    } catch (err: any) {
      setVoters([]);
      setTotal(0);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to load voters';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeChips = describeFilters(filters);

  return (
    <View style={styles.root}>
      <InsightAppBar
        title={boothName ? `Voters · B-${(partNumber ?? 0).toString().padStart(3, '0')}` : 'Voters'}
        hi={boothName ? `मतदाता · ${boothName}` : 'मतदाता'}
        back={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 96 }}
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
        {assemblyConstituency || boothName ? (
          <ScopeCrumb
            trail={[
              { lvl: 'AC', label: assemblyConstituency || '—' },
              ...(boothName
                ? [{ lvl: 'BOOTH', label: `B-${(partNumber ?? 0).toString().padStart(3, '0')} · ${boothName}` }]
                : []),
            ]}
          />
        ) : null}

        {/* Active filter chips strip */}
        <View style={styles.chipsRow}>
          <Text style={styles.chipsLabel}>ACTIVE</Text>
          {activeChips.length === 0 ? (
            <Text style={styles.chipsEmpty}>None — showing all voters in scope</Text>
          ) : (
            activeChips.map((c) => (
              <View key={c.key} style={styles.chip}>
                <Text style={styles.chipText}>
                  {c.label}
                  {c.sub ? <Text style={styles.chipSub}> · {c.sub}</Text> : null}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Indigo result band */}
        <View style={styles.resultBand}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.resultCount}>
              {voters.length.toLocaleString('en-IN')}
              <Text style={styles.resultCountSub}>
                {' / '}
                {total.toLocaleString('en-IN')} voters match
              </Text>
            </Text>
            <Text style={styles.resultCountHi}>
              {voters.length} मतदाता मेल खाते हैं
            </Text>
          </View>
        </View>

        {/* Voter rows */}
        {loading ? (
          <View style={{ padding: 36, alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.indigo} />
          </View>
        ) : error ? (
          <Card padding={18} style={{ margin: 14 }}>
            <Eyebrow color={COLORS.danger}>Error · त्रुटि</Eyebrow>
            <Text style={styles.emptyTitle}>
              Could not load voters
            </Text>
            <Text style={styles.emptyBody}>{error}</Text>
            <TouchableOpacity
              style={{ marginTop: 12, alignSelf: 'flex-start', backgroundColor: COLORS.indigo, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
              onPress={() => load()}>
              <Text style={{ fontFamily: FONTS.uiBold, fontSize: 12, color: '#fff' }}>Retry</Text>
            </TouchableOpacity>
          </Card>
        ) : voters.length === 0 ? (
          <Card padding={18} style={{ margin: 14 }}>
            <Eyebrow>No voters · कोई मतदाता नहीं</Eyebrow>
            <Text style={styles.emptyTitle}>
              No voters match your current filters.
            </Text>
            <Text style={styles.emptyBody}>
              Adjust the filters from the floating button, or pull-to-refresh
              if you think this is a sync issue.
            </Text>
          </Card>
        ) : (
          <View style={{ backgroundColor: '#FAF8F2' }}>
            {voters.map((v) => {
              const initials = (v.fullName || '?')
                .split(/\s+/)
                .map((w) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
              const visited = !!v.visitDate || v.verificationStatus;
              return (
                <TouchableOpacity
                  key={v._id}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('InsightVoterProfile', { voterId: v._id })
                  }
                  style={styles.voterRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.voterTopRow}>
                      <Text style={styles.voterName} numberOfLines={1}>
                        {v.fullName}
                      </Text>
                      <Text style={styles.voterAge}>
                        {v.age || '—'}
                        {v.gender || ''}
                      </Text>
                    </View>
                    <View style={styles.voterMetaRow}>
                      <SentDot value={0} />
                      <Text style={styles.voterMeta} numberOfLines={1}>
                        {v.caste || 'Caste —'}
                        {v.subCaste ? ' · ' + v.subCaste : ''}
                        {' · '}
                        <Text style={styles.voterMetaMono}>{v.epicNumber}</Text>
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: visited ? '#DDEFE4' : COLORS.warningSoft,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: visited ? '#0F4A2D' : '#7A5008' },
                      ]}>
                      {visited ? 'MET' : 'NEW'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating filter button (FAB) */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setSheetOpen(true)}
        style={styles.fab}>
        <Icon name="tune-variant" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Filter sheet modal */}
      <InsightFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
        resultCount={voters.length}
        totalCount={total}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cream },
  chipsRow: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.cream,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairlineSoft,
  },
  chipsLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginRight: 4,
  },
  chipsEmpty: {
    fontFamily: FONTS.ui,
    fontSize: 11,
    color: COLORS.muted,
  },
  chip: {
    backgroundColor: COLORS.indigoSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipText: {
    fontFamily: FONTS.uiSemiBold,
    fontSize: 11,
    color: COLORS.indigoDeep,
  },
  chipSub: {
    fontFamily: FONTS.ui,
    fontWeight: '500',
    opacity: 0.7,
  },
  resultBand: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: COLORS.indigo,
  },
  resultCount: {
    fontFamily: FONTS.uiBold,
    fontSize: 18,
    color: '#fff',
    letterSpacing: -0.3,
  },
  resultCountSub: {
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  resultCountHi: {
    fontFamily: FONTS.hi,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  voterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairlineSoft,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    color: COLORS.indigoDeep,
    letterSpacing: 0.3,
  },
  voterTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  voterName: {
    fontFamily: FONTS.uiBold,
    fontSize: 13.5,
    color: COLORS.ink,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  voterAge: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.muted,
  },
  voterMetaRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voterMeta: {
    flex: 1,
    fontFamily: FONTS.ui,
    fontSize: 10.5,
    color: COLORS.mutedDeep,
  },
  voterMetaMono: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.muted,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
  },
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

export default InsightVoterListScreen;
