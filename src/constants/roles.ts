/**
 * Roles and permissions, mirrored from para-backend/functions/src/lib/auth.ts (the server is the real gate;
 * the portal only uses this to show what a role can use). Keep the two in sync.
 */
export const ROLES = ['super_admin', 'admin', 'fleet'] as const;
export type Role = (typeof ROLES)[number];

/** `fleet:all`: every fleet account's records; without it a user sees only their own fleet. */
export type Permission =
  | 'users:manage'
  | 'routes:write'
  | 'fleet:read'
  | 'fleet:write'
  | 'fleet:all'
  | 'payouts:read'
  /** Mark driver payouts as paid (a fleet: its own drivers). */
  | 'payouts:write'
  /** Close weeks and record Para's remittances to fleets (admins). */
  | 'payouts:remit'
  /** Create and run Para Ads for local businesses (para-ads). */
  | 'ads:manage';

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: [
    'users:manage',
    'routes:write',
    'fleet:read',
    'fleet:write',
    'fleet:all',
    'payouts:read',
    'payouts:write',
    'payouts:remit',
    'ads:manage',
  ],
  admin: [
    'routes:write',
    'fleet:read',
    'fleet:write',
    'fleet:all',
    'payouts:read',
    'payouts:write',
    'payouts:remit',
    'ads:manage',
  ],
  fleet: ['fleet:read', 'fleet:write', 'payouts:read', 'payouts:write'],
};

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  fleet: 'Fleet',
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  super_admin: 'Everything, including inviting people and changing roles.',
  admin: 'Routes, fleet, drivers, payouts, and Para Ads. Cannot manage the team.',
  fleet: 'Their own vehicles, driver accounts, assignments, and driver payouts only.',
};

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value);

export const roleCan = (role: Role | null | undefined, permission: Permission) =>
  !!role && ROLE_PERMISSIONS[role].includes(permission);
