import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Platform } from 'react-native';

interface LoadingOverlayProps {
  visible: boolean;
  label?: string;
  testID?: string;
}

export default function LoadingOverlay({ visible, label = 'Загрузка...', testID }: LoadingOverlayProps) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Анимация появления
      Animated.parallel([
        Animated.timing(fade, { 
          toValue: 1, 
          duration: 300, 
          useNativeDriver: true 
        }),
        Animated.spring(scale, { 
          toValue: 1, 
          tension: 100,
          friction: 8,
          useNativeDriver: true 
        }),
      ]).start();

      // Пульсирующая анимация
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );

      // Вращающаяся анимация для дополнительного кольца
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );

      pulseAnimation.start();
      rotateAnimation.start();

      return () => {
        pulseAnimation.stop();
        rotateAnimation.stop();
      };
    } else {
      Animated.parallel([
        Animated.timing(fade, { 
          toValue: 0, 
          duration: 200, 
          useNativeDriver: true 
        }),
        Animated.timing(scale, { 
          toValue: 0.8, 
          duration: 200, 
          useNativeDriver: true 
        }),
      ]).start();
    }
  }, [visible, fade, scale, pulseAnim, rotateAnim]);

  if (!visible) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[styles.backdrop, { opacity: fade }]}
      pointerEvents="auto"
      testID={testID ?? 'loading-overlay'}
    >
      <Animated.View style={[
        styles.card, 
        { 
          transform: [
            { scale: Animated.multiply(scale, pulseAnim) }
          ] 
        }
      ]}>
        <View style={styles.spinnerContainer}>
          {/* Внешнее вращающееся кольцо */}
          <Animated.View style={[
            styles.outerRing,
            { transform: [{ rotate: spin }] }
          ]} />
          
          {/* Пульсирующее кольцо */}
          <Animated.View style={[
            styles.pulseRing,
            { transform: [{ scale: pulseAnim }] }
          ]} />
          
          {/* Основной спиннер */}
          <ActivityIndicator 
            size={Platform.OS === 'web' ? 32 : 'large'} 
            color="#0066FF" 
          />
        </View>
        
        {!!label && (
          <Animated.View style={[styles.labelContainer, { opacity: fade }]}>
            <Text style={styles.label}>{label}</Text>
          </Animated.View>
        )}
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  card: {
    minWidth: 180,
    maxWidth: 320,
    paddingVertical: 24,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    alignItems: 'center',
    gap: 16,
  },
  spinnerContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: '#0066FF',
    borderRightColor: '#0066FF',
  },
  pulseRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 102, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.3)',
  },
  labelContainer: {
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
});