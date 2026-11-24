import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { CurrentWeek, OpenWeek } from '@packages/tanstack/query/payouts';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Icon } from '@packages/ui/Icon';

import { centavosText, manilaTime, microText, weekText } from './payoutText';
import { styles } from './styles';

const DAY = new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

/** "Tue, Nov 17" for a "YYYY-MM-DD" day. */
const dayText = (day: string) => DAY.format(new Date(`${day}T00:00:00Z`));

type Sum = Pick<
  OpenWeek,
  'views' | 'grossMicro' | 'paraFeeMicro' | 'driversPayCentavos' | 'fleetPayCentavos' | 'remitCentavos'
>;

const sumOf = (fleets: readonly OpenWeek[]): Sum =>
  fleets.reduce<Sum>(
    (t, f) => ({
      views: t.views + f.views,
      grossMicro: t.grossMicro + f.grossMicro,
      paraFeeMicro: t.paraFeeMicro + f.paraFeeMicro,
      driversPayCentavos: t.driversPayCentavos + f.driversPayCentavos,
      fleetPayCentavos: t.fleetPayCentavos + f.fleetPayCentavos,
      remitCentavos: t.remitCentavos + f.remitCentavos,
    }),
    { views: 0, grossMicro: 0, paraFeeMicro: 0, driversPayCentavos: 0, fleetPayCentavos: 0, remitCentavos: 0 },
  );

/**
 * This week so far, before it closes on Monday: every fleet's and driver's accumulated share of the ₱1 views. The
 * same amounts the weekly settlement will use (rounded down, last week's remainders added); they grow until Monday.
 */
export function CurrentWeekSection({
  week,
  loading,
  error,
  refreshing,
  showFleet,
  admin,
  onRefresh,
  onRequestNow,
}: {
  week?: CurrentWeek;
  loading: boolean;
  error?: string;
  refreshing: boolean;
  showFleet: boolean;
  /** Para's staff see what they owe each fleet; a fleet sees what it receives and owes its drivers. */
  admin: boolean;
  onRefresh: () => void;
  /** The fleet cashes out its running total now (fleets only). */
  onRequestNow?: (week: OpenWeek) => void;
}) {
  const fleets = week?.fleets ?? [];
  const all = sumOf(fleets);
  return (
    <View style={styles.section} testID="current-week">
      <View style={styles.cardHead}>
        <View style={styles.cardTitle}>
          <View style={styles.rowWrap}>
            <AppText variant="headlineLg" bold accessibilityRole="header">
              {admin ? 'Not paid out yet' : 'Since your last payout'}
            </AppText>
            <Badge label="Not requested yet" tone="brandSubtle" />
          </View>
          {week ? (
            <AppText variant="bodySm" color={colors.onSurfaceVariant} testID="current-week-period">
              {admin
                ? `Each fleet's ₱1 shares since its last payout • fleets can request any time; the rest closes Monday 12:15 AM • updated ${manilaTime(week.asOf)}`
                : `Request it any time with Request payout now (from ₱1.00), or it closes on Monday 12:15 AM • through ${dayText(week.throughDay)} • updated ${manilaTime(week.asOf)}`}
            </AppText>
          ) : null}
        </View>
        <Button label="Refresh" icon="refresh" variant="ghost" loading={refreshing} onPress={onRefresh} />
      </View>

      {loading ? (
        <Card style={styles.empty}>
          <ActivityIndicator color={colors.primaryContainer} />
        </Card>
      ) : error ? (
        <Card style={styles.empty}>
          <Icon name="cloud-off" size={24} color={colors.error} />
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            {error}
          </AppText>
        </Card>
      ) : fleets.length === 0 ? (
        <Card style={styles.empty}>
          <Icon name="hourglass-empty" size={24} color={colors.onSurfaceVariant} />
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            {admin ? 'No ₱1 views waiting to be paid out.' : 'No ₱1 views since your last payout yet.'}
          </AppText>
        </Card>
      ) : (
        <>
          {showFleet && fleets.length > 1 ? (
            <Card style={styles.card} testID="current-week-all">
              <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                All fleets • {fleets.length} fleets
              </AppText>
              <Totals sum={all} admin={admin} />
            </Card>
          ) : null}
          {fleets.map((f) => (
            <OpenWeekCard key={f.ownerUid} week={f} showFleet={showFleet} admin={admin} onRequestNow={onRequestNow} />
          ))}
        </>
      )}
    </View>
  );
}

