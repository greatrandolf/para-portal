import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { colors } from '@/constants/theme';
import { AppText } from '@packages/ui/AppText';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Icon, type IconName } from '@packages/ui/Icon';

import { styles } from './styles';

type ComingSoonScreenProps = { icon: IconName; title: string; description: string };

/** Placeholder for sidebar sections that have no Stitch design yet. */
export function ComingSoonScreen({ icon, title, description }: ComingSoonScreenProps) {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card padding="lg" style={styles.card}>
        <View style={styles.iconWrap}>
          <Icon name={icon} size={28} color={colors.primaryContainer} />
        </View>
        <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
          In design
        </AppText>
        <AppText variant="displaySm" align="center">
          {title}
        </AppText>
        <AppText variant="bodyMd" color={colors.secondary} align="center">
          {description}
        </AppText>
        <Button
          label="Open Route & Waypoint Editor"
          icon="alt-route"
          variant="muted"
          onPress={() => router.navigate('/routes')}
        />
      </Card>
    </ScrollView>
  );
}
