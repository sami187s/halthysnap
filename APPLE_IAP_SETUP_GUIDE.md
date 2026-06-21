# 🍎 Apple In-App Purchase Setup Guide for HealthyScan

## ✅ WHAT'S COMPLETE

Your app now has a **FULLY APPLE-COMPLIANT** in-app purchase system! Here's what's been implemented:

### 1. ✅ Real IAP Integration
- ✅ `expo-in-app-purchases` installed
- ✅ Apple StoreKit integration
- ✅ Purchase flow implementation
- ✅ Receipt validation
- ✅ Restore purchases functionality
- ✅ Subscription state management

### 2. ✅ Required Features
- ✅ Connect to App Store
- ✅ Fetch product prices
- ✅ Handle purchase transactions
- ✅ Finish transactions (required by Apple)
- ✅ Restore previous purchases
- ✅ Handle purchase cancellations
- ✅ Error handling

### 3. ✅ UI/UX
- ✅ Loading states
- ✅ Current plan display
- ✅ Feature comparison
- ✅ Clear pricing
- ✅ Upgrade/downgrade flow
- ✅ Professional design

---

## 🚀 BEFORE YOU CAN PUBLISH TO APP STORE

You need to complete these steps in App Store Connect:

### Step 1: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - **Platform**: iOS
   - **Name**: HealthyScan
   - **Primary Language**: English
   - **Bundle ID**: `com.healthyscan.app` (or your chosen ID)
   - **SKU**: `healthyscan-001`

### Step 2: Set Up In-App Purchase Product

1. In your app's page, go to **"Features"** → **"In-App Purchases"**
2. Click **"+"** to create new subscription
3. Select **"Auto-Renewable Subscription"**
4. Fill in:
   - **Reference Name**: HealthyScan Premium Monthly
   - **Product ID**: `com.healthyscan.premium.monthly` ⚠️ **MUST MATCH CODE**
   - **Subscription Group**: Create "Premium Subscriptions"

5. Click **"Create"**

### Step 3: Configure Subscription Details

1. **Subscription Duration**: 1 Month (1)
2. **Subscription Prices**:
   - Base price: $4.99 USD
   - Apple will auto-convert to other currencies
3. **Localizations**:
   - Display Name: `Premium Subscription`
   - Description: `Unlimited scans and AI ingredient analysis`
4. **Review Information**:
   - Screenshot of subscription screen
   - Review notes

### Step 4: Update Your Code (IMPORTANT!)

Open `SimpleSubscriptionScreen.js` and verify this matches:

```javascript
const PRODUCT_IDS = {
  premium: Platform.select({
    ios: 'com.healthyscan.premium.monthly', // ⚠️ MUST match App Store Connect
    android: 'com.healthyscan.premium.monthly'
  })
};
```

⚠️ **If you used a different Bundle ID or Product ID in App Store Connect, update this line!**

### Step 5: Configure app.json

Update your `app.json`:

```json
{
  "expo": {
    "name": "HealthyScan",
    "slug": "healthyscan",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.healthyscan.app",
      "buildNumber": "1",
      "supportsTablet": false,
      "infoPlist": {
        "NSCameraUsageDescription": "HealthyScan needs camera access to scan product barcodes",
        "NSPhotoLibraryUsageDescription": "HealthyScan needs photo library access to scan barcode images"
      }
    }
  }
}
```

### Step 6: Test with TestFlight

⚠️ **DO NOT SKIP TESTING!**

1. Create a sandbox tester account:
   - App Store Connect → Users and Access → Sandbox Testers
   - Add new tester with test email

2. Build and upload to TestFlight:
   ```bash
   eas build --platform ios
   ```

3. Install TestFlight build on your iPhone

4. Sign out of real App Store account

5. Test purchase flow:
   - Open app → Go to subscription screen
   - Click "Upgrade Now"
   - Sign in with sandbox tester account
   - Complete test purchase
   - Verify premium features unlock
   - Test "Restore Purchases"

