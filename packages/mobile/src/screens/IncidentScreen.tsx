import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { enqueue } from '../services/offlineQueue';
import { uploadMultipleImages, generateFileName } from '../services/imageUpload';
import { COLORS } from '../utils/constants';
import { formatRelativeTime } from '../utils/helpers';
import { AssignmentInfo, IncidentData } from '../types';
import IncidentForm from '../components/IncidentForm';
import StatusBadge from '../components/StatusBadge';
import NetInfo from '@react-native-community/netinfo';

const IncidentScreen: React.FC = () => {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [assignmentRes, incidentsRes] = await Promise.allSettled([
        api.get('/assignments/my'),
        api.get('/incidents/my'),
      ]);
      if (assignmentRes.status === 'fulfilled') {
        setAssignment(assignmentRes.value.data.data);
      }
      if (incidentsRes.status === 'fulfilled') {
        setIncidents(incidentsRes.value.data.data || []);
      }
    } catch (error) {
      console.log('[Incidents] Fetch error:', error);
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

  const handleSubmitIncident = async (data: {
    category: string;
    severity: string;
    description: string;
    photoUris: string[];
  }) => {
    if (!assignment) {
      Alert.alert('Error', 'No booth assigned.');
      return;
    }

    setSubmitting(true);

    try {
      const netState = await NetInfo.fetch();

      if (!netState.isConnected) {
        await enqueue('incident', {
          boothId: assignment.booth._id,
          category: data.category,
          severity: data.severity,
          description: data.description,
          photoUris: data.photoUris,
        });
        Alert.alert(
          'Queued for Sync',
          'Incident report saved offline. It will sync when connectivity is restored.',
        );
        setSubmitting(false);
        return;
      }

      // Upload photos if any
      let photoUrls: string[] = [];
      if (data.photoUris.length > 0) {
        const uploads = await uploadMultipleImages(
          data.photoUris.map((uri) => ({
            uri,
            fileName: generateFileName('incident'),
          })),
        );
        photoUrls = uploads.map((u) => u.url);
      }

      const response = await api.post('/incidents', {
        boothId: assignment.booth._id,
        category: data.category,
        severity: data.severity,
        description: data.description,
        photos: photoUrls,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Incident reported successfully.');
        await fetchData();
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        'Failed to report incident. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'low':
        return COLORS.success;
      case 'medium':
        return COLORS.warning;
      case 'high':
        return '#f97316';
      case 'critical':
        return COLORS.danger;
      default:
        return COLORS.grey400;
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
        />
      }
      keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Report Incident</Text>

      <IncidentForm onSubmit={handleSubmitIncident} isSubmitting={submitting} />

      {/* My Incidents List */}
      {incidents.length > 0 && (
        <View style={styles.myIncidentsSection}>
          <Text style={styles.sectionTitle}>My Reports</Text>
          {incidents.map((incident) => (
            <View key={incident._id} style={styles.incidentCard}>
              <View style={styles.incidentHeader}>
                <View style={styles.incidentCategory}>
                  <View
                    style={[
                      styles.severityDot,
                      { backgroundColor: getSeverityColor(incident.severity) },
                    ]}
                  />
                  <Text style={styles.incidentCategoryText}>
                    {incident.category.charAt(0).toUpperCase() +
                      incident.category.slice(1)}
                  </Text>
                </View>
                <StatusBadge status={incident.status} />
              </View>
              <Text style={styles.incidentDescription} numberOfLines={2}>
                {incident.description}
              </Text>
              <View style={styles.incidentFooter}>
                <Text style={styles.incidentTime}>
                  {formatRelativeTime(incident.createdAt)}
                </Text>
                {incident.photos.length > 0 && (
                  <View style={styles.photoBadge}>
                    <Icon name="image" size={14} color={COLORS.grey500} />
                    <Text style={styles.photoCount}>
                      {incident.photos.length}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.grey800,
    marginBottom: 4,
  },
  myIncidentsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.grey700,
    marginBottom: 12,
  },
  incidentCard: {
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
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incidentCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  incidentCategoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.grey700,
  },
  incidentDescription: {
    fontSize: 13,
    color: COLORS.grey500,
    lineHeight: 18,
    marginBottom: 8,
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incidentTime: {
    fontSize: 12,
    color: COLORS.grey400,
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoCount: {
    fontSize: 12,
    color: COLORS.grey500,
  },
});

export default IncidentScreen;
