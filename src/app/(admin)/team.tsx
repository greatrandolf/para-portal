import { Stack } from 'expo-router';

import { TeamScreen } from '@/screens/admin/Team';

export default function TeamRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Team & Access · Para Portal' }} />
      <TeamScreen />
    </>
  );
}
