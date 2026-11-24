import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useCampaignDays } from '@/hooks/useCampaignDays';
import { AppText } from '@packages/ui/AppText';

import { countText, pesoText } from './paraAdsText';
import { styles } from './styles';

/** A Para Ad's last 14 days: views and money spent per day (Manila), live. */
export function CampaignDays({ campaignId }: { campaignId: string }) {
  const { rows, loading, error } = useCampaignDays(campaignId);
  if (loading) return <ActivityIndicator color={colors.brand} />;
  if (error)
    return (
      <AppText variant="bodySm" color={colors.error}>
        {`Daily figures could not be loaded: ${error}`}
      </AppText>
    );
  if (!rows.length)
    return (
      <AppText variant="bodySm" color={colors.onSurfaceVariant}>
        No views yet.
      </AppText>
    );
  return (
    <View style={styles.days} testID={`campaign-${campaignId}-days`}>
      <View style={styles.dayRow}>
        <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant} style={styles.dayCell}>
          Day
        </AppText>
        <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant} style={styles.dayNum}>
          Views
        </AppText>
        <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant} style={styles.dayNum}>
          Spent
        </AppText>
      </View>
      {rows.map((r) => (
        <View key={r.day} style={styles.dayRow}>
          <AppText variant="bodyMd" style={styles.dayCell}>
            {r.day}
          </AppText>
          <AppText variant="bodyMd" style={styles.dayNum}>
            {countText(r.views)}
          </AppText>
          <AppText variant="bodyMd" style={styles.dayNum}>
            {pesoText(r.spentMicro)}
          </AppText>
        </View>
      ))}
    </View>
  );
}
