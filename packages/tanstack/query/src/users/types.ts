/** Team and invite shapes returned by the para-backend user callables (see para-backend/docs/api.md). */

export type TeamRole = 'super_admin' | 'admin' | 'fleet';
export type MemberStatus = 'active' | 'disabled';
export type InviteStatus = 'pending' | 'accepted' | 'revoked';

export type Member = {
  uid: string;
  email: string;
  name: string;
  phone: string | null;
  role: TeamRole;
  status: MemberStatus;
  createdAt: string | null;
  lastSignInAt: string | null;
};

export type Invite = {
  id: string;
  email: string;
  name: string | null;
  role: TeamRole;
  status: InviteStatus;
  /** A pending invite past its expiry. */
  expired: boolean;
  expiresAt: string;
  invitedByEmail: string | null;
  createdAt: string | null;
};

export type Team = { members: Member[]; invites: Invite[] };

/** What an invite link is for (public lookup). */
export type InviteInfo = { email: string; name: string | null; role: TeamRole; roleLabel: string; expiresAt: string };

export type CreateInviteInput = { email: string; role: TeamRole; name?: string };
/** The emailed link is also returned, so it can be shared by hand when email is not set up. */
export type InviteResult = { invite: Invite; inviteUrl: string };

export type AcceptInviteInput = { token: string; name: string; phone: string; password: string };
