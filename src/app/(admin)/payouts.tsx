import { Stack } from 'expo-router';

import { PayoutsScreen } from '@/screens/admin/Payouts';

export default function PayoutsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Driver Payouts · Para Portal' }} />
      <PayoutsScreen />
    </>
  );
}
