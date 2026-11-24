import type { FunctionsClient } from '../client';
import type {
  CloseWeekResult,
  CurrentWeek,
  DocumentKind,
  MarkPaidInput,
  MarkRemittedInput,
  RequestNowInput,
  RequestPayoutInput,
  ReviewPayoutInput,
  Settlement,
  SettlementList,
} from './types';

/** Typed wrappers around the para-backend payout callables (fleet-driver-payouts). */
export const payoutsApi = (client: FunctionsClient) => ({
  list: (ownerUid: string | null, signal?: AbortSignal) =>
    client.call<SettlementList>('settlementsList', ownerUid ? { ownerUid } : {}, signal),
  /** The fleet asks Para for a closed week's payout, to this account. */
  request: async (input: RequestPayoutInput) =>
    (await client.call<{ settlement: Settlement }>('payoutRequest', input)).settlement,
  /** The fleet cashes out everything since its last payout, up to now (no need to wait for Monday). */
  requestNow: async (input: RequestNowInput) =>
    (await client.call<{ settlement: Settlement }>('payoutRequestNow', input)).settlement,
  /** Para approves a requested payout, or declines it with a reason. */
  review: async (input: ReviewPayoutInput) =>
    (await client.call<{ settlement: Settlement }>('payoutReview', input)).settlement,
  /** The fleet confirms Para's money arrived. */
  confirmReceived: async (settlementId: string) =>
    (await client.call<{ settlement: Settlement }>('payoutConfirmReceived', { settlementId })).settlement,
  /** This week so far (not closed yet): running totals per fleet and driver. */
  current: (ownerUid: string | null, signal?: AbortSignal) =>
    client.call<CurrentWeek>('settlementsCurrent', ownerUid ? { ownerUid } : {}, signal),
  /** Fleet (own drivers) or admin: the fleet sent this driver their line by GCash. */
  markPaid: (input: MarkPaidInput) =>
    client.call<{ settlement: Settlement; payoutId: string; receiptNo: string }>('payoutMarkPaid', input),
  /** Admin: Para sent the week's money to the fleet. */
  markRemitted: async (input: MarkRemittedInput) =>
    (await client.call<{ settlement: Settlement }>('settlementMarkRemitted', input)).settlement,
  /** Admin: closes a past week (Monday "YYYY-MM-DD"). Safe to repeat. */
  closeWeek: (periodStart: string) => client.call<CloseWeekResult>('settlementsClose', { periodStart }),
  /** A 10-minute URL to a receipt or statement PDF. */
  documentUrl: async (kind: DocumentKind, id: string) => {
    const { token } = await client.call<{ token: string; expiresAt: number }>('documentLink', { kind, id });
    return `${client.baseUrl}/documentPdf?t=${encodeURIComponent(token)}`;
  },
});
