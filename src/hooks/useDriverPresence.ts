import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';

import { realtimeDb } from '@/services/firebase';

/** What the driver app reported, from `driverLocations/{driverId}` in the Realtime Database. */
export type DriverPresence = {
  /** The app's connection; false once the server saw it drop (killed, offline, locked). */
  online: boolean;
  /** When `online` last changed (ms). */
  since: number | null;
  /** Time of the last GPS position (ms), if any. */
  lastFixAt: number | null;
};

/** No GPS for this long while in service counts as signal lost (the app re-sends every 30 s while parked). */
export const GPS_STALE_MS = 90_000;

/**
 * Live presence of the drivers on ongoing assignments (Realtime Database onValue). `ready` is false until the
 * first answer, so the roster does not flash "Disconnected" while loading.
 */
export function useDriverPresence(driverIds: readonly string[]): {
  ready: boolean;
  presence: ReadonlyMap<string, DriverPresence>;
} {
  const key = [...new Set(driverIds)].sort().join(',');
  // Answers are kept per set of drivers, so a new set starts "not ready" instead of showing the old one.
  const [state, setState] = useState<{ key: string; ready: boolean; presence: Map<string, DriverPresence> }>({
    key: '',
    ready: false,
    presence: new Map(),
  });

  useEffect(() => {
    const db = realtimeDb();
    const ids = key ? key.split(',') : [];
    if (!db || ids.length === 0) return;
    const seen = new Set<string>();
    const unsubscribes = ids.map((driverId) =>
      onValue(
        ref(db, `driverLocations/${driverId}`),
        (snap) => {
          const v = snap.val() as {
            presence?: { online?: boolean; at?: number };
            position?: { at?: number };
          } | null;
          seen.add(driverId);
          setState((current) => {
            const presence = new Map(current.key === key ? current.presence : []);
            presence.set(driverId, {
              online: v?.presence?.online === true,
              since: v?.presence?.at ?? null,
              lastFixAt: v?.position?.at ?? null,
            });
            return { key, ready: seen.size === ids.length, presence };
          });
        },
        () => {
          seen.add(driverId);
          setState((current) => ({
            key,
            ready: seen.size === ids.length,
            presence: current.key === key ? current.presence : new Map(),
          }));
        },
      ),
    );
    return () => unsubscribes.forEach((off) => off());
  }, [key]);

  if (!key || !realtimeDb()) return { ready: true, presence: EMPTY };
  if (state.key !== key) return { ready: false, presence: EMPTY };
  return state;
}

const EMPTY: ReadonlyMap<string, DriverPresence> = new Map();

/** The current time, refreshed every `everyMs`, so "no GPS for 90 s" shows without other changes. */
export function useNow(everyMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
}
