import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { RouteForm, type NewRouteTerminals } from '@/components/RouteForm';
import { colors } from '@/constants/theme';
import type { CreateRouteInput, DirectionSummary, RouteSummary } from '@/types/route';
import { formatRelative } from '@/utils/format';
import { useCreateRoute, useRoutes } from '@packages/tanstack/query/routes';
import { useBreakpoint } from '@packages/responsive/useBreakpoint';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Icon } from '@packages/ui/Icon';
import { TextField } from '@packages/ui/TextField';
import type { PressState } from '@packages/ui/utils/pressState';

import { styles } from './styles';

/** "Going to Sto. Niño" -> "To Sto. Niño". */
const shortLabel = (label: string) => {
  const short = label.replace(/^going\s+/i, '').trim() || label;
  return short.charAt(0).toUpperCase() + short.slice(1);
};

/** Cooperative routes (17B, 17C, 17D, …). Tapping a row opens its map editor. */
export function RoutesListScreen() {
  const router = useRouter();
  const routes = useRoutes();
  const createRoute = useCreateRoute();
  const { isPhone } = useBreakpoint();
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [createError, setCreateError] = useState<string>();

  const q = query.trim().toLowerCase();
  const visible = (routes.data ?? []).filter(
    (r) => !q || r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q),
  );
  const active = routes.data?.filter((r) => r.status === 'active').length ?? 0;
  const stops = routes.data?.reduce((n, r) => n + r.directions.outbound.stops + r.directions.inbound.stops, 0) ?? 0;

  const openRoute = (routeId: string) => router.push({ pathname: '/routes/[routeId]', params: { routeId } });

  const handleCreate = (input: CreateRouteInput, terminals: NewRouteTerminals) => {
    setCreateError(undefined);
    createRoute.mutate(input, {
      onSuccess: (created) => {
        setFormOpen(false);
        // The editor opens ready to place the terminals, named after the form.
        router.push({
          pathname: '/routes/[routeId]',
          params: { routeId: created.id, build: '1', origin: terminals.origin, destination: terminals.destination },
        });
      },
      onError: (error) => setCreateError(error.message),
    });
  };

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.page, isPhone && styles.pagePhone]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
              Route & Waypoint Editor
            </AppText>
            <AppText variant="displaySm" bold>
              Routes
            </AppText>
            <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
              Every corridor your cooperative runs. Open one to edit its trips and stops on the map.
            </AppText>
          </View>
          <Button
            label="New route"
            icon="add-road"
            variant="primary"
            size="lg"
            onPress={() => {
              setCreateError(undefined);
              setFormOpen(true);
            }}
            testID="new-route"
          />
        </View>

        <View style={styles.toolbar}>
          <TextField
            label="Search routes"
            placeholder="Code or name, e.g. 17C"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            style={styles.search}
          />
          {routes.data ? (
            <View style={styles.summary}>
              <SummaryPill icon="alt-route" text={`${routes.data.length} routes`} />
              <SummaryPill icon="check-circle" text={`${active} active`} />
              <SummaryPill icon="place" text={`${stops} stops`} />
            </View>
          ) : null}
        </View>

        {routes.isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primaryContainer} />
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              Loading routes…
            </AppText>
          </View>
        ) : routes.error ? (
          <Card style={styles.state}>
            <Icon name="cloud-off" size={28} color={colors.error} />
            <AppText variant="headlineSm" bold>
              Routes could not be loaded
            </AppText>
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              {routes.error.message}
            </AppText>
            <Button
              label="Try again"
              icon="refresh"
              loading={routes.isFetching}
              onPress={() => void routes.refetch()}
            />
          </Card>
        ) : visible.length === 0 ? (
          <Card style={styles.state}>
            <Icon name="alt-route" size={28} color={colors.secondary} />
            <AppText variant="headlineSm" bold>
              {q ? `No routes match “${query.trim()}”` : 'No routes yet'}
            </AppText>
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              {q ? 'Try another code or name.' : 'Create the first corridor, then place its stops on the map.'}
            </AppText>
            {q ? null : (
              <Button label="New route" icon="add-road" variant="primary" onPress={() => setFormOpen(true)} />
            )}
          </Card>
        ) : (
          <View style={styles.list}>
            {visible.map((route) => (
              <RouteRow key={route.id} route={route} phone={isPhone} onPress={() => openRoute(route.id)} />
            ))}
          </View>
        )}
      </ScrollView>

      {formOpen ? (
        <RouteForm
          mode="create"
          visible
          submitting={createRoute.isPending}
          serverError={createError}
          onCreate={handleCreate}
          onClose={() => setFormOpen(false)}
        />
      ) : null}
    </View>
  );
}

function SummaryPill({ icon, text }: { icon: 'alt-route' | 'check-circle' | 'place'; text: string }) {
  return (
    <View style={styles.summaryPill}>
      <Icon name={icon} size={16} color={colors.telemetryStrong} />
      <AppText variant="labelMd" bold>
        {text}
      </AppText>
    </View>
  );
}

function TripChip({ arrow, trip }: { arrow: '→' | '←'; trip: DirectionSummary }) {
  // A trip needs an origin and a destination before it can run.
  const incomplete = trip.stops < 2;
  return (
    <View style={[styles.trip, incomplete && styles.tripWarn]}>
      <AppText variant="labelMd" bold color={incomplete ? colors.onErrorContainer : colors.onSurface}>
        {arrow} {shortLabel(trip.label)}
      </AppText>
      <AppText variant="labelSm" color={incomplete ? colors.onErrorContainer : colors.onSurfaceVariant}>
        {trip.stops === 0 ? 'no stops yet' : `${trip.stops} stop${trip.stops === 1 ? '' : 's'}`}
      </AppText>
    </View>
  );
}

function RouteRow({ route, phone, onPress }: { route: RouteSummary; phone: boolean; onPress: () => void }) {
  const paused = route.status !== 'active';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open route ${route.code}, ${route.name}`}
      onPress={onPress}
      style={({ hovered, pressed }: PressState) => [
        styles.row,
        phone && styles.rowPhone,
        hovered && styles.rowHover,
        pressed && styles.rowPressed,
      ]}
      testID={`route-row-${route.code}`}>
      <View style={[styles.code, paused && styles.codePaused, phone && styles.codePhone]}>
        <AppText variant={phone ? 'labelLg' : 'headlineSm'} bold color={colors.onPrimary}>
          {route.code}
        </AppText>
      </View>
      <View style={styles.main}>
        <View style={styles.titleRow}>
          <AppText variant="headlineSm" bold numberOfLines={1}>
            {route.name}
          </AppText>
          <Badge label={paused ? 'Paused' : 'Active'} tone={paused ? 'neutral' : 'success'} />
        </View>
        <View style={styles.trips}>
          <TripChip arrow="→" trip={route.directions.outbound} />
          <TripChip arrow="←" trip={route.directions.inbound} />
        </View>
        <AppText variant="bodySm" color={colors.onSurfaceVariant} numberOfLines={1}>
          Headway {route.headway} • Franchise {route.franchiseId} • Updated {formatRelative(route.updatedAt)}
        </AppText>
      </View>
      {phone ? null : <Icon name="chevron-right" size={24} color={colors.onSurfaceVariant} />}
    </Pressable>
  );
}
