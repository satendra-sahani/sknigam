// /politician → Booths (06 of the Insight canvas).
//
// Lists booths in the selected AC.  For a scoped politician this is
// the same data the Explore tab shows, just reached via the drill
// (Districts → ACs → Booths).  Tapping a booth pushes the voter list
// (07).

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
  ScopeCrumb,
  Eyebrow,
  Chip,
} from '../../components/politician/InsightAtoms';
import type { RootStackParamList } from '../../types';

type Nav = StackNavigationProp<RootStackParamList, 'InsightBooths'>;
type Rt = RouteProp<RootStackParamList, 'InsightBooths'>;

interface Props {
  navigation: Nav;
  route: Rt;
}

interface BoothRow {
  _id: string;
  partNumber: number;
  name: string;
  assemblyConstituency: string;
  district?: string;
  totalVoters?: number;
}

const InsightBoothsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { district, assemblyConstituency } = route.params;
  const [booths, setBooths] = useState<BoothRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/booths', {
        params: { assemblyConstituency, limit: 200 },
      });
      setBooths((res.data?.data?.booths || []) as BoothRow[]);
    } catch {
      setBooths([]);
    } finally {
      setLoading(false);
    }
  }, [assemblyConstituency]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.root}>
      <InsightAppBar
        title={`Booths · ${booths.length}`}
        hi={`${assemblyConstituency} · बूथ`}
        back={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <ScopeCrumb
          trail={[
            { lvl: 'STATE', label: 'Uttar Pradesh' },
            ...(district ? [{ lvl: 'DISTRICT', label: district }] : []),
            { lvl: 'AC', label: assemblyConstituency },
            { lvl: 'BOOTH', label: 'Pick one' },
          ]}
        />

        {loading ? (
          <View style={{ padding: 36, alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.indigo} />
          </View>
        ) : booths.length === 0 ? (
          <Card padding={18}>
            <Eyebrow>No booths · कोई बूथ नहीं</Eyebrow>
            <Text style={styles.emptyTitle}>
              No booths in {assemblyConstituency} yet.
            </Text>
            <Text style={styles.emptyBody}>
              Ask your admin to import the voter roll for this AC.
            </Text>
          </Card>
        ) : (
          <Card padding={14}>
            <View style={styles.head}>
              <Text style={styles.headTitle}>
                Booth list · {booths.length}
              </Text>
              <Chip tone="neutral">
                {booths.length} assigned
              </Chip>
            </View>
            <View style={styles.list}>
              {booths.map((b, i) => (
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
                    styles.row,
                    i === 0 ? null : styles.rowDivider,
                  ]}>
                  <View style={styles.bullet} />
                  <Text style={styles.code}>
                    B-{b.partNumber.toString().padStart(3, '0')}
                  </Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {b.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {b.assemblyConstituency}
                      {typeof b.totalVoters === 'number' && b.totalVoters > 0
                        ? ' · ' + b.totalVoters.toLocaleString('en-IN') + ' voters'
                        : ''}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={14} color={COLORS.muted} />
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { padding: 14, gap: 12, paddingBottom: 24 },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  headTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 11,
    color: COLORS.ink,
    letterSpacing: -0.1,
  },
  list: { marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairlineSoft,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.indigo,
  },
  code: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.mutedDeep,
    letterSpacing: 0.4,
    width: 56,
  },
  name: {
    fontFamily: FONTS.uiSemiBold,
    fontSize: 13,
    color: COLORS.ink,
  },
  meta: {
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    color: COLORS.muted,
    marginTop: 2,
    letterSpacing: 0.4,
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

export default InsightBoothsScreen;
