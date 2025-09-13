import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Platform } from 'react-native';

interface LoadingOverlayProps {
  visible: boolean;
  label?: string;
  testID?: string;
}

export default function LoadingOverlay({ visible, label = 'Загрузка...', testID }: LoadingOverlayProps) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.95, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fade, scale]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.backdrop, { opacity: fade }]}
      pointerEvents="auto"
      testID={testID ?? 'loading-overlay'}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <ActivityIndicator size={Platform.OS === 'web' ? 28 : 'large'} color="#0066FF" />
        {!!label && <Text style={styles.label}>{label}</Text>}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  card: {
    minWidth: 160,
    maxWidth: 320,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
});