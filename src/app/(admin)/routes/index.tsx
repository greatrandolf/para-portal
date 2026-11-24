import { Stack } from 'expo-router';

import { RoutesListScreen } from '@/screens/admin/RoutesList';

export default function RoutesIndexRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Routes · Para Portal' }} />
      <RoutesListScreen />
    </>
  );
}
