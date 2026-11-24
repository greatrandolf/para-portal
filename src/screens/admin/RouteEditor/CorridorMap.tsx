import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

import { colors, fonts, mapPalettes } from '@/constants/theme';
import { offsetPlanar } from '@/utils/geo';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Card } from '@packages/ui/Card';
import { Icon } from '@packages/ui/Icon';
import { IconButton } from '@packages/ui/IconButton';
import { SegmentedControl } from '@packages/ui/SegmentedControl';

import { styles } from './styles';
import { canRemove, drawnSegments, MAP_TYPES, StopPopover, TrafficLegend, type CorridorMapProps } from './mapShared';
import { numberColors, stopPosition, TRAFFIC_COLOR } from './waypointStyle';
import type { PressState } from '@packages/ui/utils/pressState';

const CANVAS_W = 1000;
const CANVAS_H = 700;
/** Schematic SVG map used on native (the web build uses CorridorMap.web.tsx). */
/** Canvas units per metre of geofence radius (25 m draws the Stitch 54-unit ring). */
const FENCE_SCALE = 54 / 25;
/** Each direction is drawn this many canvas units right of the road centre (right-hand traffic). */
const LANE_OFFSET = 6;
/** Curbside geofence offset, in metres, to the right of travel. */
const CURB_OFFSET_M = 8;
const ZOOM_MIN = 1;
const ZOOM_MAX = 1.8;

const DISTRICTS = [
  { x: 120, y: 60, label: 'BUSAY' },
  { x: 300, y: 215, label: 'LAHUG' },
  { x: 680, y: 230, label: 'MABOLO' },
  { x: 150, y: 430, label: 'GUADALUPE' },
  { x: 330, y: 470, label: 'KAMPUTHAW' },
  { x: 120, y: 600, label: 'TISA' },
  { x: 560, y: 640, label: 'ERMITA' },
];

