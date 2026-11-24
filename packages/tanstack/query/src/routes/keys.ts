/** Query keys for routes. Invalidate `routeKeys.all` to refetch everything route-related. */
export const routeKeys = {
  all: ['routes'] as const,
  lists: () => [...routeKeys.all, 'list'] as const,
  list: (options: { includeDeleted?: boolean } = {}) => [...routeKeys.lists(), options] as const,
  details: () => [...routeKeys.all, 'detail'] as const,
  detail: (routeId: string) => [...routeKeys.details(), routeId] as const,
  /** Shared key of every route/waypoint mutation, for `isMutating`. */
  mutation: () => [...routeKeys.all, 'mutation'] as const,
};
