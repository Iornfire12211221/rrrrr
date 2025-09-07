import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform, useColorScheme } from "react-native";
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

  // Используем цветовую схему Telegram, если доступна
  const colorScheme = useMemo(() => {
    if (Platform.OS === 'web' && telegram.isTelegramWebApp) {
      return telegram.colorScheme;
    }
    return systemColorScheme;
  }, [telegram.colorScheme, telegram.isTelegramWebApp, systemColorScheme]);

  // Создаем кастомную тему на основе Telegram
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
      };
    }
    return colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  }, [telegram.themeParams, telegram.colorScheme, telegram.isTelegramWebApp, colorScheme, telegram]);

  const onLayoutRootView = React.useCallback(() => {
    if (telegram.isReady) {
      SplashScreen.hideAsync().catch((e) => {
        console.warn("Error hiding splash screen:", e);
      });
    }
  }, [telegram.isReady]);

  if (!telegram.isReady) {
    return null;
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

export default function RootLayout() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <AILearningProvider>
            <AppContent />
          </AILearningProvider>
        </AppProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}