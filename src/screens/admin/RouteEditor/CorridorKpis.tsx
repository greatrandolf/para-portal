import { View } from 'react-native';

import { colors } from '@/constants/theme';
import type { TransitRoute } from '@/types/route';
import { formatPeso } from '@/utils/format';
import { AppText } from '@packages/ui/AppText';
import { Card } from '@packages/ui/Card';
import { Icon, type IconName } from '@packages/ui/Icon';

import { styles } from './styles';

type KpiProps = {
  title: string;
  icon: IconName;
  value: string;
  valueColor: string;
  caption: string;
  footer: string;
  footerColor: string;
  footerIcon?: IconName;
};

function Kpi({ title, icon, value, valueColor, caption, footer, footerColor, footerIcon }: KpiProps) {
  return (
    <Card style={styles.kpi}>
      <View style={styles.rowBetween}>
        <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
          {title}
        </AppText>
        <Icon name={icon} size={18} color={colors.onSurfaceVariant} />
      </View>
      <View style={styles.kpiValueRow}>
        <AppText variant="metricDisplay" color={valueColor}>
          {value}
        </AppText>
        <AppText variant="bodySm" color={colors.onSurfaceVariant} style={styles.shrink}>
          {caption}
        </AppText>
      </View>
      <View style={styles.rowXs}>
        {footerIcon ? <Icon name={footerIcon} size={14} color={footerColor} /> : null}
        <AppText variant="labelSm" color={footerColor} style={styles.shrink}>
          {footer}
        </AppText>
      </View>
    </Card>
  );
}

/** Fare, speed cap, and cashback cards under the map. */
export function CorridorKpis({ route, columns }: { route: TransitRoute; columns: boolean }) {
  return (
    <View style={[styles.kpiGrid, columns && styles.kpiGridRow]}>
      <Kpi
        title="Regulated Base Fare"
        icon="payments"
        value={formatPeso(route.baseFare)}
        valueColor={colors.onSurface}
        caption={`+${formatPeso(route.perKmRate)}/km LTFRB rate`}
        footer="Automated Fare Collection Synced"
        footerColor={colors.tertiary}
        footerIcon="check-circle-outline"
      />
      <Kpi
        title="Downtown Speed Cap"
        icon="speed"
        value={`${route.speedCapKmh} km/h`}
        valueColor={colors.neonOrangeDeep}
        caption={route.speedCapZone}
        footer="RTK Geofence auto-penalizes overspeed"
        footerColor={colors.onSurfaceVariant}
      />
      <Kpi
        title="Passenger View Pool"
        icon="savings"
        value={formatPeso(route.cashbackPerTap)}
        valueColor={colors.neonOrangeDeep}
        caption="cashback per ride tap"
        footer="Micro-rewards distribution ready"
        footerColor={colors.tertiary}
      />
    </View>
  );
}
