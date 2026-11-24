import { View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '../AppText';
import { Icon, type IconName } from '../Icon';
import { styles, toneDot, toneStyles, toneText } from './styles';

export type BadgeTone = keyof typeof toneStyles;

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
  icon?: IconName;
  pill?: boolean;
  uppercase?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Badge({ label, tone = 'neutral', dot, icon, pill = true, uppercase = true, style }: BadgeProps) {
  const color = toneText[tone];
  return (
    <View style={[styles.base, !pill && styles.square, toneStyles[tone], style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: toneDot[tone] }]} /> : null}
      {icon ? <Icon name={icon} size={12} color={color} /> : null}
      <AppText variant="labelSm" color={color} uppercase={uppercase} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}
