# Subscription System Setup Guide

## Overview
This document outlines the manual steps needed to complete the subscription/payment system setup for Inspectable.

## 1. Install Required Packages

Run the following command in the project root:

```bash
npx expo install react-native-purchases expo-device
```

## 2. RevenueCat Dashboard Setup

### A. Create RevenueCat Account
1. Go to https://app.revenuecat.com/signup
2. Create a new project called "Inspectable"

### B. Configure App Store Connect (iOS)
1. In App Store Connect, create an In-App Purchase:
   - Type: Auto-Renewable Subscription
   - Reference Name: "Inspectable Pro Monthly"
   - Product ID: `inspectable_pro_monthly`
   - Price: $49.00/month
   - Description: "Unlimited properties and PDF exports"

2. Create a Subscription Group called "Inspectable Pro"

3. In RevenueCat:
   - Add iOS app with your Bundle ID
   - Add the shared secret from App Store Connect
   - Create a Product with ID `inspectable_pro_monthly`
   - Create an Entitlement called `pro`
   - Attach the product to the `pro` entitlement
   - Create an Offering called `default` and add the product

### C. Configure Google Play (Android)
1. In Google Play Console, create a subscription:
   - Product ID: `inspectable_pro_monthly`
   - Price: $49.00/month
   - Billing period: 1 month

2. In RevenueCat:
   - Add Android app with your package name
   - Upload the service account JSON key
   - Add the Android product to the same `pro` entitlement

### D. Get API Keys
1. In RevenueCat project settings, find:
   - iOS API Key (starts with `appl_`)
   - Android API Key (starts with `goog_`)

2. Update `src/services/subscriptionService.js` with your actual API keys:
   ```javascript
   const API_KEY = Platform.select({
     ios: 'appl_YOUR_IOS_KEY_HERE',
     android: 'goog_YOUR_ANDROID_KEY_HERE',
   });
   ```

## 3. App.js Configuration

Add subscription initialization to your App.js:

```javascript
import { initializeSubscriptions } from './src/services/subscriptionService';

// In your App component, add:
useEffect(() => {
  initializeSubscriptions();
}, []);
```

## 4. Testing

### Sandbox Testing (iOS)
1. Create sandbox tester accounts in App Store Connect
2. Sign out of App Store on device
3. Make a purchase in the app (will prompt for sandbox login)

### Testing (Android)
1. Add license testers in Google Play Console
2. Use a device signed in with tester account
3. Purchases will be free for testing

## 5. Subscription Tiers

| Feature | Free | Pro ($49/mo) |
|---------|------|--------------|
| Properties | 1 | Unlimited |
| PDF Export | ❌ | ✅ |
| Photo Capture | ✅ | ✅ |
| AI Analysis | ✅ | ✅ |

## 6. Files Created

- `src/services/subscriptionService.js` - RevenueCat integration
- `src/stores/subscriptionStore.js` - Subscription state management
- `src/screens/SubscriptionScreen.js` - Paywall/upgrade UI
- `src/components/ProFeatureGate.js` - Component for gating features

## 7. Modified Files

- `src/screens/PropertyListScreen.js` - Gated to 1 property for free users
- `src/screens/PDFViewerScreen.js` - Gated PDF export for free users
- `src/navigation/AppNavigator.js` - Added SubscriptionScreen route

## Troubleshooting

### "No offerings available"
- Check that products are set up correctly in RevenueCat
- Ensure products are in "Ready to Submit" or "Approved" state
- Verify API keys are correct

### Purchases not working on iOS Simulator
- RevenueCat requires a real device for purchases
- Simulator can still initialize and check subscription status

### Restore purchases not working
- User must be logged in with the same App Store/Play Store account
- Check that entitlements are properly configured
