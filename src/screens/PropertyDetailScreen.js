import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, FileText, Trash2, Plus, Camera } from 'lucide-react-native';
import axios from 'axios';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { usePropertyStore } from '../stores/propertyStore';
import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL } from '../config/api';
import { propertiesAPI } from '../services/api';
import AreaCard from '../components/AreaCard';

export default function PropertyDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { propertyId } = route.params;
  const {
    currentProperty,
    fetchPropertyById,
    createArea,
    deleteProperty,
    isLoading,
  } = usePropertyStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [areaName, setAreaName] = useState('');
  const [areaStatus, setAreaStatus] = useState('IN');
  const [notInspectedReason, setNotInspectedReason] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [creatingArea, setCreatingArea] = useState(false);

  useEffect(() => {
    fetchPropertyById(propertyId);
  }, [propertyId]);

  const handleTakePropertyPhoto = () => {
    navigation.navigate('Camera', {
      onPhotoTaken: handlePropertyPhotoTaken,
      isPropertyPhoto: true,
    });
  };

  const handlePropertyPhotoTaken = async (photoUri) => {
    try {
      setUploadingPhoto(true);
      
      // Create FormData
      const formData = new FormData();
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'property-photo.jpg',
      });

      // Upload photo
      const response = await propertiesAPI.uploadPhoto(propertyId, formData);
      
      if (response.data.property) {
        // Refresh property to show the new photo
        await fetchPropertyById(propertyId);
        Alert.alert('Success', 'Property photo updated successfully');
      }
    } catch (error) {
      console.error('Property photo upload error:', error);
      Alert.alert('Error', 'Failed to upload property photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCreateArea = async () => {
    if (!areaName.trim()) {
      Alert.alert('Error', 'Please enter an area name');
      return;
    }

    if (areaStatus === 'NI' && !notInspectedReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for not inspecting this area');
      return;
    }

    try {
      setCreatingArea(true);
      const result = await createArea(propertyId, areaName, areaStatus, notInspectedReason);
      if (result.success) {
        setModalVisible(false);
        setAreaName('');
        setAreaStatus('IN');
        setNotInspectedReason('');
        // Store automatically refreshes property data
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create area');
    } finally {
      setCreatingArea(false);
    }
  };

  const handleDeleteProperty = () => {
    Alert.alert(
      'Delete Property',
      'Are you sure? This will delete all areas and inspection items.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteProperty(propertyId);
            if (result.success) {
              navigation.goBack();
            } else {
              Alert.alert('Error', result.error);
            }
          },
        },
      ]
    );
  };

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      
      // Get auth token
      const token = useAuthStore.getState().token;
      
      console.log('Starting report generation...');
      console.log('Property ID:', propertyId);
      console.log('API URL:', `${API_BASE_URL}/reports/property/${propertyId}`);
      
      // Fetch PDF using axios
      const response = await axios.post(
        `${API_BASE_URL}/reports/property/${propertyId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'arraybuffer',
        }
      );

      console.log('PDF received, size:', response.data.byteLength);
      
      // Generate filename and path
      const fileName = `inspection-report-${Date.now()}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      console.log('Saving file to:', fileUri);
      
      // Convert ArrayBuffer to base64
      const uint8Array = new Uint8Array(response.data);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const base64String = btoa(binaryString);
      
      // Write to file
      await FileSystem.writeAsStringAsync(fileUri, base64String, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('File saved successfully');
      
      setGeneratingReport(false);

      // Navigate to PDF viewer
      navigation.navigate('PDFViewer', {
        pdfPath: fileUri,
        propertyName: currentProperty.name,
      });
    } catch (error) {
      setGeneratingReport(false);
      console.error('Report generation error:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      Alert.alert('Error', `Failed to generate report: ${error.message || 'Unknown error'}. Please try again.`);
    }
  };

  if (!currentProperty) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-gray-500 mt-4">Loading property...</Text>
      </View>
    );
  }

  // Handle both Supabase URLs (full URLs) and local URLs (relative paths)
  const propertyImageUrl = currentProperty.photoUrl?.startsWith('http')
    ? currentProperty.photoUrl
    : `${API_BASE_URL.replace('/api', '')}${currentProperty.photoUrl}`;

  return (
    <View className="flex-1" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Navigation Header */}
      <View style={{ backgroundColor: '#FFFFFF', paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            className="mr-3"
          >
            <ChevronLeft size={28} color="#2563EB" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">
            Inspection Details
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Property Header */}
        <View style={{ backgroundColor: '#FFFFFF', paddingTop: 20, paddingBottom: 24, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1 mr-4">
              <Text className="text-2xl font-bold text-gray-900 mb-2">
                {currentProperty.name}
              </Text>
              <Text className="text-sm text-gray-500 leading-5">
                📍 {currentProperty.address}
              </Text>
            </View>
            <View className="bg-blue-50 w-14 h-14 rounded-2xl items-center justify-center">
              <Text className="text-3xl">🏠</Text>
            </View>
          </View>

          {/* Property Photo */}
          {currentProperty.photoUrl ? (
            <View className="mb-4">
              <Image
                source={{ uri: propertyImageUrl }}
                style={{
                  width: '100%',
                  height: 200,
                  borderRadius: 16,
                  backgroundColor: '#F3F4F6',
                }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={handleTakePropertyPhoto}
                disabled={uploadingPhoto}
                className="absolute bottom-3 right-3 rounded-full py-2 px-4"
                style={{
                  backgroundColor: 'rgba(37, 99, 235, 0.9)',
                  shadowColor: '#2563EB',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                }}
                activeOpacity={0.8}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View className="flex-row items-center">
                    <Camera size={16} color="#FFFFFF" strokeWidth={2} />
                    <Text className="text-white font-bold text-xs ml-2">
                      Update Photo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleTakePropertyPhoto}
              disabled={uploadingPhoto}
              className="mb-4 rounded-2xl py-8 border-2 border-dashed"
              style={{
                backgroundColor: '#F8FAFC',
                borderColor: '#CBD5E1',
              }}
              activeOpacity={0.7}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color="#2563EB" size="large" />
              ) : (
                <View className="items-center">
                  <View className="bg-blue-50 w-16 h-16 rounded-full items-center justify-center mb-3">
                    <Camera size={32} color="#2563EB" strokeWidth={2} />
                  </View>
                  <Text className="text-base font-semibold text-gray-900 mb-1">
                    Add Property Photo
                  </Text>
                  <Text className="text-sm text-gray-500">
                    Take a photo of the exterior
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Stats */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <Text className="text-2xl font-bold text-blue-600 mb-1">
                {currentProperty.areas?.length || 0}
              </Text>
              <Text className="text-xs font-semibold text-blue-700">
                {currentProperty.areas?.length === 1 ? 'Area' : 'Areas'}
              </Text>
            </View>
            <View className="flex-1 bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
              <Text className="text-2xl font-bold text-indigo-600 mb-1">
                {currentProperty.areas?.reduce((sum, area) => sum + (area.items?.length || 0), 0) || 0}
              </Text>
              <Text className="text-xs font-semibold text-indigo-700">
                {currentProperty.areas?.reduce((sum, area) => sum + (area.items?.length || 0), 0) === 1 ? 'Item' : 'Items'}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 rounded-2xl py-3"
              style={{
                backgroundColor: '#2563EB',
                shadowColor: '#2563EB',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={handleGenerateReport}
              disabled={generatingReport}
              activeOpacity={0.8}
            >
              {generatingReport ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View className="flex-row items-center justify-center">
                  <FileText size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text className="text-white text-center font-bold text-sm ml-2">
                    Generate Report
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="rounded-2xl py-3 px-4"
              style={{
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FEE2E2',
              }}
              onPress={handleDeleteProperty}
              activeOpacity={0.7}
            >
              <Trash2 size={20} color="#DC2626" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Areas Section */}
        <View className="px-5 py-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">Areas</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
              className="bg-blue-500 px-4 py-2 rounded-xl"
            >
              <Text className="text-white font-bold text-sm">+ Add Area</Text>
            </TouchableOpacity>
          </View>

          {currentProperty.areas?.length === 0 ? (
            <View className="items-center py-16 px-6">
              <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#EFF6FF' }}>
                <Text className="text-4xl">📦</Text>
              </View>
              <Text className="text-lg font-bold text-gray-900 mb-2 text-center">
                No Areas Yet
              </Text>
              <Text className="text-sm text-gray-500 text-center leading-5">
                Add areas like "Crawlspace", "Basement", or "Primary Bedroom"
              </Text>
            </View>
          ) : (
            currentProperty.areas?.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                onPress={() =>
                  navigation.navigate('AreaDetail', { areaId: area.id })
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Area Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
              <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, paddingBottom: 40, paddingHorizontal: 24, maxHeight: '80%' }}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Handle Bar */}
                  <View className="items-center mb-6">
                    <View style={{ width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 }} />
                  </View>

                  <Text className="text-2xl font-bold text-gray-900 mb-2">
                    New Area
                  </Text>
                  <Text className="text-sm text-gray-500 mb-6">
                    Add a new area to inspect
                  </Text>

                  <View className="mb-6">
                    <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">
                      Area Name
                    </Text>
                    <View
                      className={`bg-gray-50 rounded-2xl px-4 py-4 ${
                        focusedField === 'areaName' ? 'border-2 border-blue-500' : 'border border-gray-200'
                      }`}
                    >
                      <TextInput
                        className="text-base text-gray-900"
                        placeholder="e.g., Crawlspace, Basement, Primary Bedroom"
                        placeholderTextColor="#9CA3AF"
                        value={areaName}
                        onChangeText={setAreaName}
                        returnKeyType="done"
                        onFocus={() => setFocusedField('areaName')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </View>
                  </View>

                  <View className="mb-6">
                    <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">
                      Inspection Status
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      <TouchableOpacity
                        onPress={() => setAreaStatus('IN')}
                        activeOpacity={0.7}
                        style={{
                          flex: 1,
                          minWidth: '45%',
                          backgroundColor: areaStatus === 'IN' ? '#2563EB' : '#F1F5F9',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: areaStatus === 'IN' ? '#2563EB' : '#E2E8F0',
                        }}
                      >
                        <Text
                          className={`text-sm font-bold ${
                            areaStatus === 'IN' ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          ✓ Inspected (IN)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setAreaStatus('NI')}
                        activeOpacity={0.7}
                        style={{
                          flex: 1,
                          minWidth: '45%',
                          backgroundColor: areaStatus === 'NI' ? '#F59E0B' : '#F1F5F9',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: areaStatus === 'NI' ? '#F59E0B' : '#E2E8F0',
                        }}
                      >
                        <Text
                          className={`text-sm font-bold ${
                            areaStatus === 'NI' ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          ⊘ Not Inspected (NI)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setAreaStatus('NP')}
                        activeOpacity={0.7}
                        style={{
                          flex: 1,
                          minWidth: '45%',
                          backgroundColor: areaStatus === 'NP' ? '#6B7280' : '#F1F5F9',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: areaStatus === 'NP' ? '#6B7280' : '#E2E8F0',
                        }}
                      >
                        <Text
                          className={`text-sm font-bold ${
                            areaStatus === 'NP' ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          ∅ Not Present (NP)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setAreaStatus('RR')}
                        activeOpacity={0.7}
                        style={{
                          flex: 1,
                          minWidth: '45%',
                          backgroundColor: areaStatus === 'RR' ? '#DC2626' : '#F1F5F9',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: areaStatus === 'RR' ? '#DC2626' : '#E2E8F0',
                        }}
                      >
                        <Text
                          className={`text-sm font-bold ${
                            areaStatus === 'RR' ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          ⚠ Repair/Replace (RR)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {areaStatus === 'NI' && (
                    <View className="mb-6">
                      <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">
                        Reason for Not Inspecting
                      </Text>
                      <View
                        className={`bg-gray-50 rounded-2xl px-4 py-4 ${
                          focusedField === 'notInspectedReason' ? 'border-2 border-blue-500' : 'border border-gray-200'
                        }`}
                      >
                        <TextInput
                          className="text-base text-gray-900"
                          placeholder="e.g., Area was inaccessible, dangerous conditions"
                          placeholderTextColor="#9CA3AF"
                          value={notInspectedReason}
                          onChangeText={setNotInspectedReason}
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                          onFocus={() => setFocusedField('notInspectedReason')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>
                    </View>
                  )}

                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className="flex-1 rounded-2xl py-4"
                      style={{ backgroundColor: '#F1F5F9' }}
                      onPress={() => {
                        Keyboard.dismiss();
                        setModalVisible(false);
                        setAreaName('');
                        setAreaStatus('IN');
                        setNotInspectedReason('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-gray-700 text-center font-bold text-base">
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-1 rounded-2xl py-4"
                      style={{
                        backgroundColor: '#2563EB',
                        shadowColor: '#2563EB',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                      }}
                      onPress={() => {
                        Keyboard.dismiss();
                        // Small delay to let keyboard animation complete
                        setTimeout(() => handleCreateArea(), 100);
                      }}
                      disabled={creatingArea}
                      activeOpacity={0.8}
                    >
                      {creatingArea ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text className="text-white text-center font-bold text-base">
                          Create
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
