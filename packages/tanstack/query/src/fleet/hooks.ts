import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useFunctionsClient } from '../QueryProvider';
import { fleetApi } from './api';
import { fleetKeys } from './keys';
import type {
  CreateAssignmentInput,
  CreateDriverInput,
  CreateVehicleInput,
  EndAssignmentInput,
  Fleet,
  SetVehicleStatusInput,
  UpdateDriverInput,
  UpdateVehicleInput,
} from './types';

const useFleetApi = () => {
  const client = useFunctionsClient();
  return useMemo(() => fleetApi(client), [client]);
};

/**
 * Units, driver accounts, and the latest assignments, in one request. Fleet users always get their own fleet;
 * admins get every fleet account's records, or one account's with `ownerUid`.
 */
export function useFleet(ownerUid: string | null = null) {
  const api = useFleetApi();
  return useQuery({
    queryKey: fleetKeys.list(ownerUid),
    queryFn: ({ signal }) => api.list(ownerUid, signal),
    placeholderData: (previous) => previous,
  });
}

/**
 * A fleet mutation. A pairing change touches the unit, the driver, and the history at once,
 * so every mutation refetches the whole fleet when it settles.
 */
type FleetApi = ReturnType<typeof fleetApi>;

function useFleetMutation<TInput, TResult>(fn: (api: FleetApi, input: TInput) => Promise<TResult>) {
  const api = useFleetApi();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...fleetKeys.all, 'mutation'],
    mutationFn: (input: TInput) => fn(api, input),
    onSettled: () => qc.invalidateQueries({ queryKey: fleetKeys.all }),
  });
}

export const useCreateVehicle = () => useFleetMutation((api, input: CreateVehicleInput) => api.createVehicle(input));
export const useUpdateVehicle = () => useFleetMutation((api, input: UpdateVehicleInput) => api.updateVehicle(input));
export const useDeleteVehicle = () => useFleetMutation((api, vehicleId: string) => api.removeVehicle(vehicleId));
export const useCreateDriver = () => useFleetMutation((api, input: CreateDriverInput) => api.createDriver(input));
export const useUpdateDriver = () => useFleetMutation((api, input: UpdateDriverInput) => api.updateDriver(input));
export const useDeleteDriver = () => useFleetMutation((api, driverId: string) => api.removeDriver(driverId));
/** A new activation code for a driver; older unused codes stop working. */
export const useCreateDriverAccess = () =>
  useFleetMutation((api, driverId: string) => api.createDriverAccess(driverId));
/** Turns off a driver's app access and signs out their phone. */
export const useRevokeDriverAccess = () =>
  useFleetMutation((api, driverId: string) => api.revokeDriverAccess(driverId));
export const useCreateAssignment = () =>
  useFleetMutation((api, input: CreateAssignmentInput) => api.createAssignment(input));
export const useEndAssignment = () => useFleetMutation((api, input: EndAssignmentInput) => api.endAssignment(input));

/** Maintenance toggles show at once; the server's copy replaces them when it answers. */
export function useSetVehicleStatus() {
  const api = useFleetApi();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...fleetKeys.all, 'mutation'],
    mutationFn: (input: SetVehicleStatusInput) => api.setVehicleStatus(input),
    onMutate: async ({ vehicleId, status, statusNote }) => {
      await qc.cancelQueries({ queryKey: fleetKeys.lists() });
      // The unit may be cached under "all accounts" and under its own account.
      const previous = qc.getQueriesData<Fleet>({ queryKey: fleetKeys.lists() });
      qc.setQueriesData<Fleet>({ queryKey: fleetKeys.lists() }, (fleet) =>
        fleet
          ? {
              ...fleet,
              vehicles: fleet.vehicles.map((v) =>
                v.id === vehicleId ? { ...v, status, statusNote: statusNote ?? null } : v,
              ),
            }
          : fleet,
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      context?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: fleetKeys.all }),
  });
}
