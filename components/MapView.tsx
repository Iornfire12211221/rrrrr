// Native MapView implementation (iOS/Android)
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

// Try to import react-native-maps, fallback to placeholder if not available
let NativeMapView: any = null;
let NativeMarker: any = null;

try {
  if (Platform.OS !== 'web') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Maps = require('react-native-maps');
    NativeMapView = Maps.default || Maps.MapView;
    NativeMarker = Maps.Marker;
  }
} catch {
  console.log('react-native-maps not available, using fallback');
}

export const MapView = (props: any) => {
  const { style, children, ...otherProps } = props;
  
  if (NativeMapView && Platform.OS !== 'web') {
    return (
      <NativeMapView style={style} {...otherProps}>
        {children}
      </NativeMapView>
    );
  }
  
  return (
    <View style={[styles.nativeMapContainer, style]} {...otherProps}>
      <Text style={styles.nativeMapText}>Карта (Мобильная версия)</Text>
      <Text style={styles.nativeMapSubtext}>Для полной функциональности установите react-native-maps</Text>
      {children}
    </View>
  );
};

export const Marker = (props: any) => {
  const { style, children, ...otherProps } = props;
  
  if (NativeMarker && Platform.OS !== 'web') {
    return (
      <NativeMarker {...otherProps}>
        {children}
      </NativeMarker>
    );
  }
  
  return (
    <View style={[styles.nativeMarker, style]} {...otherProps}>
      {children}
    </View>
  );
};

export default MapView;

const styles = StyleSheet.create({
  nativeMapContainer: {
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  nativeMapText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  nativeMapSubtext: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  nativeMarker: {
    position: 'absolute',
  },
});
