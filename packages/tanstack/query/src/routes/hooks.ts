import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useFunctionsClient } from '../QueryProvider';
import { routesApi } from './api';
import { routeKeys } from './keys';
import type {
  CreateRouteInput,
  CreateWaypointInput,
  DeleteWaypointInput,
  DirectionKey,
  TransitRoute,
  UpdateRouteInput,
  UpdateWaypointInput,
  Waypoint,
} from './types';

const useRoutesApi = () => {
  const client = useFunctionsClient();
  return useMemo(() => routesApi(client), [client]);
};

/* ---------- queries ---------- */

/** Active routes (summary fields only). */
export function useRoutes(options: { includeDeleted?: boolean } = {}) {
  const api = useRoutesApi();
  return useQuery({
    queryKey: routeKeys.list(options),
    queryFn: ({ signal }) => api.list(options, signal),
  });
}

/** One route with both directions' stops. Idle until `routeId` is known. */
export function useRoute(routeId: string | undefined) {
  const api = useRoutesApi();
  return useQuery({
    queryKey: routeKeys.detail(routeId ?? ''),
    queryFn: ({ signal }) => api.get(routeId as string, signal),
    enabled: Boolean(routeId),
  });
}

/* ---------- cache helpers ---------- */

type Snapshot = { previous?: TransitRoute };

const othersInFlight = (qc: QueryClient) => qc.isMutating({ mutationKey: routeKeys.mutation() }) > 1;

/** Applies an optimistic change to a cached route and returns the value to roll back to. */
async function optimistic(
  qc: QueryClient,
  routeId: string,
  change: (route: TransitRoute) => TransitRoute,
): Promise<Snapshot> {
  const key = routeKeys.detail(routeId);
  await qc.cancelQueries({ queryKey: key });
  const previous = qc.getQueryData<TransitRoute>(key);
  if (previous) qc.setQueryData(key, change(previous));
  return { previous };
}

/**
 * Stores the server's copy, unless a later edit is still in flight (it will store its own).
 * Lists are marked stale so their stop counts and labels refresh.
 */
function settle(qc: QueryClient, route: TransitRoute) {
  if (!othersInFlight(qc)) qc.setQueryData(routeKeys.detail(route.id), route);
  void qc.invalidateQueries({ queryKey: routeKeys.lists() });
}

function rollback(qc: QueryClient, routeId: string, snapshot: Snapshot | undefined) {
  const key = routeKeys.detail(routeId);
  if (snapshot?.previous && !othersInFlight(qc)) qc.setQueryData(key, snapshot.previous);
  void qc.invalidateQueries({ queryKey: key });
}

const withStops = (
  route: TransitRoute,
  key: DirectionKey,
  update: (stops: Waypoint[]) => Waypoint[],
): TransitRoute => ({
  ...route,
  directions: {
    ...route.directions,
    [key]: { ...route.directions[key], waypoints: update(route.directions[key].waypoints) },
  },
});

const directionOf = (route: TransitRoute, waypointId: string): DirectionKey | undefined =>
  (['outbound', 'inbound'] as const).find((key) => route.directions[key].waypoints.some((wp) => wp.id === waypointId));

/** Same rule as the backend: new stops stay between the two terminals. */
const insertIndex = (count: number, wanted: number | undefined) =>
  count < 2 ? count : Math.min(Math.max(wanted ?? count - 1, 1), count - 1);

/* ---------- route mutations ---------- */

export function useCreateRoute() {
  const api = useRoutesApi();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: routeKeys.mutation(),
    mutationFn: (input: CreateRouteInput) => api.create(input),
    onSuccess: (route) => {
      qc.setQueryData(routeKeys.detail(route.id), route);
      void qc.invalidateQueries({ queryKey: routeKeys.lists() });
    },
  });
}

export function useUpdateRoute() {
  const api = useRoutesApi();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: routeKeys.mutation(),
    mutationFn: (input: UpdateRouteInput) => api.update(input),
    onSuccess: (route) => {
      settle(qc, route);
      void qc.invalidateQueries({ queryKey: routeKeys.lists() });
    },
  });
}

/** Soft delete: the route disappears from lists; the backend keeps it. */
export function useDeleteRoute() {
  const api = useRoutesApi();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: routeKeys.mutation(),
    mutationFn: (routeId: string) => api.remove(routeId),
    onSuccess: ({ routeId }) => {
      qc.removeQueries({ queryKey: routeKeys.detail(routeId) });
      void qc.invalidateQueries({ queryKey: routeKeys.lists() });
    },
  });
}

/** Rebuilds the return trip from the outbound stops. */
export function useReverseRoute() {
  const api = useRoutesApi();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: routeKeys.mutation(),
    mutationFn: (routeId: string) => api.reverse(routeId),
    onSuccess: (route) => settle(qc, route),
  });
}

/* ---------- waypoint mutations (optimistic) ---------- */

export function useCreateWaypoint() {
  const api = useRoutesApi();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: routeKeys.mutation(),
    mutationFn: (input: CreateWaypointInput) => api.createWaypoint(input),
    onMutate: (input) =>
      optimistic(qc, input.routeId, (route) =>
        withStops(route, input.direction, (stops) => {
          const next = [...stops];
          next.splice(insertIndex(stops.length, input.index), 0, {
            ...input.waypoint,
            id: input.tempId ?? `pending-${Date.now()}`,
          });
          return next;
        }),
      ),
    onSuccess: ({ route }) => settle(qc, route),
    onError: (_error, input, snapshot) => rollback(qc, input.routeId, snapshot),
  });
}

export function useUpdateWaypoint() {
  const api = useRoutesApi();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: routeKeys.mutation(),
    mutationFn: (input: UpdateWaypointInput) => api.updateWaypoint(input),
    onMutate: (input) =>
      optimistic(qc, input.routeId, (route) => {
        const key = directionOf(route, input.waypointId);
        if (!key) return route;
        const { mapLabel, ...rest } = input.patch;
        return withStops(route, key, (stops) =>
          stops.map((wp) =>
            wp.id === input.waypointId
              ? { ...wp, ...rest, ...(mapLabel === undefined ? {} : { mapLabel: mapLabel ?? undefined }) }
              : wp,
          ),
        );
      }),
    onSuccess: (route) => settle(qc, route),
    onError: (_error, input, snapshot) => rollback(qc, input.routeId, snapshot),
  });
}

/** Soft delete of an intermediate stop (terminals are refused by the backend). */
export function useDeleteWaypoint() {
  const api = useRoutesApi();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: routeKeys.mutation(),
    mutationFn: (input: DeleteWaypointInput) => api.removeWaypoint(input),
    onMutate: (input) =>
      optimistic(qc, input.routeId, (route) => {
        const key = directionOf(route, input.waypointId);
        if (!key) return route;
        return withStops(route, key, (stops) => {
          const index = stops.findIndex((wp) => wp.id === input.waypointId);
          const next = stops.filter((wp) => wp.id !== input.waypointId);
          // Same rule as the backend: a removed end stop's neighbour becomes the terminal.
          const end = index === 0 ? 0 : index === stops.length - 1 ? next.length - 1 : -1;
          return end >= 0 && next[end]
            ? next.map((wp, i) => (i === end ? { ...wp, kind: 'terminal' as const } : wp))
            : next;
        });
      }),
    onSuccess: (route) => settle(qc, route),
    onError: (_error, input, snapshot) => rollback(qc, input.routeId, snapshot),
  });
}
