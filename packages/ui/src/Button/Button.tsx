import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '../AppText';
import { Icon, type IconName } from '../Icon';
import { colors } from '../theme';
import { labelColor, styles, variantStyles } from './styles';
import type { PressState } from '../utils/pressState';

export type ButtonVariant = keyof typeof variantStyles;

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconColor?: string;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'secondary',
  icon,
  iconColor,
  loading,
  disabled,
  size = 'md',
  fullWidth,
  style,
  testID,
}: ButtonProps) {
  const color = labelColor[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed, hovered }: PressState) => [
        styles.base,
        size === 'lg' && styles.lg,
        fullWidth && styles.fullWidth,
        variantStyles[variant],
        (pressed || hovered) && hoverStyle(variant),
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : icon ? (
        <Icon name={icon} size={size === 'lg' ? 20 : 18} color={iconColor ?? color} />
      ) : null}
      <AppText
        variant="labelLg"
        bold={variant === 'primary' || variant === 'success'}
        color={color}
        style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

function hoverStyle(variant: ButtonVariant) {
  if (variant === 'primary') return { backgroundColor: colors.brandPressed };
  if (variant === 'ghost') return { backgroundColor: colors.surfaceContainer };
  if (variant === 'danger') return { backgroundColor: colors.errorContainer };
  if (variant === 'success') return null;
  return { backgroundColor: colors.surfaceContainer };
}
