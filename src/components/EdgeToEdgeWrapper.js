import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * EdgeToEdgeWrapper - Ensures consistent edge-to-edge behavior for all screens
 */
const EdgeToEdgeWrapper = ({ children, backgroundColor = '#F5F5F0' }) => {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.content, { paddingTop: insets.top }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default EdgeToEdgeWrapper;
