import { View } from 'react-native';

import { AppText } from '../AppText';
import { Icon, type IconName } from '../Icon';
import { colors } from '../theme';
import { styles } from './styles';

export type AvatarProps = {
  name: string;
  size?: number;
  /** Small corner marker (e.g. queue position or a verified glyph). */
  marker?: { label?: string; icon?: IconName; tone: 'brand' | 'success' };
};

const PALETTE = [colors.surfaceContainerHigh, colors.neonOrangeSubtle, colors.secondaryContainer, colors.tertiaryFixed];

/** Initials avatar: the Stitch mock photos are not shipped with the app. */
export function Avatar({ name, size = 48, marker }: AvatarProps) {
  const initials = name
    .replace(/".*?"/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const bg = PALETTE[name.length % PALETTE.length];
  return (
    <View style={[styles.base, { width: size, height: size, backgroundColor: bg }]}>
      <AppText variant={size >= 64 ? 'displaySm' : 'headlineSm'} bold color={colors.onSurface}>
        {initials}
      </AppText>
      {marker ? (
        <View
          style={[
            styles.marker,
            { backgroundColor: marker.tone === 'brand' ? colors.primaryContainer : colors.tertiaryContainer },
          ]}>
          {marker.icon ? <Icon name={marker.icon} size={11} color={colors.onPrimary} /> : null}
          {marker.label ? (
            <AppText variant="labelSm" color={colors.onPrimary}>
              {marker.label}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
