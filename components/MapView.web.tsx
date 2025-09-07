import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Web-specific MapView implementation
export const MapView = (props: any) => {
  const { style, children, ...otherProps } = props;
  return (
    <View style={[styles.webMapContainer, style]} {...otherProps}>
      <Text style={styles.webMapText}>Interactive Map (Web Version)</Text>
      {children}
    </View>
  );
};

export const Marker = (props: any) => {
  const { style, children, ...otherProps } = props;
  return (
    <View style={[styles.webMarker, style]} {...otherProps}>
      {children}
    </View>
  );
};

export default MapView;

const styles = StyleSheet.create({
  webMapContainer: {
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  webMapText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  webMarker: {
    position: 'absolute',
  },
});