import type { FunctionsClient } from '../client';
import type {
  AcceptInviteInput,
  CreateInviteInput,
  Invite,
  InviteInfo,
  InviteResult,
  Member,
  MemberStatus,
  Team,
  TeamRole,
} from './types';

/** Typed wrappers around the para-backend team and invite callables. */
export const usersApi = (client: FunctionsClient) => ({
  list: (signal?: AbortSignal) => client.call<Team>('usersList', {}, signal),
  invite: (input: CreateInviteInput) => client.call<InviteResult>('invitesCreate', input),
  resend: (inviteId: string) => client.call<InviteResult>('invitesResend', { inviteId }),
  revoke: async (inviteId: string) => (await client.call<{ invite: Invite }>('invitesRevoke', { inviteId })).invite,
  setRole: async (input: { uid: string; role: TeamRole }) =>
    (await client.call<{ member: Member }>('usersSetRole', input)).member,
  setStatus: async (input: { uid: string; status: MemberStatus }) =>
    (await client.call<{ member: Member }>('usersSetStatus', input)).member,

  /** Public: needs only the token from the emailed link. */
  lookup: (token: string, signal?: AbortSignal) => client.call<InviteInfo>('invitesLookup', { token }, signal),
  /** Public: creates the account. */
  accept: (input: AcceptInviteInput) => client.call<{ email: string; role: TeamRole }>('invitesAccept', input),
});
