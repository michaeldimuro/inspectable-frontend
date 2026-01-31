import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

// RevenueCat API Keys - Replace with your actual keys from RevenueCat dashboard
const API_KEY = Platform.select({
  ios: 'appl_YOUR_IOS_API_KEY_HERE',
  android: 'goog_YOUR_ANDROID_API_KEY_HERE',
});

// Entitlement identifier from RevenueCat
export const ENTITLEMENT_ID = 'pro';

// Product identifiers
export const PRODUCT_ID = 'inspectable_pro_monthly';

/**
 * Initialize RevenueCat SDK
 * Call this once when app starts (e.g., in App.js)
 */
export const initializeSubscriptions = async () => {
  try {
    // RevenueCat requires a real device for full functionality
    if (!Device.isDevice) {
      console.log('RevenueCat: Running on simulator/emulator - limited functionality');
    }

    // Configure RevenueCat
    await Purchases.configure({
      apiKey: API_KEY,
    });

    // Enable debug logs in development
    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }

    console.log('RevenueCat initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    return false;
  }
};

/**
 * Set the user ID for RevenueCat (call after login)
 * This links purchases to your user account
 */
export const setSubscriptionUserId = async (userId) => {
  try {
    await Purchases.logIn(userId);
    console.log('RevenueCat user ID set:', userId);
  } catch (error) {
    console.error('Failed to set RevenueCat user ID:', error);
  }
};

/**
 * Clear user on logout
 */
export const clearSubscriptionUser = async () => {
  try {
    await Purchases.logOut();
    console.log('RevenueCat user logged out');
  } catch (error) {
    console.error('Failed to logout from RevenueCat:', error);
  }
};

/**
 * Check if user has active Pro subscription
 * Returns true if user has the 'pro' entitlement
 */
export const checkSubscriptionStatus = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
    return {
      isPro,
      customerInfo,
      expirationDate: customerInfo.entitlements.active[ENTITLEMENT_ID]?.expirationDate,
      willRenew: customerInfo.entitlements.active[ENTITLEMENT_ID]?.willRenew,
    };
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return {
      isPro: false,
      customerInfo: null,
      error: error.message,
    };
  }
};

/**
 * Get available subscription offerings/packages
 */
export const getOfferings = async () => {
  try {
    const offerings = await Purchases.getOfferings();
    
    if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
      return {
        success: true,
        offerings: offerings.current,
        packages: offerings.current.availablePackages,
      };
    }
    
    return {
      success: false,
      error: 'No offerings available',
      offerings: null,
      packages: [],
    };
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return {
      success: false,
      error: error.message,
      offerings: null,
      packages: [],
    };
  }
};

/**
 * Purchase a subscription package
 */
export const purchasePackage = async (packageToPurchase) => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    
    // Check if user now has pro entitlement
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
    return {
      success: true,
      isPro,
      customerInfo,
    };
  } catch (error) {
    // User cancelled purchase
    if (error.userCancelled) {
      return {
        success: false,
        cancelled: true,
        error: 'Purchase cancelled',
      };
    }
    
    console.error('Purchase failed:', error);
    return {
      success: false,
      cancelled: false,
      error: error.message,
    };
  }
};

/**
 * Restore previous purchases
 * Useful if user reinstalls app or switches devices
 */
export const restorePurchases = async () => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
    return {
      success: true,
      isPro,
      customerInfo,
      restored: isPro,
    };
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    return {
      success: false,
      isPro: false,
      error: error.message,
    };
  }
};

/**
 * Get formatted price string for display
 */
export const formatPrice = (packageItem) => {
  if (!packageItem?.product) return '$49.00/month';
  
  const product = packageItem.product;
  return `${product.priceString}/${product.subscriptionPeriod === 'P1M' ? 'month' : product.subscriptionPeriod}`;
};

/**
 * Listen for subscription status changes
 */
export const addSubscriptionListener = (callback) => {
  Purchases.addCustomerInfoUpdateListener((info) => {
    const isPro = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    callback({ isPro, customerInfo: info });
  });
};
