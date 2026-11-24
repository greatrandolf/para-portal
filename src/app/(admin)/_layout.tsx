import { Slot } from 'expo-router';

import { PortalShell } from '@/navigations/PortalShell';

export default function AdminLayout() {
  return (
    <PortalShell>
      <Slot />
    </PortalShell>
  );
}
