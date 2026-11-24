/** Route and waypoint shapes returned by the para-backend callables (see para-backend/docs/api.md). */

export type WaypointKind = 'terminal' | 'regular' | 'mandatory' | 'transfer' | 'conditional';

/** Editable stop fields (what create/update send). */
export type WaypointFields = {
  name: string;
  /** Short role shown under the name, e.g. "Origin Hub". */
  role: string;
  /** Map label shown next to the pin, if any. */
  mapLabel?: string;
  kind: WaypointKind;
  dwellSeconds: number;
  lat: number;
  lng: number;
  /** Position on the 1000x700 corridor canvas (native schematic map). */
  x: number;
  y: number;
  paxWaiting: number;
};

export type Waypoint = WaypointFields & { id: string };

export type TrafficLevel = 'optimal' | 'core' | 'moderate' | 'bottleneck';

export type RouteSegment = { from: number; to: number; level: TrafficLevel };

export type DirectionKey = 'outbound' | 'inbound';

/** One way of the loop. Each direction has its own stops, so the return trip can take different roads. */
export type RouteDirection = {
  key: DirectionKey;
  /** e.g. "Going to Sto. Niño" */
  label: string;
  /** e.g. "IT Park → Carbon via Lahug & Escario" */
  via: string;
  waypoints: Waypoint[];
  segments: RouteSegment[];
};

export type RouteFields = {
  code: string;
  name: string;
  status: 'active' | 'paused';
  roundtripKm: number;
  syncedUnits: number;
  fleetUnits: number;
  headway: string;
  baseFare: number;
  perKmRate: number;
  speedCapKmh: number;
  speedCapZone: string;
  cashbackPerTap: number;
  franchiseId: string;
};

export type TransitRoute = RouteFields & {
  id: string;
  updatedAt: string | null;
  directions: Record<DirectionKey, RouteDirection>;
};

/** One trip as shown in the routes list. */
export type DirectionSummary = { label: string; via: string; stops: number };

export type RouteSummary = RouteFields & {
  id: string;
  updatedAt: string | null;
  deletedAt: string | null;
  directions: Record<DirectionKey, DirectionSummary>;
};

/* ---------- mutation inputs ---------- */

export type CreateRouteInput = {
  route: Partial<RouteFields> & Pick<RouteFields, 'code' | 'name' | 'status'>;
  directions?: Partial<Record<DirectionKey, { label?: string; via?: string; waypoints?: WaypointFields[] }>>;
};

export type UpdateRouteInput = {
  routeId: string;
  patch?: Partial<RouteFields>;
  directions?: Partial<Record<DirectionKey, { label?: string; via?: string }>>;
};

export type CreateWaypointInput = {
  routeId: string;
  direction: DirectionKey;
  /** Position in the direction; kept between the terminals. Defaults to just before the destination. */
  index?: number;
  waypoint: WaypointFields;
  /** Id for the optimistic copy shown until the server answers. */
  tempId?: string;
};

export type UpdateWaypointInput = {
  routeId: string;
  waypointId: string;
  /** `mapLabel: null` clears the label. */
  patch: Partial<Omit<WaypointFields, 'mapLabel'>> & { mapLabel?: string | null };
};

export type DeleteWaypointInput = { routeId: string; waypointId: string };
