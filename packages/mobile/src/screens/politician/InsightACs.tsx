// /politician → ACs (05 of the Insight canvas).
//
// Lists Vidhan Sabha constituencies within the picked district that the
// politician has scope into.  Tapping a row drills to InsightBooths.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
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
  Section,
  ScopeCrumb,
  Eyebrow,
} from '../../components/politician/InsightAtoms';
import type { RootStackParamList } from '../../types';

type Nav = StackNavigationProp<RootStackParamList, 'InsightACs'>;
type Rt = RouteProp<RootStackParamList, 'InsightACs'>;

interface Props {
  navigation: Nav;
  route: Rt;
}

interface ACRow {
  number: number;
  assemblyConstituency: string;
  district: string;
  booths: number;
  totalVoters: number;
  verified: number;
}

const InsightACsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { district } = route.params;
  const [rows, setRows] = useState<ACRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/hierarchy/constituencies', {
        params: { district },
      });
      setRows((res.data?.data || []) as ACRow[]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [district]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalACs = rows.length;
  const totalVoters = rows.reduce((s, r) => s + (r.totalVoters || 0), 0);
  const totalBooths = rows.reduce((s, r) => s + (r.booths || 0), 0);

  return (
    <View style={styles.root}>
      <InsightAppBar
        title={`${district} · ${totalACs} AC${totalACs === 1 ? '' : 's'}`}
        hi={`${district} · विधानसभा`}
        back={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <ScopeCrumb
          trail={[
            { lvl: 'STATE', label: 'Uttar Pradesh' },
            { lvl: 'DISTRICT', label: district },
            { lvl: 'AC', label: 'Pick one' },
          ]}
        />

        {/* Summary card */}
        {totalACs > 0 ? (
          <Card padding={12}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryValue}>{totalACs}</Text>
                <Text style={styles.summaryKey}>ACs</Text>
                <Text style={styles.summaryHi}>विधानसभा</Text>
              </View>
              <View style={[styles.summaryCell, styles.summaryCellBorder]}>
                <Text style={styles.summaryValue}>
                  {totalBooths.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.summaryKey}>Booths</Text>
                <Text style={styles.summaryHi}>बूथ</Text>
              </View>
              <View style={[styles.summaryCell, styles.summaryCellBorder]}>
                <Text style={styles.summaryValue}>
                  {totalVoters >= 100000
                    ? (totalVoters / 100000).toFixed(1) + 'L'
                    : (totalVoters / 1000).toFixed(0) + 'K'}
                </Text>
                <Text style={styles.summaryKey}>Voters</Text>
                <Text style={styles.summaryHi}>मतदाता</Text>
              </View>
            </View>
          </Card>
        ) : null}

        {loading ? (
          <View style={{ padding: 36, alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.indigo} />
          </View>
        ) : rows.length === 0 ? (
          <Card padding={18}>
            <Eyebrow>No constituencies · कोई विधानसभा नहीं</Eyebrow>
            <Text style={styles.emptyTitle}>
              No ACs in {district} found in your scope.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 8 }}>
            {rows.map((ac) => (
              <TouchableOpacity
                key={ac.assemblyConstituency}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('InsightBooths', {
                    district,
                    assemblyConstituency: ac.assemblyConstituency,
                  })
                }>
                <View style={styles.row}>
                  <View style={styles.acHead}>
                    <Text style={styles.acCode}>
                      UP-{(ac.number || 0).toString().padStart(3, '0')}
                    </Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowName}>{ac.assemblyConstituency}</Text>
                    </View>
                    <Icon name="chevron-right" size={16} color={COLORS.muted} />
                  </View>
                  <View style={styles.acMetaRow}>
                    <Text style={styles.rowMeta}>
                      {ac.booths || 0} booth
                      {ac.booths === 1 ? '' : 's'}
                    </Text>
                    <Text style={styles.rowMetaDot}>·</Text>
                    <Text style={styles.rowMeta}>
                      {(ac.totalVoters / 1000).toFixed(0)}K voters
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { padding: 14, gap: 12, paddingBottom: 24 },

  summaryGrid: {
    flexDirection: 'row',
  },
  summaryCell: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  summaryCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.hairlineSoft,
  },
  summaryValue: {
    fontFamily: FONTS.uiBold,
    fontSize: 17,
    color: COLORS.ink,
    letterSpacing: -0.4,
  },
  summaryKey: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    color: COLORS.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  summaryHi: {
    fontFamily: FONTS.hi,
    fontSize: 9.5,
    color: COLORS.muted,
    marginTop: 1,
  },

  row: {
    padding: 12,
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.hairlineSoft,
  },
  acHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  acCode: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    color: COLORS.muted,
    letterSpacing: 0.6,
    width: 56,
  },
  rowName: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    color: COLORS.ink,
    letterSpacing: -0.1,
  },
  acMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowMeta: {
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    color: COLORS.mutedDeep,
    letterSpacing: 0.3,
  },
  rowMetaDot: {
    color: COLORS.muted,
    opacity: 0.4,
  },

  emptyTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    color: COLORS.ink,
    marginTop: 6,
  },
});

export default InsightACsScreen;
