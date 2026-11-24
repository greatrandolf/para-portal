import { Stack } from 'expo-router';

import { ParaAdsScreen } from '@/screens/admin/ParaAds';

export default function ParaAdsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Para Ads · Para Portal' }} />
      <ParaAdsScreen />
    </>
  );
}
