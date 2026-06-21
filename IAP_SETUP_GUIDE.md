# 🚀 Real In-App Purchase Setup Guide

## ✅ What's Implemented:

### **1. Real In-App Purchase System**
- ✅ `RealInAppPurchaseManager.js` - Complete IAP integration
- ✅ `RealSubscriptionScreen.js` - Real payment interface  
- ✅ Daily trial reset (2 free premium scans every 24 hours)
- ✅ Bottom tab navigation
- ✅ Clean home screen design

### **2. Features:**
- **Daily Free Trials**: 2 premium scans every 24 hours
- **Real Payments**: Weekly subscription at $1.99/week
- **Purchase Restoration**: Users can restore previous purchases
- **Cross-Platform**: Works on iOS and Android

## 📱 **How to Test:**

### **For Development (Expo Go):**
```bash
npx expo start
```
- In development, IAP will show "Development Mode"
- No real payments will be charged
- You can test the UI and navigation

### **For Real Payments (Development Build):**
```bash
# Create development build with IAP support
npx expo run:ios
# or
npx expo run:android
```

## 🏪 **App Store Setup Required:**

### **1. App Store Connect (iOS):**
1. Go to App Store Connect
2. Select your app "HealthyScan"
3. Go to **Features** → **In-App Purchases**
4. Create new subscription:
   - **Product ID**: `com.healthyscan.app.weekly_premium`
   - **Price**: $1.99 USD
   - **Duration**: 1 week
   - **Auto-renewable**: Yes

### **2. Google Play Console (Android):**
1. Go to Google Play Console
2. Select your app
3. Go to **Products** → **Subscriptions**
4. Create new subscription:
   - **Product ID**: `com.healthyscan.app.weekly_premium`
   - **Price**: $1.99 USD
   - **Billing Period**: 1 week

### **3. Update Product IDs:**
If you use different product IDs, update them in `RealInAppPurchaseManager.js`:

```javascript
this.productIds = {
  ios: 'your.actual.ios.product.id',
  android: 'your.actual.android.product.id',
};
```

## 🔄 **How It Works:**

### **Free Users:**
1. Get 2 premium scans daily (resets every 24 hours)
2. After using 2 scans, 3rd scan shows subscription page
3. Can upgrade to unlimited premium scans

### **Premium Users:**
1. Unlimited premium scans
2. All AI analysis features
3. No daily limitations

## 🧪 **Testing Sequence:**

1. **Open app** → See home with big scan button
2. **Scan product** → Works (1/2 daily scans used)
3. **Scan again** → Works (2/2 daily scans used)
4. **Try 3rd scan** → Shows subscription page
5. **Tap "Subscribe Now"** → Real payment flow
6. **After purchase** → Unlimited scanning

## ⚠️ **Important Notes:**

- **Expo Go**: Only for UI testing, no real payments
- **Development Build**: Required for real IAP testing
- **App Store Approval**: Required before real payments work
- **Product IDs**: Must match exactly in App Store Connect/Google Play

## 🚀 **Next Steps:**

1. Test in Expo Go for UI/UX
2. Create development build for IAP testing
3. Set up subscriptions in App Store Connect
4. Submit app for review
5. Launch with real payments! 🎉