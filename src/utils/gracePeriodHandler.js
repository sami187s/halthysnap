import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export class GracePeriodHandler {
  static async checkGracePeriodStatus() {
    try {
      const gracePeriodData = await AsyncStorage.getItem('healthyscan_grace_period');
      if (gracePeriodData) {
        const parsed = JSON.parse(gracePeriodData);
        const isInGracePeriod = new Date() < new Date(parsed.expiryDate);
        
        return {
          isInGracePeriod,
          daysRemaining: this.calculateDaysRemaining(parsed.expiryDate),
          reason: parsed.reason || 'Payment processing failed'
        };
      }
      
      return { isInGracePeriod: false };
    } catch (error) {
      console.error('Error checking grace period:', error);
      return { isInGracePeriod: false };
    }
  }

  static calculateDaysRemaining(expiryDate) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  static showGracePeriodAlert(daysRemaining) {
    Alert.alert(
      '⚠️ Payment Issue',
      `Your HealthyScan Premium payment couldn't be processed.\n\n` +
      `You have ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining to update your payment method.\n\n` +
      `Continue enjoying unlimited scans and AI analysis!`,
      [
        { 
          text: 'Update Payment', 
          onPress: () => this.openPaymentSettings()
        },
        { 
          text: 'Later', 
          style: 'cancel' 
        }
      ]
    );
  }

  static openPaymentSettings() {
    Alert.alert(
      'Update Payment Method',
      'To continue HealthyScan Premium:\n\n' +
      '1. Open Settings\n' +
      '2. Tap your Apple ID\n' +
      '3. Go to Subscriptions\n' +
      '4. Select HealthyScan\n' +
      '5. Update payment method',
      [{ text: 'Got it!' }]
    );
  }

  // Colors for grace period UI (following HealthyScan's traffic light system)
  static getGracePeriodColor(daysRemaining) {
    if (daysRemaining <= 1) return '#F44336'; // 🔴 Red - urgent
    if (daysRemaining <= 2) return '#FF9800'; // 🟡 Yellow - warning  
    return '#4CAF50'; // 🟢 Green - still time
  }

  // Store grace period information when payment fails
  static async startGracePeriod(reason = 'Payment processing failed') {
    try {
      const gracePeriodData = {
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString(), // 3 days from now
        reason,
        notificationShown: false
      };
      
      await AsyncStorage.setItem('healthyscan_grace_period', JSON.stringify(gracePeriodData));
      console.log('🕐 Grace period started:', gracePeriodData);
    } catch (error) {
      console.error('Failed to start grace period:', error);
    }
  }

  // Clear grace period when subscription is restored
  static async clearGracePeriod() {
    try {
      await AsyncStorage.removeItem('healthyscan_grace_period');
      console.log('✅ Grace period cleared');
    } catch (error) {
      console.error('Failed to clear grace period:', error);
    }
  }

  // Check if we should show grace period notification
  static async shouldShowNotification() {
    try {
      const gracePeriodData = await AsyncStorage.getItem('healthyscan_grace_period');
      if (gracePeriodData) {
        const parsed = JSON.parse(gracePeriodData);
        return !parsed.notificationShown && parsed.isInGracePeriod;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Mark notification as shown
  static async markNotificationShown() {
    try {
      const gracePeriodData = await AsyncStorage.getItem('healthyscan_grace_period');
      if (gracePeriodData) {
        const parsed = JSON.parse(gracePeriodData);
        parsed.notificationShown = true;
        await AsyncStorage.setItem('healthyscan_grace_period', JSON.stringify(parsed));
      }
    } catch (error) {
      console.error('Failed to mark notification shown:', error);
    }
  }
}