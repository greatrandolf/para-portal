/** Para Ads (para-ads): ads local businesses buy from Para, shown to commuters instead of Google ads. */

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'exhausted' | 'ended';

/** adCampaigns/{id}, as the portal reads it live. Money in micro-pesos (₱1 = 1,000,000). */
export type Campaign = {
  id: string;
  businessName: string;
  headline: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  imagePath: string;
  imageUrl: string;
  startAt: number;
  endAt: number;
  /** Daily window in Manila time, minutes after midnight (null = all day). */
  dailyFrom: number | null;
  dailyTo: number | null;
  /** Empty = every route. */
  routeIds: string[];
  budgetMicro: number;
  pricePerViewMicro: number;
  spentMicro: number;
  views: number;
  status: CampaignStatus;
  lastViewAt?: number;
  createdAt?: number;
};

/** The form the portal sends (money in centavos, daily hours as "HH:MM"). */
export type CampaignInput = {
  id: string;
  businessName: string;
  headline: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imagePath: string;
  imageUrl: string;
  startAt: number;
  endAt: number;
  dailyFrom?: string;
  dailyTo?: string;
  routeIds: string[];
  budgetCentavos: number;
  priceCentavos: number;
};

export type SetStatusInput = { id: string; status: 'active' | 'paused' | 'ended' };
export type TopUpInput = { id: string; addCentavos: number };
