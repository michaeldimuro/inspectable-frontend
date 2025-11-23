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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Camera, Package, Edit2 } from 'lucide-react-native';
import { usePropertyStore } from '../stores/propertyStore';
import { areasAPI } from '../services/api';
import InspectionItemCard from '../components/InspectionItemCard';

export default function AreaDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { areaId } = route.params;
  const { currentProperty, fetchPropertyById, setCurrentArea, deleteItem, isLoading } =
    usePropertyStore();

  const area = currentProperty?.areas?.find((a) => a.id === areaId);
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editStatus, setEditStatus] = useState(area?.status || 'IN');
  const [editNotInspectedReason, setEditNotInspectedReason] = useState(area?.notInspectedReason || '');
  const [focusedField, setFocusedField] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (area) {
      setCurrentArea(area);
      setEditStatus(area.status || 'IN');
      setEditNotInspectedReason(area.notInspectedReason || '');
    }
  }, [area]);

  const handleUpdateStatus = async () => {
    if (editStatus === 'NI' && !editNotInspectedReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for not inspecting this area');
      return;
    }

    try {
      setUpdating(true);
      const data = { status: editStatus };
      if (editStatus === 'NI') {
        data.notInspectedReason = editNotInspectedReason;
      }
      
      await areasAPI.update(areaId, data);
      
      // Refresh the property
      if (currentProperty) {
        await fetchPropertyById(currentProperty.id);
      }
      
      setEditModalVisible(false);
      Alert.alert('Success', 'Area status updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update area status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      IN: { label: 'Inspected', color: '#2563EB', bgColor: '#EFF6FF', icon: '✓', description: 'Visually observed and appears to be functioning as intended' },
      NI: { label: 'Not Inspected', color: '#F59E0B', bgColor: '#FEF3C7', icon: '⊘', description: 'Not inspected - reason provided below' },
      NP: { label: 'Not Present', color: '#6B7280', bgColor: '#F3F4F6', icon: '∅', description: 'This item is not present in this home or building' },
      RR: { label: 'Repair or Replace', color: '#DC2626', bgColor: '#FEE2E2', icon: '⚠', description: 'Not functioning as intended, needs further inspection or repair' },
    };

    return statusConfig[status] || statusConfig.IN;
  };

  const handleEditItem = (item) => {
    navigation.navigate('Camera', { 
      areaId,
      editMode: true,
      itemToEdit: item
    });
  };

  const handleDeleteItem = (itemId) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this inspection item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteItem(itemId);
          if (result.success) {
            // Refresh the property to update the area
            if (currentProperty) {
              await fetchPropertyById(currentProperty.id);
            }
          } else {
            Alert.alert('Error', result.error);
          }
        },
      },
    ]);
  };

  if (!area) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-gray-500 mt-4">Loading area...</Text>
      </View>
    );
  }

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
            Area Details
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Area Header */}
        <View style={{ backgroundColor: '#FFFFFF', paddingTop: 20, paddingBottom: 24, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1 mr-4">
              <Text className="text-2xl font-bold text-gray-900 mb-2">
                {area.name}
              </Text>
              <Text className="text-sm text-gray-500">
                {area.items?.length || 0} inspection {area.items?.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
            <View className="bg-blue-50 w-14 h-14 rounded-2xl items-center justify-center">
              <Package size={28} color="#2563EB" strokeWidth={2} />
            </View>
          </View>

          {/* Status Section */}
          {(() => {
            const statusInfo = getStatusBadge(area.status || 'IN');
            return (
              <View style={{ backgroundColor: statusInfo.bgColor, borderRadius: 12, padding: 16 }}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1">
                    <Text style={{ fontSize: 20, marginRight: 8 }}>{statusInfo.icon}</Text>
                    <Text style={{ color: statusInfo.color, fontSize: 16, fontWeight: '700' }}>
                      {statusInfo.label}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setEditModalVisible(true)}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Edit2 size={14} color={statusInfo.color} strokeWidth={2} />
                    <Text style={{ color: statusInfo.color, fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ color: statusInfo.color, fontSize: 13, opacity: 0.8, marginBottom: 8 }}>
                  {statusInfo.description}
                </Text>
                {area.status === 'NI' && area.notInspectedReason && (
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 4 }}>
                      Reason for Not Inspecting:
                    </Text>
                    <Text style={{ fontSize: 14, color: '#374151' }}>
                      {area.notInspectedReason}
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}
        </View>

        {/* Inspection Items */}
        <View className="px-5 py-6">
          {area.items?.length === 0 ? (
            <View className="items-center py-20 px-6">
              <View className="w-24 h-24 rounded-full items-center justify-center mb-6" style={{ backgroundColor: '#EFF6FF' }}>
                <Camera size={48} color="#2563EB" strokeWidth={1.5} />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                No Inspections Yet
              </Text>
              <Text className="text-base text-gray-500 text-center mb-6 leading-6">
                Tap the camera button below to add photos and descriptions
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Camera', { areaId })}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#2563EB',
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  borderRadius: 16,
                  shadowColor: '#2563EB',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
                >
                  <View className="flex-row items-center">
                    <Camera size={20} color="#FFFFFF" strokeWidth={2} />
                    <Text className="text-white font-bold text-base ml-2">
                      Take Photo
                    </Text>
                  </View>
                </TouchableOpacity>
            </View>
          ) : (
            area.items?.map((item) => (
              <InspectionItemCard
                key={item.id}
                item={item}
                onEdit={() => handleEditItem(item)}
                onDelete={() => handleDeleteItem(item.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Camera Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Camera', { areaId })}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#2563EB',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#2563EB',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Camera size={28} color="#FFFFFF" strokeWidth={2} />
      </TouchableOpacity>

      {/* Edit Status Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
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
                    Update Status
                  </Text>
                  <Text className="text-sm text-gray-500 mb-6">
                    Change the inspection status for this area
                  </Text>

                  <View className="mb-6">
                    <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">
                      Inspection Status
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      <TouchableOpacity
                        onPress={() => setEditStatus('IN')}
                        activeOpacity={0.7}
                        style={{
                          flex: 1,
                          minWidth: '45%',
                          backgroundColor: editStatus === 'IN' ? '#2563EB' : '#F1F5F9',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: editStatus === 'IN' ? '#2563EB' : '#E2E8F0',
                        }}
                      >
                        <Text
                          className={`text-sm font-bold ${
                            editStatus === 'IN' ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          ✓ Inspected (IN)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setEditStatus('NI')}
                        activeOpacity={0.7}
                        style={{
                          flex: 1,
                          minWidth: '45%',
                          backgroundColor: editStatus === 'NI' ? '#F59E0B' : '#F1F5F9',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: editStatus === 'NI' ? '#F59E0B' : '#E2E8F0',
                        }}
                      >
                        <Text
                          className={`text-sm font-bold ${
                            editStatus === 'NI' ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          ⊘ Not Inspected (NI)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setEditStatus('NP')}
                        activeOpacity={0.7}
                        style={{
                          flex: 1,
                          minWidth: '45%',
                          backgroundColor: editStatus === 'NP' ? '#6B7280' : '#F1F5F9',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: editStatus === 'NP' ? '#6B7280' : '#E2E8F0',
                        }}
                      >
                        <Text
                          className={`text-sm font-bold ${
                            editStatus === 'NP' ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          ∅ Not Present (NP)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setEditStatus('RR')}
                        activeOpacity={0.7}
                        style={{
                          flex: 1,
                          minWidth: '45%',
                          backgroundColor: editStatus === 'RR' ? '#DC2626' : '#F1F5F9',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: editStatus === 'RR' ? '#DC2626' : '#E2E8F0',
                        }}
                      >
                        <Text
                          className={`text-sm font-bold ${
                            editStatus === 'RR' ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          ⚠ Repair/Replace (RR)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {editStatus === 'NI' && (
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
                          value={editNotInspectedReason}
                          onChangeText={setEditNotInspectedReason}
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
                        setEditModalVisible(false);
                        setEditStatus(area?.status || 'IN');
                        setEditNotInspectedReason(area?.notInspectedReason || '');
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
                        setTimeout(() => handleUpdateStatus(), 100);
                      }}
                      disabled={updating}
                      activeOpacity={0.8}
                    >
                      {updating ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text className="text-white text-center font-bold text-base">
                          Update
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
