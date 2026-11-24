import { Stack } from 'expo-router';

import { FleetAssetsScreen } from '@/screens/admin/FleetAssets';

export default function AssetsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Fleet & Asset Management · Para Portal' }} />
      <FleetAssetsScreen />
    </>
  );
}
