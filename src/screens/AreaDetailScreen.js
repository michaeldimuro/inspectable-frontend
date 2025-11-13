import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Camera, Package } from 'lucide-react-native';
import { usePropertyStore } from '../stores/propertyStore';
import InspectionItemCard from '../components/InspectionItemCard';

export default function AreaDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { areaId } = route.params;
  const { currentProperty, fetchPropertyById, setCurrentArea, deleteItem, isLoading } =
    usePropertyStore();

  const area = currentProperty?.areas?.find((a) => a.id === areaId);

  useEffect(() => {
    if (area) {
      setCurrentArea(area);
    }
  }, [area]);

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
          <View className="flex-row items-start justify-between">
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
    </View>
  );
}
