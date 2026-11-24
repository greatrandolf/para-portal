import type { Waypoint, WaypointFields } from '@/types/route';

/** Route data comes from para-backend via @packages/tanstack/query; these build new stops locally. */

/** Schematic (native) canvas spots for the first two stops of a new corridor. */
const ORIGIN_XY = { x: 220, y: 110 };
const DESTINATION_XY = { x: 780, y: 590 };

/** The first two stops of a direction are its terminals. */
function terminalStop(index: 0 | 1, point: { lat: number; lng: number }, name: string): Waypoint {
  const origin = index === 0;
  return {
    id: `wp-${Date.now()}`,
    name,
    role: origin ? 'Origin Terminal' : 'Destination Terminal',
    mapLabel: origin ? 'Origin' : 'Destination',
    kind: 'terminal',
    dwellSeconds: 60,
    lat: point.lat,
    lng: point.lng,
    ...(origin ? ORIGIN_XY : DESTINATION_XY),
    paxWaiting: 0,
  };
}

/**
 * A new draft waypoint placed halfway between the two stops before the destination
 * (native, which has no map clicks). On an empty corridor it becomes a terminal.
 */
export function createDraftWaypoint(waypoints: readonly Waypoint[], terminalName?: string): Waypoint {
  const n = waypoints.length;
  if (n < 2) {
    const near = waypoints[0] ?? { lat: 10.3157, lng: 123.8854 };
    const point = n === 0 ? near : { lat: near.lat - 0.01, lng: near.lng - 0.01 };
    return terminalStop(n as 0 | 1, point, terminalName ?? (n === 0 ? 'Origin Terminal' : 'Destination Terminal'));
  }
  const a = waypoints[n - 2];
  const b = waypoints[n - 1];
  return {
    id: `wp-draft-${Date.now()}`,
    name: `Draft Waypoint ${n + 1}`,
    role: 'Unpublished stop',
    kind: 'conditional',
    dwellSeconds: 30,
    lat: (a.lat + b.lat) / 2,
    lng: (a.lng + b.lng) / 2,
    x: Math.round((a.x + b.x) / 2) - 70,
    y: Math.round((a.y + b.y) / 2) + 10,
    paxWaiting: 0,
  };
}

/**
 * A waypoint at a real coordinate (e.g. a map click snapped to a road). The first
 * two stops of a direction become its origin and destination terminals (named
 * `terminalName` when given). x/y for the native schematic map are interpolated
 * from the terminals.
 */
export function createWaypointAt(
  waypoints: readonly Waypoint[],
  point: { lat: number; lng: number },
  roadName: string,
  terminalName?: string,
): Waypoint {
  const n = waypoints.length;
  if (n < 2) {
    const fallback = roadName ? `${roadName} Terminal` : n === 0 ? 'Origin Terminal' : 'Destination Terminal';
    return terminalStop(n as 0 | 1, point, terminalName ?? fallback);
  }
  const a = waypoints[0];
  const b = waypoints[n - 1];
  // Project the point onto the terminal-to-terminal line (clamped to it), and place it the
  // same fraction along the schematic line. Per-axis ratios blow up when the terminals share a latitude.
  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;
  const length2 = dLat * dLat + dLng * dLng;
  const along = length2 === 0 ? 0.5 : ((point.lat - a.lat) * dLat + (point.lng - a.lng) * dLng) / length2;
  const t = Math.min(1, Math.max(0, along));
  return {
    id: `wp-${Date.now()}`,
    name: roadName ? `${roadName} Stop` : `Waypoint ${n + 1}`,
    role: 'New stop (unpublished)',
    kind: 'regular',
    dwellSeconds: 30,
    lat: point.lat,
    lng: point.lng,
    x: Math.round(a.x + (b.x - a.x) * t),
    y: Math.round(a.y + (b.y - a.y) * t),
    paxWaiting: 0,
  };
}

/** The editable fields of a stop (drops the local id before sending it to the backend). */
export function toWaypointFields({ id: _id, ...fields }: Waypoint): WaypointFields {
  return fields;
}
