import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useFunctionsClient } from '../QueryProvider';
import { payoutsApi } from './api';
import { payoutKeys } from './keys';
import type {
  DocumentKind,
  MarkPaidInput,
  MarkRemittedInput,
  RequestPayoutInput,
  ReviewPayoutInput,
  RequestNowInput,
} from './types';

export const usePayoutsApi = () => {
  const client = useFunctionsClient();
  return useMemo(() => payoutsApi(client), [client]);
};

/** Weekly settlements, latest first: a fleet's own, or every fleet's for admins. */
export function useSettlements(ownerUid: string | null = null, enabled = true) {
  const api = usePayoutsApi();
  return useQuery({
    queryKey: payoutKeys.list(ownerUid),
    queryFn: ({ signal }) => api.list(ownerUid, signal),
    enabled,
  });
}

/** This week so far (not closed yet), refreshed every minute while the page is open. */
export function useCurrentWeek(ownerUid: string | null = null, enabled = true) {
  const api = usePayoutsApi();
  return useQuery({
    queryKey: payoutKeys.current(ownerUid),
    queryFn: ({ signal }) => api.current(ownerUid, signal),
    enabled,
    refetchInterval: 60_000,
  });
}

function usePayoutMutation<TInput, TResult>(
  fn: (api: ReturnType<typeof payoutsApi>, input: TInput) => Promise<TResult>,
) {
  const api = usePayoutsApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => fn(api, input),
    onSettled: () => qc.invalidateQueries({ queryKey: payoutKeys.all }),
  });
}

export const useRequestPayout = () => usePayoutMutation((api, input: RequestPayoutInput) => api.request(input));
export const useRequestPayoutNow = () => usePayoutMutation((api, input: RequestNowInput) => api.requestNow(input));
export const useReviewPayout = () => usePayoutMutation((api, input: ReviewPayoutInput) => api.review(input));
export const useConfirmReceived = () =>
  usePayoutMutation((api, settlementId: string) => api.confirmReceived(settlementId));
export const useMarkPaid = () => usePayoutMutation((api, input: MarkPaidInput) => api.markPaid(input));
export const useMarkRemitted = () => usePayoutMutation((api, input: MarkRemittedInput) => api.markRemitted(input));
export const useCloseWeek = () => usePayoutMutation((api, periodStart: string) => api.closeWeek(periodStart));

/** Gets a short-lived PDF URL (the screen opens it). */
export function useDocumentUrl() {
  const api = usePayoutsApi();
  return useMutation({
    mutationFn: (input: { kind: DocumentKind; id: string }) => api.documentUrl(input.kind, input.id),
  });
}
