import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ChurchProvider, useChurch } from '@/contexts/ChurchContext';
import { AppThemeProvider, useAppTheme } from '@/contexts/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <AppThemeProvider>
      <AuthProvider>
        <ChurchProvider>
          <RootNavigator />
        </ChurchProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}

function RootNavigator() {
  const { scheme, palette, ready: themeReady } = useAppTheme();
  const { ready: authReady } = useAuth();
  const { ready: churchReady, onboarded } = useChurch();
  const ready = themeReady && authReady && churchReady;
  const lastNotification = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  useEffect(() => {
    const url = lastNotification?.notification.request.content.data?.url;
    if (ready && onboarded && typeof url === 'string') {
      router.navigate(url as '/');
    }
  }, [lastNotification, ready, onboarded]);

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: palette.accent,
        background: palette.background,
        card: palette.background,
        text: palette.text,
        border: palette.border,
      },
    };
  }, [scheme, palette]);

  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: "minimal",
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.accent,
          headerTitleStyle: { color: palette.text },
        }}
      >
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
          <Stack.Screen
            name="sign-in"
            options={{ title: "Admin sign in", presentation: "modal" }}
          />
        </Stack.Protected>
        <Stack.Screen
          name="welcome"
          options={{ headerShown: false, gestureEnabled: onboarded }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
