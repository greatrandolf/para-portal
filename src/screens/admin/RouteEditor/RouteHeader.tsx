import { View } from 'react-native';

import { colors } from '@/constants/theme';
import type { TransitRoute } from '@/types/route';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { IconButton } from '@packages/ui/IconButton';

import { styles } from './styles';

type RouteHeaderProps = {
  route: TransitRoute;
  publishing: boolean;
  /** A route or stop change is being saved to the backend. */
  saving?: boolean;
  /** Back to the routes list. */
  onBack: () => void;
  /** Opens the route details form (edit / delete). */
  onEditRoute: () => void;
  onAddWaypoint: () => void;
  /** Web placing mode is active (the button becomes Cancel). */
  placing?: boolean;
  onReverse: () => void;
  onImport: () => void;
  onPublish: () => void;
};

/** Route selector, quick actions, and the "Publish to Fleet" CTA. */
export function RouteHeader({
  route,
  publishing,
  saving,
  onBack,
  onEditRoute,
  onAddWaypoint,
  placing,
  onReverse,
  onImport,
  onPublish,
}: RouteHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Card padding="sm" style={styles.routeCard}>
          <IconButton
            icon="arrow-back"
            color={colors.onSurfaceVariant}
            accessibilityLabel="All routes"
            onPress={onBack}
          />
          <View style={styles.routeCode}>
            <AppText variant="headlineLg" bold color={colors.onPrimary}>
              {route.code}
            </AppText>
          </View>
          <View style={styles.shrink}>
            <View style={styles.rowWrap}>
              <AppText variant="headlineSm" bold>
                {route.name}
              </AppText>
              <Badge
                label={route.status === 'active' ? 'Active Loop' : 'Paused'}
                tone={route.status === 'active' ? 'success' : 'neutral'}
              />
              <AppText variant="labelSm" color={colors.onSurfaceVariant} testID="save-state">
                {saving ? 'Saving…' : 'All changes saved'}
              </AppText>
            </View>
            <View style={styles.rowWrap}>
              <AppText variant="bodySm" color={colors.onSurfaceVariant}>
                {route.roundtripKm ? `${route.roundtripKm} km roundtrip` : 'New corridor'}
              </AppText>
              <AppText variant="bodySm" color={colors.onSurfaceVariant}>
                •
              </AppText>
              <AppText variant="bodySm" bold color={colors.tertiary}>
                {route.syncedUnits} modern jeepneys synced
              </AppText>
              <AppText variant="bodySm" color={colors.onSurfaceVariant}>
                •
              </AppText>
              <AppText variant="bodySm" color={colors.onSurfaceVariant}>
                Headway: {route.headway}
              </AppText>
            </View>
          </View>
          <IconButton
            icon="edit"
            color={colors.onSurfaceVariant}
            accessibilityLabel="Edit route details"
            onPress={onEditRoute}
          />
        </Card>
        <View style={styles.actionsRow}>
          <Button
            label={placing ? 'Cancel placing' : '+ Add Waypoint'}
            variant={placing ? 'muted' : 'secondary'}
            icon="add-location-alt"
            iconColor={colors.primaryContainer}
            onPress={onAddWaypoint}
          />
          <Button label="Reverse to Return Trip" icon="swap-vert" onPress={onReverse} />
          <Button label="Import KML/GPX" icon="file-upload" iconColor={colors.secondary} onPress={onImport} />
        </View>
      </View>
      <Button
        label={`Publish to Fleet (${route.fleetUnits} Units)`}
        icon="satellite-alt"
        variant="primary"
        size="lg"
        loading={publishing}
        onPress={onPublish}
        testID="publish-button"
      />
    </View>
  );
}
