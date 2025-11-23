import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Svg, { Path, Line } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { X, RefreshCw, ImageIcon, Camera as CameraIcon, Mic, MicOff, Zap, ZapOff, Pencil, ArrowRight, Eraser, Undo2 } from 'lucide-react-native';
import { usePropertyStore } from '../stores/propertyStore';

// Conditionally import Voice - it requires native modules not available in Expo Go
let Voice = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch (e) {
  console.log('Voice module not available - voice input disabled');
}

export default function CameraScreen({ route, navigation }) {
  const { areaId, onPhotoTaken, isPropertyPhoto, editMode, itemToEdit } = route.params || {};
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [flashMode, setFlashMode] = useState('off');
  const [capturedPhotos, setCapturedPhotos] = useState([]); // Array of photo URIs
  const [currentView, setCurrentView] = useState('camera'); // 'camera', 'gallery', 'annotate', 'description'
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0); // Currently viewing/annotating photo
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const cameraRef = useRef(null);
  const imageWithAnnotationsRef = useRef(null);
  const { createItem, updateItem, currentProperty, fetchPropertyById } = usePropertyStore();

  // Drawing state - per photo
  const [drawingMode, setDrawingMode] = useState(null); // 'pen', 'arrow', 'eraser', null
  const [strokeColor, setStrokeColor] = useState('#FF0000');
  const [photoAnnotations, setPhotoAnnotations] = useState({}); // { photoIndex: { paths: [] } }
  const [currentPath, setCurrentPath] = useState([]);
  const [imageBounds, setImageBounds] = useState(null); // { x, y, width, height }

  // Initialize edit mode
  useEffect(() => {
    if (editMode && itemToEdit) {
      // Pre-populate with existing item data
      setDescription(itemToEdit.description || '');
      
      // Load all photos from the item
      if (itemToEdit.photos && itemToEdit.photos.length > 0) {
        const photoUrls = itemToEdit.photos.map(photo => 
          photo.photoUrl.startsWith('http')
            ? photo.photoUrl
            : `${require('../config/api').API_BASE_URL.replace('/api', '')}${photo.photoUrl}`
        );
        setCapturedPhotos(photoUrls);
        // Start at description view if editing
        setCurrentView('description');
      }
    }
  }, [editMode, itemToEdit]);

  // Animation values
  const imageAnimY = useRef(new Animated.Value(0)).current;
  const imageAnimScale = useRef(new Animated.Value(1)).current;
  const modalAnimY = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const bottomSheetBottom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Setup voice recognition (only if available)
    if (Voice) {
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;

      return () => {
        Voice.destroy().then(Voice.removeAllListeners);
      };
    }
  }, []);

  useEffect(() => {
    // Keyboard listeners
    const showSubscription = Keyboard.addListener('keyboardWillShow', (event) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
      Animated.timing(bottomSheetBottom, {
        toValue: event.endCoordinates.height,
        duration: event.duration || 250,
        useNativeDriver: false, // bottom is not supported by native driver
      }).start();
    });
    const hideSubscription = Keyboard.addListener('keyboardWillHide', (event) => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      Animated.timing(bottomSheetBottom, {
        toValue: 0,
        duration: event?.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Listen for return from annotation screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Check if we have an annotated image in route params
      if (route.params?.annotatedImageUri) {
        setCapturedImage(route.params.annotatedImageUri);
        // Clear the param
        navigation.setParams({ annotatedImageUri: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, route.params?.annotatedImageUri]);

  // No need for animation trigger - we're handling views differently

  const onSpeechResults = (event) => {
    if (event.value && event.value.length > 0) {
      setDescription(event.value[0]);
    }
  };

  const onSpeechError = (error) => {
    console.error('Speech error:', error);
    setIsRecording(false);
  };

  const startVoiceRecognition = async () => {
    if (!Voice) {
      Alert.alert(
        'Voice Input Unavailable',
        'Voice input requires a development build. Please type your description instead.'
      );
      return;
    }
    
    try {
      setIsRecording(true);
      await Voice.start('en-US');
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      Alert.alert('Error', 'Failed to start voice recognition');
      setIsRecording(false);
    }
  };

  const stopVoiceRecognition = async () => {
    if (!Voice) return;
    
    try {
      await Voice.stop();
      setIsRecording(false);
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      setIsRecording(false);
    }
  };

  const toggleFlash = () => {
    setFlashMode((current) => (current === 'off' ? 'on' : 'off'));
  };

  // Pan Responder for drawing
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      console.log('onStartShouldSetPanResponder - drawingMode:', drawingMode);
      return drawingMode !== null;
    },
    onMoveShouldSetPanResponder: () => drawingMode !== null,
    onPanResponderGrant: (evt, gestureState) => {
      const { locationX, locationY } = evt.nativeEvent;
      console.log('onPanResponderGrant - drawingMode:', drawingMode, 'location:', locationX, locationY);
      
      if (drawingMode === 'eraser') {
        // Remove paths near touch point
        if (selectedPhotoIndex !== null) {
          const currentPaths = photoAnnotations[selectedPhotoIndex]?.paths || [];
          const filteredPaths = currentPaths.filter(path => {
            if (path.points && path.points.length > 0) {
              const distance = Math.sqrt(
                Math.pow(path.points[0].x - locationX, 2) + 
                Math.pow(path.points[0].y - locationY, 2)
              );
              return distance > 30;
            }
            return true;
          });
          setPhotoAnnotations(prev => ({
            ...prev,
            [selectedPhotoIndex]: { paths: filteredPaths }
          }));
        }
      } else {
        setCurrentPath([{ x: locationX, y: locationY }]);
      }
    },
    onPanResponderMove: (evt, gestureState) => {
      const { locationX, locationY } = evt.nativeEvent;
      
      if (drawingMode === 'pen') {
        setCurrentPath(prev => [...prev, { x: locationX, y: locationY }]);
      } else if (drawingMode === 'arrow') {
        setCurrentPath(prev => prev.length > 0 ? [prev[0], { x: locationX, y: locationY }] : [{ x: locationX, y: locationY }]);
      }
    },
    onPanResponderRelease: () => {
      if (currentPath.length > 0 && drawingMode !== 'eraser' && selectedPhotoIndex !== null) {
        const newPath = { 
          type: drawingMode, 
          points: currentPath, 
          color: strokeColor 
        };
        const currentPaths = photoAnnotations[selectedPhotoIndex]?.paths || [];
        setPhotoAnnotations(prev => ({
          ...prev,
          [selectedPhotoIndex]: {
            paths: [...currentPaths, newPath]
          }
        }));
        setCurrentPath([]);
      }
    },
  });

  const handleUndoDraw = () => {
    if (selectedPhotoIndex !== null) {
      const currentPaths = photoAnnotations[selectedPhotoIndex]?.paths || [];
      setPhotoAnnotations(prev => ({
        ...prev,
        [selectedPhotoIndex]: {
          paths: currentPaths.slice(0, -1)
        }
      }));
    }
  };

  const handleClearDrawing = () => {
    if (selectedPhotoIndex !== null) {
      setPhotoAnnotations(prev => ({
        ...prev,
        [selectedPhotoIndex]: { paths: [] }
      }));
    }
    setCurrentPath([]);
  };

  const calculateImageBounds = (containerWidth, containerHeight) => {
    // Square image (1:1 aspect ratio)
    const imageAspectRatio = 1;
    const containerAspectRatio = containerWidth / containerHeight;

    let imageWidth, imageHeight, offsetX, offsetY;

    if (containerAspectRatio > imageAspectRatio) {
      // Container is wider - image constrained by height
      imageHeight = containerHeight;
      imageWidth = imageHeight * imageAspectRatio;
      offsetX = (containerWidth - imageWidth) / 2;
      offsetY = 0;
    } else {
      // Container is taller - image constrained by width
      imageWidth = containerWidth;
      imageHeight = imageWidth / imageAspectRatio;
      offsetX = 0;
      offsetY = (containerHeight - imageHeight) / 2;
    }

    return { x: offsetX, y: offsetY, width: imageWidth, height: imageHeight };
  };

  const isPointInImage = (x, y) => {
    if (!imageBounds) return false;
    return (
      x >= imageBounds.x &&
      x <= imageBounds.x + imageBounds.width &&
      y >= imageBounds.y &&
      y <= imageBounds.y + imageBounds.height
    );
  };

  const cropToSquare = async (uri) => {
    try {
      // Get image info
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG }
      );
      
      // Load the image to get dimensions
      const image = await new Promise((resolve, reject) => {
        Image.getSize(
          manipResult.uri,
          (width, height) => resolve({ width, height }),
          reject
        );
      });
      
      // Calculate square crop dimensions (centered)
      const size = Math.min(image.width, image.height);
      const originX = (image.width - size) / 2;
      const originY = (image.height - size) / 2;
      
      // Crop to square
      const croppedImage = await ImageManipulator.manipulateAsync(
        manipResult.uri,
        [
          {
            crop: {
              originX,
              originY,
              width: size,
              height: size,
            },
          },
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      return croppedImage.uri;
    } catch (error) {
      console.error('Error cropping image:', error);
      return uri; // Return original if crop fails
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      
      // Crop to square
      const squareUri = await cropToSquare(photo.uri);
      
      // Property photos go back with callback
      if (isPropertyPhoto && onPhotoTaken) {
        onPhotoTaken(squareUri);
        navigation.goBack();
        return;
      }
      
      // For inspection photos, add to photos array and stay in camera mode
      setCapturedPhotos(prev => [...prev, squareUri]);
    }
  };

  const handleRemovePhoto = (index) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
    // Remove annotations for this photo
    const newAnnotations = { ...photoAnnotations };
    delete newAnnotations[index];
    // Shift annotations for photos after this one
    const shiftedAnnotations = {};
    Object.keys(newAnnotations).forEach(key => {
      const keyNum = parseInt(key);
      if (keyNum > index) {
        shiftedAnnotations[keyNum - 1] = newAnnotations[key];
      } else {
        shiftedAnnotations[key] = newAnnotations[key];
      }
    });
    setPhotoAnnotations(shiftedAnnotations);
  };

  const handleProceedToDescription = () => {
    if (capturedPhotos.length === 0) {
      Alert.alert('Error', 'Please take at least one photo');
      return;
    }
    setCurrentView('description');
  };

  const handleBackToCamera = () => {
    setCurrentView('camera');
  };

  const handleOpenAnnotation = (index) => {
    setSelectedPhotoIndex(index);
    setCurrentView('annotate');
    setDrawingMode(null);
    setCurrentPath([]);
  };

  const handleSaveAnnotation = async () => {
    // Save current annotations for this photo
    if (photoAnnotations[selectedPhotoIndex]?.paths.length > 0 && imageWithAnnotationsRef.current) {
      try {
        const capturedUri = await captureRef(imageWithAnnotationsRef, {
          format: 'jpg',
          quality: 1.0,
          result: 'tmpfile',
        });

        // Replace the photo with annotated version
        const newPhotos = [...capturedPhotos];
        newPhotos[selectedPhotoIndex] = capturedUri;
        setCapturedPhotos(newPhotos);
        
        // Clear annotations for this photo since they're now baked in
        const newAnnotations = { ...photoAnnotations };
        delete newAnnotations[selectedPhotoIndex];
        setPhotoAnnotations(newAnnotations);
      } catch (error) {
        console.error('Error saving annotation:', error);
      }
    }
    
    setCurrentView('description');
    setSelectedPhotoIndex(null);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Force square selection
      quality: 0.8,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      
      // Crop to square just in case
      const squareUri = await cropToSquare(imageUri);
      
      // Property photos go back with callback
      if (isPropertyPhoto && onPhotoTaken) {
        onPhotoTaken(squareUri);
        navigation.goBack();
        return;
      }
      
      // For inspection photos, add to photos array and stay in camera mode
      setCapturedPhotos(prev => [...prev, squareUri]);
    }
  };

  const handleSave = async () => {
    if (capturedPhotos.length === 0) {
      Alert.alert('Error', 'Please capture at least one photo');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please add a description');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      
      if (editMode && itemToEdit) {
        formData.append('description', description);
        capturedPhotos.forEach((uri, index) => {
          formData.append('photos', {
            uri,
            type: 'image/jpeg',
            name: `inspection-photo-${index + 1}.jpg`,
          });
        });
        
        const result = await updateItem(itemToEdit.id, formData);
        
        if (result.success) {
          Alert.alert('Success', 'Item updated successfully', [
            {
              text: 'OK',
              onPress: () => {
                if (currentProperty) fetchPropertyById(currentProperty.id);
                navigation.goBack();
              },
            },
          ]);
        } else {
          Alert.alert('Error', result.error || 'Failed to update item');
        }
      } else {
        formData.append('areaId', areaId);
        formData.append('description', description);
        capturedPhotos.forEach((uri, index) => {
          formData.append('photos', {
            uri,
            type: 'image/jpeg',
            name: `inspection-photo-${index + 1}.jpg`,
          });
        });

        const result = await createItem(areaId, formData);

        if (result.success) {
          Alert.alert('Success', `${capturedPhotos.length} photo(s) uploaded successfully. AI analysis in progress...`, [
            {
              text: 'OK',
              onPress: () => {
                if (currentProperty) fetchPropertyById(currentProperty.id);
                navigation.goBack();
              },
            },
          ]);
        } else {
          Alert.alert('Error', result.error || 'Failed to upload photos');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save');
      console.error('Save error:', error);
    } finally {
      setUploading(false);
    }
  };

  if (!permission) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-gray-500 mt-4">Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center px-8" style={{ backgroundColor: '#F8FAFC' }}>
        <View className="w-24 h-24 rounded-full items-center justify-center mb-6" style={{ backgroundColor: '#EFF6FF' }}>
          <CameraIcon size={48} color="#2563EB" strokeWidth={1.5} />
        </View>
        <Text className="text-xl font-bold text-gray-900 text-center mb-3">
          Camera Permission Required
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8 leading-6">
          We need access to your camera to take inspection photos
        </Text>
        <TouchableOpacity
          className="rounded-2xl py-4 px-8 mb-3"
          style={{
            backgroundColor: '#2563EB',
            shadowColor: '#2563EB',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-base">
            Grant Permission
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="rounded-2xl py-4 px-8"
          style={{ backgroundColor: '#F1F5F9' }}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text className="text-gray-700 font-bold text-base">
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show description view when we have photos AND currentView is 'description'
  if (capturedPhotos.length > 0 && currentView === 'description') {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      >
        {/* Fixed Header */}
        <View style={{ 
          backgroundColor: '#FFFFFF', 
          paddingTop: 60, 
          paddingBottom: 20, 
          paddingHorizontal: 24,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
          zIndex: 10,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={handleBackToCamera} style={{ marginRight: 16 }}>
              <Text style={{ fontSize: 28, color: '#2563EB' }}>←</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
              Add Description
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>
            {capturedPhotos.length} photo{capturedPhotos.length !== 1 ? 's' : ''} captured
          </Text>
        </View>

        {/* Scrollable Content */}
        <ScrollView style={{ flex: 1 }}>
          {/* Photo Gallery Preview */}
          <View style={{ padding: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
              Photos (tap to annotate)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, overflow: 'visible' }}>
                {capturedPhotos.map((uri, index) => (
                  <View key={index} style={{ position: 'relative', overflow: 'visible' }}>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedPhotoIndex(index);
                        setCurrentView('annotate');
                      }}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri }}
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: 12,
                          backgroundColor: '#F3F4F6',
                        }}
                      />
                      <View style={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}>
                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>{index + 1}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemovePhoto(index)}
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        backgroundColor: '#EF4444',
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                      }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Description Input */}
          <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
              Description
            </Text>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                borderWidth: focusedField === 'description' ? 2 : 1,
                borderColor: focusedField === 'description' ? '#2563EB' : '#E5E7EB',
                minHeight: 120,
              }}
            >
              <TextInput
                style={{
                  fontSize: 16,
                  color: '#111827',
                  textAlignVertical: 'top',
                  minHeight: 100,
                }}
                placeholder="Describe what you found (e.g., 'Cracked foundation', 'Water damage')"
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                onFocus={() => setFocusedField('description')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Voice Input Button */}
            {Voice && (
              <TouchableOpacity
                onPress={isRecording ? stopVoiceRecognition : startVoiceRecognition}
                activeOpacity={0.8}
                style={{
                  marginTop: 12,
                  borderRadius: 12,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isRecording ? '#FEF2F2' : '#EFF6FF',
                  borderWidth: 1,
                  borderColor: isRecording ? '#FEE2E2' : '#DBEAFE',
                }}
              >
                {isRecording ? (
                  <>
                    <MicOff size={18} color="#DC2626" strokeWidth={2} />
                    <Text style={{ color: '#DC2626', fontWeight: 'bold', fontSize: 14, marginLeft: 8 }}>
                      Stop Recording
                    </Text>
                  </>
                ) : (
                  <>
                    <Mic size={18} color="#2563EB" strokeWidth={2} />
                    <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 14, marginLeft: 8 }}>
                      Use Voice Input
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Action Buttons */}
          <View style={{ padding: 24, paddingBottom: 40, gap: 12 }}>
            <TouchableOpacity
              onPress={handleBackToCamera}
              style={{
                backgroundColor: '#EFF6FF',
                borderRadius: 16,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: '#2563EB',
                borderStyle: 'dashed',
              }}
            >
              <CameraIcon size={20} color="#2563EB" strokeWidth={2} />
              <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>
                Add More Photos ({capturedPhotos.length})
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setCapturedPhotos([]);
                  setPhotoAnnotations({});
                  setCurrentView('camera');
                  setDescription('');
                }}
                disabled={uploading}
                style={{
                  flex: 1,
                  backgroundColor: '#F3F4F6',
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#6B7280', fontWeight: 'bold', fontSize: 16 }}>
                  Clear All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={uploading || !description.trim()}
                style={{
                  flex: 2,
                  backgroundColor: uploading || !description.trim() ? '#9CA3AF' : '#2563EB',
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#2563EB',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
                    Save & Analyze
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ANNOTATION VIEW - View and annotate a single photo
  if (currentView === 'annotate' && selectedPhotoIndex !== null) {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Image with annotations */}
        <View 
          style={{ 
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Capturable view with image + annotations */}
          <View 
            ref={imageWithAnnotationsRef}
            style={{ 
              width: screenWidth,
              height: screenWidth, // Square
              position: 'relative',
            }}
            collapsable={false}
          >
            <Image
              source={{ uri: capturedPhotos[selectedPhotoIndex] }}
              style={{
                width: '100%',
                height: '100%',
              }}
              resizeMode="contain"
            />
            
            {/* Drawing overlay */}
            <Svg
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            >
              {/* Render saved paths for current photo */}
              {(photoAnnotations[selectedPhotoIndex]?.paths || []).map((path, index) => {
                if (path.type === 'pen') {
                  const pathData = path.points.map((p, i) => 
                    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                  ).join(' ');
                  return (
                    <Path
                      key={index}
                      d={pathData}
                      stroke={path.color}
                      strokeWidth={3}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                } else if (path.type === 'arrow' && path.points.length === 2) {
                  const start = path.points[0];
                  const end = path.points[1];
                  const angle = Math.atan2(end.y - start.y, end.x - start.x);
                  const arrowSize = 15;
                  const arrowAngle = Math.PI / 6;
                  
                  return (
                    <React.Fragment key={index}>
                      <Line
                        x1={start.x}
                        y1={start.y}
                        x2={end.x}
                        y2={end.y}
                        stroke={path.color}
                        strokeWidth={3}
                        strokeLinecap="round"
                      />
                      <Path
                        d={`M ${end.x} ${end.y} L ${end.x - arrowSize * Math.cos(angle - arrowAngle)} ${end.y - arrowSize * Math.sin(angle - arrowAngle)} M ${end.x} ${end.y} L ${end.x - arrowSize * Math.cos(angle + arrowAngle)} ${end.y - arrowSize * Math.sin(angle + arrowAngle)}`}
                        stroke={path.color}
                        strokeWidth={3}
                        strokeLinecap="round"
                      />
                    </React.Fragment>
                  );
                }
                return null;
              })}

              {/* Render current path being drawn */}
              {currentPath.length > 0 && drawingMode === 'pen' && (
                <Path
                  d={currentPath.map((p, i) => 
                    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                  ).join(' ')}
                  stroke={strokeColor}
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Render current arrow */}
              {currentPath.length === 2 && drawingMode === 'arrow' && (
                <Line
                  x1={currentPath[0].x}
                  y1={currentPath[0].y}
                  x2={currentPath[1].x}
                  y2={currentPath[1].y}
                  stroke={strokeColor}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              )}
            </Svg>

            {/* Touch layer for drawing */}
            {drawingMode && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'transparent',
                }}
                {...panResponder.panHandlers}
              />
            )}
          </View>
        </View>

        {/* Top toolbar */}
        <View
          style={{
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            zIndex: 20,
          }}
        >
          {/* Left: Drawing tools */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setDrawingMode(drawingMode === 'pen' ? null : 'pen')}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: drawingMode === 'pen' ? '#2563EB' : 'rgba(0, 0, 0, 0.6)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: drawingMode === 'pen' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
              }}
            >
              <Pencil size={20} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDrawingMode(drawingMode === 'arrow' ? null : 'arrow')}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: drawingMode === 'arrow' ? '#2563EB' : 'rgba(0, 0, 0, 0.6)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: drawingMode === 'arrow' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
              }}
            >
              <ArrowRight size={20} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDrawingMode(drawingMode === 'eraser' ? null : 'eraser')}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: drawingMode === 'eraser' ? '#EF4444' : 'rgba(0, 0, 0, 0.6)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: drawingMode === 'eraser' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
              }}
            >
              <Eraser size={20} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Right: Undo */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleUndoDraw}
              activeOpacity={0.7}
              disabled={(photoAnnotations[selectedPhotoIndex]?.paths || []).length === 0}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                opacity: (photoAnnotations[selectedPhotoIndex]?.paths || []).length === 0 ? 0.5 : 1,
              }}
            >
              <Undo2 size={20} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Color picker */}
        {drawingMode && drawingMode !== 'eraser' && (
          <View
            style={{
              position: 'absolute',
              bottom: 140,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 12,
              paddingVertical: 8,
              zIndex: 15,
            }}
          >
            {['#FF0000', '#2563EB', '#10B981', '#F59E0B', '#FFFFFF', '#000000'].map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setStrokeColor(color)}
                activeOpacity={0.7}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: color,
                  borderWidth: strokeColor === color ? 3 : 2,
                  borderColor: strokeColor === color ? '#2563EB' : '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                }}
              />
            ))}
          </View>
        )}

        {/* Bottom navigation bar */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            paddingHorizontal: 24,
            paddingVertical: 20,
            paddingBottom: 40,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setCurrentView('description');
              setDrawingMode(null);
            }}
            style={{
              flex: 1,
              backgroundColor: '#374151',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              // Save annotations for this photo
              if ((photoAnnotations[selectedPhotoIndex]?.paths || []).length > 0 && imageWithAnnotationsRef.current) {
                try {
                  const capturedUri = await captureRef(imageWithAnnotationsRef, {
                    format: 'jpg',
                    quality: 1.0,
                    result: 'tmpfile',
                  });

                  // Replace the photo with annotated version
                  const newPhotos = [...capturedPhotos];
                  newPhotos[selectedPhotoIndex] = capturedUri;
                  setCapturedPhotos(newPhotos);
                  
                  // Clear annotations for this photo since they're now baked in
                  const newAnnotations = { ...photoAnnotations };
                  delete newAnnotations[selectedPhotoIndex];
                  setPhotoAnnotations(newAnnotations);

                  Alert.alert('Success', 'Annotations saved!');
                } catch (error) {
                  console.error('Error saving annotation:', error);
                  Alert.alert('Error', 'Failed to save annotations');
                }
              }
              setCurrentView('description');
              setDrawingMode(null);
            }}
            style={{
              flex: 1,
              backgroundColor: '#2563EB',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              shadowColor: '#2563EB',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Photo counter */}
        <View
          style={{
            position: 'absolute',
            top: 20,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 25,
          }}
        >
          <View style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}>
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>
              Photo {selectedPhotoIndex + 1} of {capturedPhotos.length}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // CAMERA VIEW - Default and primary view
  if (currentView === 'camera') {
    return (
      <View className="flex-1 bg-black">
        <CameraView style={{ flex: 1 }} facing={facing} flash={flashMode} ref={cameraRef} />
        
        {/* Thumbnail Gallery at Bottom */}
        {capturedPhotos.length > 0 && (
          <View style={{
            position: 'absolute',
            bottom: 120,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            overflow: 'visible',
          }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 8, overflow: 'visible' }}>
                {capturedPhotos.map((uri, index) => (
                  <View key={index} style={{ position: 'relative', overflow: 'visible' }}>
                    <Image
                      source={{ uri }}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: '#FFF',
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => handleRemovePhoto(index)}
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        backgroundColor: '#EF4444',
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                      }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>×</Text>
                    </TouchableOpacity>
                    <View style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}>
                      <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>{index + 1}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
        
        {/* "Next" button when photos are captured */}
        {capturedPhotos.length > 0 && (
          <View style={{
            position: 'absolute',
            bottom: 30,
            right: 24,
            zIndex: 100,
          }}>
            <TouchableOpacity
              onPress={handleProceedToDescription}
              style={{
                backgroundColor: '#10B981',
                paddingHorizontal: 24,
                paddingVertical: 14,
                borderRadius: 12,
                shadowColor: '#10B981',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
                Next ({capturedPhotos.length})
              </Text>
              <Text style={{ color: '#FFF', fontSize: 18 }}>→</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Camera UI Overlays */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'space-between',
          }}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center p-6" style={{ paddingTop: 60 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              <X size={24} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            <View className="flex-row gap-3">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={toggleFlash}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: flashMode === 'on' ? 'rgba(37, 99, 235, 0.9)' : 'rgba(0, 0, 0, 0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: flashMode === 'on' ? 'rgba(37, 99, 235, 1)' : 'rgba(255, 255, 255, 0.2)',
                }}
              >
                {flashMode === 'on' ? (
                  <Zap size={24} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
                ) : (
                  <ZapOff size={24} color="#FFFFFF" strokeWidth={2} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <RefreshCw size={24} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Controls */}
          <View className="items-center pb-12">
            <View className="flex-row items-center gap-8">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={pickImage}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                <ImageIcon size={28} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={takePicture}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 4,
                  borderColor: 'rgba(255, 255, 255, 0.9)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: '#2563EB',
                  }}
                />
              </TouchableOpacity>

              <View style={{ width: 64, height: 64 }} />
            </View>
          </View>
        </View>
        
        {/* Square Viewfinder Overlay */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <View
            style={{
              width: Dimensions.get('window').width - 40,
              height: Dimensions.get('window').width - 40,
              borderWidth: 2,
              borderColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: 20,
            }}
          >
            {/* Corner indicators */}
            <View style={{
              position: 'absolute',
              top: -2,
              left: -2,
              width: 40,
              height: 40,
              borderTopWidth: 4,
              borderLeftWidth: 4,
              borderColor: '#2563EB',
              borderTopLeftRadius: 20,
            }} />
            <View style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 40,
              height: 40,
              borderTopWidth: 4,
              borderRightWidth: 4,
              borderColor: '#2563EB',
              borderTopRightRadius: 20,
            }} />
            <View style={{
              position: 'absolute',
              bottom: -2,
              left: -2,
              width: 40,
              height: 40,
              borderBottomWidth: 4,
              borderLeftWidth: 4,
              borderColor: '#2563EB',
              borderBottomLeftRadius: 20,
            }} />
            <View style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 40,
              height: 40,
              borderBottomWidth: 4,
              borderRightWidth: 4,
              borderColor: '#2563EB',
              borderBottomRightRadius: 20,
            }} />
            
            {/* Square 1:1 label */}
            <View style={{
              position: 'absolute',
              bottom: -40,
              left: 0,
              right: 0,
              alignItems: 'center',
            }}>
              <View style={{
                backgroundColor: 'rgba(37, 99, 235, 0.9)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
              }}>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 'bold',
                }}>
                  1:1 SQUARE
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // PERMISSION/LOADING STATES
  if (!permission) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-gray-500 mt-4">Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center px-8" style={{ backgroundColor: '#F8FAFC' }}>
        <View className="w-24 h-24 rounded-full items-center justify-center mb-6" style={{ backgroundColor: '#EFF6FF' }}>
          <CameraIcon size={48} color="#2563EB" strokeWidth={1.5} />
        </View>
        <Text className="text-xl font-bold text-gray-900 text-center mb-3">
          Camera Permission Required
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8 leading-6">
          We need access to your camera to take inspection photos
        </Text>
        <TouchableOpacity
          className="rounded-2xl py-4 px-8 mb-3"
          style={{
            backgroundColor: '#2563EB',
            shadowColor: '#2563EB',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-base">
            Grant Permission
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="rounded-2xl py-4 px-8"
          style={{ backgroundColor: '#F1F5F9' }}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text className="text-gray-700 font-bold text-base">
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Default fallback (should never reach here)
  return (
    <View className="flex-1 justify-center items-center" style={{ backgroundColor: '#F8FAFC' }}>
      <Text className="text-gray-500">Initializing...</Text>
    </View>
  );
}
