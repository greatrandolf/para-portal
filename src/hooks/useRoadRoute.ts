import { useEffect, useState } from 'react';

import { fetchRoadRoute, type RoadRoute } from '@/services/routingService';
import type { LatLng } from '@/utils/geo';

export type RoadRouteState =
  /** Fewer than two stops: nothing to route yet. */
  | { status: 'idle'; route: null }
  | { status: 'loading'; route: RoadRoute | null }
  | { status: 'ready'; route: RoadRoute }
  | { status: 'error'; route: null; message: string };

type Result = { key: string; route: RoadRoute } | { key: string; error: string };

const DEBOUNCE_MS = 350;

/** Road-snapped geometry for the given stops; re-fetches (debounced) when they change. */
export function useRoadRoute(stops: readonly LatLng[]): RoadRouteState {
  const key = stops.map((s) => `${s.lat.toFixed(6)},${s.lng.toFixed(6)}`).join(';');
  const [result, setResult] = useState<Result | null>(null);
  const [lastRoute, setLastRoute] = useState<RoadRoute | null>(null);

  const enough = stops.length >= 2;

  useEffect(() => {
    if (!enough) return;
    const points = key.split(';').map((pair) => {
      const [lat, lng] = pair.split(',').map(Number);
      return { lat, lng };
    });
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchRoadRoute(points, controller.signal)
        .then((route) => {
          setResult({ key, route });
          setLastRoute(route);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setResult({ key, error: error instanceof Error ? error.message : 'Routing failed' });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, enough]);

  if (!enough) return { status: 'idle', route: null };
  // While a new request is pending, keep showing the previous geometry.
  if (!result || result.key !== key) return { status: 'loading', route: lastRoute };
  if ('error' in result) return { status: 'error', route: null, message: result.error };
  return { status: 'ready', route: result.route };
}
