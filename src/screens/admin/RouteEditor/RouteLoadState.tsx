import { ActivityIndicator, View } from 'react-native';

import { FUNCTIONS_URL } from '@/constants/api';
import { colors } from '@/constants/theme';
import { AppText } from '@packages/ui/AppText';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Icon } from '@packages/ui/Icon';

import { styles } from './styles';

type RouteLoadStateProps =
  | { state: 'loading' }
  | { state: 'error'; message: string; onRetry: () => void; retrying: boolean; onBack?: () => void }
  | { state: 'empty'; onRetry: () => void; retrying: boolean; onNewRoute?: () => void };

/** Shown while a route loads from para-backend, or when it cannot be loaded. */
export function RouteLoadState(props: RouteLoadStateProps) {
  if (props.state === 'loading') {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={colors.primaryContainer} />
        <AppText variant="bodySm" color={colors.onSurfaceVariant}>
          Loading route from the dispatch backend…
        </AppText>
      </View>
    );
  }

  const isError = props.state === 'error';
  return (
    <View style={styles.empty}>
      <Card style={styles.loadCard}>
        <Icon name={isError ? 'cloud-off' : 'alt-route'} size={28} color={isError ? colors.error : colors.secondary} />
        <AppText variant="headlineSm" bold>
          {isError ? 'Route could not be loaded' : 'No routes yet'}
        </AppText>
        <AppText variant="bodySm" color={colors.onSurfaceVariant} style={styles.loadText}>
          {isError
            ? props.message
            : 'The cooperative has no routes yet. Create the first corridor, or seed Route 17B with `npm run seed` in para-backend/functions.'}
        </AppText>
        {isError ? null : (
          <AppText variant="labelSm" color={colors.onSurfaceVariant} style={styles.loadText}>
            Backend: {FUNCTIONS_URL}
          </AppText>
        )}
        {props.state === 'empty' && props.onNewRoute ? (
          <Button label="New route" icon="add-road" variant="primary" onPress={props.onNewRoute} />
        ) : null}
        <Button label="Try again" icon="refresh" loading={props.retrying} onPress={props.onRetry} />
        {props.state === 'error' && props.onBack ? (
          <Button label="All routes" icon="arrow-back" variant="muted" onPress={props.onBack} />
        ) : null}
      </Card>
    </View>
  );
}
