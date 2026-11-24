import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { styles } from './styles';

export type CardProps = ViewProps & {
  padding?: 'sm' | 'md' | 'lg' | 'none';
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ padding = 'md', elevated, style, ...rest }: CardProps) {
  return <View {...rest} style={[styles.base, styles[padding], elevated && styles.elevated, style]} />;
}
