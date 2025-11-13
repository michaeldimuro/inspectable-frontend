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
  const [capturedImage, setCapturedImage] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const cameraRef = useRef(null);
  const imageWithAnnotationsRef = useRef(null);
  const { createItem, updateItem, currentProperty, fetchPropertyById } = usePropertyStore();

  // Drawing state
  const [drawingMode, setDrawingMode] = useState(null); // 'pen', 'arrow', 'eraser', null
  const [strokeColor, setStrokeColor] = useState('#FF0000');
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [imageBounds, setImageBounds] = useState(null); // { x, y, width, height }

  // Initialize edit mode
  useEffect(() => {
    if (editMode && itemToEdit) {
      // Pre-populate with existing item data
      setDescription(itemToEdit.description || '');
      
      // Construct full image URL
      const imageUrl = itemToEdit.photoUrl.startsWith('http')
        ? itemToEdit.photoUrl
        : `${require('../config/api').API_BASE_URL.replace('/api', '')}${itemToEdit.photoUrl}`;
      
      setCapturedImage(imageUrl);
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

  // Trigger animation when image is captured
  useEffect(() => {
    if (capturedImage) {
      // Dismiss keyboard if open
      Keyboard.dismiss();
      
      // Reset states
      setPaths([]);
      setCurrentPath([]);
      setDrawingMode(null);
      setImageBounds(null);
      
      // Reset animation values
      imageAnimY.setValue(0);
      imageAnimScale.setValue(1);
      modalAnimY.setValue(Dimensions.get('window').height);

      // Animate modal up from bottom
      Animated.spring(modalAnimY, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset when image is cleared
      imageAnimY.setValue(0);
      imageAnimScale.setValue(1);
      modalAnimY.setValue(Dimensions.get('window').height);
    }
  }, [capturedImage]);

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
        setPaths(paths.filter(path => {
          // Check distance to first point of each path
          if (path.points && path.points.length > 0) {
            const distance = Math.sqrt(
              Math.pow(path.points[0].x - locationX, 2) + 
              Math.pow(path.points[0].y - locationY, 2)
            );
            return distance > 30;
          }
          return true;
        }));
      } else {
        setCurrentPath([{ x: locationX, y: locationY }]);
        console.log('Started path with point:', locationX, locationY);
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
      console.log('onPanResponderRelease - currentPath length:', currentPath.length);
      if (currentPath.length > 0 && drawingMode !== 'eraser') {
        const newPath = { 
          type: drawingMode, 
          points: currentPath, 
          color: strokeColor 
        };
        console.log('Adding path:', newPath);
        setPaths(prev => [...prev, newPath]);
        setCurrentPath([]);
      }
    },
  });

  const handleUndoDraw = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const handleClearDrawing = () => {
    setPaths([]);
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
      
      // Just set the captured image directly - skip annotation for now
      // Property photos go back with callback
      if (isPropertyPhoto && onPhotoTaken) {
        onPhotoTaken(squareUri);
        navigation.goBack();
        return;
      }
      
      // For inspection photos, show description screen
      setCapturedImage(squareUri);
    }
  };

  const handleRetake = () => {
    Keyboard.dismiss();
    setCapturedImage(null);
    // In edit mode, keep the description
    if (!editMode) {
      setDescription('');
    }
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
      
      // For inspection photos, show description screen
      setCapturedImage(squareUri);
    }
  };

  const handleSave = async () => {
    if (!capturedImage) {
      Alert.alert('Error', 'Please capture or select an image');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please add a description');
      return;
    }

    setUploading(true);

    try {
      let finalImageUri = capturedImage;
      let hasNewPhoto = false;

      // Check if this is a new photo (not from edit mode) or has annotations
      if (editMode && itemToEdit) {
        // In edit mode, only update photo if it's different from original or has annotations
        const originalUrl = itemToEdit.photoUrl.startsWith('http')
          ? itemToEdit.photoUrl
          : `${require('../config/api').API_BASE_URL.replace('/api', '')}${itemToEdit.photoUrl}`;
        
        hasNewPhoto = capturedImage !== originalUrl || paths.length > 0;
      } else {
        // Not in edit mode, so this is definitely a new photo
        hasNewPhoto = true;
      }

      // If there are annotations, capture the view with annotations
      if (paths.length > 0 && imageWithAnnotationsRef.current) {
        console.log('Capturing annotated image...');
        try {
          // First capture at screen resolution
          const capturedUri = await captureRef(imageWithAnnotationsRef, {
            format: 'jpg',
            quality: 1.0,
            result: 'tmpfile',
          });
          
          console.log('Captured image with annotations:', capturedUri);
          
          // Get the dimensions of the captured image
          const capturedInfo = await new Promise((resolve, reject) => {
            Image.getSize(
              capturedUri,
              (width, height) => resolve({ width, height }),
              (error) => reject(error)
            );
          });
          
          console.log('Captured dimensions:', capturedInfo);
          
          // Get original image dimensions
          const originalInfo = await new Promise((resolve, reject) => {
            Image.getSize(
              capturedImage,
              (width, height) => resolve({ width, height }),
              (error) => reject(error)
            );
          });
          
          console.log('Original dimensions:', originalInfo);
          
          // Calculate the crop area to remove letterboxing
          // The image is displayed with resizeMode="contain", so we need to find the actual image area
          const capturedAspect = capturedInfo.width / capturedInfo.height;
          const imageAspect = originalInfo.width / originalInfo.height;
          
          let cropX = 0;
          let cropY = 0;
          let cropWidth = capturedInfo.width;
          let cropHeight = capturedInfo.height;
          
          if (capturedAspect > imageAspect) {
            // Letterboxing on sides
            const actualWidth = capturedInfo.height * imageAspect;
            cropX = (capturedInfo.width - actualWidth) / 2;
            cropWidth = actualWidth;
          } else if (capturedAspect < imageAspect) {
            // Letterboxing on top/bottom
            const actualHeight = capturedInfo.width / imageAspect;
            cropY = (capturedInfo.height - actualHeight) / 2;
            cropHeight = actualHeight;
          }
          
          console.log('Crop parameters:', { cropX, cropY, cropWidth, cropHeight });
          
          // Crop to remove letterboxing and resize to original dimensions
          const result = await ImageManipulator.manipulateAsync(
            capturedUri,
            [
              {
                crop: {
                  originX: Math.round(cropX),
                  originY: Math.round(cropY),
                  width: Math.round(cropWidth),
                  height: Math.round(cropHeight),
                }
              },
              {
                resize: {
                  width: originalInfo.width,
                  height: originalInfo.height,
                }
              }
            ],
            { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
          );
          
          finalImageUri = result.uri;
          console.log('Final annotated image:', finalImageUri);
          hasNewPhoto = true; // Annotations mean we have a new photo
        } catch (captureError) {
          console.error('Error capturing annotated image:', captureError);
          // Fall back to original image if capture fails
          Alert.alert('Warning', 'Could not save annotations, using original image');
        }
      }

      let result;
      
      if (editMode && itemToEdit) {
        // Update existing item
        if (hasNewPhoto) {
          // Update with new photo
          const formData = new FormData();
          formData.append('description', description);
          formData.append('photo', {
            uri: finalImageUri,
            type: 'image/jpeg',
            name: 'inspection-photo.jpg',
          });
          result = await updateItem(itemToEdit.id, formData);
        } else {
          // Update description only
          result = await updateItem(itemToEdit.id, { description });
        }

        if (result.success) {
          Alert.alert(
            'Success',
            'Item updated successfully',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Refresh property and navigate back
                  if (currentProperty) {
                    fetchPropertyById(currentProperty.id);
                  }
                  navigation.goBack();
                },
              },
            ]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to update item');
        }
      } else {
        // Create new item
        const formData = new FormData();
        formData.append('areaId', areaId);
        formData.append('description', description);
        formData.append('photo', {
          uri: finalImageUri,
          type: 'image/jpeg',
          name: 'inspection-photo.jpg',
        });

        result = await createItem(areaId, formData);

        if (result.success) {
          Alert.alert(
            'Success',
            'Photo uploaded successfully. AI analysis in progress...',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Refresh property and navigate back
                  if (currentProperty) {
                    fetchPropertyById(currentProperty.id);
                  }
                  navigation.goBack();
                },
              },
            ]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to upload photo');
        }
      }
    } catch (error) {
      Alert.alert('Error', editMode ? 'Failed to update item' : 'Failed to upload photo');
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

  if (capturedImage) {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const bottomSheetCollapsedHeight = 360; // Height when keyboard is closed
    const bottomSheetExpandedHeight = 200; // Height when keyboard is open
    const toolbarTopOffset = -50; // Move image up so it extends behind toolbar
    // Image container has ABSOLUTE fixed height - NEVER changes regardless of keyboard
    const fixedImageContainerHeight = screenHeight - bottomSheetCollapsedHeight + Math.abs(toolbarTopOffset);

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Fixed-height image container - extends behind toolbar */}
        <View 
          style={{ 
            position: 'absolute',
            top: toolbarTopOffset,
            left: 0,
            right: 0,
            height: fixedImageContainerHeight,
            backgroundColor: '#000',
            zIndex: 1,
          }}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            // Only set bounds once when image first loads
            if (!imageBounds) {
              const bounds = calculateImageBounds(width, height);
              console.log('Image container layout:', { width, height, bounds });
              setImageBounds(bounds);
            }
          }}
        >
          {/* Capturable view with image + annotations */}
          <View 
            ref={imageWithAnnotationsRef}
            style={{ width: '100%', height: '100%' }}
            collapsable={false}
          >
            <Image
              source={{ uri: capturedImage }}
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
              {/* Render saved paths */}
              {paths.map((path, index) => {
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
          </View>

          {/* Touch layer for drawing - overlays everything in image container */}
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

        {/* Drawing tools toolbar - overlays image at top */}
        <View
          pointerEvents="box-none"
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
              <View pointerEvents="box-none" style={{ flexDirection: 'row', gap: 8 }}>
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

              {/* Right: Undo/Clear */}
              <View pointerEvents="box-none" style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={handleUndoDraw}
                  activeOpacity={0.7}
                  disabled={paths.length === 0}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    opacity: paths.length === 0 ? 0.5 : 1,
                  }}
                >
                  <Undo2 size={20} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
              </View>
        </View>

        {/* Color picker - positioned close to bottom of image */}
        {drawingMode && drawingMode !== 'eraser' && !isKeyboardVisible && (
          <View
            style={{
              position: 'absolute',
              bottom: bottomSheetCollapsedHeight + 48,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 12,
              paddingVertical: 8,
              zIndex: 15,
              backgroundColor: 'transparent',
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

        {/* Bottom sheet - smoothly animated to stay above keyboard */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: bottomSheetBottom,
            left: 0,
            right: 0,
            height: isKeyboardVisible ? bottomSheetExpandedHeight : bottomSheetCollapsedHeight,
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 20,
            zIndex: 10,
          }}
        >
              <View style={{ padding: 24, paddingBottom: 20 }}>
                {!isKeyboardVisible && (
                  <>
                    {/* Handle Bar */}
                    <View className="items-center mb-3">
                      <View style={{ width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 }} />
                    </View>

                    <Text className="text-lg font-bold text-gray-900 mb-1">
                      {editMode ? 'Edit Description' : 'Add Description'}
                    </Text>
                    <Text className="text-xs text-gray-500 mb-3">
                      Describe what you found or use voice input
                    </Text>
                  </>
                )}

                <View
                  className={`bg-gray-50 rounded-2xl px-4 py-3 mb-3 ${
                    focusedField === 'description' ? 'border-2 border-blue-500' : 'border border-gray-200'
                  }`}
                >
                  <TextInput
                    className="text-base text-gray-900"
                    placeholder="e.g., 'Cracked foundation', 'Water damage'"
                    placeholderTextColor="#9CA3AF"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={isKeyboardVisible ? 2 : 4}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onFocus={() => setFocusedField('description')}
                    onBlur={() => setFocusedField(null)}
                    style={{ minHeight: isKeyboardVisible ? 50 : 80 }}
                  />
                </View>

                {!isKeyboardVisible && (
                  <>
                    {/* Voice Input Button */}
                    <TouchableOpacity
                      onPress={isRecording ? stopVoiceRecognition : startVoiceRecognition}
                      activeOpacity={0.8}
                      className="rounded-2xl py-2 mb-3 flex-row items-center justify-center"
                      style={{
                        backgroundColor: isRecording ? '#FEF2F2' : '#EFF6FF',
                        borderWidth: 1,
                        borderColor: isRecording ? '#FEE2E2' : '#DBEAFE',
                      }}
                    >
                      {isRecording ? (
                        <>
                          <MicOff size={18} color="#DC2626" strokeWidth={2} />
                          <Text className="text-red-600 font-bold text-sm ml-2">
                            Stop Recording
                          </Text>
                        </>
                      ) : (
                        <>
                          <Mic size={18} color="#2563EB" strokeWidth={2} />
                          <Text className="text-blue-600 font-bold text-sm ml-2">
                            Use Voice Input
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 rounded-2xl py-4"
                    style={{ backgroundColor: '#F1F5F9' }}
                    onPress={handleRetake}
                    disabled={uploading}
                    activeOpacity={0.7}
                  >
                    <Text className="text-gray-700 text-center font-bold text-base">
                      {editMode ? 'New Photo' : 'Retake'}
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
                      handleSave();
                    }}
                    disabled={uploading}
                    activeOpacity={0.8}
                  >
                    {uploading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white text-center font-bold text-base">
                        {editMode ? 'Save Changes' : 'Save & Analyze'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView style={{ flex: 1 }} facing={facing} flash={flashMode} ref={cameraRef} />
      
      {/* Square Viewfinder Overlay - Outside CameraView */}
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

      {/* Controls Overlay */}
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
                onPress={() => {
                  setFacing(facing === 'back' ? 'front' : 'back');
                }}
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
    </View>
  );
}
