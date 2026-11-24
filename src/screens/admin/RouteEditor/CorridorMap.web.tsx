import 'leaflet/dist/leaflet.css';

import L, { type LatLngBoundsExpression, type Map as LeafletMap } from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Circle, CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import { MAP_TILES } from '@/constants/mapTiles';
import { colors, fonts } from '@/constants/theme';
import { useRoadRoute } from '@/hooks/useRoadRoute';
import type { Waypoint } from '@/types/route';
import { metersPerPixel, nearestIndex, offsetPath, offsetPointRight, type LatLng } from '@/utils/geo';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Card } from '@packages/ui/Card';
import { Icon } from '@packages/ui/Icon';
import { IconButton } from '@packages/ui/IconButton';
import { SegmentedControl } from '@packages/ui/SegmentedControl';

import {
  buildHint,
  canRemove,
  drawnSegments,
  MAP_TYPES,
  StopPopover,
  TrafficLegend,
  type CorridorMapProps,
} from './mapShared';
import { styles } from './styles';
import { numberColors, stopPosition, TRAFFIC_COLOR, type StopPosition } from './waypointStyle';

const FIT_PADDING: [number, number] = [56, 56];
/** Metro Cebu: shown while a new corridor has no stops yet. */
const DEFAULT_BOUNDS: [number, number][] = [
  [10.285, 123.86],
  [10.345, 123.93],
];

/** Bounds to frame the stops; a single stop gets a small box around it. */
function fitBoundsFor(stops: readonly LatLng[]): [number, number][] {
  if (stops.length === 0) return DEFAULT_BOUNDS;
  if (stops.length === 1) {
    const { lat, lng } = stops[0];
    return [
      [lat - 0.006, lng - 0.006],
      [lat + 0.006, lng + 0.006],
    ];
  }
  return stops.map((s) => [s.lat, s.lng]);
}
/** Screen gap between a direction's line and the road centre, so both directions stay visible side by side. */
const LANE_OFFSET_PX = 5;
/** Curbside geofences sit this far to the right of the road centre (right-hand traffic). */
export const CURB_OFFSET_M = 8;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** Numbered stop pin (+ label for terminals and named stops) as a Leaflet divIcon. */
function pinIcon(wp: Waypoint, index: number, position: StopPosition, selected: boolean, showLabel: boolean) {
  const size = selected ? 40 : position === 'middle' ? 28 : 34;
  const { bg, fg } = numberColors(wp, position, selected);
  const outlined = position === 'middle' && !selected && wp.kind !== 'transfer';
  const ring =
    selected || position !== 'middle'
      ? `box-shadow:0 0 0 4px ${colors.brandRing},0 4px 12px ${colors.routeShadow};`
      : `box-shadow:0 4px 12px ${colors.routeShadow};`;
  const label =
    showLabel && (position !== 'middle' || wp.mapLabel)
      ? `<div style="position:absolute;left:${size + 6}px;top:50%;transform:translateY(-50%);white-space:nowrap;background:${colors.surfaceContainerLowest};padding:4px 10px;border-radius:8px;box-shadow:0 4px 12px ${colors.routeShadow};font-family:${fonts.interBold};font-size:12px;color:${colors.onSurface}">${escapeHtml(position === 'middle' ? (wp.mapLabel ?? '') : wp.name)}${
          position !== 'middle' && wp.mapLabel
            ? `<div style="font-size:10px;color:${position === 'origin' ? colors.tertiary : colors.neonOrangeDeep}">${escapeHtml(wp.mapLabel)}</div>`
            : ''
        }</div>`
      : '';
  return L.divIcon({
    className: 'para-stop-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:9999px;display:flex;align-items:center;justify-content:center;background:${outlined ? colors.surfaceContainerLowest : bg};border:${outlined ? `2px solid ${colors.primaryContainer}` : '0'};box-sizing:border-box;${ring}font-family:${fonts.jakartaBold};font-size:${size > 30 ? 16 : 13}px;color:${fg};cursor:grab">${index + 1}${label}</div>`,
  });
}

