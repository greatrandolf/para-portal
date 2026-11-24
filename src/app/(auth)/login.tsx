import { Stack } from 'expo-router';

import { LoginScreen } from '@/screens/shared/Login';

export default function LoginRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Sign in · Para Portal' }} />
      <LoginScreen />
    </>
  );
}
