import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/constants';

interface IncidentFormProps {
  onSubmit: (data: {
    category: string;
    severity: string;
    description: string;
    photoUris: string[];
  }) => Promise<void>;
  isSubmitting: boolean;
}

const CATEGORIES = [
  { key: 'technical', label: 'Technical', icon: 'wrench' },
  { key: 'security', label: 'Security', icon: 'shield-alert' },
  { key: 'administrative', label: 'Administrative', icon: 'file-document' },
  { key: 'other', label: 'Other', icon: 'dots-horizontal' },
];

const SEVERITIES = [
  { key: 'low', label: 'Low', color: COLORS.success },
  { key: 'medium', label: 'Medium', color: COLORS.warning },
  { key: 'high', label: 'High', color: '#f97316' },
  { key: 'critical', label: 'Critical', color: COLORS.danger },
];

const IncidentForm: React.FC<IncidentFormProps> = ({
  onSubmit,
  isSubmitting,
}) => {
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const descriptionLength = description.trim().length;
  const isValid =
    category &&
    severity &&
    descriptionLength >= 50 &&
    descriptionLength <= 200;

  const handleAddPhoto = () => {
    if (photos.length >= 3) {
      Alert.alert('Limit Reached', 'Maximum 3 photos allowed per incident.');
      return;
    }

    Alert.alert('Add Photo', 'Choose a source', [
      {
        text: 'Camera',
        onPress: () => {
          launchCamera(
            {
              mediaType: 'photo',
              quality: 0.7,
              maxWidth: 1280,
              maxHeight: 1280,
              saveToPhotos: false,
            },
            (response) => {
              if (
                response.assets &&
                response.assets.length > 0 &&
                response.assets[0].uri
              ) {
                setPhotos((prev) => [...prev, response.assets![0].uri!]);
              }
            },
          );
        },
      },
      {
        text: 'Gallery',
        onPress: () => {
          launchImageLibrary(
            {
              mediaType: 'photo',
              quality: 0.7,
              maxWidth: 1280,
              maxHeight: 1280,
            },
            (response) => {
              if (
                response.assets &&
                response.assets.length > 0 &&
                response.assets[0].uri
              ) {
                setPhotos((prev) => [...prev, response.assets![0].uri!]);
              }
            },
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    await onSubmit({
      category,
      severity,
      description: description.trim(),
      photoUris: photos,
    });
    // Reset form on success
    setCategory('');
    setSeverity('');
    setDescription('');
    setPhotos([]);
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {/* Category */}
      <Text style={styles.sectionLabel}>Category</Text>
      <View style={styles.optionRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.optionButton,
              category === cat.key && styles.optionSelected,
            ]}
            onPress={() => setCategory(cat.key)}>
            <Icon
              name={cat.icon}
              size={20}
              color={
                category === cat.key ? COLORS.primary : COLORS.grey500
              }
            />
            <Text
              style={[
                styles.optionText,
                category === cat.key && styles.optionTextSelected,
              ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Severity */}
      <Text style={styles.sectionLabel}>Severity</Text>
      <View style={styles.optionRow}>
        {SEVERITIES.map((sev) => (
          <TouchableOpacity
            key={sev.key}
            style={[
              styles.severityButton,
              severity === sev.key && {
                backgroundColor: sev.color + '20',
                borderColor: sev.color,
              },
            ]}
            onPress={() => setSeverity(sev.key)}>
            <View
              style={[
                styles.severityDot,
                { backgroundColor: sev.color },
              ]}
            />
            <Text
              style={[
                styles.severityText,
                severity === sev.key && { color: sev.color },
              ]}>
              {sev.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description */}
      <Text style={styles.sectionLabel}>Description</Text>
      <TextInput
        style={styles.descriptionInput}
        multiline
        numberOfLines={4}
        maxLength={200}
        placeholder="Describe the incident in detail (50-200 characters)..."
        placeholderTextColor={COLORS.grey400}
        value={description}
        onChangeText={setDescription}
        textAlignVertical="top"
      />
      <Text
        style={[
          styles.charCount,
          descriptionLength < 50 && styles.charCountWarning,
          descriptionLength >= 50 && styles.charCountOk,
        ]}>
        {descriptionLength}/200
        {descriptionLength < 50
          ? ` (min ${50 - descriptionLength} more)`
          : ''}
      </Text>

      {/* Photos */}
      <Text style={styles.sectionLabel}>Photos (optional, max 3)</Text>
      <View style={styles.photoRow}>
        {photos.map((uri, index) => (
          <View key={index} style={styles.photoContainer}>
            <Image source={{ uri }} style={styles.photoThumb} />
            <TouchableOpacity
              style={styles.removePhotoBtn}
              onPress={() => handleRemovePhoto(index)}>
              <Icon name="close-circle" size={22} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 3 && (
          <TouchableOpacity
            style={styles.addPhotoBtn}
            onPress={handleAddPhoto}>
            <Icon name="camera-plus" size={28} color={COLORS.grey400} />
            <Text style={styles.addPhotoText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          !isValid && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!isValid || isSubmitting}
        activeOpacity={0.8}>
        {isSubmitting ? (
          <ActivityIndicator color={COLORS.white} size="small" />
        ) : (
          <>
            <Icon name="send" size={20} color={COLORS.white} />
            <Text style={styles.submitText}>Report Incident</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.grey700,
    marginBottom: 10,
    marginTop: 16,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.grey300,
    backgroundColor: COLORS.white,
    gap: 6,
  },
  optionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.grey600,
  },
  optionTextSelected: {
    color: COLORS.primary,
  },
  severityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.grey300,
    backgroundColor: COLORS.white,
    gap: 6,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  severityText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.grey600,
  },
  descriptionInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.grey300,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.grey800,
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    color: COLORS.grey400,
  },
  charCountWarning: {
    color: COLORS.danger,
  },
  charCountOk: {
    color: COLORS.success,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  photoContainer: {
    position: 'relative',
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.white,
    borderRadius: 11,
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.grey300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 11,
    color: COLORS.grey400,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 32,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.grey300,
  },
  submitText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default IncidentForm;
