import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import type { MapStyle } from '@/constants/theme';
import { RouteForm } from '@/components/RouteForm';
import { useToast } from '@/hooks/useToast';
import { createDraftWaypoint, createWaypointAt, toWaypointFields } from '@/services/routeService';
import { snapToRoad } from '@/services/routingService';
import { cheapestInsertionIndex, type LatLng } from '@/utils/geo';
import type { DirectionKey, UpdateRouteInput, UpdateWaypointInput, Waypoint } from '@/types/route';
import {
  routeKeys,
  useCreateWaypoint,
  useDeleteRoute,
  useDeleteWaypoint,
  useReverseRoute,
  useRoute,
  useUpdateRoute,
  useUpdateWaypoint,
} from '@packages/tanstack/query/routes';
import { Toast } from '@packages/ui/Toast';
import { useIsMutating } from '@tanstack/react-query';
import { useBreakpoint } from '@packages/responsive/useBreakpoint';

import { CorridorKpis } from './CorridorKpis';
import { CorridorMap } from './CorridorMap';
import { RouteHeader } from './RouteHeader';
import { RouteLoadState } from './RouteLoadState';
import { StopForm } from './StopForm';
import { styles } from './styles';
import { CertificationCard, WaypointInspector, type SimStatus } from './WaypointInspector';

const SIM_UNIT = 'GMD-1782';
const SIM_STEP_MS = 450;

type EditorParams = {
  routeId: string;
  /** Set by the routes list right after "New route": open ready to place the terminals. */
  build?: string;
  /** Terminal names from the New Route form, used to name the first two stops. */
  origin?: string;
  destination?: string;
};

/** The stop selected when a direction opens: its mandatory stop, else the first intermediate stop. */
function defaultStop(waypoints: readonly Waypoint[]): string {
  return (waypoints.find((wp) => wp.kind === 'mandatory') ?? waypoints[1] ?? waypoints[0])?.id ?? '';
}

