import { colors } from '@/constants/theme';
import type { BadgeTone } from '@packages/ui/Badge';
import type { TrafficLevel, Waypoint } from '@/types/route';

export type StopPosition = 'origin' | 'middle' | 'destination';

export function stopPosition(index: number, total: number): StopPosition {
  if (index === 0) return 'origin';
  if (index === total - 1) return 'destination';
  return 'middle';
}

/** Badge for the inspector list (Stitch: TERMINAL / REGULAR / MANDATORY / TRANSFER / CONDITIONAL). */
export function kindBadge(wp: Waypoint, position: StopPosition): { label: string; tone: BadgeTone } {
  switch (wp.kind) {
    case 'terminal':
      return { label: 'Terminal', tone: position === 'destination' ? 'brandSubtle' : 'successSubtle' };
    case 'mandatory':
      return { label: 'Mandatory', tone: 'brand' };
    case 'transfer':
      return { label: 'Transfer', tone: 'info' };
    case 'conditional':
      return { label: 'Conditional', tone: 'neutral' };
    default:
      return { label: 'Regular', tone: 'neutral' };
  }
}

export const KIND_TITLE: Record<Waypoint['kind'], string> = {
  terminal: 'Terminal Hub',
  mandatory: 'Mandatory Stop',
  regular: 'Regular Stop',
  transfer: 'Transfer Point',
  conditional: 'Conditional Stop',
};

/** Numbered circle fill and text colour. */
export function numberColors(wp: Waypoint, position: StopPosition, selected: boolean) {
  if (selected || position === 'destination') return { bg: colors.primaryContainer, fg: colors.onPrimary };
  if (position === 'origin') return { bg: colors.tertiary, fg: colors.onTertiary };
  if (wp.kind === 'transfer') return { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer };
  return { bg: colors.surfaceContainerHigh, fg: colors.onSurface };
}

export const TRAFFIC_COLOR: Record<TrafficLevel, string> = {
  optimal: colors.flowGreen,
  core: colors.coreBlue,
  moderate: colors.amberFare,
  bottleneck: colors.primaryContainer,
};

export const TRAFFIC_LEGEND: { level: TrafficLevel; label: string }[] = [
  { level: 'optimal', label: 'Optimal Flow (>25 km/h)' },
  { level: 'moderate', label: 'Moderate Escario (15-25 km/h)' },
  { level: 'bottleneck', label: 'Colon Bottleneck (<10 km/h)' },
];
