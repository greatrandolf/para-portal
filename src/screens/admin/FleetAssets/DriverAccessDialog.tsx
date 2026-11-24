import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { Driver, DriverActivation } from '@/types/fleet';
import { AppText } from '@packages/ui/AppText';
import { Button } from '@packages/ui/Button';
import { Dialog } from '@packages/ui/Dialog';
import { Icon } from '@packages/ui/Icon';
import { QrCode } from '@packages/ui/QrCode';

import { styles } from './styles';

/** Seconds left until `iso`, ticking once a second. */
function useSecondsLeft(iso: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [iso]);
  return iso ? Math.max(0, Math.round((new Date(iso).getTime() - now) / 1000)) : 0;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const STEPS = [
  'On the driver’s phone, open the Para app and choose “I’m a driver”.',
  'Tap “Scan activation code” and point the camera at this code.',
  'The driver sets a 6-digit PIN for that phone. Done.',
];

/**
 * Give a driver access to the driver app: a one-time QR code, shown in person. It works once and expires in 15
 * minutes; the driver never gets a password.
 */
export function DriverAccessDialog({
  driver,
  activation,
  loading,
  error,
  onNewCode,
  onClose,
}: {
  driver: Driver;
  activation?: DriverActivation;
  loading: boolean;
  error?: string;
  onNewCode: () => void;
  onClose: () => void;
}) {
  const left = useSecondsLeft(activation?.expiresAt);
  const expired = !!activation && left === 0;
  const replacing = driver.appAccess === 'active';

  return (
    <Dialog
      visible
      title={`App access for ${driver.name}`}
      subtitle={`${driver.driverNo} • Show this code to the driver in person. Don’t send it as a photo.`}
      onClose={onClose}
      width={520}
      footer={
        <View style={styles.dialogFooter}>
          <Button
            label="Make a new code"
            icon="refresh"
            variant="outline"
            loading={loading}
            disabled={loading}
            onPress={onNewCode}
          />
          <Button label="Done" variant="primary" onPress={onClose} testID="access-done" />
        </View>
      }>
      <View style={styles.accessBody}>
        {replacing ? (
          <View style={styles.accessNote}>
            <Icon name="info-outline" size={18} color={colors.telemetryStrong} />
            <AppText variant="bodySm" color={colors.telemetryInk} style={styles.shrink}>
              {driver.name} already uses the app on a phone. Activating with this code signs that phone out.
            </AppText>
          </View>
        ) : null}
        <View style={styles.qrWrap}>
          {loading && !activation ? (
            <View style={styles.qrPlaceholder}>
              <ActivityIndicator color={colors.primaryContainer} />
            </View>
          ) : error && !activation ? (
            <View style={styles.qrPlaceholder}>
              <Icon name="error-outline" size={28} color={colors.error} />
              <AppText variant="bodySm" color={colors.onSurfaceVariant} align="center">
                {error}
              </AppText>
            </View>
          ) : activation ? (
            <View>
              <QrCode
                value={activation.link}
                size={240}
                accessibilityLabel={`Activation code for ${driver.name}`}
                testID="access-qr"
              />
              {expired ? (
                <View style={styles.qrExpired}>
                  <Icon name="timer-off" size={28} color={colors.onSurface} />
                  <AppText variant="labelLg" bold>
                    Code expired
                  </AppText>
                  <AppText variant="bodySm" color={colors.onSurfaceVariant}>
                    Make a new code to try again.
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}
          {activation && !expired ? (
            <AppText variant="labelLg" bold color={colors.telemetryStrong} testID="access-countdown">
              Expires in {mmss(left)} • works once
            </AppText>
          ) : null}
        </View>
        <View style={styles.gapXs}>
          {STEPS.map((step, i) => (
            <View key={step} style={styles.accessStep}>
              <View style={styles.accessStepNo}>
                <AppText variant="labelSm" bold color={colors.onPrimary}>
                  {i + 1}
                </AppText>
              </View>
              <AppText variant="bodySm" style={styles.shrink}>
                {step}
              </AppText>
            </View>
          ))}
        </View>
        {activation ? (
          <AppText variant="labelSm" color={colors.onSurfaceVariant} selectable numberOfLines={2} testID="access-link">
            Can’t scan? On the driver’s phone, tap “Paste link instead” and enter: {activation.link}
          </AppText>
        ) : null}
      </View>
    </Dialog>
  );
}
