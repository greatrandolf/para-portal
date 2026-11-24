import { Text, type TextProps } from 'react-native';

import { boldFamily, colors, typography, type TypographyVariant } from '../theme';
import { styles } from './styles';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  bold?: boolean;
  uppercase?: boolean;
  align?: 'left' | 'center' | 'right';
};

/** Text with the portal type scale (Inter body/labels, Plus Jakarta Sans headlines). */
export function AppText({
  variant = 'bodyMd',
  color = colors.onSurface,
  bold,
  uppercase,
  align,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        typography[variant],
        bold && { fontFamily: boldFamily[variant] },
        uppercase && styles.uppercase,
        align && { textAlign: align },
        { color },
        style,
      ]}
    />
  );
}
