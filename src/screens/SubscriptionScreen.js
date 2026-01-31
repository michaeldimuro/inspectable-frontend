import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Check,
  Crown,
  FileText,
  Home,
  Sparkles,
  Shield,
} from 'lucide-react-native';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { formatPrice } from '../services/subscriptionService';

export default function SubscriptionScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const {
    isPro,
    isLoading,
    packages,
    purchasePro,
    restorePurchases,
    refreshSubscriptionStatus,
  } = useSubscriptionStore();
  
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  
  // Feature that triggered the paywall (optional)
  const triggerFeature = route.params?.feature;

  useEffect(() => {
    // Refresh subscription status on mount
    refreshSubscriptionStatus();
  }, []);

  // If user is already Pro, redirect back
  useEffect(() => {
    if (isPro && !isLoading) {
      navigation.goBack();
    }
  }, [isPro, isLoading]);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const selectedPackage = packages[0]; // Monthly subscription
      const result = await purchasePro(selectedPackage);
      
      if (result.cancelled) {
        // User cancelled, do nothing
        setPurchasing(false);
        return;
      }
      
      if (result.success && result.isPro) {
        Alert.alert(
          '🎉 Welcome to Pro!',
          'You now have access to unlimited properties and PDF exports.',
          [{ text: 'Awesome!', onPress: () => navigation.goBack() }]
        );
      } else if (result.error) {
        Alert.alert('Purchase Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restorePurchases();
      
      if (result.restored && result.isPro) {
        Alert.alert(
          'Purchases Restored!',
          'Your Pro subscription has been restored.',
          [{ text: 'Great!', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'We couldn\'t find any previous purchases for this account.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const openTerms = () => {
    Linking.openURL('https://inspectable.app/terms');
  };

  const openPrivacy = () => {
    Linking.openURL('https://inspectable.app/privacy');
  };

  const getPrice = () => {
    if (packages.length > 0) {
      return formatPrice(packages[0]);
    }
    return '$49.00/month';
  };

  const features = [
    {
      icon: Home,
      title: 'Unlimited Properties',
      description: 'Create as many inspection properties as you need',
      free: '1 property',
      pro: 'Unlimited',
    },
    {
      icon: FileText,
      title: 'PDF Report Export',
      description: 'Generate and share professional PDF reports',
      free: '❌',
      pro: '✓',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Analysis',
      description: 'Automatic issue detection and descriptions',
      free: '✓',
      pro: '✓',
    },
    {
      icon: Shield,
      title: 'Priority Support',
      description: 'Get help when you need it most',
      free: '❌',
      pro: '✓',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with close button */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
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
            <X size={24} color="#6B7280" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingTop: 24 }}>
          <LinearGradient
            colors={['#2563EB', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Crown size={40} color="#FFFFFF" strokeWidth={2} />
          </LinearGradient>
          
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 12 }}>
            Upgrade to Pro
          </Text>
          
          <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24 }}>
            Unlock unlimited properties and professional PDF reports
          </Text>

          {triggerFeature && (
            <View style={{
              marginTop: 16,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: '#FEF3C7',
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 14, color: '#92400E', fontWeight: '600' }}>
                {triggerFeature === 'pdf' 
                  ? '📄 PDF Export is a Pro feature'
                  : '🏠 Multiple properties is a Pro feature'
                }
              </Text>
            </View>
          )}
        </View>

        {/* Pricing Card */}
        <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
          <LinearGradient
            colors={['#2563EB', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              padding: 24,
              shadowColor: '#2563EB',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={{ fontSize: 48, fontWeight: 'bold', color: '#FFFFFF' }}>
                $49
              </Text>
              <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', marginLeft: 4 }}>
                /month
              </Text>
            </View>
            
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>
              Billed monthly • Cancel anytime
            </Text>
            
            <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 20 }}>
              {['Unlimited properties', 'PDF report export', 'Priority support'].map((feature, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  </View>
                  <Text style={{ fontSize: 16, color: '#FFFFFF', marginLeft: 12, fontWeight: '500' }}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Feature Comparison */}
        <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 16 }}>
            Compare Plans
          </Text>
          
          {/* Header */}
          <View style={{ flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
            <View style={{ flex: 2 }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>Free</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#2563EB' }}>Pro</Text>
            </View>
          </View>
          
          {/* Features */}
          {features.map((feature, index) => (
            <View 
              key={index} 
              style={{ 
                flexDirection: 'row', 
                paddingVertical: 16, 
                borderBottomWidth: 1, 
                borderBottomColor: '#F3F4F6',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                <feature.icon size={20} color="#6B7280" strokeWidth={2} />
                <Text style={{ fontSize: 14, color: '#374151', marginLeft: 12, fontWeight: '500' }}>
                  {feature.title}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#9CA3AF' }}>{feature.free}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#2563EB', fontWeight: '600' }}>{feature.pro}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Restore Purchases Link */}
        <TouchableOpacity
          onPress={handleRestore}
          disabled={restoring}
          activeOpacity={0.7}
          style={{ alignItems: 'center', marginTop: 24 }}
        >
          {restoring ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : (
            <Text style={{ fontSize: 14, color: '#6B7280', textDecorationLine: 'underline' }}>
              Restore Previous Purchases
            </Text>
          )}
        </TouchableOpacity>

        {/* Terms */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 16 }}>
          <TouchableOpacity onPress={openTerms}>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Terms of Use</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: '#D1D5DB' }}>•</Text>
          <TouchableOpacity onPress={openPrivacy}>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32, marginTop: 12, lineHeight: 16 }}>
          Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. 
          Manage subscriptions in your App Store account settings.
        </Text>
      </ScrollView>

      {/* Fixed Purchase Button */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
        }}
      >
        <TouchableOpacity
          onPress={handlePurchase}
          disabled={purchasing || isLoading}
          activeOpacity={0.8}
          style={{
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={['#2563EB', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingVertical: 18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {purchasing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                Subscribe for {getPrice()}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
