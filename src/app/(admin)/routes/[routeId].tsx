import { Stack } from 'expo-router';

import { RouteEditorScreen } from '@/screens/admin/RouteEditor';

export default function RouteEditorRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Route & Waypoint Editor · Para Portal' }} />
      <RouteEditorScreen />
    </>
  );
}
