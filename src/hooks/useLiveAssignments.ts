import { useQueryClient } from '@tanstack/react-query';
import { collection, onSnapshot, query, where, type QueryConstraint } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { firestore } from '@/services/firebase';
import { fleetKeys, type Assignment, type DutyStatus, type Fleet } from '@packages/tanstack/query/fleet';

/**
 * Keeps the fleet roster live (Firestore onSnapshot on the ongoing assignments):
 * - a driver's duty change (Stop / Resume Tracking) is written into the cached list at once;
 * - a new, ended or rotated assignment (by the fleet, or End Shift in the driver app) refetches the list, so units
 *   and drivers update with it.
 *
 * The query matches the security rules: fleet users read only their own records (`ownerUid`), admins every fleet
 * (or the picked one), and list queries must filter `deletedAt == null`.
 *
 * @param ownerUid the fleet account an admin picked, or null for all (admins) / own (fleet users)
 * @returns whether the live connection is up
 */
export function useLiveAssignments(ownerUid: string | null, seesAll: boolean): boolean {
  const auth = useAuth();
  const uid = auth.status === 'signedIn' ? auth.user.uid : undefined;
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const owner = seesAll ? ownerUid : uid;
    const constraints: QueryConstraint[] = [where('state', '==', 'ongoing'), where('deletedAt', '==', null)];
    if (owner) constraints.unshift(where('ownerUid', '==', owner));

    let first = true;
    const unsubscribe = onSnapshot(
      query(collection(firestore, 'assignments'), ...constraints),
      (snap) => {
        setLive(true);
        if (first) {
          first = false;
          return; // the list was just loaded through the API
        }
        const changes = snap.docChanges();
        // Duty status only: patch the cached rows, no refetch needed.
        const dutyOnly = changes.every((c) => c.type === 'modified');
        if (dutyOnly) {
          const duty = new Map(changes.map((c) => [c.doc.id, c.doc.get('dutyStatus') as DutyStatus | undefined]));
          queryClient.setQueriesData<Fleet>({ queryKey: fleetKeys.lists() }, (fleet) =>
            fleet
              ? {
                  ...fleet,
                  assignments: fleet.assignments.map((a): Assignment =>
                    duty.has(a.id) ? { ...a, dutyStatus: duty.get(a.id) ?? 'in_service' } : a,
                  ),
                }
              : fleet,
          );
          return;
        }
        // Assigned, ended or rotated: units and drivers changed too.
        void queryClient.invalidateQueries({ queryKey: fleetKeys.lists() });
      },
      () => setLive(false),
    );
    return () => {
      unsubscribe();
      setLive(false);
    };
  }, [uid, ownerUid, seesAll, queryClient]);

  return live;
}
