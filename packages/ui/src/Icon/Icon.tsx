import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { colors } from '../theme';
import { styles } from './styles';

/** Stitch uses Material Symbols in snake_case; MaterialIcons has them in kebab-case. */
export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function Icon({ name, size = 20, color = colors.onSurface, style }: IconProps) {
  return (
    <MaterialIcons
      name={name}
      size={size}
      color={color}
      style={[styles.icon, style]}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
