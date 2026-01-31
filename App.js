import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/stores/authStore';
import { useSubscriptionStore } from './src/stores/subscriptionStore';
import { initializeSubscriptions } from './src/services/subscriptionService';

export default function App() {
  const loadToken = useAuthStore((state) => state.loadToken);
  const user = useAuthStore((state) => state.user);
  const initializeSubStore = useSubscriptionStore((state) => state.initialize);
  const linkToUser = useSubscriptionStore((state) => state.linkToUser);

  useEffect(() => {
    // Initialize auth
    loadToken();
    
    // Initialize RevenueCat SDK
    initializeSubscriptions().then(() => {
      // Initialize subscription store
      initializeSubStore();
    });
  }, []);

  // Link subscription to user when they log in
  useEffect(() => {
    if (user?.id) {
      linkToUser(user.id);
    }
  }, [user?.id]);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

