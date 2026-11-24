/** Mirrors para-backend/functions/src/payouts/model.ts (fleet-driver-payouts). Money is in centavos or micro-pesos. */

export type LineStatus = 'unpaid' | 'paid' | 'carried';

export type DriverResponse = { response: 'received' | 'problem'; note: string; at: number };

export type SettlementLine = {
  driverId: string;
  driverNo: string;
  name: string;
  /** Full GCash number (the fleet sends the money to it). */
  gcash: string;
  views: number;
  unitEarnedMicro: number;
  driverMicro: number;
  carryInMicro: number;
  payCentavos: number;
  carryOutMicro: number;
  status: LineStatus;
  payoutId?: string;
  receiptNo?: string;
  reference?: string;
  paidAt?: number;
  driverResponse?: DriverResponse;
};

export type Remittance = { method: string; reference: string; sentAt: number; by: string };

/**
 * A closed week's payout from Para to the fleet:
 * ready → requested → approved → sent → received, or requested → declined → (request again).
 * The fleet pays its drivers once Para has sent the money.
 */
export type PayoutStatus = 'ready' | 'requested' | 'approved' | 'declined' | 'sent' | 'received';

export type PayoutMethod = 'GCash' | 'Bank transfer';

/** Where Para sends the fleet's money. */
export type PayoutAccount = { method: PayoutMethod; accountName: string; accountNumber: string; bankName: string };

export type PayoutRequest = PayoutAccount & { note: string; at: number; by: string };
export type PayoutReview = { decision: 'approved' | 'declined'; reason: string; at: number; by: string };
export type PayoutEvent = {
  action: 'request' | 'approve' | 'decline' | 'send' | 'receive';
  at: number;
  by: string;
  note?: string;
};

/** One fleet's week: what Para remits and what each driver is owed. */
export type Settlement = {
  id: string;
  number: string;
  ownerUid: string;
  fleetName: string;
  /** Monday and Sunday, "YYYY-MM-DD" (Manila). */
  periodStart: string;
  periodEnd: string;
  views: number;
  grossMicro: number;
  paraFeeMicro: number;
  fleetMicro: number;
  driversMicro: number;
  fleetPayCentavos: number;
  driversPayCentavos: number;
  remitCentavos: number;
  lines: SettlementLine[];
  createdAt: number;
  remittance: Remittance | null;
  unpaidCount: number;
  payoutStatus: PayoutStatus;
  /** Requested mid-week by the fleet ("Request payout now"), not a Monday close. */
  partial?: boolean;
  /** Views after `fromMs` and up to `toMs` (ms); missing on older weeks. */
  fromMs?: number;
  toMs?: number;
  request: PayoutRequest | null;
  review: PayoutReview | null;
  receivedAt: number | null;
  history: PayoutEvent[];
};

/** `settlementsList`: the weeks, and (for a fleet) its last payout account to prefill a request. */
export type SettlementList = { settlements: Settlement[]; account: PayoutAccount | null };

export type RequestNowInput = { account: PayoutAccount; note?: string };

export type RequestPayoutInput = { settlementId: string; account: PayoutAccount; note?: string };
export type ReviewPayoutInput = { settlementId: string; decision: 'approve' | 'decline'; reason?: string };

/** A fleet's week so far, before it closes: what a settlement would hold if the week closed now (not stored). */
/**
 * A fleet's earnings since its last payout (or last weekly close), up to now: what it receives if it requests a payout
 * now. Not stored.
 */
export type OpenWeek = { sinceMs: number } & Omit<
  Settlement,
  | 'id'
  | 'number'
  | 'createdAt'
  | 'remittance'
  | 'unpaidCount'
  | 'payoutStatus'
  | 'request'
  | 'review'
  | 'receivedAt'
  | 'history'
>;

/** `settlementsCurrent`: this week (Monday to now, Manila) for every fleet with ₱1 views, or the caller's fleet. */
export type CurrentWeek = {
  periodStart: string;
  periodEnd: string;
  /** The last day counted (today, Manila). */
  throughDay: string;
  /** When the backend added it up (ms). */
  asOf: number;
  fleets: OpenWeek[];
};

export type MarkPaidInput = { settlementId: string; driverId: string; reference: string };
export type MarkRemittedInput = { settlementId: string; method: string; reference: string };
export type CloseWeekResult = { periodStart: string; created: string[]; skipped: string[] };
export type DocumentKind = 'receipt' | 'statement';
