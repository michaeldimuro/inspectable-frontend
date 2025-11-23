import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Package, ChevronRight } from 'lucide-react-native';

export default function AreaCard({ area, onPress }) {
  const itemCount = area.items?.length || 0;
  const status = area.status || 'IN';

  const getStatusBadge = () => {
    const statusConfig = {
      IN: { label: 'IN', color: '#2563EB', bgColor: '#EFF6FF', icon: '✓' },
      NI: { label: 'NI', color: '#F59E0B', bgColor: '#FEF3C7', icon: '⊘' },
      NP: { label: 'NP', color: '#6B7280', bgColor: '#F3F4F6', icon: '∅' },
      RR: { label: 'RR', color: '#DC2626', bgColor: '#FEE2E2', icon: '⚠' },
    };

    const config = statusConfig[status] || statusConfig.IN;

    return (
      <View style={{ backgroundColor: config.bgColor, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 }}>
        <Text style={{ color: config.color, fontSize: 12, fontWeight: '700' }}>
          {config.icon} {config.label}
        </Text>
      </View>
    );
  };

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
            <View className="flex-row items-center mb-1">
              <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
                {area.name}
              </Text>
            </View>
            <View className="flex-row items-center">
              {getStatusBadge()}
              <Text className="text-sm text-gray-500">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Badge */}
        <View className="flex-row items-center">
          <ChevronRight size={20} color="#9CA3AF" strokeWidth={2} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
