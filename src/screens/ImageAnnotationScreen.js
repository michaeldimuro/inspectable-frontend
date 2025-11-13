import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, Pencil, ArrowRight, Eraser, RotateCcw } from 'lucide-react-native';

// Conditionally import SketchCanvas - requires native modules
let SketchCanvas = null;
try {
  const SketchCanvasModule = require('@terrylinla/react-native-sketch-canvas');
  SketchCanvas = SketchCanvasModule.default || SketchCanvasModule.SketchCanvas;
} catch (e) {
  console.log('Sketch canvas not available - requires development build');
}

const { width: screenWidth } = Dimensions.get('window');

export default function ImageAnnotationScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { imageUri, onAnnotationComplete, isPropertyPhoto } = route.params;
  const canvasRef = useRef(null);
  
  const [selectedTool, setSelectedTool] = useState('pen');
  const [strokeColor, setStrokeColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(5);

  const handleSave = async () => {
    if (!SketchCanvas || !canvasRef.current) {
      // If annotation not available, just return original image
      if (onAnnotationComplete) {
        onAnnotationComplete(imageUri);
      } else {
        navigation.navigate(route.params.returnScreen || 'Camera', {
          annotatedImageUri: imageUri,
        });
      }
      return;
    }

    try {
      // Get the annotated image
      canvasRef.current.getBase64('png', false, true, true, (error, result) => {
        if (error) {
          console.error('Error getting annotated image:', error);
          Alert.alert('Error', 'Failed to save annotations');
          return;
        }
        
        // Create data URI
        const annotatedImageUri = `data:image/png;base64,${result}`;
        
        if (onAnnotationComplete) {
          onAnnotationComplete(annotatedImageUri);
          navigation.goBack();
        } else {
          navigation.navigate(route.params.returnScreen || 'Camera', {
            annotatedImageUri,
          });
        }
      });
    } catch (error) {
      console.error('Save annotation error:', error);
      Alert.alert('Error', 'Failed to save annotations');
    }
  };

  const handleSkip = () => {
    if (onAnnotationComplete) {
      onAnnotationComplete(imageUri);
      navigation.goBack();
    } else {
      navigation.navigate(route.params.returnScreen || 'Camera', {
        annotatedImageUri: imageUri,
      });
    }
  };

  const handleClear = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
  };

  const handleUndo = () => {
    if (canvasRef.current) {
      canvasRef.current.undo();
    }
  };

  // Fallback UI if SketchCanvas is not available
  if (!SketchCanvas) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <View style={{ backgroundColor: '#FFFFFF', paddingTop: insets.top, paddingBottom: 12 }}>
          <View className="flex-row items-center justify-between px-4">
            <Text className="text-lg font-bold text-gray-900">
              Annotation Unavailable
            </Text>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
              <X size={28} color="#2563EB" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View className="flex-1 justify-center items-center px-8">
          <View className="bg-white rounded-3xl p-8 items-center" style={{ maxWidth: 400 }}>
            <Text className="text-xl font-bold text-gray-900 text-center mb-4">
              Annotation Feature
            </Text>
            <Text className="text-base text-gray-600 text-center mb-6 leading-6">
              Image annotation requires a development build. The photo will be saved without annotations.
            </Text>
            <TouchableOpacity
              onPress={handleSkip}
              className="w-full rounded-2xl py-4"
              style={{ backgroundColor: '#2563EB' }}
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold text-base text-center">
                Continue Without Annotation
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#FFFFFF', paddingTop: insets.top, paddingBottom: 12 }}>
        <View className="flex-row items-center justify-between px-4 mb-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={24} color="#374151" strokeWidth={2.5} />
          </TouchableOpacity>

          <Text className="text-lg font-bold text-gray-900">
            Annotate Image
          </Text>

          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#2563EB',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={24} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Tools */}
        <View className="flex-row items-center justify-between px-4">
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setSelectedTool('pen')}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: selectedTool === 'pen' ? '#2563EB' : '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Pencil 
                size={20} 
                color={selectedTool === 'pen' ? '#FFFFFF' : '#6B7280'} 
                strokeWidth={2} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedTool('arrow')}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: selectedTool === 'arrow' ? '#2563EB' : '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowRight 
                size={20} 
                color={selectedTool === 'arrow' ? '#FFFFFF' : '#6B7280'} 
                strokeWidth={2} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedTool('eraser')}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: selectedTool === 'eraser' ? '#2563EB' : '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Eraser 
                size={20} 
                color={selectedTool === 'eraser' ? '#FFFFFF' : '#6B7280'} 
                strokeWidth={2} 
              />
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleUndo}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RotateCcw size={20} color="#6B7280" strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClear}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 16,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#FEF2F2',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#FEE2E2',
              }}
            >
              <Text className="text-red-600 font-bold text-sm">
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Color Picker */}
        <View className="flex-row items-center px-4 mt-3">
          <Text className="text-sm font-semibold text-gray-700 mr-3">
            Color:
          </Text>
          <View className="flex-row gap-2">
            {['#FF0000', '#2563EB', '#10B981', '#F59E0B', '#FFFFFF', '#000000'].map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setStrokeColor(color)}
                activeOpacity={0.7}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: color,
                  borderWidth: strokeColor === color ? 3 : 1,
                  borderColor: strokeColor === color ? '#2563EB' : '#E5E7EB',
                }}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Canvas */}
      <View style={{ flex: 1 }}>
        <SketchCanvas
          ref={canvasRef}
          style={{ flex: 1 }}
          strokeColor={selectedTool === 'eraser' ? '#00000000' : strokeColor}
          strokeWidth={selectedTool === 'eraser' ? 20 : strokeWidth}
          localSourceImage={{ 
            filename: imageUri,
            directory: '',
            mode: 'AspectFit'
          }}
        />
      </View>

      {/* Bottom Skip Button */}
      <View style={{ 
        backgroundColor: '#FFFFFF', 
        paddingBottom: insets.bottom + 16,
        paddingTop: 16,
        paddingHorizontal: 20,
      }}>
        <TouchableOpacity
          onPress={handleSkip}
          className="rounded-2xl py-4"
          style={{ backgroundColor: '#F1F5F9' }}
          activeOpacity={0.7}
        >
          <Text className="text-gray-700 font-bold text-base text-center">
            Skip Annotation
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

