import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Package, ChevronRight } from 'lucide-react-native';

export default function AreaCard({ area, onPress }) {
  const itemCount = area.items?.length || 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
      }}
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-1 flex-row items-center">
          {/* Icon */}
          <View className="bg-gradient-to-br from-blue-50 to-indigo-50 w-11 h-11 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: '#EFF6FF' }}>
            <Package size={22} color="#2563EB" strokeWidth={2} />
          </View>
          
          {/* Content */}
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900 mb-0.5" numberOfLines={1}>
              {area.name}
            </Text>
            <Text className="text-sm text-gray-500">
              {itemCount} {itemCount === 1 ? 'inspection' : 'inspections'}
            </Text>
          </View>
        </View>
        
        {/* Badge */}
        <View className="flex-row items-center">
          <View className="bg-blue-500 px-3 py-1.5 rounded-full mr-2">
            <Text className="text-white font-bold text-sm">{itemCount}</Text>
          </View>
          <ChevronRight size={20} color="#9CA3AF" strokeWidth={2} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
