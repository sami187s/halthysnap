import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text, Alert, SafeAreaView } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import SearchScreen from './src/screens/SearchScreen';
import AboutScreen from './src/screens/AboutScreen';
import SourcesScreen from './src/screens/SourcesScreen';
import { localCrashReporter } from './src/utils/crashReporting';
import { NavigationErrorBoundary } from './src/components/SafeNavigation';
import { platformSupports } from './src/utils/platformUtils';

const Stack = createStackNavigator();

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('App Error:', error, errorInfo);
    
    // Capture the error with our crash reporter
    localCrashReporter.captureError(error, {
      component: 'App',
      errorInfo: errorInfo.componentStack || 'No component stack',
      errorBoundary: true
    });
    
    // In production, you might want to log this to a crash reporting service
    if (__DEV__) {
      Alert.alert('Development Error', error.toString());
    } else {
      // In production, show a user-friendly message
      console.error('🚨 App crashed in production:', error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 24, color: '#333', textAlign: 'center', marginBottom: 20 }}>
              Vee: Product Check
            </Text>
            <Text style={{ fontSize: 18, color: '#333', textAlign: 'center', marginBottom: 20 }}>
              Something went wrong. Please restart the app.
            </Text>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
              Error: {this.state.error?.message || 'Unknown error'}
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [isReady, setIsReady] = React.useState(false);
  
  // Log platform capabilities
  React.useEffect(() => {
    console.log('Platform capabilities:', platformSupports);
    localCrashReporter.addBreadcrumb('App started', 'app');
    
    // Add iPad-specific debugging
    const { width, height } = require('react-native').Dimensions.get('window');
    console.log('App starting on device:', {
      width,
      height,
      platform: require('react-native').Platform.OS,
      isTablet: width > 768
    });
    
    // Simulate app ready after a short delay
    setTimeout(() => {
      setIsReady(true);
    }, 100);
  }, []);

  // Set up global error handler for unhandled promise rejections
  React.useEffect(() => {
    const unhandledRejectionHandler = (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      localCrashReporter.captureError(
        new Error(event.reason || 'Unhandled Promise Rejection'), 
        { type: 'unhandledRejection', source: 'global' }
      );
    };

    // Add global error listeners (web only)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', unhandledRejectionHandler);
      return () => window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
    }
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

  // Show loading screen until app is ready
  if (!isReady) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, color: '#4CAF50', fontWeight: 'bold', marginBottom: 20 }}>
            Vee: Product Check
          </Text>
          <Text style={{ fontSize: 16, color: '#666' }}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <ErrorBoundary>
        <NavigationErrorBoundary screenName="App">
          <NavigationContainer 
            linking={linking}
            fallback={
              <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, color: '#4CAF50', fontWeight: 'bold', marginBottom: 20 }}>
                    Vee: Product Check
                  </Text>
                  <Text style={{ fontSize: 16, color: '#666' }}>
                    Initializing...
                  </Text>
                </View>
              </SafeAreaView>
            }
            onStateChange={(state) => {
              if (__DEV__) {
                console.log('Navigation state changed:', state);
              }
              localCrashReporter.addBreadcrumb('Navigation state changed', 'navigation');
            }}
            onUnhandledAction={(action) => {
              console.warn('Unhandled navigation action:', action);
              localCrashReporter.captureError(
                new Error(`Unhandled navigation action: ${action.type}`),
                { action, component: 'Navigation' }
              );
            }}
            onError={(error) => {
              console.error('Navigation Container Error:', error);
              localCrashReporter.captureError(error, {
                component: 'NavigationContainer'
              });
            }}
          >
            <StatusBar style="auto" />
            <Stack.Navigator 
              initialRouteName="Home"
              screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }}
            >
              <Stack.Screen 
                name="Home" 
                component={(props) => (
                  <NavigationErrorBoundary screenName="Home" navigation={props.navigation}>
                    <HomeScreen {...props} />
                  </NavigationErrorBoundary>
                )} 
              />
              <Stack.Screen 
                name="Results" 
                component={(props) => (
                  <NavigationErrorBoundary screenName="Results" navigation={props.navigation}>
                    <ResultsScreen {...props} />
                  </NavigationErrorBoundary>
                )} 
              />
              <Stack.Screen 
                name="Search" 
                component={(props) => (
                  <NavigationErrorBoundary screenName="Search" navigation={props.navigation}>
                    <SearchScreen {...props} />
                  </NavigationErrorBoundary>
                )} 
              />
              <Stack.Screen 
                name="About" 
                component={(props) => (
                  <NavigationErrorBoundary screenName="About" navigation={props.navigation}>
                    <AboutScreen {...props} />
                  </NavigationErrorBoundary>
                )} 
              />
              <Stack.Screen 
                name="Sources" 
                component={(props) => (
                  <NavigationErrorBoundary screenName="Sources" navigation={props.navigation}>
                    <SourcesScreen {...props} />
                  </NavigationErrorBoundary>
                )} 
              />
            </Stack.Navigator>
          </NavigationContainer>
        </NavigationErrorBoundary>
      </ErrorBoundary>
    </SafeAreaView>
  );
}
