import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { localCrashReporter } from '../utils/crashReporting';

// Safe navigation wrapper
export const SafeNavigationWrapper = ({ navigation, children, fallbackScreen = 'Home' }) => {
  const safeNavigate = (screenName, params = {}) => {
    try {
      if (!navigation) {
        return;
      }
      
      navigation.navigate(screenName, params);
      localCrashReporter.addBreadcrumb(`Navigated to ${screenName}`, 'navigation');
    } catch (error) {
      localCrashReporter.captureError(error, {
        component: 'SafeNavigationWrapper',
        targetScreen: screenName,
        params
      });
      
      // Fallback navigation
      try {
        navigation.navigate(fallbackScreen);
      } catch (fallbackError) {
      }
    }
  };

  // Clone children and inject safe navigation
  const childrenWithSafeNav = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        ...child.props,
        navigation: {
          ...navigation,
          navigate: safeNavigate,
          safeNavigate
        }
      });
    }
    return child;
  });

  return <>{childrenWithSafeNav}</>;
};

// Navigation error boundary
export class NavigationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('🔴 NavigationErrorBoundary caught error:', error);
    console.log('🔴 Error message:', error.message);
    console.log('🔴 Error stack:', error.stack);
    console.log('🔴 Component stack:', errorInfo.componentStack);
    console.log('🔴 Screen:', this.props.screenName);
    
    localCrashReporter.captureError(error, {
      component: 'NavigationErrorBoundary',
      errorInfo: errorInfo.componentStack || 'No component stack',
      screen: this.props.screenName || 'Unknown'
    });
  }

  render() {
    if (this.state.hasError) {
      const errorDetails = this.state.error ? this.state.error.message : 'Unknown error';
      
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={60} color="#FF9800" />
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {errorDetails || 'An unexpected error occurred'}
          </Text>
          <Text style={styles.errorHint}>
            Screen: {this.props.screenName || 'Unknown'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.navigation) {
                this.props.navigation.navigate('Home');
              }
            }}
          >
            <Text style={styles.retryButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  errorHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
