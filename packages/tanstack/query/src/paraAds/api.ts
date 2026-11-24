import type { FunctionsClient } from '../client';
import type { CampaignInput, CampaignStatus, SetStatusInput, TopUpInput } from './types';

/** Typed wrappers around the para-backend Para Ads callables (admins, `ads:manage`). */
export const paraAdsApi = (client: FunctionsClient) => ({
  /** An id for a new campaign, so its photo can be uploaded to paraAds/{id}/ first. */
  newId: async () => (await client.call<{ id: string }>('paraAdsNewId', {})).id,
  /** Creates (as a draft) or updates a campaign. */
  save: (input: CampaignInput) => client.call<{ id: string; status: CampaignStatus }>('paraAdsSave', input),
  setStatus: (input: SetStatusInput) => client.call<{ id: string; status: CampaignStatus }>('paraAdsSetStatus', input),
  /** Adds to the purchase amount (the business paid more). */
  topUp: (input: TopUpInput) =>
    client.call<{ id: string; status: CampaignStatus; remainingMicro: number; viewsLeft: number }>(
      'paraAdsTopUp',
      input,
    ),
});
