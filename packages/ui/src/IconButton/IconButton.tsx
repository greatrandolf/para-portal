import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '../Icon';
import { colors } from '../theme';
import { styles } from './styles';
import type { PressState } from '../utils/pressState';

export type IconButtonProps = {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  color?: string;
  size?: number;
  variant?: 'plain' | 'card';
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color = colors.onSurface,
  size = 20,
  variant = 'plain',
  style,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed, hovered }: PressState) => [
        styles.base,
        variant === 'card' && styles.card,
        (pressed || hovered) && styles.hover,
        style,
      ]}>
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}
