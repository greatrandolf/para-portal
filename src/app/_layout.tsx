import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { FUNCTIONS_URL } from '@/constants/api';
import { colors, fontAssets } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { getIdToken } from '@/services/firebase';
import { QueryProvider } from '@packages/tanstack/query/QueryProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

const navigationTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    background: colors.surface,
    card: colors.surfaceContainerLowest,
    text: colors.onSurface,
    border: colors.surfaceBorder,
    primary: colors.brand,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <QueryProvider functionsUrl={FUNCTIONS_URL} getAuthToken={getIdToken}>
      <AuthProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="dark" />
          <RootNavigator />
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

/**
 * Team members with a role see the portal; everyone else (signed out, or signed in without a role) sees sign-in.
 * The invite page is open to everyone: invitees have no account yet.
 */
function RootNavigator() {
  const auth = useAuth();
  if (auth.status === 'loading') return null;
  const member = auth.status === 'signedIn' && auth.role !== null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Protected guard={member}>
        <Stack.Screen name="(admin)" />
      </Stack.Protected>
      <Stack.Protected guard={!member}>
        <Stack.Screen name="(auth)/login" />
      </Stack.Protected>
      <Stack.Screen name="(auth)/accept-invite" />
    </Stack>
  );
}
