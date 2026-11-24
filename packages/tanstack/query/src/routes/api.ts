import type { FunctionsClient } from '../client';
import type {
  CreateRouteInput,
  CreateWaypointInput,
  DeleteWaypointInput,
  RouteSummary,
  TransitRoute,
  UpdateRouteInput,
  UpdateWaypointInput,
} from './types';

/** Typed wrappers around the para-backend route and waypoint callables. */
export const routesApi = (client: FunctionsClient) => ({
  list: async (options: { includeDeleted?: boolean } = {}, signal?: AbortSignal) =>
    (await client.call<{ routes: RouteSummary[] }>('routesList', options, signal)).routes,

  get: async (routeId: string, signal?: AbortSignal) =>
    (await client.call<{ route: TransitRoute }>('routesGet', { routeId }, signal)).route,

  create: async (input: CreateRouteInput) => (await client.call<{ route: TransitRoute }>('routesCreate', input)).route,

  update: async (input: UpdateRouteInput) => (await client.call<{ route: TransitRoute }>('routesUpdate', input)).route,

  remove: async (routeId: string) => client.call<{ routeId: string }>('routesDelete', { routeId }),

  reverse: async (routeId: string) => (await client.call<{ route: TransitRoute }>('routesReverse', { routeId })).route,

  createWaypoint: async ({ tempId: _tempId, ...input }: CreateWaypointInput) =>
    client.call<{ route: TransitRoute; waypointId: string }>('waypointsCreate', input),

  updateWaypoint: async (input: UpdateWaypointInput) =>
    (await client.call<{ route: TransitRoute }>('waypointsUpdate', input)).route,

  removeWaypoint: async (input: DeleteWaypointInput) =>
    (await client.call<{ route: TransitRoute }>('waypointsDelete', input)).route,
});
