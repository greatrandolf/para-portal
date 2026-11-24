import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useFunctionsClient } from '../QueryProvider';
import { usersApi } from './api';
import { teamKeys } from './keys';
import type { AcceptInviteInput, CreateInviteInput, MemberStatus, TeamRole } from './types';

const useUsersApi = () => {
  const client = useFunctionsClient();
  return useMemo(() => usersApi(client), [client]);
};

/** Team members and open invites (super admin). */
export function useTeam() {
  const api = useUsersApi();
  return useQuery({ queryKey: teamKeys.list(), queryFn: ({ signal }) => api.list(signal) });
}

function useTeamMutation<TInput, TResult>(fn: (api: ReturnType<typeof usersApi>, input: TInput) => Promise<TResult>) {
  const api = useUsersApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => fn(api, input),
    onSettled: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
  });
}

export const useInviteMember = () => useTeamMutation((api, input: CreateInviteInput) => api.invite(input));
export const useResendInvite = () => useTeamMutation((api, inviteId: string) => api.resend(inviteId));
export const useRevokeInvite = () => useTeamMutation((api, inviteId: string) => api.revoke(inviteId));
export const useSetMemberRole = () =>
  useTeamMutation((api, input: { uid: string; role: TeamRole }) => api.setRole(input));
export const useSetMemberStatus = () =>
  useTeamMutation((api, input: { uid: string; status: MemberStatus }) => api.setStatus(input));

/** What an invite link is for. Idle without a token; an invalid or expired link is not retried. */
export function useInviteLookup(token: string | undefined) {
  const api = useUsersApi();
  return useQuery({
    queryKey: teamKeys.invite(token ?? ''),
    queryFn: ({ signal }) => api.lookup(token as string, signal),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  });
}

export function useAcceptInvite() {
  const api = useUsersApi();
  return useMutation({ mutationFn: (input: AcceptInviteInput) => api.accept(input) });
}
