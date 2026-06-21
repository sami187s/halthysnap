# 🏪 App Store Connect Setup Guide

## **IMPORTANT: Complete these steps before publishing to App Store**

### **Step 1: Apple Developer Account**
- ✅ **Cost**: $99/year
- ✅ **Required**: Apple Developer Program membership
- ✅ **Link**: https://developer.apple.com/programs/

### **Step 2: App Store Connect Configuration**

#### **2.1: Create App Record**
1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in app details:
   - **App Name**: HealthyScan: Food & Beauty Check
   - **Bundle ID**: com.healthyscan.app
   - **Primary Language**: English
   - **SKU**: healthyscan-ios

#### **2.2: Configure In-App Purchases**
1. In your app, go to "Features" → "In-App Purchases"
2. Click "+" to add new purchase

**Weekly Premium Subscription:**
- **Reference Name**: HealthyScan Premium Weekly
- **Product ID**: `healthyscan_premium_weekly`
- **Type**: Auto-Renewable Subscription
- **Subscription Group**: HealthyScan Premium
- **Price**: $1.99 USD (Tier 3)
- **Subscription Duration**: 1 Week

**Monthly Premium Subscription:**
- **Reference Name**: HealthyScan Premium Monthly  
- **Product ID**: `healthyscan_premium_monthly`
- **Type**: Auto-Renewable Subscription
- **Subscription Group**: HealthyScan Premium
- **Price**: $6.99 USD (Tier 10)
- **Subscription Duration**: 1 Month

#### **2.3: Subscription Details**
For each subscription, add:
- **Display Name**: HealthyScan Premium
- **Description**: "Unlock AI-powered ingredient analysis, detect hidden dangers, get unlimited scans and personalized recommendations."
- **Privacy Policy URL**: [Your privacy policy URL]
- **Screenshot**: [Screenshot of premium features]

### **Step 3: Tax and Banking**
1. Go to "Agreements, Tax, and Banking"
2. Complete:
   - ✅ **Paid Apps Agreement**
   - ✅ **Tax Information** (W-9 for US, tax forms for other countries)
   - ✅ **Banking Information** (Where Apple sends your money)

### **Step 4: App Submission Requirements**

#### **4.1: App Information**
- **Category**: Health & Fitness (Primary), Utilities (Secondary)  
- **Age Rating**: 4+ (No objectionable content)
- **Copyright**: © 2025 [Your Company Name]
- **Privacy Policy URL**: [Required - create one]

#### **4.2: Screenshots Required**
- **iPhone 6.7"**: 3-10 screenshots
- **iPhone 6.5"**: 3-10 screenshots  
- **iPad Pro (6th Gen)**: 3-10 screenshots
- **App Preview Videos**: Optional but recommended

#### **4.3: App Review Information**
- **Notes for Reviewer**: 
  ```
  HealthyScan allows users to scan barcodes and analyze ingredient safety.
  
  Premium subscription features:
  - AI-powered ingredient analysis
  - Hidden danger detection
  - Unlimited scans
  - Personalized recommendations
  
  Test Account: [Provide test account if needed]
  Test Products: Use any barcode from Open Beauty Facts database
  ```

### **Step 5: Subscription Configuration Details**

#### **5.1: Subscription Group Settings**
- **Name**: HealthyScan Premium
- **Reference Name**: healthyscan-premium-group
- **Introductory Offers**: 
  - 3 days free trial (optional)
  - 50% off first month (optional)

#### **5.2: Subscription Localizations**
Add localizations for major markets:
- **English (US)**: Primary
- **Spanish**: Optional
- **French**: Optional
- **German**: Optional

### **Step 6: Testing**

#### **6.1: Sandbox Testing**
1. Create sandbox tester accounts in App Store Connect
2. Use these accounts to test purchases
3. Test both subscription types
4. Test restore purchases functionality

#### **6.2: TestFlight Testing**
1. Upload build via EAS Build: `npx eas build --platform ios`
2. Add beta testers in App Store Connect
3. Test full subscription flow
4. Collect feedback before App Store submission

### **Step 7: Revenue and Analytics**

#### **7.1: Expected Revenue**
- **Apple's Cut**: 30% (first year), 15% (after 1 year for subscribers)
- **Your Cut**: 70% (first year), 85% (after 1 year)
- **Weekly ($1.99)**: You get ~$1.39 first year, ~$1.69 after
- **Monthly ($6.99)**: You get ~$4.89 first year, ~$5.94 after

#### **7.2: Analytics Setup**
- **App Store Connect Analytics**: Built-in
- **Revenue Tracking**: Built-in
- **Subscription Metrics**: Retention, churn, renewal rates

## **🚨 CRITICAL REMINDERS**

### **Before App Store Submission:**
1. ✅ **Real In-App Purchases**: Must use Apple's IAP system
2. ✅ **No External Payment**: Cannot mention other payment methods
3. ✅ **Privacy Policy**: Required for subscriptions
4. ✅ **Terms of Service**: Recommended
5. ✅ **Subscription Terms**: Must be clear about auto-renewal
6. ✅ **Cancel Instructions**: Must explain how to cancel
7. ✅ **Restore Purchases**: Must work properly

### **App Review Guidelines Compliance:**
- ✅ **Subscription Value**: Must provide ongoing value
- ✅ **No Duplicate Features**: Premium features must be unique
- ✅ **Fair Pricing**: Pricing must match value provided  
- ✅ **Clear Benefits**: Users must understand what they're paying for
- ✅ **Functional Free Tier**: Free version must be useful

## **📋 Quick Checklist**

- [ ] Apple Developer Account ($99/year)
- [ ] App Store Connect app record created
- [ ] In-app purchase products configured
- [ ] Tax and banking information completed
- [ ] Privacy policy created and published
- [ ] App screenshots and metadata ready
- [ ] Subscription terms clearly explained in app
- [ ] Sandbox testing completed
- [ ] TestFlight testing completed
- [ ] App ready for final submission

## **🔗 Important Links**

- **App Store Connect**: https://appstoreconnect.apple.com
- **Developer Portal**: https://developer.apple.com
- **App Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Human Interface Guidelines**: https://developer.apple.com/design/human-interface-guidelines/
- **In-App Purchase Guidelines**: https://developer.apple.com/app-store/review/guidelines/#payments

---

**📞 Need Help?**
- Apple Developer Support
- App Store Connect Help
- Developer Forums: https://developer.apple.com/forums/