import React, { useState, useEffect, useContext, createContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';
import iapManager from '../services/iapManager';

const SubscriptionContext = createContext({
  isActive: true,
  isPremium: true,
  isCancelled: false,
  isLoading: true,
  expiresAt: null,
  daysRemaining: null,
  refreshSubscription: () => {},
});

export const SubscriptionProvider = ({ children }) => {
  const [subscriptionState, setSubscriptionState] = useState({
    isActive: true,
    isPremium: true,
    isCancelled: false,
    isLoading: true,
    expiresAt: null,
    daysRemaining: null,
  });

  useEffect(() => {
    initializeSubscription();
    
    // Refresh subscription when app comes to foreground
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      // App came to foreground - refresh subscription
      refreshSubscription();
    }
  };

  const initializeSubscription = async () => {
    try {
      // Auto-grant free premium to ALL users on every launch
      await AsyncStorage.setItem('freePremiumGranted', 'true');
      await AsyncStorage.multiSet([
        ['subscriptionType', 'Premium'],
        ['subscriptionExpiresAt', (Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toString()],
        ['lastSubscriptionCheck', Date.now().toString()],
      ]);
      setSubscriptionState({
        isActive: true,
        isPremium: true,
        isCancelled: false,
        isLoading: false,
        expiresAt: null,
        daysRemaining: null,
      });
      console.log('✅ Free premium auto-granted');
    } catch (error) {
      console.error('Subscription initialization failed:', error);
      // Grant premium even on error
      setSubscriptionState({
        isActive: true,
        isPremium: true,
        isCancelled: false,
        isLoading: false,
        expiresAt: null,
        daysRemaining: null,
      });
    }
  };

  const refreshSubscription = async () => {
    setSubscriptionState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Free premium grant is permanent — don't let IAP overwrite it
      const freePremium = await AsyncStorage.getItem('freePremiumGranted');
      if (freePremium === 'true') {
        setSubscriptionState({
          isActive: true,
          isPremium: true,
          isCancelled: false,
          isLoading: false,
          expiresAt: null,
          daysRemaining: null,
        });
        return;
      }

      const status = await iapManager.checkSubscriptionStatus();
      
      setSubscriptionState({
        isActive: status.isPremium || false,
        isPremium: status.isPremium || false,
        isCancelled: false,
        isLoading: false,
        expiresAt: status.expiresAt || null,
        daysRemaining: status.daysRemaining || null,
      });
      
      console.log('🔄 Subscription refreshed:', {
        isPremium: status.isPremium,
        daysRemaining: status.daysRemaining
      });
    } catch (error) {
      console.error('Refresh subscription failed:', error);
      setSubscriptionState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const contextValue = {
    isActive: subscriptionState.isActive,
    isPremium: subscriptionState.isPremium,
    isCancelled: subscriptionState.isCancelled,
    isLoading: subscriptionState.isLoading,
    expiresAt: subscriptionState.expiresAt,
    daysRemaining: subscriptionState.daysRemaining,
    refreshSubscription,
    isSubscribed: subscriptionState.isActive && !subscriptionState.isCancelled,
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
