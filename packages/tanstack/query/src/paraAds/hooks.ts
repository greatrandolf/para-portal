import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useFunctionsClient } from '../QueryProvider';
import { paraAdsApi } from './api';
import type { CampaignInput, SetStatusInput, TopUpInput } from './types';

export const useParaAdsApi = () => {
  const client = useFunctionsClient();
  return useMemo(() => paraAdsApi(client), [client]);
};

// The campaign list is read live from Firestore (useLiveCampaigns in the portal), so mutations need no invalidation.
export const useSaveCampaign = () => {
  const api = useParaAdsApi();
  return useMutation({ mutationFn: (input: CampaignInput) => api.save(input) });
};

export const useSetCampaignStatus = () => {
  const api = useParaAdsApi();
  return useMutation({ mutationFn: (input: SetStatusInput) => api.setStatus(input) });
};

export const useTopUpCampaign = () => {
  const api = useParaAdsApi();
  return useMutation({ mutationFn: (input: TopUpInput) => api.topUp(input) });
};
