import { Redirect } from 'expo-router';

import { NAV_ITEMS } from '@/constants/navigation';
import { useAuth } from '@/hooks/useAuth';

/** Working sections first (Fleet Telemetry is still a placeholder). */
const HOME_ORDER = ['routes', 'assets', 'team'] as const;

/** Home: the first working section this role may use (admins land on routes, fleet users on Fleet & Assets). */
export default function AdminIndex() {
  const auth = useAuth();
  const allowed = NAV_ITEMS.filter((item) => auth.can(item.permission));
  const home = HOME_ORDER.map((key) => allowed.find((item) => item.key === key)).find(Boolean) ?? allowed[0];
  return <Redirect href={home?.href ?? '/routes'} />;
}
