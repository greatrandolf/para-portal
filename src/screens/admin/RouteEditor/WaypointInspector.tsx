import { Pressable, ScrollView, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { DirectionKey, RouteDirection, Waypoint } from '@/types/route';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Icon } from '@packages/ui/Icon';
import { SegmentedControl } from '@packages/ui/SegmentedControl';
import { Slider } from '@packages/ui/Slider';

import { styles } from './styles';
import { kindBadge, numberColors, stopPosition } from './waypointStyle';
import type { PressState } from '@packages/ui/utils/pressState';

export type SimStatus = 'standby' | 'running' | 'passed';

type WaypointInspectorProps = {
  waypoints: Waypoint[];
  selectedId: string;
  onSelect: (id: string) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  simStatus: SimStatus;
  onSimulate: () => void;
  unitId: string;
  direction: DirectionKey;
  onDirectionChange: (direction: DirectionKey) => void;
  directions: Record<DirectionKey, RouteDirection>;
  /** Builds the return trip from the outbound stops (shown while the return trip is empty). */
  onBuildReturn?: () => void;
  buildingReturn?: boolean;
};

/** "Going to Sto. Niño" -> "To Sto. Niño"; "Going back to IT Park" -> "Back to IT Park". */
function tabLabel(label: string): string {
  const short = label.replace(/^going\s+/i, '').trim() || label;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

const SIM_TAG: Record<SimStatus, { label: string; color: string }> = {
  standby: { label: 'STANDBY', color: colors.telemetryStrong },
  running: { label: 'RUNNING SIMULATION', color: colors.neonOrangeDeep },
  passed: { label: 'PASSED (0 ERRORS)', color: colors.tertiary },
};

/** Right-hand "Corridor Inspector: Waypoints & Geofences" panel. */
export function WaypointInspector({
  waypoints,
  selectedId,
  onSelect,
  radius,
  onRadiusChange,
  simStatus,
  onSimulate,
  unitId,
  direction,
  onDirectionChange,
  directions,
  onBuildReturn,
  buildingReturn,
}: WaypointInspectorProps) {
  const tag = SIM_TAG[simStatus];
  const outboundCount = directions.outbound.waypoints.length;
  const canBuildReturn = Boolean(onBuildReturn) && outboundCount >= 2 && directions.inbound.waypoints.length === 0;
  return (
    <Card padding="lg" elevated style={styles.inspector}>
      <View style={styles.rowBetween}>
        <View style={styles.shrink}>
          <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
            Corridor Inspector
          </AppText>
          <AppText variant="headlineLg" bold>
            Waypoints & Geofences
          </AppText>
        </View>
        <View style={styles.countPill}>
          <AppText variant="labelMd" bold>
            {waypoints.length} Stops Total
          </AppText>
        </View>
      </View>

      <View style={styles.radiusBox}>
        <View style={styles.rowBetween}>
          <AppText variant="labelMd" bold style={styles.shrink}>
            Standard Geofence Radius
          </AppText>
          <AppText variant="metricTabular" bold color={colors.telemetryStrong} testID="radius-value">
            {radius} meters
          </AppText>
        </View>
        <Slider
          value={radius}
          min={20}
          max={50}
          onChange={onRadiusChange}
          accessibilityLabel="Standard geofence radius in meters"
          testID="radius-slider"
        />
        <View style={styles.rowBetween}>
          <AppText variant="labelSm" color={colors.onSurfaceVariant}>
            20m (Tight Street)
          </AppText>
          <AppText variant="labelSm" color={colors.onSurfaceVariant}>
            35m (Avenue)
          </AppText>
          <AppText variant="labelSm" color={colors.onSurfaceVariant}>
            50m (Terminal Hub)
          </AppText>
        </View>
      </View>

      <View style={styles.directionBox}>
        <SegmentedControl
          variant="white"
          value={direction}
          onChange={onDirectionChange}
          style={styles.directionTabs}
          segments={[
            { value: 'outbound', label: `→ ${tabLabel(directions.outbound.label)}`, count: outboundCount },
            {
              value: 'inbound',
              label: `← ${tabLabel(directions.inbound.label)}`,
              count: directions.inbound.waypoints.length,
            },
          ]}
        />
        <View style={styles.rowXs}>
          <Icon name="alt-route" size={14} color={colors.onSurfaceVariant} />
          <AppText variant="labelSm" color={colors.onSurfaceVariant} style={styles.shrink}>
            {directions[direction].via}
          </AppText>
        </View>
      </View>

      {waypoints.length < 2 && !(direction === 'inbound' && canBuildReturn) ? (
        <View style={styles.buildCard}>
          <View style={styles.rowXs}>
            <Icon name="add-location-alt" size={18} color={colors.primaryContainer} />
            <AppText variant="labelMd" bold>
              {waypoints.length === 0 ? 'Place the origin terminal' : 'Place the destination terminal'}
            </AppText>
          </View>
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            {`Use “+ Add Waypoint”, then click the map. The first stop is where “${directions[direction].label}” starts, the second is where it ends; later stops go in between.`}
          </AppText>
        </View>
      ) : null}

      {canBuildReturn ? (
        <View style={styles.buildCard}>
          <View style={styles.rowXs}>
            <Icon name="swap-vert" size={18} color={colors.primaryContainer} />
            <AppText variant="labelMd" bold>
              {directions.inbound.label} has no stops yet
            </AppText>
          </View>
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            Mirror the {outboundCount} outbound stops in reverse, then drag or add stops so the return trip can use
            different roads.
          </AppText>
          <Button
            label="Build return trip"
            icon="swap-vert"
            variant="primary"
            loading={buildingReturn}
            onPress={onBuildReturn}
            testID="build-return"
          />
        </View>
      ) : null}

      <ScrollView style={styles.waypointList} contentContainerStyle={styles.waypointListContent} nestedScrollEnabled>
        {waypoints.map((wp, index) => {
          const position = stopPosition(index, waypoints.length);
          const isSelected = wp.id === selectedId;
          const badge = kindBadge(wp, position);
          const num = numberColors(wp, position, isSelected);
          return (
            <Pressable
              key={wp.id}
              accessibilityRole="button"
              accessibilityLabel={`Select stop ${index + 1}, ${wp.name}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(wp.id)}
              style={({ hovered }: PressState) => [
                styles.waypointItem,
                hovered && !isSelected && styles.waypointItemHover,
                isSelected && styles.waypointItemSelected,
              ]}>
              <View style={[styles.rowSm, styles.shrink]}>
                <Icon
                  name="drag-indicator"
                  size={18}
                  color={isSelected ? colors.primaryContainer : colors.onSurfaceVariant}
                />
                <View style={[styles.numberCircle, { backgroundColor: num.bg }]}>
                  <AppText variant="labelMd" bold color={num.fg}>
                    {index + 1}
                  </AppText>
                </View>
                <View style={styles.shrink}>
                  <AppText variant="labelLg" bold numberOfLines={2}>
                    {wp.name}
                  </AppText>
                  <AppText
                    variant="labelSm"
                    color={isSelected ? colors.neonOrangeDeep : colors.onSurfaceVariant}
                    numberOfLines={2}>
                    {isSelected ? `Active Selected • ${radius}m Fence` : `${wp.role} • ${wp.dwellSeconds}s dwell`}
                  </AppText>
                </View>
              </View>
              <Badge label={badge.label} tone={badge.tone} pill={false} />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.simCard}>
        <View style={styles.rowBetween}>
          <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
            Corridor Sanity Test
          </AppText>
          <AppText variant="labelSm" color={tag.color} testID="sim-status">
            {tag.label}
          </AppText>
        </View>
        <AppText variant="bodySm" color={colors.onSurfaceVariant}>
          Run virtual test packet across the {waypoints.length} geofences to verify headway sync and auto-fare rules.
        </AppText>
        <Button
          label={simStatus === 'running' ? 'Simulation running…' : `Simulate Unit ${unitId} run`}
          icon="play-circle-outline"
          iconColor={colors.brand}
          variant="outline"
          disabled={simStatus === 'running'}
          onPress={onSimulate}
          testID="simulate-button"
        />
      </View>
    </Card>
  );
}

type CertificationCardProps = { franchiseId: string };

export function CertificationCard({ franchiseId }: CertificationCardProps) {
  return (
    <Card style={styles.certCard}>
      <View style={styles.certIcon}>
        <Icon name="verified" size={24} color={colors.onTertiary} />
      </View>
      <View style={styles.shrink}>
        <AppText variant="labelLg" bold>
          LTFRB Region VII Certified
        </AppText>
        <AppText variant="bodySm" color={colors.onSurfaceVariant}>
          CPC Franchise ID: {franchiseId}
        </AppText>
        <AppText variant="labelSm" color={colors.tertiary}>
          Route Integrity Verified
        </AppText>
      </View>
    </Card>
  );
}