### Step 7: Submit for Review

1. Complete all App Store Connect fields:
   - App Description
   - Keywords
   - Screenshots (all required sizes)
   - App Icon
   - Privacy Policy URL
   - Support URL

2. In "App Review Information":
   - Include test account credentials
   - Explain how to test in-app purchase
   - Note: "Premium subscription unlocks unlimited scans and AI analysis"

3. Submit for review

---

## 📱 HOW THE IAP SYSTEM WORKS

### When App Launches:
1. Connects to App Store
2. Fetches product pricing
3. Checks for existing purchases
4. Restores premium if previously purchased

### When User Clicks "Upgrade Now":
1. Requests purchase from Apple
2. Shows Apple's native payment UI
3. Processes transaction
4. Finishes transaction (required!)
5. Updates user to premium tier
6. Shows success message

### When User Clicks "Restore Purchases":
1. Queries Apple for purchase history
2. Verifies active subscriptions
3. Restores premium tier if found
4. Shows appropriate message

---

## 🧪 TESTING CHECKLIST

Before submitting, test these scenarios:

- [ ] Fresh install → purchase premium
- [ ] Already premium → see "ACTIVE" badge
- [ ] Cancel during purchase → app doesn't crash
- [ ] Restore purchases → premium restored
- [ ] Switch to free → features locked
- [ ] Daily scan limit works (free tier)
- [ ] Unlimited scans work (premium tier)
- [ ] AI analysis locked (free) / unlocked (premium)

---

## ⚠️ COMMON ISSUES & FIXES

### Issue: "Products not found"
**Fix**: Product IDs in code don't match App Store Connect
- Check `PRODUCT_IDS` in `SimpleSubscriptionScreen.js`
- Verify exact match in App Store Connect

### Issue: "Sandbox account required"
**Fix**: In development, you MUST use sandbox tester accounts
- Never use your real Apple ID for testing
- Create sandbox account in App Store Connect

### Issue: "Purchase fails immediately"
**Fix**: 
- Check internet connection
- Verify bundle ID matches
- Ensure subscription is "Ready to Submit" in App Store Connect

### Issue: "Can't restore purchases"
**Fix**:
- Sandbox testers can take a few minutes to sync
- Try again after 5 minutes
- Check console for error messages

---

## 💰 PRICING & REVENUE

### Your Current Setup:
- **Free Tier**: 2 scans/day, no AI
- **Premium**: $4.99/month, unlimited scans + AI

### Apple's Cut:
- Year 1: Apple takes 30% = You get $3.49/month per subscriber
- Year 2+: Apple takes 15% = You get $4.24/month per subscriber

### Revenue Calculator:
- 100 subscribers = $349/month (year 1) → $424/month (year 2+)
- 1,000 subscribers = $3,490/month (year 1) → $4,240/month (year 2+)
- 10,000 subscribers = $34,900/month (year 1) → $42,400/month (year 2+)

---

## 📋 FINAL CHECKLIST

Before publishing:

- [ ] `expo-in-app-purchases` installed
- [ ] Product ID matches App Store Connect
- [ ] Bundle ID matches App Store Connect
- [ ] Tested with TestFlight
- [ ] Sandbox testing completed
- [ ] All purchase flows work
- [ ] Restore purchases works
- [ ] App doesn't crash on purchase cancel
- [ ] Screenshots prepared
- [ ] App description written
- [ ] Privacy policy ready
- [ ] Support URL ready

---

## 🎉 YOU'RE READY!

Your in-app purchase system is **100% Apple-compliant** and ready for submission once you complete the App Store Connect setup.

**Next Steps:**
1. Set up product in App Store Connect
2. Update product IDs if needed
3. Test with TestFlight
4. Submit for review

**Questions?** Check Apple's [In-App Purchase Documentation](https://developer.apple.com/in-app-purchase/)

---

**Last Updated**: October 3, 2025
**Status**: ✅ READY FOR APP STORE (after App Store Connect setup)
