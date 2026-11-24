/**
 * Para Portal colour tokens, taken from the Stitch "JeepTrack Coop Transit
 * Portal" Tailwind config (Material 3 palette + custom keys). This folder is
 * the only place hex / rgba literals are allowed (ESLint `no-restricted-syntax`).
 */
export const colors = {
  // Stitch Material 3 palette.
  surface: '#f8f9ff',
  surfaceBright: '#f8f9ff',
  surfaceDim: '#cbdbf5',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d3e4fe',
  surfaceVariant: '#d3e4fe',
  surfaceBorder: '#e2e8f0',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#5b4137',
  outline: '#8f7065',
  primary: '#a63b00',
  primaryContainer: '#ff5e00',
  onPrimary: '#ffffff',
  primaryFixed: '#ffdbce',
  secondary: '#565e74',
  secondaryContainer: '#dae2fd',
  onSecondaryContainer: '#5c647a',
  secondaryFixed: '#dae2fd',
  onSecondaryFixed: '#131b2e',
  tertiary: '#006c4b',
  tertiaryContainer: '#00a876',
  onTertiary: '#ffffff',
  tertiaryFixed: '#71fbc0',
  onTertiaryFixed: '#002114',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  crimsonAlert: '#e11d48',
  neonOrangeBright: '#ff6b00',
  neonOrangeDeep: '#ea5200',
  neonOrangeSubtle: '#fff1e8',
  amberFare: '#f59e0b',
  emeraldActive: '#00b37e',

  // Brand (the Stitch CTA overrides use #ff5500).
  brand: '#ff5500',
  brandPressed: '#ea5200',
  onBrand: '#ffffff',

  // Telemetry cyan used by the header pills, sliders and GPS sync.
  telemetry: '#00b4d8',
  telemetryStrong: '#0284c7',
  telemetryTint: '#e0f7fa',
  telemetryInk: '#006064',
  telemetryBorder: 'rgba(0, 180, 216, 0.4)',

  // Route segment colours on the map.
  flowGreen: '#10b981',
  coreBlue: '#2563eb',
  routeShadow: 'rgba(15, 23, 42, 0.15)',

  // Overlays.
  overlay: 'rgba(255, 255, 255, 0.92)',
  scrim: 'rgba(11, 28, 48, 0.4)',
  brandRing: 'rgba(255, 94, 0, 0.35)',
  tertiaryRing: 'rgba(0, 168, 118, 0.3)',
  geofenceFill: 'rgba(255, 94, 0, 0.18)',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;

/** Base-map palettes for the Vector / Satellite / Terrain toggle. */
export const mapPalettes = {
  vector: {
    land: '#eef3ea',
    park: '#cfe8cf',
    water: '#a9d6f5',
    road: '#ffffff',
    roadEdge: '#d9dee8',
    label: '#6b7280',
    district: '#374151',
  },
  satellite: {
    land: '#4b5d43',
    park: '#3c5a35',
    water: '#1f3f5c',
    road: '#9aa3a8',
    roadEdge: '#2f3a2b',
    label: '#e5e7eb',
    district: '#f9fafb',
  },
  terrain: {
    land: '#f1ead8',
    park: '#d8e4c0',
    water: '#b5d4e6',
    road: '#fffaf0',
    roadEdge: '#d6c9a8',
    label: '#7c6f57',
    district: '#4b4232',
  },
} as const;

export type MapStyle = keyof typeof mapPalettes;
