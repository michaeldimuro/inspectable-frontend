import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../stores/authStore';
import { Home, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main Screens
import PropertyListScreen from '../screens/PropertyListScreen';
import PropertyDetailScreen from '../screens/PropertyDetailScreen';
import AreaDetailScreen from '../screens/AreaDetailScreen';
import CameraScreen from '../screens/CameraScreen';
import ImageAnnotationScreen from '../screens/ImageAnnotationScreen';
import PDFViewerScreen from '../screens/PDFViewerScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main App Stack (after login)
function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { 
          backgroundColor: '#FFFFFF',
        },
        headerShadowVisible: false,
        headerTintColor: '#2563EB',
        headerTitleStyle: { 
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen 
        name="PropertyList" 
        component={PropertyListScreen}
        options={{ 
          headerShown: false // PropertyListScreen has custom header
        }}
      />
      <Stack.Screen 
        name="PropertyDetail" 
        component={PropertyDetailScreen}
        options={{ 
          title: 'Inspection Details',
          headerShown: false // Has custom header
        }}
      />
      <Stack.Screen 
        name="AreaDetail" 
        component={AreaDetailScreen}
        options={{ 
          title: 'Area Details',
          headerShown: false // Has custom header
        }}
      />
      <Stack.Screen 
        name="Camera" 
        component={CameraScreen}
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal'
        }}
      />
      <Stack.Screen 
        name="ImageAnnotation" 
        component={ImageAnnotationScreen}
        options={{ 
          headerShown: false,
          presentation: 'card'
        }}
      />
      <Stack.Screen 
        name="PDFViewer" 
        component={PDFViewerScreen}
        options={{ 
          headerShown: false,
          presentation: 'card'
        }}
      />
    </Stack.Navigator>
  );
}

// Custom Tab Bar with Safe Area
function CustomTabBar({ children }) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{ paddingBottom: insets.bottom }}>
      {children}
    </View>
  );
}

// Tab Navigator
function TabNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          backgroundColor: '#FFFFFF',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={MainStack}
        options={{ 
          tabBarLabel: 'Inspections',
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
export default function AppNavigator() {
  const token = useAuthStore((state) => state.token);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        // Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        // Main App
        <Stack.Screen name="MainApp" component={TabNavigator} />
      )}
    </Stack.Navigator>
  );
}
