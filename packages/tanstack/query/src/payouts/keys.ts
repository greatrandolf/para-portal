/** Query keys for payouts. Payout mutations invalidate `payoutKeys.all`. */
export const payoutKeys = {
  all: ['payouts'] as const,
  /** `ownerUid` null = every fleet (admins) or the caller's own fleet (fleet users). */
  list: (ownerUid: string | null) => [...payoutKeys.all, 'list', ownerUid ?? 'all'] as const,
  current: (ownerUid: string | null) => [...payoutKeys.all, 'current', ownerUid ?? 'all'] as const,
};
