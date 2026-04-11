import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  ScrollView,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  COLORS,
  CAST_OPTIONS,
  SUBCAST_OPTIONS,
  PARTY_OPTIONS,
} from '../utils/constants';

interface VoterFormProps {
  onSubmit: (data: {
    voterId: string;
    name: string;
    mobileNumber: string;
    email: string;
    photoUri: string;
    cast: string;
    subCast: string;
    party: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

interface DropdownItem {
  key: string;
  label: string;
}

const VoterForm: React.FC<VoterFormProps> = ({ onSubmit, isSubmitting }) => {
  const [voterId, setVoterId] = useState('');
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState('');
  const [cast, setCast] = useState('');
  const [subCast, setSubCast] = useState('');
  const [party, setParty] = useState('');

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownType, setDropdownType] = useState<
    'cast' | 'subCast' | 'party'
  >('cast');

  const subCastOptions = useMemo(
    () => (cast ? SUBCAST_OPTIONS[cast] || [] : []),
    [cast],
  );

  const isValid =
    voterId.trim().length >= 3 &&
    name.trim().length >= 2 &&
    mobileNumber.trim().length === 10 &&
    cast &&
    subCast &&
    party;

  const openDropdown = (type: 'cast' | 'subCast' | 'party') => {
    if (type === 'subCast' && !cast) {
      Alert.alert('Select Cast First', 'Please select a cast before choosing sub-cast.');
      return;
    }
    setDropdownType(type);
    setDropdownVisible(true);
  };

  const getDropdownItems = (): DropdownItem[] => {
    switch (dropdownType) {
      case 'cast':
        return CAST_OPTIONS;
      case 'subCast':
        return subCastOptions;
      case 'party':
        return PARTY_OPTIONS;
    }
  };

  const getDropdownTitle = (): string => {
    switch (dropdownType) {
      case 'cast':
        return 'Select Cast';
      case 'subCast':
        return 'Select Sub-Cast';
      case 'party':
        return 'Select Party';
    }
  };

  const getSelectedValue = (): string => {
    switch (dropdownType) {
      case 'cast':
        return cast;
      case 'subCast':
        return subCast;
      case 'party':
        return party;
    }
  };

  const handleDropdownSelect = (key: string) => {
    switch (dropdownType) {
      case 'cast':
        setCast(key);
        if (subCast) setSubCast('');
        break;
      case 'subCast':
        setSubCast(key);
        break;
      case 'party':
        setParty(key);
        break;
    }
    setDropdownVisible(false);
  };

  const getLabelForKey = (
    key: string,
    options: DropdownItem[],
  ): string => {
    return options.find((o) => o.key === key)?.label || '';
  };

  const handleAddPhoto = () => {
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
                setPhoto(response.assets[0].uri);
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
                setPhoto(response.assets[0].uri);
              }
            },
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!isValid) return;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    await onSubmit({
      voterId: voterId.trim(),
      name: name.trim(),
      mobileNumber: mobileNumber.trim(),
      email: email.trim(),
      photoUri: photo,
      cast,
      subCast,
      party,
    });
    // Reset form on success
    setVoterId('');
    setName('');
    setMobileNumber('');
    setEmail('');
    setPhoto('');
    setCast('');
    setSubCast('');
    setParty('');
  };

  return (
    <View style={styles.container}>
      {/* Voter ID */}
      <Text style={styles.sectionLabel}>Voter ID *</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter voter ID"
        placeholderTextColor={COLORS.grey400}
        value={voterId}
        onChangeText={setVoterId}
        autoCapitalize="characters"
      />

      {/* Name */}
      <Text style={styles.sectionLabel}>Full Name *</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter full name"
        placeholderTextColor={COLORS.grey400}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      {/* Mobile Number */}
      <Text style={styles.sectionLabel}>Mobile Number *</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter 10-digit mobile number"
        placeholderTextColor={COLORS.grey400}
        value={mobileNumber}
        onChangeText={(text) => setMobileNumber(text.replace(/[^0-9]/g, ''))}
        keyboardType="phone-pad"
        maxLength={10}
      />
      {mobileNumber.length > 0 && mobileNumber.length < 10 && (
        <Text style={styles.hintText}>
          {10 - mobileNumber.length} digits remaining
        </Text>
      )}

      {/* Email (Optional) */}
      <Text style={styles.sectionLabel}>Email (optional)</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter email address"
        placeholderTextColor={COLORS.grey400}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Cast Dropdown */}
      <Text style={styles.sectionLabel}>Cast *</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => openDropdown('cast')}>
        <Text
          style={[
            styles.dropdownText,
            !cast && styles.dropdownPlaceholder,
          ]}>
          {cast ? getLabelForKey(cast, CAST_OPTIONS) : 'Select cast'}
        </Text>
        <Icon name="chevron-down" size={22} color={COLORS.grey500} />
      </TouchableOpacity>

      {/* Sub-Cast Dropdown */}
      <Text style={styles.sectionLabel}>Sub-Cast *</Text>
      <TouchableOpacity
        style={[styles.dropdownButton, !cast && styles.dropdownDisabled]}
        onPress={() => openDropdown('subCast')}>
        <Text
          style={[
            styles.dropdownText,
            !subCast && styles.dropdownPlaceholder,
          ]}>
          {subCast
            ? getLabelForKey(subCast, subCastOptions)
            : cast
              ? 'Select sub-cast'
              : 'Select cast first'}
        </Text>
        <Icon name="chevron-down" size={22} color={COLORS.grey500} />
      </TouchableOpacity>

      {/* Party Dropdown */}
      <Text style={styles.sectionLabel}>Party *</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => openDropdown('party')}>
        <Text
          style={[
            styles.dropdownText,
            !party && styles.dropdownPlaceholder,
          ]}>
          {party ? getLabelForKey(party, PARTY_OPTIONS) : 'Select party'}
        </Text>
        <Icon name="chevron-down" size={22} color={COLORS.grey500} />
      </TouchableOpacity>

      {/* Photo (Optional) */}
      <Text style={styles.sectionLabel}>Photo (optional)</Text>
      <View style={styles.photoRow}>
        {photo ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photo }} style={styles.photoThumb} />
            <TouchableOpacity
              style={styles.removePhotoBtn}
              onPress={() => setPhoto('')}>
              <Icon name="close-circle" size={22} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addPhotoBtn}
            onPress={handleAddPhoto}>
            <Icon name="camera-plus" size={28} color={COLORS.grey400} />
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!isValid || isSubmitting}
        activeOpacity={0.8}>
        {isSubmitting ? (
          <ActivityIndicator color={COLORS.white} size="small" />
        ) : (
          <>
            <Icon name="account-plus" size={20} color={COLORS.white} />
            <Text style={styles.submitText}>Add Voter</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDropdownVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{getDropdownTitle()}</Text>
              <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                <Icon name="close" size={24} color={COLORS.grey600} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getDropdownItems()}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    getSelectedValue() === item.key && styles.modalItemSelected,
                  ]}
                  onPress={() => handleDropdownSelect(item.key)}>
                  <Text
                    style={[
                      styles.modalItemText,
                      getSelectedValue() === item.key &&
                        styles.modalItemTextSelected,
                    ]}>
                    {item.label}
                  </Text>
                  {getSelectedValue() === item.key && (
                    <Icon
                      name="check"
                      size={20}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
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
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.grey300,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.grey800,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.warning,
    marginTop: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.grey300,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dropdownDisabled: {
    backgroundColor: COLORS.grey100,
  },
  dropdownText: {
    fontSize: 15,
    color: COLORS.grey800,
  },
  dropdownPlaceholder: {
    color: COLORS.grey400,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoContainer: {
    position: 'relative',
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.white,
    borderRadius: 11,
  },
  addPhotoBtn: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.grey300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 11,
    color: COLORS.grey400,
    marginTop: 4,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey200,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.grey800,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey100,
  },
  modalItemSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  modalItemText: {
    fontSize: 15,
    color: COLORS.grey700,
  },
  modalItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default VoterForm;
