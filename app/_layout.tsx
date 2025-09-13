import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from "@/hooks/app-store";
import { AILearningProvider } from "@/hooks/ai-learning";
import { trpc, trpcClient } from "@/lib/trpc";
import { useTelegram } from "@/hooks/telegram";

SplashScreen.preventAutoHideAsync().catch(() => {
  console.log("preventAutoHideAsync error ignored");
});

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Назад" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-post"
        options={{ presentation: "modal", title: "Добавить пост" }}
      />
      <Stack.Screen
        name="admin"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen
        name="auth"
        options={{ presentation: "fullScreenModal", headerShown: false }}
      />
    </Stack>
  );
}

function AppContent() {
  const systemColorScheme = useColorScheme();
  const telegram = useTelegram();

  const colorScheme = useMemo(() => {
    if (Platform.OS === 'web' && telegram.isTelegramWebApp) {
      return telegram.colorScheme;
    }
    return systemColorScheme;
  }, [telegram.colorScheme, telegram.isTelegramWebApp, systemColorScheme]);

  const telegramTheme = useMemo(() => {
    if (Platform.OS === 'web' && telegram.isTelegramWebApp && telegram.themeParams) {
      const { themeParams } = telegram;
      const isDark = telegram.colorScheme === 'dark';
      const baseTheme = isDark ? DarkTheme : DefaultTheme;
      return {
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          primary: themeParams.button_color || baseTheme.colors.primary,
          background: themeParams.bg_color || baseTheme.colors.background,
          card: themeParams.secondary_bg_color || baseTheme.colors.card,
          text: themeParams.text_color || baseTheme.colors.text,
          border: themeParams.hint_color || baseTheme.colors.border,
          notification: themeParams.link_color || baseTheme.colors.notification,
        },
      } as typeof DefaultTheme;
    }
    return (colorScheme === 'dark' ? DarkTheme : DefaultTheme) as typeof DefaultTheme;
  }, [telegram.themeParams, telegram.colorScheme, telegram.isTelegramWebApp, colorScheme]);

  const onLayoutRootView = React.useCallback(() => {
    if (telegram.isReady) {
      SplashScreen.hideAsync().catch((e) => {
        console.warn("Error hiding splash screen:")
      });
    }
  }, [telegram.isReady]);

  if (!telegram.isReady) {
    return (
      <View style={styles.loadingContainer} testID="app-loading">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={telegramTheme}>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <RootLayoutNav />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: unknown }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error('App error boundary caught:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.loadingContainer} testID="app-error">
          <Text style={styles.errorTitle}>Произошла ошибка</Text>
          <Text style={styles.loadingText}>Перезагрузите страницу</Text>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export default function RootLayout() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <AILearningProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </AILearningProvider>
        </AppProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  errorTitle: {
    fontSize: 18,
    color: '#FF3B30',
    fontWeight: '600' as const,
  },
});