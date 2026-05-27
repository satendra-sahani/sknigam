// /politician → Districts (04 of the Insight canvas).
//
// Lists the districts the politician has access to.  For a politician
// scoped to a single AC this will be one row; for multi-AC scopes it
// will be a few.  Same row shape as the prototype's `InsightDistrictDrill`.

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
import api from '../../services/api';
import { COLORS } from '../../utils/constants';
import { FONTS } from '../../utils/theme';
import { InsightAppBar } from '../../components/politician/InsightAppBar';
import { Card, ScopeCrumb, Eyebrow } from '../../components/politician/InsightAtoms';
import type { RootStackParamList } from '../../types';

type Nav = StackNavigationProp<RootStackParamList, 'InsightDistricts'>;

interface Props {
  navigation: Nav;
}

interface DistrictRow {
  district: string;
  acs: number;
  totalVoters: number;
  verified: number;
}

const InsightDistrictsScreen: React.FC<Props> = ({ navigation }) => {
  const [rows, setRows] = useState<DistrictRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/hierarchy/districts');
      const data = res.data?.data || [];
      setRows(
        data.map((d: any) => ({
          district: d.district,
          acs: d.constituenciesTotal ?? d.constituencies ?? 0,
          totalVoters: d.totalVoters || 0,
          verified: d.verified || 0,
        })),
      );
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.root}>
      <InsightAppBar
        title={`Districts · ${rows.length}`}
        hi="ज़िले"
        back={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <ScopeCrumb
          trail={[
            { lvl: 'STATE', label: 'Uttar Pradesh' },
            { lvl: 'DISTRICT', label: 'Pick one' },
          ]}
        />

        {loading ? (
          <View style={{ padding: 36, alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.indigo} />
          </View>
        ) : rows.length === 0 ? (
          <Card padding={18}>
            <Eyebrow>No districts · कोई ज़िला नहीं</Eyebrow>
            <Text style={styles.emptyTitle}>
              No districts found in your assigned scope.
            </Text>
            <Text style={styles.emptyBody}>
              Once your admin imports booths for the AC assigned to you, the
              corresponding district will appear here.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 8 }}>
            {rows.map((d) => (
              <TouchableOpacity
                key={d.district}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('InsightACs', { district: d.district })
                }>
                <View style={styles.row}>
                  <View style={styles.codeTile}>
                    <Text style={styles.codeTileText}>
                      {d.district.slice(0, 3).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowName}>{d.district}</Text>
                    <Text style={styles.rowMeta}>
                      {d.acs} AC{d.acs === 1 ? '' : 's'} ·{' '}
                      {(d.totalVoters / 100000).toFixed(1)}L voters
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={COLORS.muted} />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.hairlineSoft,
  },
  codeTile: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#EEEAE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeTileText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.mutedDeep,
    letterSpacing: 0.4,
  },
  rowName: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    color: COLORS.ink,
    letterSpacing: -0.1,
  },
  rowMeta: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.mutedDeep,
    marginTop: 3,
    letterSpacing: 0.3,
  },
  emptyTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    color: COLORS.ink,
    marginTop: 6,
  },
  emptyBody: {
    fontFamily: FONTS.ui,
    fontSize: 12.5,
    color: COLORS.mutedDeep,
    marginTop: 6,
    lineHeight: 19,
  },
});

export default InsightDistrictsScreen;
