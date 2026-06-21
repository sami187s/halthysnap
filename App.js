import React, { createContext, useContext, useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, setStatusBarTranslucent, setStatusBarBackgroundColor } from 'expo-status-bar';
import { Platform, View, Text, Alert, StyleSheet, TouchableOpacity as RNTouchableOpacity, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFocusedRouteNameFromRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

// Global web scrollbar — always visible, thick, green themed
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const id = 'healthyscan-global-scrollbar';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      /* All scrollable containers */
      [data-testid="scroll-view"], [class*="ScrollView"], [class*="r-overflow"] {
        scrollbar-width: auto !important;
        scrollbar-color: #4CAF50 #E8E8E8 !important;
      }
      ::-webkit-scrollbar {
        width: 10px !important;
        height: 10px !important;
      }
      ::-webkit-scrollbar-track {
        background: #E8E8E8 !important;
        border-radius: 8px !important;
      }
      ::-webkit-scrollbar-thumb {
        background: #4CAF50 !important;
        border-radius: 8px !important;
        border: 2px solid #E8E8E8 !important;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #388E3C !important;
      }
      /* Ensure overflow scroll on scrollable views */
      [class*="r-overflow-hidden"] {
        overflow: auto !important;
      }
    `;
    document.head.appendChild(s);
  }
}

// Screens and components
import HomeScreen from './src/screens/HomeScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import ResultsScreenV2 from './src/screens/ResultsScreenV2';
import CosmeticResultsScreen from './src/screens/CosmeticResultsScreen';
import FoodPhotoResultsScreen from './src/screens/FoodPhotoResultsScreen';
import SearchScreen from './src/screens/SearchScreen';
import AboutScreen from './src/screens/AboutScreen';
import SourcesScreen from './src/screens/SourcesScreen';
import ProductNotFoundScreen from './src/screens/ProductNotFoundScreen';
import SubscriptionScreen from './src/screens/SimpleSubscriptionScreenNew';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
// OnboardingPaywallScreen removed — onboarding now routes directly to SubscriptionScreen
import PremiumFeaturesScreen from './src/screens/PremiumFeaturesScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import VeeListScreen from './src/screens/VeeListScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AINutritionistScreen from './src/screens/AINutritionistScreen';
// import TestSubscriptionScreen from './src/screens/TestSubscriptionScreen';
import DevScreen from './src/screens/DevScreen';
import { localCrashReporter } from './src/utils/crashReporting';
import { NavigationErrorBoundary } from './src/components/SafeNavigation';
import { SubscriptionProvider } from './src/hooks/useSubscription';
import iapManager from './src/services/iapManager';
import { ScanContext, useScanContext } from './src/contexts/ScanContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://29911f628f7b9a4dbde3a2164f504187@o4510499972448256.ingest.us.sentry.io/4510499973955584',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// 🚀 GoMarketMe — key should come from app config, not hardcoded
// Set via app.json extra.goMarketMeApiKey or environment variable
import Constants from 'expo-constants';
const GOMARKETME_API_KEY = Constants.expoConfig?.extra?.goMarketMeApiKey || '';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ScanProvider = ({ children }) => {
  const [isScanning, setIsScanning] = useState(false);
  
  return (
    <ScanContext.Provider value={{ isScanning, setIsScanning }}>
      {children}
    </ScanContext.Provider>
  );
};

// Main Tab Navigator Component
function MainTabs() {
  const { isScanning } = useScanContext();
  const { theme } = useTheme();
  const [isPremium, setIsPremium] = useState(false);
  const parentNavigation = useNavigation();
  
  // Check premium status
  useEffect(() => {
    checkPremiumStatus();
  }, []);
  
  const checkPremiumStatus = async () => {
    try {
      const subscriptionType = await AsyncStorage.getItem('subscriptionType');
      setIsPremium(subscriptionType === 'Premium');
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
    }
  };
  
  return (
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'leaf' : 'leaf-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'AIChat') {
            iconName = focused ? 'nutrition' : 'nutrition-outline';
          } else if (route.name === 'VeeList') {
            iconName = focused ? 'list' : 'list-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarActiveBackgroundColor: theme.tabActiveBg,
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarStyle: isScanning ? { display: 'none' } : {
          backgroundColor: theme.tabBg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.tabBorder,
          paddingBottom: 10,
          paddingTop: 10,
          paddingHorizontal: 8,
          height: 70,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          borderRadius: 10,
          marginHorizontal: 4,
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarLabel: 'Search' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarLabel: 'History' }}
      />
      <Tab.Screen
        name="AIChat"
        component={AINutritionistScreen}
        options={{ tabBarLabel: 'AI Chat' }}
      />
      
      <Tab.Screen 
        name="VeeList" 
        component={VeeListScreen}
        options={{ tabBarLabel: 'Vee List' }}
      />
    </Tab.Navigator>

    {/* Floating Dev Menu Button — only in development */}
    {__DEV__ && !isScanning && (
      <RNTouchableOpacity
        onPress={() => parentNavigation.navigate('DevMenu')}
        activeOpacity={0.8}
        style={{
          position: 'absolute',
          bottom: 80,
          right: 16,
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: '#37474F',
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          zIndex: 9999,
        }}
      >
        <Ionicons name="code-slash" size={22} color="#FFF" />
      </RNTouchableOpacity>
    )}
    </View>
  );
}

// Enhanced Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('🔴 Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Report to crash reporter
    if (localCrashReporter && localCrashReporter.captureException) {
      localCrashReporter.captureException(error);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#F5F5F0', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="alert-circle" size={80} color="#F44336" />
          <Text style={{ fontSize: 24, color: '#212121', textAlign: 'center', marginBottom: 10, marginTop: 20, fontWeight: 'bold' }}>
            Oops! Something went wrong
          </Text>
          <Text style={{ fontSize: 16, color: '#757575', textAlign: 'center', marginBottom: 30 }}>
            We encountered an unexpected error. Don't worry, your data is safe.
          </Text>
          {__DEV__ && this.state.error && (
            <View style={{ width: '100%', maxHeight: 150, backgroundColor: '#FFFFFF', padding: 15, borderRadius: 10, marginBottom: 20 }}>
              <Text style={{ fontSize: 12, color: '#F44336', fontWeight: 'bold' }}>Dev Mode Error:</Text>
              <Text style={{ fontSize: 12, color: '#757575' }}>{this.state.error.toString()}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View 
              style={{ 
                backgroundColor: '#4CAF50', 
                paddingHorizontal: 30, 
                paddingVertical: 15, 
                borderRadius: 25,
                flexDirection: 'row',
                alignItems: 'center'
              }}
              onTouchEnd={this.handleReset}
            >
              <Ionicons name="refresh" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>Try Again</Text>
            </View>
          </View>
          <Text style={{ fontSize: 14, color: '#999', marginTop: 20, textAlign: 'center' }}>
            If this keeps happening, try restarting the app
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function App() {
  const { theme, isDark } = useTheme();
  const [isReady, setIsReady] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [showPremiumOnLaunch, setShowPremiumOnLaunch] = React.useState(false);
  
  // Check if user has seen onboarding
  const checkOnboarding = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      const hasCompletedPaywall = await AsyncStorage.getItem('hasCompletedPaywall');
      const needsOnboarding = hasSeenOnboarding === null;
      setShowOnboarding(needsOnboarding);
      setIsFirstLaunch(needsOnboarding);
      // If paywall was completed, launch straight to PremiumFeatures screen
      setShowPremiumOnLaunch(!needsOnboarding && hasCompletedPaywall === 'true');
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setShowOnboarding(false);
      setIsFirstLaunch(false);
      setShowPremiumOnLaunch(false);
    }
  };
  
  // Comprehensive app initialization
  React.useEffect(() => {
    console.log('🚀 App initializing...');
    
    if (localCrashReporter && localCrashReporter.addBreadcrumb) {
      localCrashReporter.addBreadcrumb('App started', 'app');
    }
    
    // 🚀 Initialize GoMarketMe SDK (mobile only - iOS/Android)
    // Temporarily disabled to avoid web bundling issues with expo-iap 2.x
    // if (Platform.OS !== 'web') {
    //   try {
    //     const { default: GoMarketMe } = require('gomarketme-react-native-expo');
    //     GoMarketMe.initialize(GOMARKETME_API_KEY);
    //     console.log('✅ GoMarketMe SDK initialized');
    //   } catch (error) {
    //     console.log('ℹ️ GoMarketMe not available:', error.message);
    //   }
    // }
    
    const initializeApp = async () => {
      try {
        // Check if user has seen onboarding
        await checkOnboarding();

        // 🖼️ Prefetch Vee List images so they're ready instantly
        const VEE_IMAGE_URLS = [
          'https://media.sobeys.com/original/061314000056_VOILA_7beca970b0ad2512141beb2e92bd8f3cd5343355.JPG',
          'https://digital.loblaws.ca/PCX/21560949_EA/en/1/21560949_en_front_800.png',
          'https://m.media-amazon.com/images/I/51eKuOrpExL.jpg',
          'https://m.media-amazon.com/images/I/81DQ8tL64oL._AC_UF1000,1000_QL80_.jpg',
          'https://www.britsuperstore.com/media/catalog/product/cache/7/image/225x225/602f0fa2c1f0d1ba5e241f914e856ff9/m/e/meridian_organic_smooth_almond_butter_170g-1762849553.jpg',
          'https://images.hollandandbarrettimages.co.uk/productimages/HB/724/094373_D.jpg',
          'https://www.laroche-posay.ca/dw/image/v2/AATL_PRD/on/demandware.static/-/Sites-larocheposay-master-catalog/default/dw9ff4849c/2022/3337875578486/lrp_toleriane-sensitive-40ml-3337875578486-00.jpg',
          'https://boots.scene7.com/is/image/Boots/10290141?fmt=jpeg&wid=400',
        ];
        VEE_IMAGE_URLS.forEach(url => Image.prefetch(url).catch(() => {}));

        if (Platform.OS === 'ios') {
          console.log('📱 Checking iOS IAP system status...');
          try {
            // IAP is already initializing from early init, just wait for it
            const iapInitialized = await iapManager.initialize();
            if (iapInitialized) {
              console.log('✅ IAP system ready');
              
              // Check and restore existing subscription
              const subStatus = await iapManager.checkSubscriptionStatus();
              if (subStatus.isPremium) {
                console.log('✅ Active subscription found:', subStatus.daysRemaining, 'days remaining');
              } else {
                console.log('ℹ️ No active subscription');
              }
            } else {
              console.warn('⚠️ IAP initialization incomplete - features may be limited');
            }
          } catch (iapError) {
            console.warn('⚠️ IAP check error:', iapError.message);
            // Don't block app startup for IAP errors
          }
        } else {
          console.log('ℹ️ IAP only available on iOS');
        }
        
        setIsReady(true);
        console.log('✅ App ready');
      } catch (error) {
        console.error('❌ App initialization error:', error);
        setIsReady(true); // Still allow app to start
      }
    };
    
    initializeApp();

    return () => {
      // Cleanup IAP on app unmount
      if (Platform.OS === 'ios') {
        iapManager.cleanup().catch(console.error);
      }
    };
  }, []);



  // 🔗 Handle Deep Links for Affiliate Tracking
  React.useEffect(() => {
    const handleDeepLink = async (url) => {
      try {
        console.log('🔗 Deep link received:', url);
        const data = Linking.parse(url);
        
        // Check for affiliate parameters
        if (data.queryParams?.ref || data.queryParams?.promo || data.queryParams?.affiliate) {
          console.log('🎯 Affiliate params detected:', data.queryParams);
          
          // Store affiliate source for analytics
          await AsyncStorage.setItem('affiliateSource', JSON.stringify({
            ...data.queryParams,
            timestamp: new Date().toISOString()
          }));
          
          // GoMarketMe SDK will automatically capture these params
        }
      } catch (error) {
        console.error('❌ Error handling deep link:', error);
      }
    };

    // Listen for incoming deep links
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 App opened with URL:', url);
        handleDeepLink(url);
      }
    });

    return () => subscription.remove();
  }, []);

  const linking = {
    prefixes: [],
    config: {
      screens: {
        Home: 'home',
        Results: 'results',
        Search: 'search',
        About: 'about',
        Sources: 'sources',
      },
    },
  };

  // Simplified loading screen
  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="light" backgroundColor="transparent" translucent={true} />
        <Text style={{ fontSize: 24, color: '#4CAF50', fontWeight: 'bold', marginBottom: 10 }}>
          Vee: Product Check
        </Text>
        <Text style={{ fontSize: 16, color: '#666' }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ 
        flex: 1, 
        backgroundColor: theme.bg, 
        width: '100%', 
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor="transparent" translucent={true} />
        <ErrorBoundary>
        <NavigationErrorBoundary screenName="App">
          <NavigationContainer 
            linking={linking}
            fallback={
              <View style={{ flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, color: '#4CAF50', fontWeight: 'bold', marginBottom: 20 }}>
                  Vee: Product Check
                </Text>
                <Text style={{ fontSize: 16, color: '#666' }}>
                  Initializing...
                </Text>
              </View>
            }
            onStateChange={(state) => {
              if (__DEV__) {
                console.log('Navigation state changed:', state);
              }
              if (state && localCrashReporter && localCrashReporter.addBreadcrumb) {
                localCrashReporter.addBreadcrumb('Navigation state changed', 'navigation');
              }
            }}
            onUnhandledAction={(action) => {
              console.warn('Unhandled navigation action:', action);
              if (localCrashReporter && localCrashReporter.captureError) {
                localCrashReporter.captureError(
                  new Error(`Unhandled navigation action: ${action.type}`),
                  { action, component: 'Navigation' }
                );
              }
            }}
            onError={(error) => {
              console.error('Navigation Container Error:', error);
              localCrashReporter.captureError(error, {
                component: 'NavigationContainer'
              });
            }}
          >
            <Stack.Navigator 
              initialRouteName={showOnboarding ? "Onboarding" : "MainTabs"}
              screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                animation: 'slide_from_right',
                contentStyle: {
                  backgroundColor: '#f8f9fa',
                },
              }}
            >
              {/* Onboarding Screen */}
              <Stack.Screen 
                name="Onboarding" 
                component={OnboardingScreen}
                options={{
                  gestureEnabled: false,
                  headerShown: false,
                  animation: 'none',
                }}
              />

              {/* Real subscription screen shown after name entry */}
              <Stack.Screen
                name="OnboardingPaywall"
                options={{
                  gestureEnabled: false,
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              >
                {(props) => (
                  <NavigationErrorBoundary screenName="OnboardingPaywall" navigation={props.navigation}>
                    <SubscriptionScreen {...props} route={{ ...props.route, params: { ...props.route?.params, fromOnboarding: true } }} />
                  </NavigationErrorBoundary>
                )}
              </Stack.Screen>

              {/* Premium Features (landing after paywall + on re-launch) */}
              <Stack.Screen
                name="PremiumFeatures"
                component={PremiumFeaturesScreen}
                options={{
                  gestureEnabled: false,
                  headerShown: false,
                  animation: 'fade',
                }}
              />
              
              {/* Main Bottom Tab Navigation */}
              <Stack.Screen name="MainTabs" component={MainTabs} />
              
              {/* Stack Screens (opened from tabs) */}
              <Stack.Screen name="Results">
                {(props) => (
                  <NavigationErrorBoundary screenName="Results" navigation={props.navigation}>
                    <ResultsScreenV2 {...props} />
                  </NavigationErrorBoundary>
                )}
              </Stack.Screen>
              <Stack.Screen name="ResultsV2">
                {(props) => (
                  <NavigationErrorBoundary screenName="ResultsV2" navigation={props.navigation}>
                    <ResultsScreenV2 {...props} />
                  </NavigationErrorBoundary>
                )}
              </Stack.Screen>
              <Stack.Screen name="CosmeticResults">
                {(props) => (
                  <NavigationErrorBoundary screenName="CosmeticResults" navigation={props.navigation}>
                    <CosmeticResultsScreen {...props} />
                  </NavigationErrorBoundary>
                )}
              </Stack.Screen>
              <Stack.Screen name="FoodPhotoResults">
                {(props) => (
                  <NavigationErrorBoundary screenName="FoodPhotoResults" navigation={props.navigation}>
                    <FoodPhotoResultsScreen {...props} />
                  </NavigationErrorBoundary>
                )}
              </Stack.Screen>
              <Stack.Screen name="About">
                {(props) => (
                  <NavigationErrorBoundary screenName="About" navigation={props.navigation}>
                    <AboutScreen {...props} />
                  </NavigationErrorBoundary>
                )}
              </Stack.Screen>
              <Stack.Screen name="Sources">
                {(props) => (
                  <NavigationErrorBoundary screenName="Sources" navigation={props.navigation}>
                    <SourcesScreen {...props} />
                  </NavigationErrorBoundary>
                )}
              </Stack.Screen>
              <Stack.Screen name="ProductNotFound">
                {(props) => (
                  <NavigationErrorBoundary screenName="ProductNotFound" navigation={props.navigation}>
                    <ProductNotFoundScreen {...props} />
                  </NavigationErrorBoundary>
                )}
              </Stack.Screen>
              <Stack.Screen name="History">
                {(props) => (
                  <NavigationErrorBoundary screenName="History" navigation={props.navigation}>
                    <HistoryScreen {...props} />
                  </NavigationErrorBoundary>
                )}
              </Stack.Screen>
              <Stack.Screen name="Profile">
                {(props) => (
                  <NavigationErrorBoundary screenName="Profile" navigation={props.navigation}>
                    <ProfileScreen {...props} />
                  </NavigationErrorBoundary>
                )}
              </Stack.Screen>
              <Stack.Screen name="Settings">
                {(props) => (
                  <NavigationErrorBoundary screenName="Settings" navigation={props.navigation}>
                    <SettingsScreen {...props} />
                  </NavigationErrorBoundary>
                )}
              </Stack.Screen>
              <Stack.Screen name="Subscription">
                {(props) => (
                  <NavigationErrorBoundary screenName="Subscription" navigation={props.navigation}>
                    <SubscriptionScreen {...props} />
                  </NavigationErrorBoundary>
                )}
              </Stack.Screen>
              <Stack.Screen name="TestSubscription">
                {(props) => (
                  <NavigationErrorBoundary screenName="TestSubscription" navigation={props.navigation}>
                    <SubscriptionScreen {...props} />  {/* Use SubscriptionScreen instead */}
                  </NavigationErrorBoundary>
                )}
              </Stack.Screen>

              {/* Dev Menu — only registered in development builds */}
              {__DEV__ && (
                <Stack.Screen
                  name="DevMenu"
                  component={DevScreen}
                  options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
                />
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </NavigationErrorBoundary>
      </ErrorBoundary>
    </View>
    </SafeAreaProvider>
  );
}

// Wrap the entire app with providers
export default Sentry.wrap(function AppWithProviders() {
  // 🔒 Check subscription on app startup
  useEffect(() => {
    checkSubscriptionOnAppStart();
  }, []);

  const checkSubscriptionOnAppStart = async () => {
    try {
      const subscriptionType = await AsyncStorage.getItem('subscriptionType');
      const expiresAt = await AsyncStorage.getItem('subscriptionExpiresAt');
      
      if (subscriptionType === 'Premium' && expiresAt) {
        const expireDate = new Date(parseInt(expiresAt));
        const now = new Date();
        
        if (expireDate <= now) {
          // Subscription expired - clean up
          console.log('⚠️ Subscription expired on app start:', expireDate);
          await AsyncStorage.multiRemove([
            'subscriptionType',
            'subscriptionExpiresAt',
            'originalTransactionId',
            'premiumTrialActivated',
            'premiumTrialUsedToday'
          ]);
          console.log('✅ Expired subscription data cleaned up');
        } else {
          console.log('✅ Premium subscription active until:', expireDate);
          // Calculate days remaining
          const daysRemaining = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));
          console.log(`📅 ${daysRemaining} days remaining`);
        }
      } else if (subscriptionType === 'Premium' && !expiresAt) {
        // Old subscription without expiry date - needs re-purchase
        console.log('⚠️ Old subscription format detected - clearing');
        await AsyncStorage.multiRemove([
          'subscriptionType',
          'originalTransactionId'
        ]);
      }
    } catch (error) {
      console.error('❌ Error checking subscription on app start:', error);
    }
  };

  return (
    <ScanProvider>
      <SubscriptionProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </SubscriptionProvider>
    </ScanProvider>
  );
});