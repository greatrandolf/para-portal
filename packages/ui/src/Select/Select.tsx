import { useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '../AppText';
import { Icon } from '../Icon';
import { colors } from '../theme';
import type { PressState } from '../utils/pressState';
import { styles } from './styles';

export type SelectOption<T extends string> = { value: T; label: string };

export type SelectProps<T extends string> = {
  options: readonly SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** Lightweight dropdown: a button plus an anchored option list. */
export function Select<T extends string>({ options, value, onChange, accessibilityLabel, style }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);
  return (
    <View style={[styles.wrap, open && styles.wrapOpen, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}: ${current?.label ?? ''}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={({ hovered }: PressState) => [styles.trigger, hovered && styles.triggerHover]}>
        <AppText variant="labelLg" numberOfLines={1} style={styles.label}>
          {current?.label}
        </AppText>
        <Icon name={open ? 'expand-less' : 'expand-more'} size={18} color={colors.onSurfaceVariant} />
      </Pressable>
      {open ? (
        <View accessibilityRole="menu" style={styles.menu}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={({ hovered }: PressState) => [styles.option, (hovered || selected) && styles.optionActive]}>
                <AppText variant="labelLg" bold={selected} color={selected ? colors.neonOrangeDeep : colors.onSurface}>
                  {option.label}
                </AppText>
                {selected ? <Icon name="check" size={16} color={colors.neonOrangeDeep} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
