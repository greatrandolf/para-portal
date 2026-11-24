import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, type MapStyle } from '@/constants/theme';
import type { RouteSegment, Waypoint } from '@/types/route';
import { formatCoord } from '@/utils/format';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Icon } from '@packages/ui/Icon';
import type { PressState } from '@packages/ui/utils/pressState';

import { styles } from './styles';
import { KIND_TITLE, TRAFFIC_COLOR, TRAFFIC_LEGEND } from './waypointStyle';

export const MAP_TYPES = [
  { value: 'vector', label: 'Vector Map' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'terrain', label: 'Terrain' },
] as const;

/** Props shared by the native schematic map and the web Leaflet map. */
export type CorridorMapProps = {
  waypoints: Waypoint[];
  segments: RouteSegment[];
  selectedId: string;
  onSelect: (id: string) => void;
  radius: number;
  mapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
  /** Index of the simulated unit, or null to park it on the selected stop. */
  simIndex: number | null;
  /** Web only: when true, the next map click adds a stop at that coordinate. */
  placing?: boolean;
  onPlace?: (point: { lat: number; lng: number }) => void;
  /** Web only: a stop was dragged to a new coordinate. */
  onMove?: (id: string, point: { lat: number; lng: number }) => void;
  onRemove?: (id: string) => void;
  /** Opens the Edit stop form for a stop. */
  onEdit?: (id: string) => void;
  /** Label of the direction being edited, e.g. "Going to Sto. Niño". */
  directionLabel?: string;
  /** The opposite direction, drawn faintly for comparison. */
  ghostWaypoints?: Waypoint[];
  ghostLabel?: string;
};

/** Origin and destination terminals cannot be removed; a route keeps at least two stops. */
/**
 * Traffic segments clipped to the current stops. A route with no traffic data yet
 * (e.g. a newly created corridor) is drawn as one "optimal" line.
 */
export function drawnSegments(segments: readonly RouteSegment[], total: number): RouteSegment[] {
  if (total < 2) return [];
  if (segments.length === 0) return [{ from: 0, to: total - 1, level: 'optimal' }];
  return segments
    .filter((segment) => segment.from < total - 1)
    .map((segment, i, list) => ({
      ...segment,
      to: i === list.length - 1 ? total - 1 : Math.min(segment.to, total - 1),
    }));
}

/** Guidance shown instead of the routing status while a corridor has fewer than two stops. */
export function buildHint(total: number): string | null {
  if (total === 0) return 'Use "+ Add Waypoint", then click the map to place the origin terminal';
  if (total === 1) return 'Click "+ Add Waypoint" again to place the destination terminal';
  return null;
}

/**
 * Any stop can be removed while the trip keeps at least two (an origin and a destination).
 * Removing an end stop makes its neighbour the new terminal.
 */
export function canRemove(waypoints: readonly Waypoint[], id: string): boolean {
  return waypoints.length > 2 && waypoints.some((wp) => wp.id === id);
}

export function TrafficLegend({ ghostLabel }: { ghostLabel?: string }) {
  return (
    <>
      {ghostLabel ? (
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendGhost]} />
          <AppText variant="labelSm">{ghostLabel} (other way)</AppText>
        </View>
      ) : null}
      {TRAFFIC_LEGEND.map((item) => (
        <View key={item.level} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: TRAFFIC_COLOR[item.level] }]} />
          <AppText variant="labelSm">{item.label}</AppText>
        </View>
      ))}
    </>
  );
}

const POPOVER_W = 256;

type StopPopoverProps = {
  waypoint: Waypoint;
  radius: number;
  /** Native schematic: float next to the pin at `anchor` (fractions of `frame`). */
  frame?: { w: number; h: number };
  anchor?: { fx: number; fy: number };
  style?: StyleProp<ViewStyle>;
  /** Opens the Edit stop form. */
  onEdit?: () => void;
  onRemove?: () => void;
};

/** Stitch "MANDATORY STOP / N. Escario Central Mall" telemetry card. */
export function StopPopover({ waypoint, radius, frame, anchor, style, onEdit, onRemove }: StopPopoverProps) {
  const floating = frame && anchor;
  let position = {};
  if (floating) {
    const left = Math.max(12, Math.min(frame.w - POPOVER_W - 12, anchor.fx * frame.w - POPOVER_W / 2));
    const below = anchor.fy < 0.55;
    position = below ? { left, top: anchor.fy * frame.h + 28 } : { left, bottom: frame.h - anchor.fy * frame.h + 28 };
  }
  return (
    <View style={[styles.popover, floating ? [styles.popoverFloating, position] : null, style]}>
      <View style={styles.rowBetween}>
        <Badge label={KIND_TITLE[waypoint.kind]} tone="brandSubtle" pill={false} />
        <View style={styles.rowXs}>
          <View style={[styles.dot, { backgroundColor: colors.tertiary }]} />
          <AppText variant="labelSm" color={colors.tertiary}>
            Active
          </AppText>
        </View>
      </View>
      <AppText variant="headlineSm" bold>
        {waypoint.name}
      </AppText>
      <View style={styles.popoverBody}>
        <AppText variant="bodySm" color={colors.onSurfaceVariant} selectable>
          Geo: {formatCoord(waypoint.lat, 'lat')}, {formatCoord(waypoint.lng, 'lng')}
        </AppText>
        <AppText variant="bodySm" color={colors.onSurfaceVariant}>
          Dwell Window:{' '}
          <AppText variant="bodySm" bold>
            {waypoint.dwellSeconds} seconds
          </AppText>
        </AppText>
        <AppText variant="bodySm" color={colors.onSurfaceVariant}>
          Geofence Boundary:{' '}
          <AppText variant="bodySm" bold color={colors.neonOrangeDeep}>
            {radius}m Circular
          </AppText>
          {' • right curb'}
        </AppText>
      </View>
      <View style={styles.popoverFooter}>
        <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
          Wait Density
        </AppText>
        <AppText variant="labelMd" bold color={colors.neonOrangeDeep}>
          {waypoint.paxWaiting} Pax waiting
        </AppText>
      </View>
      {onEdit || onRemove ? (
        <View style={styles.popoverActions}>
          {onEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${waypoint.name}`}
              onPress={onEdit}
              style={({ hovered }: PressState) => [
                styles.removeStop,
                styles.shrinkFlex,
                hovered && styles.editStopHover,
              ]}>
              <Icon name="edit" size={16} color={colors.primaryContainer} />
              <AppText variant="labelMd" bold color={colors.primaryContainer}>
                Edit stop
              </AppText>
            </Pressable>
          ) : null}
          {onRemove ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${waypoint.name} from the route`}
              onPress={onRemove}
              style={({ hovered }: PressState) => [
                styles.removeStop,
                styles.shrinkFlex,
                hovered && styles.removeStopHover,
              ]}>
              <Icon name="delete-outline" size={16} color={colors.error} />
              <AppText variant="labelMd" bold color={colors.error}>
                Remove stop
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
