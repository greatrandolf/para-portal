import { Stack } from 'expo-router';

import { AcceptInviteScreen } from '@/screens/shared/AcceptInvite';

export default function AcceptInviteRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Join your team · Para Portal' }} />
      <AcceptInviteScreen />
    </>
  );
}
