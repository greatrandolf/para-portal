import type { BadgeTone } from '@packages/ui/Badge';
import type { Campaign, CampaignStatus } from '@packages/tanstack/query/paraAds';

/** Display and form helpers for Para Ads (para-ads). Money from the backend is in micro-pesos. */

export const MICRO_PER_CENTAVO = 10_000;

/** Quick picks for the price per view (₱0.30, ₱0.50, ₱0.80); any amount from ₱0.10 to ₱5.00 works. */
export const PRICE_PICKS = [30, 50, 80] as const;

export const pesoText = (micro: number) =>
  `₱${(micro / 1_000_000).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const remainingMicro = (c: Pick<Campaign, 'budgetMicro' | 'spentMicro'>) =>
  Math.max(0, c.budgetMicro - c.spentMicro);

export const viewsLeft = (c: Pick<Campaign, 'budgetMicro' | 'spentMicro' | 'pricePerViewMicro'>) =>
  c.pricePerViewMicro > 0 ? Math.floor(remainingMicro(c) / c.pricePerViewMicro) : 0;

/** Share of the purchase amount spent, 0..1. */
export const spentShare = (c: Pick<Campaign, 'budgetMicro' | 'spentMicro'>) =>
  c.budgetMicro > 0 ? Math.min(1, c.spentMicro / c.budgetMicro) : 0;

/**
 * The status to show: an ad past its end date reads "Finished" (the backend no longer shows it) even if it was never
 * ended by hand.
 */
export type ShownStatus = CampaignStatus | 'finished';
export const shownStatus = (c: Pick<Campaign, 'status' | 'endAt'>, now: number): ShownStatus =>
  c.status !== 'ended' && c.endAt <= now ? 'finished' : c.status;

export const STATUS_LABEL: Record<ShownStatus, string> = {
  finished: 'Finished',
  draft: 'Draft',
  active: 'Running',
  paused: 'Paused',
  exhausted: 'Used up',
  ended: 'Ended',
};

export const STATUS_TONE: Record<ShownStatus, BadgeTone> = {
  finished: 'neutral',
  draft: 'neutral',
  active: 'success',
  paused: 'info',
  exhausted: 'warning',
  ended: 'neutral',
};

/** "1,234" */
export const countText = (n: number) => n.toLocaleString('en-PH');

/**
 * Pesos typed in the form ("500", "0.80", "₱1,000.50") as whole centavos, or undefined when it isn't an amount.
 */
export function parsePesos(text: string): number | undefined {
  const clean = text.replace(/[₱,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return undefined;
  return Math.round(Number(clean) * 100);
}

/** Views a purchase pays for at a price (both centavos). */
export const viewsFor = (budgetCentavos?: number, priceCentavos?: number) =>
  budgetCentavos && priceCentavos ? Math.floor(budgetCentavos / priceCentavos) : 0;

const MANILA_MS = 8 * 60 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

/** "2027-01-15" (Manila) → 00:00 that day in Manila, epoch ms; undefined when not a real date. */
export function manilaDayStart(text: string): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!m) return undefined;
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (new Date(utc).getUTCDate() !== Number(m[3])) return undefined;
  return utc - MANILA_MS;
}

/** Epoch ms → "2027-01-15" in Manila. */
export const manilaDate = (ms: number) => new Date(ms + MANILA_MS).toISOString().slice(0, 10);

/** The last day an end time covers (the end is the next midnight). */
export const lastDay = (endAt: number) => manilaDate(endAt - 1);

/** End of a Manila day (the next midnight), for the schedule's end. */
export const manilaDayEnd = (text: string) => {
  const start = manilaDayStart(text);
  return start === undefined ? undefined : start + DAY_MS;
};

const DATE = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** Minutes after midnight → "06:30". */
export const timeText = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** "Jan 15, 2027 – Feb 15, 2027 • 06:00–20:00" */
export function scheduleText(c: Pick<Campaign, 'startAt' | 'endAt' | 'dailyFrom' | 'dailyTo'>): string {
  const from = DATE.format(new Date(c.startAt + MANILA_MS));
  const to = DATE.format(new Date(c.endAt - 1 + MANILA_MS));
  const hours =
    c.dailyFrom !== null && c.dailyTo !== null ? ` • ${timeText(c.dailyFrom)}–${timeText(c.dailyTo)}` : ' • all day';
  return `${from} – ${to}${hours}`;
}

/** What the admin can do next, by status. */
export function nextActions(status: ShownStatus): ('activate' | 'pause' | 'topUp' | 'edit' | 'end')[] {
  switch (status) {
    case 'finished':
      // Change the end date (Edit) to run it again, or end it for good.
      return ['edit', 'end'];
    case 'draft':
      return ['activate', 'edit', 'end'];
    case 'active':
      return ['pause', 'topUp', 'edit', 'end'];
    case 'paused':
      return ['activate', 'topUp', 'edit', 'end'];
    case 'exhausted':
      return ['topUp', 'edit', 'end'];
    case 'ended':
      return [];
  }
}
