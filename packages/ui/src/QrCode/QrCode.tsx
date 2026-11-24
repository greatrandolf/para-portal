import QRCode from 'qrcode';
import { useMemo } from 'react';
import { View } from 'react-native';

import { colors } from '../theme';
import { styles } from './styles';

export type QrCodeProps = {
  /** The text to encode, e.g. a deep link. */
  value: string;
  /** Width and height in points, including the quiet zone. */
  size?: number;
  accessibilityLabel: string;
  testID?: string;
};

type Run = { x: number; length: number };

/** Dark modules of each row, merged into horizontal runs so a code needs a few hundred Views, not thousands. */
function toRuns(value: string): { count: number; rows: Run[][] } {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const rows: Run[][] = [];
  for (let y = 0; y < modules.size; y++) {
    const runs: Run[] = [];
    let start = -1;
    for (let x = 0; x <= modules.size; x++) {
      const dark = x < modules.size && modules.data[y * modules.size + x] === 1;
      if (dark && start < 0) start = x;
      if (!dark && start >= 0) {
        runs.push({ x: start, length: x - start });
        start = -1;
      }
    }
    rows.push(runs);
  }
  return { count: modules.size, rows };
}

/** A scannable QR code drawn with plain Views (works on web and native, no canvas or SVG). */
export function QrCode({ value, size = 240, accessibilityLabel, testID }: QrCodeProps) {
  const { count, rows } = useMemo(() => toRuns(value), [value]);
  // Four modules of quiet zone on each side, as the QR spec asks.
  const cell = size / (count + 8);
  const quiet = cell * 4;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.frame, { width: size, height: size }]}>
      {rows.map((runs, y) =>
        runs.map((run) => (
          <View
            key={`${y}-${run.x}`}
            style={{
              position: 'absolute',
              left: quiet + run.x * cell,
              top: quiet + y * cell,
              width: run.length * cell + 0.5,
              height: cell + 0.5,
              backgroundColor: colors.onSurface,
            }}
          />
        )),
      )}
    </View>
  );
}
