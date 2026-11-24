import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { firestore } from '@/services/firebase';
import type { Campaign } from '@packages/tanstack/query/paraAds';

export type LiveCampaigns = { campaigns: Campaign[]; loading: boolean; error?: string };

/**
 * Para Ads campaigns, live (para-ads): spent, views and remaining update within seconds of each counted view.
 * The security rules let only admins (`ads:manage`) read `adCampaigns`; changes go through the callables.
 */
export function useLiveCampaigns(): LiveCampaigns {
  const auth = useAuth();
  const allowed = auth.status === 'signedIn' && auth.can('ads:manage');
  const [state, setState] = useState<LiveCampaigns>({ campaigns: [], loading: true });

  useEffect(() => {
    if (!allowed) return;
    return onSnapshot(
      query(collection(firestore, 'adCampaigns'), orderBy('createdAt', 'desc')),
      (snap) =>
        setState({
          campaigns: snap.docs.map((d) => ({ ...(d.data() as Omit<Campaign, 'id'>), id: d.id })),
          loading: false,
        }),
      (error) => setState({ campaigns: [], loading: false, error: error.message }),
    );
  }, [allowed]);

  return allowed ? state : { campaigns: [], loading: false };
}