function Totals({ sum, admin }: { sum: Sum; admin: boolean }) {
  return admin ? (
    <View style={styles.totals}>
      <Total label="Owed to fleet so far" value={centavosText(sum.remitCentavos)} strong />
      <Total label="For its drivers" value={centavosText(sum.driversPayCentavos)} />
      <Total label="Fleet share" value={centavosText(sum.fleetPayCentavos)} />
      <Total label="Para fee so far" value={microText(sum.paraFeeMicro)} />
      <Total label="Units earned" value={microText(sum.grossMicro)} />
      <Total label="Views shared" value={String(sum.views)} />
    </View>
  ) : (
    <View style={styles.totals}>
      <Total label="To receive so far" value={centavosText(sum.remitCentavos)} strong />
      <Total label="To pay drivers so far" value={centavosText(sum.driversPayCentavos)} />
      <Total label="Your share so far" value={centavosText(sum.fleetPayCentavos)} />
      <Total label="Views shared" value={String(sum.views)} />
    </View>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={[styles.total, strong && styles.totalStrong]}>
      <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
        {label}
      </AppText>
      <AppText variant="metricTabular" color={strong ? colors.primaryContainer : colors.onSurface}>
        {value}
      </AppText>
    </View>
  );
}

/** On-demand payouts start at ₱1.00 (the backend checks too). */
const MIN_REQUEST_CENTAVOS = 100;

function OpenWeekCard({
  week: w,
  showFleet,
  admin,
  onRequestNow,
}: {
  week: OpenWeek;
  showFleet: boolean;
  admin: boolean;
  onRequestNow?: (week: OpenWeek) => void;
}) {
  const enough = w.remitCentavos >= MIN_REQUEST_CENTAVOS;
  return (
    <Card style={styles.card} testID={`open-week-${w.ownerUid}`}>
      <View style={styles.cardHead}>
        <View style={styles.cardTitle}>
          {showFleet ? (
            <AppText variant="headlineSm" bold>
              {w.fleetName}
            </AppText>
          ) : null}
          <AppText variant="bodySm" color={colors.onSurfaceVariant} testID={`open-since-${w.ownerUid}`}>
            {w.sinceMs > 0
              ? `Since the last payout, ${manilaTime(w.sinceMs)}`
              : `Since the first ₱1 view, ${weekText(w.periodStart, w.periodEnd)}`}
          </AppText>
        </View>
        {!admin && onRequestNow ? (
          <View style={styles.actions}>
            {enough ? null : (
              <AppText variant="bodySm" color={colors.onSurfaceVariant}>
                Request from ₱1.00
              </AppText>
            )}
            <Button
              label="Request payout now"
              icon="request-quote"
              variant="primary"
              disabled={!enough}
              onPress={() => onRequestNow(w)}
              testID="request-now"
            />
          </View>
        ) : null}
      </View>
      <Totals sum={w} admin={admin} />
      <View style={styles.lines}>
        {w.lines.map((l) => (
          <View key={l.driverId} style={styles.line} testID={`open-line-${l.driverId}`}>
            <View style={styles.lineWho}>
              <AppText variant="labelLg" bold numberOfLines={1}>
                {l.name}
              </AppText>
              <AppText variant="bodySm" color={colors.onSurfaceVariant} numberOfLines={1}>
                {[l.driverNo, `GCash ${l.gcash || '—'}`, `${l.views} ${l.views === 1 ? 'view' : 'views'}`]
                  .filter(Boolean)
                  .join(' • ')}
              </AppText>
            </View>
            <View style={styles.lineMeta}>
              <Badge
                label={l.status === 'carried' ? 'Under ₱0.01 so far' : 'Accumulating'}
                tone={l.status === 'carried' ? 'neutral' : 'telemetry'}
                uppercase={false}
              />
            </View>
            <View style={styles.lineAmount}>
              <AppText variant="metricTabular">{centavosText(l.payCentavos)}</AppText>
              <AppText variant="bodySm" color={colors.onSurfaceVariant}>
                so far
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
