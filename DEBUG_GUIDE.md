# Debug and Crash Reporting Setup

## 🐛 Debugging Your APK Crashes

### Method 1: Remote Debugging (Built into your app)

1. **Install your APK** on your Android device
2. **Open the app** and navigate to the home screen  
3. **Find the debug button** at the bottom (small bug icon with "Debug Info")
4. **Tap once** to see app version and debug info
5. **Long press** the debug button to get remote debugging instructions
6. **Follow the instructions** to enable Chrome DevTools debugging

### Method 2: Manual Remote Debug Setup

1. **Enable Developer Options** on your Android device:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings > Developer Options
   
2. **Enable Wireless Debugging**:
   - Turn on "Wireless Debugging" in Developer Options
   - Connect your computer to the same Wi-Fi network
   
3. **Open your APK** and shake your device
4. **Select "Debug Remote JS"** from the menu
5. **On your computer**, open Chrome and go to `chrome://inspect`
6. **Click "inspect"** on your app
7. **Check the Console tab** for errors when the app crashes

### Method 3: Built-in Crash Reporter (Already Added)

The app now has automatic crash reporting that logs detailed information:

- **Error messages and stack traces**
- **App version and build info**
- **Device information**
- **Component context where error occurred**

**To view crash reports:**
- Check the device logs or
- Connect via ADB: `adb logcat | grep "CRASH REPORT"`

## 📊 Setting up Sentry (Recommended for Production)

1. **Sign up** at [sentry.io](https://sentry.io)
2. **Create a new project** for React Native
3. **Copy your DSN** (Data Source Name)
4. **Edit** `src/utils/crashReporting.js`:
   ```javascript
   dsn: 'YOUR_ACTUAL_SENTRY_DSN_HERE'
   ```
5. **Rebuild your APK**

Sentry will automatically:
- Capture all crashes with full context
- Send error reports to your dashboard
- Group similar errors
- Show you exactly where crashes happen

## 🔍 Common Debug Scenarios

### If App Crashes Immediately
1. Use Method 1 above to enable remote debugging
2. Look for errors in Chrome DevTools Console
3. Check for JavaScript errors or missing dependencies

### If App Crashes on Specific Actions
1. Use the built-in crash reporter logs
2. Check what action triggered the crash
3. Look for null reference or API errors

### If App Crashes on Startup
1. Most likely a configuration or dependency issue
2. Check the Metro bundler logs
3. Verify all native dependencies are compatible

## 📱 Testing Different Scenarios

Use the **test button** on the home screen to:
- Test with known working barcode: `3600531037024`
- Test the ingredient analysis system
- Verify navigation between screens works

## 🚨 Emergency Debugging

If all else fails and you can't get remote debugging working:

1. **Check device logs** via ADB:
   ```bash
   adb logcat | grep HealthyScan
   ```

2. **Look for these key error patterns**:
   - `CRASH REPORT` - Our custom crash logs
   - `JavaScriptException` - JavaScript errors
   - `NullPointerException` - Null reference errors
   - `SecurityException` - Permission errors

3. **Enable verbose logging** by building with development profile:
   ```bash
   eas build --platform android --profile development
   ```

## 📋 What to Send for Help

If you still get crashes after trying these methods, send:

1. **Device info**: Android version, device model
2. **App version**: Check the debug info in the app
3. **Crash logs**: From ADB or the debug console
4. **Steps to reproduce**: Exact actions that cause the crash
5. **Screenshots**: Of any error messages

The app is now much more robust and should provide clear debugging information for any issues that occur!
