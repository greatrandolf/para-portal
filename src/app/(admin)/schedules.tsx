import { Stack } from 'expo-router';

import { ComingSoonScreen } from '@/screens/shared/ComingSoon';

export default function SchedulesRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Terminal Schedules · Para Portal' }} />
      <ComingSoonScreen
        icon="departure-board"
        title="Terminal Schedules"
        description="Departure boards and dispatch windows for IT Park and Carbon Market terminals."
      />
    </>
  );
}