export function CorridorMap({
  waypoints,
  segments,
  selectedId,
  onSelect,
  radius,
  mapStyle,
  onMapStyleChange,
  simIndex,
  onRemove,
  onEdit,
  ghostWaypoints,
  ghostLabel,
}: CorridorMapProps) {
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const palette = mapPalettes[mapStyle];
  const compact = frame.w > 0 && frame.w < 640;
  const total = waypoints.length;
  const selectedIndex = waypoints.findIndex((wp) => wp.id === selectedId);
  const selected = waypoints[selectedIndex];
  const unit = waypoints[simIndex ?? Math.max(0, selectedIndex)];

  /**
   * Canvas point -> fraction of the frame. Mirrors the SVG's `xMidYMid slice`
   * fit (narrow frames are square and crop the sides), then zooms around the centre.
   */
  const project = (x: number, y: number) => {
    const s = frame.w && frame.h ? Math.max(frame.w / CANVAS_W, frame.h / CANVAS_H) : 1;
    const px = (frame.w - CANVAS_W * s) / 2 + x * s;
    const py = (frame.h - CANVAS_H * s) / 2 + y * s;
    return {
      fx: frame.w ? 0.5 + (px / frame.w - 0.5) * zoom : 0,
      fy: frame.h ? 0.5 + (py / frame.h - 0.5) * zoom : 0,
    };
  };

  const toD = (points: readonly { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  // Offset the whole line once so segment joints line up, then slice per segment.
  const laned = offsetPlanar(waypoints, LANE_OFFSET, true);
  const pathFor = (from: number, to: number) => toD(laned.slice(from, to + 1));
  // Curbside geofence centre: to the right of travel at the selected stop.
  const fence = (() => {
    if (selectedIndex < 0) return null;
    const from = waypoints[Math.max(0, selectedIndex - 1)];
    const to = waypoints[Math.min(total - 1, selectedIndex + 1)];
    const [shifted] = offsetPlanar(
      [
        {
          x: waypoints[selectedIndex].x - (to.x - from.x) * 1e-3,
          y: waypoints[selectedIndex].y - (to.y - from.y) * 1e-3,
        },
        {
          x: waypoints[selectedIndex].x + (to.x - from.x) * 1e-3,
          y: waypoints[selectedIndex].y + (to.y - from.y) * 1e-3,
        },
      ],
      CURB_OFFSET_M * FENCE_SCALE,
      true,
    );
    return shifted;
  })();

  // The last segment always runs to the destination, so inserted waypoints stay coloured.
  const segmentsToDraw = drawnSegments(segments, total);

  return (
    <View style={styles.mapStack}>
      <View
        style={[styles.mapFrame, compact && styles.mapFrameSquare, { backgroundColor: palette.land }]}
        onLayout={(e: LayoutChangeEvent) =>
          setFrame({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }>
        <View style={[styles.mapCanvas, { transform: [{ scale: zoom }] }]} pointerEvents="none">
          <Svg width="100%" height="100%" viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} preserveAspectRatio="xMidYMid slice">
            <Defs>
              <RadialGradient id="geofence" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={colors.primaryContainer} stopOpacity={0.38} />
                <Stop offset="70%" stopColor={colors.primaryContainer} stopOpacity={0.14} />
                <Stop offset="100%" stopColor={colors.primaryContainer} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            {/* Base map: sea, parks, arterials, districts. */}
            <Path
              d="M 1000 260 C 930 330 905 420 945 510 C 975 590 900 650 760 700 L 1000 700 Z"
              fill={palette.water}
            />
            <Ellipse cx={1000} cy={560} rx={60} ry={120} fill={palette.land} />
            <Ellipse cx={540} cy={150} rx={120} ry={60} fill={palette.park} />
            <Ellipse cx={110} cy={340} rx={90} ry={55} fill={palette.park} />
            <Ellipse cx={860} cy={110} rx={70} ry={45} fill={palette.park} />
            <Ellipse cx={420} cy={560} rx={60} ry={35} fill={palette.park} />
            {[
              'M 0 230 L 1000 170',
              'M 90 700 L 330 0',
              'M 0 470 L 940 410',
              'M 470 0 L 660 700',
              'M 0 620 L 720 520',
              'M 260 330 L 880 290',
              'M 780 0 L 640 700',
            ].map((d) => (
              <G key={d}>
                <Path d={d} stroke={palette.roadEdge} strokeWidth={9} fill="none" />
                <Path d={d} stroke={palette.road} strokeWidth={6} fill="none" />
              </G>
            ))}
            {DISTRICTS.map((d) => (
              <SvgText
                key={d.label}
                x={d.x}
                y={d.y}
                fill={palette.label}
                fontSize={15}
                fontFamily={fonts.interBold}
                letterSpacing={2}>
                {d.label}
              </SvgText>
            ))}
            <SvgText x={500} y={500} fill={palette.district} fontSize={30} fontFamily={fonts.jakartaExtraBold}>
              Cebu City
            </SvgText>

            {/* Opposite direction, faint and dashed, for comparison. */}
            {ghostWaypoints && ghostWaypoints.length > 1 ? (
              <Path
                d={toD(offsetPlanar(ghostWaypoints, LANE_OFFSET, true))}
                fill="none"
                stroke={colors.secondary}
                strokeOpacity={0.5}
                strokeWidth={5}
                strokeDasharray="10,8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* Geofence ring around the selected stop. */}
            {selected ? (
              <G>
                <Circle
                  cx={fence?.x ?? selected.x}
                  cy={fence?.y ?? selected.y}
                  r={radius * FENCE_SCALE}
                  fill="url(#geofence)"
                />
                <Circle
                  cx={fence?.x ?? selected.x}
                  cy={fence?.y ?? selected.y}
                  r={radius * FENCE_SCALE}
                  fill="none"
                  stroke={colors.primaryContainer}
                  strokeDasharray="4,4"
                  strokeWidth={1.5}
                />
              </G>
            ) : null}

            {/* Corridor polyline, coloured by live traffic. */}
            <Path
              d={pathFor(0, total - 1)}
              fill="none"
              stroke={colors.routeShadow}
              strokeWidth={12}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {segmentsToDraw.map((segment) => (
              <Path
                key={`${segment.from}-${segment.level}`}
                d={pathFor(segment.from, segment.to)}
                fill="none"
                stroke={TRAFFIC_COLOR[segment.level]}
                strokeWidth={segment.level === 'bottleneck' ? 8 : 7}
                strokeDasharray={segment.level === 'bottleneck' ? '2,6' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Simulated unit GMD-1782. */}
            {unit ? (
              <Circle
                cx={unit.x}
                cy={unit.y}
                r={8}
                fill={colors.surfaceContainerLowest}
                stroke={colors.primaryContainer}
                strokeWidth={3}
              />
            ) : null}
          </Svg>
        </View>

        {/* Pins (kept at a constant size while zooming). */}
        {frame.w > 0
          ? waypoints.map((wp, index) => {
              const position = stopPosition(index, total);
              const isSelected = wp.id === selectedId;
              const { fx, fy } = project(wp.x, wp.y);
              const size = isSelected ? 40 : position === 'middle' ? 28 : 34;
              const pin = numberColors(wp, position, isSelected);
              const showLabel = !compact && !isSelected && (position !== 'middle' || wp.mapLabel);
              // Labels flip to the left of pins near the right edge so they are not clipped.
              const flip = fx > 0.7;
              const horizontal = flip
                ? { right: frame.w - fx * frame.w - size / 2 }
                : { left: fx * frame.w - size / 2 };
              return (
                <View
                  key={wp.id}
                  style={[
                    styles.pinAnchor,
                    flip && styles.pinAnchorReversed,
                    { ...horizontal, top: fy * frame.h - 20, zIndex: isSelected ? 3 : 2 },
                  ]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Stop ${index + 1}: ${wp.name}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => onSelect(wp.id)}
                    style={({ hovered }: PressState) => [
                      styles.pin,
                      { width: size, height: size, backgroundColor: pin.bg },
                      position === 'middle' && !isSelected && wp.kind !== 'transfer' && styles.pinOutlined,
                      isSelected && styles.pinSelected,
                      position !== 'middle' && !isSelected && styles.pinTerminal,
                      hovered && styles.pinHover,
                    ]}>
                    <AppText variant={size > 30 ? 'headlineSm' : 'labelLg'} bold color={pin.fg}>
                      {index + 1}
                    </AppText>
                  </Pressable>
                  {showLabel ? (
                    <View style={styles.pinLabel}>
                      <AppText variant="labelMd" bold numberOfLines={1}>
                        {position === 'middle' ? wp.mapLabel : wp.name}
                      </AppText>
                      {position !== 'middle' && wp.mapLabel ? (
                        <AppText
                          variant="labelSm"
                          color={position === 'origin' ? colors.tertiary : colors.neonOrangeDeep}
                          numberOfLines={1}>
                          {wp.mapLabel}
                        </AppText>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })
          : null}

        {/* Selected stop popover (shown below the map on narrow frames). */}
        {selected && frame.w > 0 && !compact ? (
          <StopPopover
            waypoint={selected}
            radius={radius}
            frame={frame}
            anchor={project(selected.x, selected.y)}
            onEdit={onEdit ? () => onEdit(selected.id) : undefined}
            onRemove={canRemove(waypoints, selected.id) ? () => onRemove?.(selected.id) : undefined}
          />
        ) : null}

        {/* Top-left: map type + road snapping. */}
        <View style={compact ? styles.mapBottomLeft : styles.mapTopLeft}>
          <SegmentedControl segments={MAP_TYPES} value={mapStyle} onChange={onMapStyleChange} />
          {compact ? null : (
            <View style={styles.mapChip}>
              <View style={[styles.dot, { backgroundColor: colors.emeraldActive }]} />
              <AppText variant="labelSm">Road Snapping: OSRM High-Precision Active</AppText>
            </View>
          )}
        </View>

        {/* Top-right: live traffic. */}
        {compact ? null : (
          <View style={styles.mapTopRight}>
            <View style={[styles.mapChip, styles.mapChipLg]}>
              <Icon name="traffic" size={18} color={colors.telemetryStrong} />
              <AppText variant="labelMd" bold>
                Live Traffic Telemetry:
              </AppText>
              <Badge label="Streaming" tone="telemetry" pill={false} />
            </View>
          </View>
        )}

        {/* Bottom-right: zoom, recenter. */}
        <View style={styles.mapControls}>
          <View style={styles.zoomGroup}>
            <IconButton
              icon="add"
              accessibilityLabel="Zoom in"
              onPress={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + 0.2).toFixed(1)))}
            />
            <View style={styles.zoomDivider} />
            <IconButton
              icon="remove"
              accessibilityLabel="Zoom out"
              onPress={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - 0.2).toFixed(1)))}
            />
          </View>
          <IconButton
            icon="my-location"
            variant="card"
            color={colors.primaryContainer}
            accessibilityLabel="Recenter corridor"
            onPress={() => setZoom(1)}
          />
        </View>

        {/* Bottom-left: traffic legend. */}
        {compact ? null : (
          <View style={styles.legend}>
            <TrafficLegend ghostLabel={ghostLabel} />
          </View>
        )}
      </View>
      {/* Narrow frames: legend and stop details move below the map. */}
      {compact ? (
        <>
          <Card padding="sm" style={styles.legendCard}>
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
