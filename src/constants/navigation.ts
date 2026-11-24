import type { Permission } from '@/constants/roles';
import type { IconName } from '@packages/ui/Icon';

export type NavItem = {
  key: 'fleet' | 'assets' | 'routes' | 'drivers' | 'payouts' | 'paraAds' | 'schedules' | 'team';
  href: '/fleet' | '/fleet-assets' | '/routes' | '/drivers' | '/payouts' | '/para-ads' | '/schedules' | '/team';
  label: string;
  icon: IconName;
  badge?: number;
  /** Shown only to roles with this permission (see constants/roles.ts). */
  permission: Permission;
};

/** Sidebar sections, in Stitch order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'fleet', href: '/fleet', label: 'Fleet Telemetry & Dispatches', icon: 'radar', permission: 'fleet:read' },
  {
    key: 'assets',
    href: '/fleet-assets',
    label: 'Fleet & Asset Management',
    icon: 'directions-bus',
    permission: 'fleet:read',
  },
  { key: 'routes', href: '/routes', label: 'Route & Waypoint Editor', icon: 'alt-route', permission: 'routes:write' },
  {
    key: 'drivers',
    href: '/drivers',
    label: 'Driver Registration',
    icon: 'badge',
    badge: 7,
    permission: 'fleet:write',
  },
  {
    key: 'payouts',
    href: '/payouts',
    label: 'Driver Payouts',
    icon: 'account-balance-wallet',
    permission: 'payouts:read',
  },
  { key: 'paraAds', href: '/para-ads', label: 'Para Ads', icon: 'campaign', permission: 'ads:manage' },
  {
    key: 'schedules',
    href: '/schedules',
    label: 'Terminal Schedules',
    icon: 'departure-board',
    permission: 'routes:write',
  },
  { key: 'team', href: '/team', label: 'Team & Access', icon: 'manage-accounts', permission: 'users:manage' },
];
