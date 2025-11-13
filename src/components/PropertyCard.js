import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Building2, MapPin, Grid3x3, FileText } from 'lucide-react-native';
import { API_BASE_URL } from '../config/api';

export default function PropertyCard({ property, onPress }) {
  const areaCount = property.areas?.length || 0;
  const itemCount = property.areas?.reduce((sum, area) => sum + (area._count?.items || 0), 0) || 0;
  const hasPhoto = !!property.photoUrl;

  // Handle both Supabase URLs (full URLs) and local URLs (relative paths)
  const imageUrl = property.photoUrl?.startsWith('http')
    ? property.photoUrl
    : `${API_BASE_URL.replace('/api', '')}${property.photoUrl}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F1F5F9',
      }}
    >
      {/* Property Photo */}
      {hasPhoto && (
        <View className="mb-4 -mx-5 -mt-5">
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: '100%',
              height: 160,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              backgroundColor: '#F3F4F6',
            }}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Header with Icon */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-xl font-bold text-gray-900 mb-1" numberOfLines={1}>
            {property.name}
          </Text>
          <View className="flex-row items-center">
            <MapPin size={14} color="#9CA3AF" strokeWidth={2} />
            <Text className="text-sm text-gray-500 leading-5 ml-1.5" numberOfLines={2}>
              {property.address}
            </Text>
          </View>
        </View>
        {!hasPhoto && (
          <View className="bg-blue-50 w-12 h-12 rounded-xl items-center justify-center">
            <Building2 size={24} color="#2563EB" strokeWidth={2} />
          </View>
        )}
      </View>
      
      {/* Stats */}
      <View className="flex-row mt-4 pt-4 border-t border-gray-100">
        <View className="flex-1 flex-row items-center">
          <View className="bg-blue-500 w-8 h-8 rounded-lg items-center justify-center mr-2">
            <Grid3x3 size={16} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <View>
            <Text className="text-sm font-bold text-gray-900">{areaCount}</Text>
            <Text className="text-xs text-gray-500">
              {areaCount === 1 ? 'Area' : 'Areas'}
            </Text>
          </View>
        </View>
        
        <View className="flex-1 flex-row items-center">
          <View className="bg-indigo-500 w-8 h-8 rounded-lg items-center justify-center mr-2">
            <FileText size={16} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <View>
            <Text className="text-sm font-bold text-gray-900">{itemCount}</Text>
            <Text className="text-xs text-gray-500">
              {itemCount === 1 ? 'Item' : 'Items'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
