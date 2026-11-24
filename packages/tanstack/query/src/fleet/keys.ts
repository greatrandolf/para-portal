/** Query keys for fleet records. Every fleet mutation invalidates `fleetKeys.all`. */
export const fleetKeys = {
  all: ['fleet'] as const,
  lists: () => [...fleetKeys.all, 'list'] as const,
  /** `ownerUid` null = every fleet account (admins) or the caller's own fleet (fleet users). */
  list: (ownerUid: string | null) => [...fleetKeys.lists(), ownerUid ?? 'all'] as const,
};