/** Wires map clicks (placing mode), resize, and hands the map instance to the parent. */
function MapBridge({
  onReady,
  placing,
  onPlace,
  onZoom,
}: {
  onReady: (map: LeafletMap) => void;
  placing: boolean;
  onPlace?: CorridorMapProps['onPlace'];
  onZoom: (zoom: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
    onZoom(map.getZoom());
  }, [map, onReady, onZoom]);
  useEffect(() => {
    map.getContainer().style.cursor = placing ? 'crosshair' : '';
  }, [map, placing]);
  useMapEvents({
    zoomend() {
      onZoom(map.getZoom());
    },
    click(event) {
      if (placing) onPlace?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

/** Real map (Leaflet + OpenStreetMap tiles) with road-snapped corridor geometry from OSRM. */
export function CorridorMap({
  waypoints,
  segments,
  selectedId,
  onSelect,
  radius,
  mapStyle,
  onMapStyleChange,
  simIndex,
  directionLabel,
  ghostWaypoints,
  ghostLabel,
  placing = false,
  onPlace,
  onMove,
  onRemove,
  onEdit,
}: CorridorMapProps) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [frameW, setFrameW] = useState(0);
  const [zoom, setZoom] = useState(14);
  const compact = frameW > 0 && frameW < 640;
  const total = waypoints.length;
  const tiles = MAP_TILES[mapStyle];
  const selected = waypoints.find((wp) => wp.id === selectedId);
  const stops: LatLng[] = useMemo(() => waypoints.map(({ lat, lng }) => ({ lat, lng })), [waypoints]);
  const road = useRoadRoute(stops);
  const ghostStops: LatLng[] = useMemo(
    () => (ghostWaypoints ?? []).map(({ lat, lng }) => ({ lat, lng })),
    [ghostWaypoints],
  );
  const ghost = useRoadRoute(ghostStops);

  const bounds: LatLngBoundsExpression = useMemo(() => fitBoundsFor(stops), [stops]);

  // Fit the corridor once the map has a measured frame, and again when the layout switches square/wide.
  useEffect(() => {
    if (!map || frameW === 0) return;
    map.invalidateSize();
    map.fitBounds(bounds, { padding: FIT_PADDING });
    // Refit only on map creation or layout mode change, not on every stop edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, compact, frameW === 0]);

  // Centre the selected stop (the docked stop card covers the top-right corner).
  useEffect(() => {
    if (map && selected) map.panTo([selected.lat, selected.lng]);
  }, [map, selected]);

  // Each direction is drawn a few pixels to the right of the road centre, so the
  // outbound and return trips never hide each other on shared roads.
  const laneOffsetM = LANE_OFFSET_PX * metersPerPixel(stops[0]?.lat ?? 10.3, zoom);

  // Where each stop falls on the snapped road geometry.
  const breaks = useMemo(() => {
    const route = road.route;
    if (!route || route.snappedStops.length !== total) return null;
    const result: number[] = [];
    route.snappedStops.forEach((stop, i) => result.push(nearestIndex(route.path, stop, i === 0 ? 0 : result[i - 1])));
    return result;
  }, [road.route, total]);

  // Split the snapped road geometry at each stop so each segment can carry its traffic colour.
  const coloredSegments = useMemo(() => {
    const drawn = drawnSegments(segments, total);
    const route = road.route;
    return drawn.map((segment) => ({
      ...segment,
      path: offsetPath(
        route && breaks
          ? route.path.slice(breaks[segment.from], breaks[segment.to] + 1)
          : stops.slice(segment.from, segment.to + 1),
        laneOffsetM,
      ),
    }));
  }, [segments, total, road.route, breaks, stops, laneOffsetM]);

  const ghostPath = useMemo(
    () =>
      offsetPath(ghost.route?.path ?? ghostStops, LANE_OFFSET_PX * metersPerPixel(ghostStops[0]?.lat ?? 10.3, zoom)),
    [ghost.route, ghostStops, zoom],
  );

  // Curbside geofence: the selected stop's circle moves to the right side of the road for this direction.
  const fenceCenter = useMemo(() => {
    const index = waypoints.findIndex((wp) => wp.id === selectedId);
    if (index < 0) return null;
    const route = road.route;
    if (route && breaks) {
      const at = breaks[index];
      const from = route.path[Math.max(0, at - 1)];
      const to = route.path[Math.min(route.path.length - 1, at + 1)];
      return offsetPointRight(route.snappedStops[index], from, to, CURB_OFFSET_M);
    }
    const from = stops[Math.max(0, index - 1)];
    const to = stops[Math.min(stops.length - 1, index + 1)];
    return offsetPointRight(stops[index], from, to, CURB_OFFSET_M);
  }, [waypoints, selectedId, road.route, breaks, stops]);

  const unitPoint = (() => {
    const index = simIndex ?? waypoints.findIndex((wp) => wp.id === selectedId);
    const route = road.route;
    if (index < 0) return null;
    return route && route.snappedStops.length === total ? route.snappedStops[index] : stops[index];
  })();

  const hint = buildHint(total);
  const status = hint
    ? { dot: colors.amberFare, text: hint }
    : road.status === 'ready'
      ? {
          dot: colors.emeraldActive,
          text: `${directionLabel ? `${directionLabel} • ` : ''}OSRM • ${road.route.distanceKm.toFixed(1)} km • ${Math.round(road.route.durationMin)} min`,
        }
      : road.status === 'loading'
        ? { dot: colors.amberFare, text: 'Road Snapping: routing on OSRM…' }
        : { dot: colors.crimsonAlert, text: 'Road snapping unavailable: showing straight segments' };

  return (
    <View style={styles.mapStack}>
      <View
        style={[styles.mapFrame, compact && styles.mapFrameSquare]}
        onLayout={(e: LayoutChangeEvent) => {
          setFrameW(e.nativeEvent.layout.width);
          map?.invalidateSize();
        }}>
        <View style={styles.leafletHost}>
          <MapContainer
            bounds={bounds}
            boundsOptions={{ padding: FIT_PADDING }}
            zoomControl={false}
            scrollWheelZoom
            style={{ width: '100%', height: '100%' }}>
            <TileLayer key={mapStyle} url={tiles.url} attribution={tiles.attribution} maxZoom={tiles.maxZoom} />
            <MapBridge onReady={setMap} placing={placing} onPlace={onPlace} onZoom={setZoom} />

            {fenceCenter ? (
              <Circle
                center={[fenceCenter.lat, fenceCenter.lng]}
                radius={radius}
                pathOptions={{
                  color: colors.primaryContainer,
                  weight: 1.5,
                  dashArray: '4 4',
                  fillColor: colors.primaryContainer,
                  fillOpacity: 0.18,
                }}
              />
            ) : null}

            {/* Opposite direction, faint and dashed, so both ways can be compared. */}
            {ghostStops.length > 1 ? (
              <Polyline
                positions={ghostPath.map((p) => [p.lat, p.lng])}
                interactive={false}
                pathOptions={{ color: colors.secondary, opacity: 0.55, weight: 5, dashArray: '10 8', lineCap: 'round' }}
              />
            ) : null}

            {road.route ? (
              <Polyline
                positions={offsetPath(road.route.path, laneOffsetM).map((p) => [p.lat, p.lng])}
                pathOptions={{ color: colors.routeShadow, weight: 12, lineCap: 'round', lineJoin: 'round' }}
              />
            ) : null}
            {coloredSegments.map((segment) => (
              <Polyline
                key={`${segment.from}-${segment.to}-${segment.level}`}
                positions={segment.path.map((p) => [p.lat, p.lng])}
                pathOptions={{
                  color: TRAFFIC_COLOR[segment.level],
                  weight: segment.level === 'bottleneck' ? 7 : 6,
                  dashArray: road.status === 'error' ? '6 8' : segment.level === 'bottleneck' ? '2 10' : undefined,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            ))}

            {waypoints.map((wp, index) => {
              const position = stopPosition(index, total);
              const isSelected = wp.id === selectedId;
              return (
                <Marker
                  key={`${wp.id}-${index}-${isSelected}-${compact}`}
                  position={[wp.lat, wp.lng]}
                  icon={pinIcon(wp, index, position, isSelected, !compact && !isSelected)}
                  draggable={!placing}
                  zIndexOffset={isSelected ? 1000 : 0}
                  title={`Stop ${index + 1}: ${wp.name}`}
                  eventHandlers={{
                    click: () => onSelect(wp.id),
                    dragend: (event) => {
                      const { lat, lng } = (event.target as L.Marker).getLatLng();
                      onMove?.(wp.id, { lat, lng });
                    },
                  }}
                />
              );
            })}

            {unitPoint ? (
              <CircleMarker
                center={[unitPoint.lat, unitPoint.lng]}
                radius={8}
                pathOptions={{
                  color: colors.primaryContainer,
                  weight: 3,
                  fillColor: colors.surfaceContainerLowest,
                  fillOpacity: 1,
                }}
              />
            ) : null}
          </MapContainer>
        </View>

        {placing ? (
          <View style={styles.placingBanner} pointerEvents="none">
            <Icon name="add-location-alt" size={18} color={colors.onPrimary} />
            <AppText variant="labelMd" bold color={colors.onPrimary}>
              Click the map to drop a stop. It snaps to the nearest road.
            </AppText>
          </View>
        ) : null}

        <View style={[compact ? styles.mapBottomLeft : styles.mapTopLeft, styles.mapOverlay]}>
          <SegmentedControl segments={MAP_TYPES} value={mapStyle} onChange={onMapStyleChange} />
          {compact ? null : (
            <View style={styles.mapChip}>
              <View style={[styles.dot, { backgroundColor: status.dot }]} />
              <AppText variant="labelSm">{status.text}</AppText>
            </View>
          )}
        </View>

        {compact ? null : (
          <View style={[styles.mapTopRight, styles.mapOverlay]}>
            <View style={[styles.mapChip, styles.mapChipLg]}>
              <Icon name="traffic" size={18} color={colors.telemetryStrong} />
              <AppText variant="labelMd" bold>
                Live Traffic Telemetry:
              </AppText>
              <Badge label="Streaming" tone="telemetry" pill={false} />
            </View>
          </View>
        )}

        {selected && !compact && !placing ? (
          <StopPopover
            waypoint={selected}
            radius={radius}
            style={styles.popoverDocked}
            onEdit={onEdit ? () => onEdit(selected.id) : undefined}
            onRemove={canRemove(waypoints, selected.id) ? () => onRemove?.(selected.id) : undefined}
          />
        ) : null}

        <View style={[styles.mapControls, styles.mapControlsWeb, styles.mapOverlay]}>
          <View style={styles.zoomGroup}>
            <IconButton icon="add" accessibilityLabel="Zoom in" onPress={() => map?.zoomIn()} />
            <View style={styles.zoomDivider} />
            <IconButton icon="remove" accessibilityLabel="Zoom out" onPress={() => map?.zoomOut()} />
          </View>
          <IconButton
            icon="my-location"
            variant="card"
            color={colors.primaryContainer}
            accessibilityLabel="Recenter corridor"
            onPress={() => map?.fitBounds(bounds, { padding: FIT_PADDING })}
          />
        </View>

        {compact ? null : (
          <View style={[styles.legend, styles.mapOverlay]}>
            <TrafficLegend ghostLabel={ghostLabel} />
          </View>
        )}
      </View>

      {compact ? (
        <>
          <Card padding="sm" style={styles.legendCard}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: status.dot }]} />
              <AppText variant="labelSm">{status.text}</AppText>
            </View>
            <TrafficLegend ghostLabel={ghostLabel} />
          </Card>
          {selected ? (
            <StopPopover
              waypoint={selected}
              radius={radius}
              onEdit={onEdit ? () => onEdit(selected.id) : undefined}
              onRemove={canRemove(waypoints, selected.id) ? () => onRemove?.(selected.id) : undefined}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}
