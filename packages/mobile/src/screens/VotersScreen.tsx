import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { enqueue } from '../services/offlineQueue';
import { uploadImage, generateFileName } from '../services/imageUpload';
import {
  COLORS,
  CAST_OPTIONS,
  SUBCAST_OPTIONS,
  PARTY_OPTIONS,
} from '../utils/constants';
import { formatRelativeTime } from '../utils/helpers';
import { AssignmentInfo, VoterData } from '../types';
import VoterForm from '../components/VoterForm';
import NetInfo from '@react-native-community/netinfo';

const VotersScreen: React.FC = () => {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [voters, setVoters] = useState<VoterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [assignmentRes, votersRes] = await Promise.allSettled([
        api.get('/assignments/my'),
        api.get('/voters/my'),
      ]);
      if (assignmentRes.status === 'fulfilled') {
        setAssignment(assignmentRes.value.data.data);
      }
      if (votersRes.status === 'fulfilled') {
        setVoters(votersRes.value.data.data || []);
      }
    } catch (error) {
      console.log('[Voters] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSubmitVoter = async (data: {
    voterId: string;
    name: string;
    mobileNumber: string;
    email: string;
    photoUri: string;
    cast: string;
    subCast: string;
    party: string;
  }) => {
    if (!assignment) {
      Alert.alert('Error', 'No booth assigned.');
      return;
    }

    setSubmitting(true);

    try {
      const netState = await NetInfo.fetch();

      if (!netState.isConnected) {
        await enqueue('voter', {
          boothId: assignment.booth._id,
          voterId: data.voterId,
          name: data.name,
          mobileNumber: data.mobileNumber,
          email: data.email || undefined,
          photoUri: data.photoUri || undefined,
          cast: data.cast,
          subCast: data.subCast,
          party: data.party,
        });
        Alert.alert(
          'Queued for Sync',
          'Voter data saved offline. It will sync when connectivity is restored.',
        );
        setSubmitting(false);
        setShowForm(false);
        return;
      }

      // Upload photo if provided
      let photoUrl: string | undefined;
      if (data.photoUri) {
        const result = await uploadImage(
          data.photoUri,
          generateFileName('voter'),
          '/election/voters',
        );
        photoUrl = result.url;
      }

      const response = await api.post('/voters', {
        boothId: assignment.booth._id,
        voterId: data.voterId,
        name: data.name,
        mobileNumber: data.mobileNumber,
        email: data.email || undefined,
        photoUrl,
        cast: data.cast,
        subCast: data.subCast,
        party: data.party,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Voter added successfully.');
        setShowForm(false);
        await fetchData();
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        'Failed to add voter. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getLabelForKey = (
    key: string,
    options: { key: string; label: string }[],
  ): string => {
    return options.find((o) => o.key === key)?.label || key;
  };

  const getPartyColor = (partyKey: string): string => {
    switch (partyKey) {
      case 'bjp':
        return '#FF9933';
      case 'inc':
        return '#19AAED';
      case 'aap':
        return '#0066CC';
      case 'sp':
        return '#E60000';
      case 'bsp':
        return '#2244AA';
      default:
        return COLORS.grey500;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Voters</Text>
            <Text style={styles.subtitle}>
              {voters.length} voter{voters.length !== 1 ? 's' : ''} added
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(!showForm)}
            activeOpacity={0.8}>
            <Icon
              name={showForm ? 'close' : 'plus'}
              size={20}
              color={COLORS.white}
            />
            <Text style={styles.addButtonText}>
              {showForm ? 'Cancel' : 'Add Voter'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        {showForm && (
          <View style={styles.formCard}>
            <VoterForm
              onSubmit={handleSubmitVoter}
              isSubmitting={submitting}
            />
          </View>
        )}

        {/* Voters List */}
        {voters.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>All Voters</Text>
            {voters.map((voter) => (
              <View key={voter._id} style={styles.voterCard}>
                <View style={styles.voterHeader}>
                  <View style={styles.voterInfo}>
                    {voter.photoUrl ? (
                      <Image
                        source={{ uri: voter.photoUrl }}
                        style={styles.voterPhoto}
                      />
                    ) : (
                      <View style={styles.voterPhotoPlaceholder}>
                        <Icon
                          name="account"
                          size={24}
                          color={COLORS.grey400}
                        />
                      </View>
                    )}
                    <View style={styles.voterDetails}>
                      <Text style={styles.voterName}>{voter.name}</Text>
                      <Text style={styles.voterIdText}>
                        ID: {voter.voterId}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.partyBadge,
                      { backgroundColor: getPartyColor(voter.party) + '20' },
                    ]}>
                    <Text
                      style={[
                        styles.partyBadgeText,
                        { color: getPartyColor(voter.party) },
                      ]}>
                      {getLabelForKey(voter.party, PARTY_OPTIONS)}
                    </Text>
                  </View>
                </View>

                <View style={styles.voterMeta}>
                  <View style={styles.metaItem}>
                    <Icon name="phone" size={14} color={COLORS.grey500} />
                    <Text style={styles.metaText}>{voter.mobileNumber}</Text>
                  </View>
                  {voter.email && (
                    <View style={styles.metaItem}>
                      <Icon name="email" size={14} color={COLORS.grey500} />
                      <Text style={styles.metaText}>{voter.email}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.voterFooter}>
                  <View style={styles.castInfo}>
                    <Text style={styles.castText}>
                      {getLabelForKey(voter.cast, CAST_OPTIONS)}
                      {' / '}
                      {getLabelForKey(
                        voter.subCast,
                        SUBCAST_OPTIONS[voter.cast] || [],
                      )}
                    </Text>
                  </View>
                  <Text style={styles.timeText}>
                    {formatRelativeTime(voter.createdAt)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {voters.length === 0 && !showForm && (
          <View style={styles.emptyState}>
            <Icon name="account-group" size={56} color={COLORS.grey300} />
            <Text style={styles.emptyTitle}>No Voters Added</Text>
            <Text style={styles.emptySubtitle}>
              Tap "Add Voter" to start adding voters to your list.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.grey800,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.grey500,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  listSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.grey700,
    marginBottom: 12,
  },
  voterCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  voterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  voterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  voterPhoto: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  voterPhotoPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.grey100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voterDetails: {
    flex: 1,
  },
  voterName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.grey800,
  },
  voterIdText: {
    fontSize: 12,
    color: COLORS.grey500,
    marginTop: 2,
  },
  partyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  partyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  voterMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.grey600,
  },
  voterFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.grey100,
    paddingTop: 8,
  },
  castInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  castText: {
    fontSize: 12,
    color: COLORS.grey500,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: COLORS.grey400,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.grey600,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.grey400,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default VotersScreen;
