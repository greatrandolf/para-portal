/** Query keys for the team. Team mutations invalidate `teamKeys.all`. */
export const teamKeys = {
  all: ['team'] as const,
  list: () => [...teamKeys.all, 'list'] as const,
  invite: (token: string) => ['invite', token] as const,
};
