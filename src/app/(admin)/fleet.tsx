import { Stack } from 'expo-router';

import { ComingSoonScreen } from '@/screens/shared/ComingSoon';

export default function FleetRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Fleet Telemetry & Dispatches · Para Portal' }} />
      <ComingSoonScreen
        icon="radar"
        title="Fleet Telemetry & Dispatches"
        description="Live unit positions, dispatch queue, and headway alerts for every franchised corridor."
      />
    </>
  );
}