/** Stitch "Admin Route Management & Waypoint Editor (Route 17B)" for one route: /routes/<routeId>. */
export function RouteEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<EditorParams>();
  const routeId = params.routeId;
  // Server state (para-backend via TanStack Query). Edits are optimistic and saved per change.
  const routeQuery = useRoute(routeId);
  const route = routeQuery.data;
  const updateRoute = useUpdateRoute();
  const deleteRoute = useDeleteRoute();
  const createWaypoint = useCreateWaypoint();
  const updateWaypoint = useUpdateWaypoint();
  const deleteWaypoint = useDeleteWaypoint();
  const reverseRoute = useReverseRoute();
  const saving = useIsMutating({ mutationKey: routeKeys.mutation() }) > 0;

  /** Which trip is being edited: "Going to …" (outbound) or "Going back to …" (inbound). */
  const [direction, setDirection] = useState<DirectionKey>('outbound');
  const [pickedId, setSelectedId] = useState('');
  const [radius, setRadius] = useState(25);
  const [mapStyle, setMapStyle] = useState<MapStyle>('vector');
  const [simStatus, setSimStatus] = useState<SimStatus>('standby');
  const [simIndex, setSimIndex] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  /** Web: next map click places a stop. Until toggled, a just-created empty route starts in placing mode. */
  const [placingChoice, setPlacing] = useState<boolean | null>(null);
  const placing =
    placingChoice ??
    (Platform.OS === 'web' && params.build === '1' && route?.directions.outbound.waypoints.length === 0);
  const [editOpen, setEditOpen] = useState(false);
  const [formError, setFormError] = useState<string>();
  /** Stop open in the Edit stop form, and the backend error from saving it. */
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [stopError, setStopError] = useState<string>();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { toast, show, dismiss } = useToast();
  const { atLeastMd, atLeastXl, isPhone } = useBreakpoint();

  const terminals =
    params.origin && params.destination ? { routeId, origin: params.origin, destination: params.destination } : null;

  /** Latest stops, for async handlers that resume after a road-snap request. */
  const waypointsRef = useRef<Waypoint[]>(route?.directions[direction].waypoints ?? []);
  useEffect(() => {
    waypointsRef.current = route?.directions[direction].waypoints ?? [];
  }, [route, direction]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const backToList = () => (router.canGoBack() ? router.back() : router.replace('/routes'));

  const handleUpdate = (input: UpdateRouteInput) => {
    setFormError(undefined);
    updateRoute.mutate(input, {
      onSuccess: (updated) => {
        setEditOpen(false);
        show({ title: `Route ${updated.code} saved`, message: updated.name, icon: 'save', tone: 'info' });
      },
      onError: (error) => setFormError(error.message),
    });
  };

  const handleDelete = (routeIdToDelete: string) => {
    setFormError(undefined);
    deleteRoute.mutate(routeIdToDelete, {
      onSuccess: () => {
        setEditOpen(false);
        router.replace('/routes');
      },
      onError: (error) => setFormError(error.message),
    });
  };

  if (!route) {
    if (routeQuery.error)
      return (
        <RouteLoadState
          state="error"
          message={routeQuery.error.message}
          onRetry={() => void routeQuery.refetch()}
          retrying={routeQuery.isFetching}
          onBack={() => router.replace('/routes')}
        />
      );
    return <RouteLoadState state="loading" />;
  }

  const active = route.directions[direction];
  const other = route.directions[direction === 'outbound' ? 'inbound' : 'outbound'];
  // Keep a stop selected: the one picked, else the direction's default (also after a stop is removed).
  const selectedId = active.waypoints.some((wp) => wp.id === pickedId) ? pickedId : defaultStop(active.waypoints);

  const fail = (title: string, error: unknown) =>
    show({
      title,
      message: error instanceof Error ? error.message : 'Please try again.',
      icon: 'error-outline',
      tone: 'danger',
    });

  const changeDirection = (next: DirectionKey) => {
    if (next === direction || simStatus === 'running') return;
    setDirection(next);
    setPlacing(false);
    setSimStatus('standby');
    setSelectedId(defaultStop(route.directions[next].waypoints));
  };

  /** Names the first two stops of a trip after the new route's terminals (the return trip runs the other way). */
  const terminalName = (count: number, key: DirectionKey) => {
    if (count > 1 || terminals?.routeId !== route.id) return undefined;
    const [first, second] =
      key === 'outbound' ? [terminals.origin, terminals.destination] : [terminals.destination, terminals.origin];
    return count === 0 ? first : second;
  };

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const handlePublish = () => {
    setPublishing(true);
    later(() => {
      setPublishing(false);
      show({
        title: `Route ${route.code} polyline v4.8 broadcasted`,
        message: `${route.fleetUnits} onboard IoT trackers re-synced via Cebu South LoRaWAN network.`,
        icon: 'cloud-done',
      });
    }, 700);
  };

  /** Snaps a coordinate onto the nearest road; falls back to the raw point if OSRM is unreachable. */
  const snap = async (point: LatLng) => {
    try {
      return await snapToRoad(point);
    } catch {
      show({
        title: 'Road snapping unavailable',
        message: 'The stop was kept at the exact point you chose.',
        icon: 'wifi-off',
        tone: 'danger',
      });
      return { point, roadName: '' };
    }
  };

  const handleAddWaypoint = () => {
    if (Platform.OS === 'web') {
      setPlacing(!placing);
      return;
    }
    const draft = createDraftWaypoint(active.waypoints, terminalName(active.waypoints.length, direction));
    setSelectedId(draft.id);
    createWaypoint.mutate(
      { routeId: route.id, direction, waypoint: toWaypointFields(draft), tempId: draft.id },
      {
        onSuccess: ({ waypointId }) => {
          setSelectedId(waypointId);
          show({
            title: 'Waypoint added',
            message: `${draft.name} inserted before the destination terminal.`,
            icon: 'add-location-alt',
            tone: 'info',
          });
        },
        onError: (error) => fail('Could not add the waypoint', error),
      },
    );
  };

  const handlePlace = async (point: LatLng) => {
    setPlacing(false);
    const key = direction;
    const snapped = await snap(point);
    const current = waypointsRef.current;
    const created = createWaypointAt(current, snapped.point, snapped.roadName, terminalName(current.length, key));
    const position = cheapestInsertionIndex(current, snapped.point);
    setSelectedId(created.id);
    try {
      const { waypointId } = await createWaypoint.mutateAsync({
        routeId: route.id,
        direction: key,
        index: position,
        waypoint: toWaypointFields(created),
        tempId: created.id,
      });
      setSelectedId(waypointId);
      if (current.length === 0) {
        // Origin placed: go straight on to the destination terminal.
        setPlacing(true);
        show({
          title: 'Origin terminal placed',
          message: `${created.name} saved. Click the map to place the destination terminal.`,
          icon: 'add-location-alt',
          tone: 'info',
        });
        return;
      }
      show({
        title: current.length === 1 ? 'Destination terminal placed' : 'Stop added on the road network',
        message:
          current.length === 1
            ? `${created.name} saved. Use "+ Add Waypoint" to add stops between the terminals.`
            : `${created.name} saved as stop ${position + 1}${snapped.roadName ? ` on ${snapped.roadName}` : ''}.`,
        icon: 'add-location-alt',
        tone: 'info',
      });
    } catch (error) {
      fail('Could not add the stop', error);
    }
  };

  const handleMove = async (id: string, point: LatLng) => {
    // The pin stays where it was dropped; it settles onto the road once snapped and saved.
    setSelectedId(id);
    const snapped = await snap(point);
    updateWaypoint.mutate(
      { routeId: route.id, waypointId: id, patch: { lat: snapped.point.lat, lng: snapped.point.lng } },
      { onError: (error) => fail('Could not move the stop', error) },
    );
  };

  const openEditStop = (id: string) => {
    setSelectedId(id);
    setStopError(undefined);
    setPlacing(false);
    setEditingStopId(id);
  };

  const handleSaveStop = (waypointId: string, patch: UpdateWaypointInput['patch']) => {
    setStopError(undefined);
    updateWaypoint.mutate(
      { routeId: route.id, waypointId, patch },
      {
        onSuccess: (updated) => {
          setEditingStopId(null);
          const saved = updated.directions[direction].waypoints.find((wp) => wp.id === waypointId);
          show({
            title: 'Stop saved',
            message: `${saved?.name ?? 'The stop'} was updated.`,
            icon: 'save',
            tone: 'info',
          });
        },
        onError: (error) => setStopError(error.message),
      },
    );
  };

  const editingStop = active.waypoints.find((wp) => wp.id === editingStopId);
  const editingIndex = editingStop ? active.waypoints.indexOf(editingStop) : -1;
  const editingPosition =
    editingIndex === 0
      ? `Origin terminal of "${active.label}"`
      : editingIndex === active.waypoints.length - 1
        ? `Destination terminal of "${active.label}"`
        : `Stop ${editingIndex + 1} of ${active.waypoints.length} on "${active.label}"`;

  const handleRemove = (id: string) => {
    const removed = active.waypoints.find((wp) => wp.id === id);
    const index = active.waypoints.findIndex((wp) => wp.id === id);
    const last = active.waypoints.length - 1;
    // Removing an end stop: its neighbour becomes the new origin/destination terminal.
    const newEnd = index === 0 ? active.waypoints[1] : index === last ? active.waypoints[last - 1] : undefined;
    setSelectedId(active.waypoints[Math.max(0, index - 1)]?.id ?? '');
    deleteWaypoint.mutate(
      { routeId: route.id, waypointId: id },
      {
        onSuccess: () =>
          show({
            title: 'Stop removed',
            message: newEnd
              ? `${removed?.name ?? 'The stop'} was taken off. ${newEnd.name} is now the ${index === 0 ? 'origin' : 'destination'} terminal.`
              : `${removed?.name ?? 'The stop'} was taken off the corridor.`,
            icon: 'delete-outline',
            tone: 'info',
          }),
        onError: (error) => fail('Could not remove the stop', error),
      },
    );
  };

  /** Rebuilds the return trip as a mirror of the outbound stops, then opens it for editing. */
  const handleReverse = () => {
    if (simStatus === 'running' || reverseRoute.isPending) return;
    if (route.directions.outbound.waypoints.length < 2) {
      show({
        title: 'Place both terminals first',
        message: `"${route.directions.outbound.label}" needs an origin and a destination before it can be reversed.`,
        icon: 'swap-vert',
        tone: 'info',
      });
      return;
    }
    setPlacing(false);
    reverseRoute.mutate(route.id, {
      onSuccess: (updated) => {
        setDirection('inbound');
        setSimStatus('standby');
        setSelectedId(defaultStop(updated.directions.inbound.waypoints));
        show({
          title: 'Return trip rebuilt from the outbound stops',
          message: `Now editing "${updated.directions.inbound.label}". Drag or add stops to send it along different roads.`,
          icon: 'swap-vert',
          tone: 'info',
        });
      },
      onError: (error) => fail('Could not rebuild the return trip', error),
    });
  };

  const handleSimulate = () => {
    if (simStatus === 'running') return;
    setSimStatus('running');
    active.waypoints.forEach((_, index) => later(() => setSimIndex(index), SIM_STEP_MS * index));
    later(() => {
      setSimStatus('passed');
      setSimIndex(null);
    }, SIM_STEP_MS * active.waypoints.length);
  };

  const map = (
    <CorridorMap
      key={route.id}
      waypoints={active.waypoints}
      segments={active.segments}
      selectedId={selectedId}
      onSelect={setSelectedId}
      radius={radius}
      mapStyle={mapStyle}
      onMapStyleChange={setMapStyle}
      simIndex={simIndex}
      directionLabel={active.label}
      ghostWaypoints={other.waypoints}
      ghostLabel={other.label}
      placing={placing}
      onPlace={handlePlace}
      onMove={handleMove}
      onRemove={handleRemove}
      onEdit={openEditStop}
    />
  );

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.page, isPhone && styles.pagePhone]}>
        <RouteHeader
          route={route}
          publishing={publishing}
          saving={saving}
          onBack={backToList}
          onEditRoute={() => {
            setFormError(undefined);
            setEditOpen(true);
          }}
          onAddWaypoint={handleAddWaypoint}
          placing={placing}
          onReverse={handleReverse}
          onImport={() =>
            show({ title: 'Import KML/GPX', message: 'File import is coming soon.', icon: 'file-upload', tone: 'info' })
          }
          onPublish={handlePublish}
        />
        <View style={[styles.split, atLeastXl && styles.splitRow]}>
          <View style={[styles.studio, atLeastXl && styles.studioWide]}>
            {map}
            <CorridorKpis route={route} columns={atLeastMd} />
          </View>
          <View style={[styles.side, atLeastXl && styles.sideWide]}>
            <WaypointInspector
              waypoints={active.waypoints}
              selectedId={selectedId}
              onSelect={setSelectedId}
              radius={radius}
              onRadiusChange={setRadius}
              simStatus={simStatus}
              onSimulate={handleSimulate}
              unitId={SIM_UNIT}
              direction={direction}
              onDirectionChange={changeDirection}
              directions={route.directions}
              onBuildReturn={handleReverse}
              buildingReturn={reverseRoute.isPending}
            />
            <CertificationCard franchiseId={route.franchiseId} />
          </View>
        </View>
      </ScrollView>
      {editOpen ? (
        <RouteForm
          key={route.id}
          mode="edit"
          visible
          route={route}
          submitting={updateRoute.isPending}
          deleting={deleteRoute.isPending}
          serverError={formError}
          onUpdate={handleUpdate}
          onDelete={() => handleDelete(route.id)}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
      {editingStop ? (
        <StopForm
          key={editingStop.id}
          waypoint={editingStop}
          positionLabel={editingPosition}
          saving={updateWaypoint.isPending}
          serverError={stopError}
          onSave={(patch) => handleSaveStop(editingStop.id, patch)}
          onClose={() => setEditingStopId(null)}
        />
      ) : null}
      <Toast toast={toast} onDismiss={dismiss} />
    </View>
  );
}
