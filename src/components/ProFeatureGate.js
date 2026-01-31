import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Crown, Lock } from 'lucide-react-native';
import { useSubscriptionStore } from '../stores/subscriptionStore';

/**
 * ProFeatureGate - Wraps content that requires Pro subscription
 * 
 * Usage:
 * <ProFeatureGate feature="pdf">
 *   <PDFExportButton />
 * </ProFeatureGate>
 * 
 * Props:
 * - feature: string - Feature name for tracking ('pdf', 'properties', etc.)
 * - children: ReactNode - Content to show when user has Pro
 * - fallback: ReactNode - Optional custom fallback for free users
 * - style: object - Container style
 * - showUpgradeButton: boolean - Show upgrade button in fallback (default: true)
 */
export default function ProFeatureGate({ 
  feature, 
  children, 
  fallback,
  style,
  showUpgradeButton = true,
}) {
  const navigation = useNavigation();
  const { isPro } = useSubscriptionStore();

  // If user is Pro, show the gated content
  if (isPro) {
    return <>{children}</>;
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback - locked state with upgrade prompt
  const handleUpgrade = () => {
    navigation.navigate('Subscription', { feature });
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Lock size={24} color="#9CA3AF" strokeWidth={2} />
      </View>
      <Text style={styles.title}>Pro Feature</Text>
      <Text style={styles.description}>
        {getFeatureDescription(feature)}
      </Text>
      {showUpgradeButton && (
        <TouchableOpacity
          onPress={handleUpgrade}
          activeOpacity={0.8}
          style={styles.upgradeButton}
        >
          <Crown size={16} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * useProFeature - Hook to check if a feature is available
 * Returns { canAccess, showPaywall }
 */
export function useProFeature(feature) {
  const navigation = useNavigation();
  const { isPro, canExportPDF, canCreateProperty } = useSubscriptionStore();

  const checkAccess = () => {
    switch (feature) {
      case 'pdf':
        return canExportPDF();
      case 'properties':
        // This would need property count
        return isPro;
      default:
        return isPro;
    }
  };

  const showPaywall = () => {
    navigation.navigate('Subscription', { feature });
  };

  return {
    canAccess: checkAccess(),
    showPaywall,
    isPro,
  };
}

/**
 * ProBadge - Small badge to indicate Pro feature
 */
export function ProBadge({ style }) {
  return (
    <View style={[styles.badge, style]}>
      <Crown size={12} color="#7C3AED" strokeWidth={2.5} />
      <Text style={styles.badgeText}>PRO</Text>
    </View>
  );
}

function getFeatureDescription(feature) {
  switch (feature) {
    case 'pdf':
      return 'Export professional PDF reports with a Pro subscription.';
    case 'properties':
      return 'Create unlimited properties with a Pro subscription.';
    default:
      return 'This feature requires a Pro subscription.';
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
});
