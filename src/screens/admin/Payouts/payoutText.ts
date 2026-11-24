import type { BadgeTone } from '@packages/ui/Badge';
import type { PayoutAccount, PayoutStatus, Settlement, SettlementLine } from '@packages/tanstack/query/payouts';

/** 3465 -> "₱34.65" */
export const centavosText = (centavos: number) =>
  `₱${(centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Micro-pesos with 2 decimals, or 4 when below a centavo matters ("₱0.0750"). */
export const microText = (micro: number) => {
  const digits = Math.round(micro) % 10_000 === 0 ? 2 : 4;
  return `₱${(micro / 1_000_000).toLocaleString('en-PH', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};

const DAY = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const YEAR = new Intl.DateTimeFormat('en-PH', { year: 'numeric', timeZone: 'UTC' });

/** "Nov 9 – Nov 15, 2026" for a Monday–Sunday week. */
export function weekText(start: string, end: string): string {
  const a = new Date(`${start}T00:00:00Z`);
  const b = new Date(`${end}T00:00:00Z`);
  return `${DAY.format(a)} – ${DAY.format(b)}, ${YEAR.format(b)}`;
}

/** "Nov 24, 2026, 10:00 AM" in Manila time. */
export const manilaTime = (ms: number) =>
  new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ms));

/** The Mondays of the last `count` weeks that have ended, latest first (Manila). */
export function pastMondays(now = Date.now(), count = 8): string[] {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date(now));
  const t = new Date(`${today}T00:00:00Z`);
  const thisMonday = t.getTime() - ((t.getUTCDay() + 6) % 7) * 86_400_000;
  return Array.from({ length: count }, (_, i) =>
    new Date(thisMonday - (i + 1) * 7 * 86_400_000).toISOString().slice(0, 10),
  );
}

export const LINE_STATUS_LABEL: Record<SettlementLine['status'], string> = {
  unpaid: 'To pay',
  paid: 'Paid',
  carried: 'Carried',
};

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * The week's driver lines as CSV, for GCash bulk transfer or the fleet's books. Amounts in pesos with 2 decimals.
 */
export function settlementCsv(s: Settlement): string {
  const rows: (string | number)[][] = [
    ['Driver', 'Driver No', 'GCash number', 'Views', 'Amount (PHP)', 'Status', 'Receipt', 'GCash reference'],
    ...s.lines.map((l) => [
      l.name,
      l.driverNo,
      l.gcash,
      l.views,
      (l.payCentavos / 100).toFixed(2),
      LINE_STATUS_LABEL[l.status],
      l.receiptNo ?? '',
      l.reference ?? '',
    ]),
  ];
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

type StatusText = { label: string; tone: BadgeTone; note: string };

/** How a week's payout status reads for Para's staff. */
export const ADMIN_STATUS: Record<PayoutStatus, StatusText> = {
  ready: { label: 'Waiting for the fleet', tone: 'neutral', note: "The fleet hasn't requested this payout yet." },
  requested: { label: 'To review', tone: 'brand', note: 'The fleet requested this payout. Approve or decline it.' },
  approved: { label: 'Approved • to send', tone: 'telemetry', note: 'Send the money, then record the reference.' },
  declined: { label: 'Declined', tone: 'warning', note: 'Waiting for the fleet to fix it and request again.' },
  sent: { label: 'Sent', tone: 'success', note: 'Waiting for the fleet to confirm it arrived.' },
  received: { label: 'Received by fleet', tone: 'success', note: 'The fleet confirmed the money arrived.' },
};

/** How a week's payout status reads for the fleet. */
export const FLEET_STATUS: Record<PayoutStatus, StatusText> = {
  ready: { label: 'Ready to request', tone: 'brand', note: 'Check the amounts, then request your payout from Para.' },
  requested: { label: 'Requested • pending', tone: 'neutral', note: 'Para is reviewing your request.' },
  approved: { label: 'Approved', tone: 'telemetry', note: 'Para approved it and will send the money.' },
  declined: { label: 'Declined', tone: 'warning', note: 'Fix the reason below, then request again.' },
  sent: {
    label: 'Sent by Para',
    tone: 'success',
    note: 'Para sent the money. Confirm when it arrives, and pay your drivers.',
  },
  received: { label: 'Received', tone: 'success', note: 'You confirmed the money arrived. Pay your drivers.' },
};

/** "GCash 0917 123 4567 • Mabolo Transport" or "BPI 0012… • name". */
export function accountText(a: PayoutAccount, full = true): string {
  const n = a.accountNumber;
  const number = full ? n : n.length >= 8 ? `${n.slice(0, 4)} ••• ${n.slice(-4)}` : '••••';
  return `${a.method === 'GCash' ? 'GCash' : a.bankName} ${number} • ${a.accountName}`;
}
