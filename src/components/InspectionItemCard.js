import React, { useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Calendar, Bot, ChevronDown, ChevronUp, Lightbulb, DollarSign, AlertTriangle, Trash2, Edit3 } from 'lucide-react-native';
import { API_BASE_URL } from '../config/api';

export default function InspectionItemCard({ item, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(Dimensions.get('window').width);
  const flatListRef = useRef(null);
  const screenWidth = Dimensions.get('window').width;

  let analysis = null;
  if (item.aiSummary) {
    try {
      // Try to parse the aiSummary
      let parsedData = JSON.parse(item.aiSummary);
      
      // Ensure recommendations is always an array
      if (parsedData.recommendations && !Array.isArray(parsedData.recommendations)) {
        parsedData.recommendations = [parsedData.recommendations];
      }
      
      analysis = parsedData;
    } catch (e) {
      console.error('Failed to parse AI summary:', e);
      console.error('AI summary content:', item.aiSummary);
      // Don't show anything if parsing fails
      analysis = null;
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return { bg: '#FEF2F2', border: '#FEE2E2', text: '#DC2626', badge: '#EF4444' };
      case 'medium':
        return { bg: '#FFF7ED', border: '#FED7AA', text: '#EA580C', badge: '#F97316' };
      case 'low':
        return { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', badge: '#22C55E' };
      default:
        return { bg: '#F9FAFB', border: '#E5E7EB', text: '#6B7280', badge: '#9CA3AF' };
    }
  };

  // Construct full image URLs for all photos
  const photoUrls = item.photos && item.photos.length > 0
    ? item.photos.map(photo => 
        photo.photoUrl.startsWith('http')
          ? photo.photoUrl
          : `${API_BASE_URL.replace('/api', '')}${photo.photoUrl}`
      )
    : [];

  const severityColors = analysis ? getSeverityColor(analysis.severity) : null;

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / carouselWidth);
    setCurrentPhotoIndex(index);
  };

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F1F5F9',
      }}
    >
      {/* Image Carousel with Overlay Badges */}
      {photoUrls.length > 0 && (
        <View 
          style={{ position: 'relative' }}
          onLayout={(event) => {
            const { width } = event.nativeEvent.layout;
            setCarouselWidth(width);
          }}
        >
          <FlatList
            ref={flatListRef}
            data={photoUrls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            snapToInterval={carouselWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            keyExtractor={(item, index) => `photo-${index}`}
            getItemLayout={(data, index) => ({
              length: carouselWidth,
              offset: carouselWidth * index,
              index,
            })}
            renderItem={({ item: photoUrl }) => (
              <View style={{ width: carouselWidth }}>
                <Image
                  source={{ uri: photoUrl }}
                  style={{ width: carouselWidth, height: 320 }}
                  resizeMode="cover"
                />
              </View>
            )}
          />

          {/* Page Indicator Dots */}
          {photoUrls.length > 1 && (
            <View
              style={{
                position: 'absolute',
                bottom: 12,
                left: 0,
                right: 0,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {photoUrls.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: currentPhotoIndex === index ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: currentPhotoIndex === index 
                      ? '#2563EB' 
                      : 'rgba(255, 255, 255, 0.6)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  }}
                />
              ))}
            </View>
          )}

          {/* Photo Count Badge */}
          <View
            className="absolute top-3 left-3 px-3 py-1.5 rounded-full flex-row items-center"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}
          >
            <Text className="text-white font-bold text-xs">
              {currentPhotoIndex + 1} / {photoUrls.length}
            </Text>
          </View>

          {/* Severity Badge */}
          {analysis && (
            <View
              className="absolute top-3 right-3 px-3 py-1.5 rounded-full flex-row items-center"
              style={{
                backgroundColor: severityColors.badge,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              }}
            >
              <AlertTriangle size={14} color="#FFFFFF" strokeWidth={2.5} />
              <Text className="text-white font-bold text-xs uppercase tracking-wide ml-1">
                {analysis.severity || 'N/A'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Content */}
      <View className="p-5">
        {/* Description */}
        <View className="mb-4">
          <Text className="text-lg font-bold text-gray-900 mb-2">
            {item.description}
          </Text>
          <View className="flex-row items-center">
            <Calendar size={12} color="#9CA3AF" strokeWidth={2} />
            <Text className="text-xs text-gray-400 ml-1.5">
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {analysis && (
          <>
            {/* AI Analysis Section */}
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              activeOpacity={0.7}
              className="mb-4"
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <View className="w-9 h-9 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: '#EFF6FF' }}>
                    <Bot size={20} color="#2563EB" strokeWidth={2} />
                  </View>
                  <Text className="text-base font-bold text-gray-900">
                    AI Analysis
                  </Text>
                </View>
                <View
                  className="w-7 h-7 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#E2E8F0' }}
                >
                  {expanded ? (
                    <ChevronUp size={16} color="#64748B" strokeWidth={2.5} />
                  ) : (
                    <ChevronDown size={16} color="#64748B" strokeWidth={2.5} />
                  )}
                </View>
              </View>

              {expanded && (
                <View className="mt-3 pt-3 border-t border-gray-200">
                  {/* Summary */}
                  <Text className="text-sm text-gray-700 leading-6 mb-4">
                    {analysis.summary}
                  </Text>

                  {/* Recommendations */}
                  {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <View className="mb-4">
                      <View className="flex-row items-center mb-2">
                        <Lightbulb size={16} color="#2563EB" strokeWidth={2} />
                        <Text className="text-sm font-bold text-gray-900 ml-2">
                          Recommendations
                        </Text>
                      </View>
                      {analysis.recommendations.map((rec, idx) => (
                        <View key={idx} className="flex-row mb-2">
                          <Text className="text-blue-500 mr-2">•</Text>
                          <Text className="text-sm text-gray-700 flex-1 leading-5">
                            {rec}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Cost and Urgency */}
                  <View className="gap-3">
                    {analysis.estimatedCost && (
                      <View className="bg-green-50 rounded-xl p-3 border border-green-100 flex-row items-center">
                        <DollarSign size={16} color="#16A34A" strokeWidth={2} />
                        <View className="ml-2 flex-1">
                          <Text className="text-xs font-semibold text-green-700">
                            Est. Cost
                          </Text>
                          <Text className="text-sm font-bold text-green-900">
                            {analysis.estimatedCost}
                          </Text>
                        </View>
                      </View>
                    )}
                    {analysis.urgency && (
                      <View className="bg-orange-50 rounded-xl p-3 border border-orange-100 flex-row items-center">
                        <AlertTriangle size={16} color="#EA580C" strokeWidth={2} />
                        <View className="ml-2 flex-1">
                          <Text className="text-xs font-semibold text-orange-700">
                            Urgency
                          </Text>
                          <Text className="text-sm font-bold text-orange-900">
                            {analysis.urgency}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Action Buttons */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={onEdit}
            activeOpacity={0.7}
            className="flex-1 rounded-xl py-3 flex-row items-center justify-center"
            style={{
              backgroundColor: '#EFF6FF',
              borderWidth: 1,
              borderColor: '#BFDBFE',
            }}
          >
            <Edit3 size={18} color="#2563EB" strokeWidth={2} />
            <Text className="text-blue-600 text-center font-bold text-sm ml-2">
              Edit
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={onDelete}
            activeOpacity={0.7}
            className="flex-1 rounded-xl py-3 flex-row items-center justify-center"
            style={{
              backgroundColor: '#FEF2F2',
              borderWidth: 1,
              borderColor: '#FEE2E2',
            }}
          >
            <Trash2 size={18} color="#DC2626" strokeWidth={2} />
            <Text className="text-red-600 text-center font-bold text-sm ml-2">
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
