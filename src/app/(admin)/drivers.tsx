import { Stack } from 'expo-router';

import { DriverRegistrationScreen } from '@/screens/admin/DriverRegistration';

export default function DriversRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Driver Registration · Para Portal' }} />
      <DriverRegistrationScreen />
    </>
  );
}
