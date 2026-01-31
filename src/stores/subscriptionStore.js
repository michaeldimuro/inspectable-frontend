import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  checkSubscriptionStatus,
  getOfferings,
  purchasePackage,
  restorePurchases,
  setSubscriptionUserId,
  clearSubscriptionUser,
  addSubscriptionListener,
} from '../services/subscriptionService';

// Free tier limits
export const FREE_TIER_LIMITS = {
  maxProperties: 1,
  canExportPDF: false,
};

// Pro tier features
export const PRO_TIER_FEATURES = {
  maxProperties: Infinity,
  canExportPDF: true,
};

export const useSubscriptionStore = create(
  persist(
    (set, get) => ({
      // Subscription state
      isPro: false,
      isLoading: false,
      error: null,
      
      // Customer info from RevenueCat
      customerInfo: null,
      expirationDate: null,
      willRenew: true,
      
      // Available offerings/packages
      offerings: null,
      packages: [],
      
      // Cached check (to avoid too many API calls)
      lastChecked: null,

      /**
       * Initialize subscription status on app start
       */
      initialize: async () => {
        set({ isLoading: true, error: null });
        try {
          // Check subscription status
          const status = await checkSubscriptionStatus();
          
          // Get available offerings
          const offeringsResult = await getOfferings();
          
          set({
            isPro: status.isPro,
            customerInfo: status.customerInfo,
            expirationDate: status.expirationDate,
            willRenew: status.willRenew,
            offerings: offeringsResult.offerings,
            packages: offeringsResult.packages,
            lastChecked: Date.now(),
            isLoading: false,
          });
          
          // Set up listener for subscription changes
          addSubscriptionListener(({ isPro, customerInfo }) => {
            set({ isPro, customerInfo });
          });
          
          return { success: true, isPro: status.isPro };
        } catch (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      /**
       * Link subscription to user account
       */
      linkToUser: async (userId) => {
        try {
          await setSubscriptionUserId(userId);
          // Refresh subscription status after linking
          await get().refreshSubscriptionStatus();
        } catch (error) {
          console.error('Failed to link subscription to user:', error);
        }
      },

      /**
       * Clear subscription on logout
       */
      clearOnLogout: async () => {
        try {
          await clearSubscriptionUser();
          set({
            isPro: false,
            customerInfo: null,
            expirationDate: null,
            lastChecked: null,
          });
        } catch (error) {
          console.error('Failed to clear subscription:', error);
        }
      },

      /**
       * Refresh subscription status from RevenueCat
       */
      refreshSubscriptionStatus: async () => {
        set({ isLoading: true, error: null });
        try {
          const status = await checkSubscriptionStatus();
          set({
            isPro: status.isPro,
            customerInfo: status.customerInfo,
            expirationDate: status.expirationDate,
            willRenew: status.willRenew,
            lastChecked: Date.now(),
            isLoading: false,
          });
          return { success: true, isPro: status.isPro };
        } catch (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      /**
       * Purchase Pro subscription
       */
      purchasePro: async (packageItem) => {
        set({ isLoading: true, error: null });
        try {
          // If no package provided, try to get the first available one
          let pkg = packageItem;
          if (!pkg && get().packages.length > 0) {
            pkg = get().packages[0];
          }
          
          if (!pkg) {
            throw new Error('No subscription package available');
          }
          
          const result = await purchasePackage(pkg);
          
          if (result.cancelled) {
            set({ isLoading: false });
            return { success: false, cancelled: true };
          }
          
          if (result.success) {
            set({
              isPro: result.isPro,
              customerInfo: result.customerInfo,
              isLoading: false,
            });
            return { success: true, isPro: result.isPro };
          }
          
          set({ isLoading: false, error: result.error });
          return { success: false, error: result.error };
        } catch (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      /**
       * Restore previous purchases
       */
      restorePurchases: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await restorePurchases();
          
          set({
            isPro: result.isPro,
            customerInfo: result.customerInfo,
            isLoading: false,
          });
          
          return {
            success: true,
            isPro: result.isPro,
            restored: result.restored,
          };
        } catch (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      /**
       * Check if user can create more properties
       */
      canCreateProperty: (currentPropertyCount) => {
        const { isPro } = get();
        if (isPro) return true;
        return currentPropertyCount < FREE_TIER_LIMITS.maxProperties;
      },

      /**
       * Check if user can export PDF
       */
      canExportPDF: () => {
        const { isPro } = get();
        if (isPro) return true;
        return FREE_TIER_LIMITS.canExportPDF;
      },

      /**
       * Get user's tier limits
       */
      getTierLimits: () => {
        const { isPro } = get();
        return isPro ? PRO_TIER_FEATURES : FREE_TIER_LIMITS;
      },

      /**
       * Clear any errors
       */
      clearError: () => set({ error: null }),
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist certain fields
      partialize: (state) => ({
        isPro: state.isPro,
        lastChecked: state.lastChecked,
      }),
    }
  )
);
