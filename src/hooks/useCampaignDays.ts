import { collection, documentId, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { firestore } from '@/services/firebase';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" in Manila (the backend's day ids). */
const manilaDay = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(ms),
  );

export type CampaignDay = { day: string; views: number; spentMicro: number };

/**
 * A Para Ad's views and money spent per Manila day (para-ads), latest first, live while shown. Admins only (rules).
 *
 * @param campaignId the ad, or undefined to read nothing
 * @param days how many days (default 14)
 */
export function useCampaignDays(campaignId: string | undefined, days = 14) {
  const [state, setState] = useState<{ id?: string; rows: CampaignDay[]; error?: string }>({ rows: [] });
  useEffect(() => {
    if (!campaignId) return;
    return onSnapshot(
      // Firestore can't scan document ids in descending order (limitToLast does that too): read the last `days` Manila
      // days in ascending order, from their first day id, then show the latest first.
      query(
        collection(firestore, 'adCampaigns', campaignId, 'days'),
        where(documentId(), '>=', manilaDay(Date.now() - (days - 1) * DAY_MS)),
        orderBy(documentId()),
      ),
      (snap) =>
        setState({
          id: campaignId,
          rows: snap.docs
            .map((d) => ({
              day: d.id,
              views: Number(d.get('views') ?? 0),
              spentMicro: Number(d.get('spentMicro') ?? 0),
            }))
            .reverse(),
        }),
      (error) => setState({ id: campaignId, rows: [], error: error.message }),
    );
  }, [campaignId, days]);
  const ready = state.id === campaignId;
  return { rows: ready ? state.rows : [], loading: !!campaignId && !ready, error: ready ? state.error : undefined };
}
