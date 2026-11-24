import { useId, useState } from 'react';
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { AppText } from '../AppText';
import { colors } from '../theme';
import { styles } from './styles';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Shown under the input when there is no error. */
  hint?: string;
  error?: string;
  required?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Labelled text input with hint and error text, using the portal tokens. */
export function TextField({ label, hint, error, required, style, editable = true, ...input }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  return (
    <View style={[styles.field, style]}>
      <AppText variant="labelMd" bold nativeID={`${id}-label`}>
        {label}
        {required ? <AppText color={colors.error}> *</AppText> : null}
      </AppText>
      <TextInput
        placeholderTextColor={colors.secondary}
        accessibilityLabel={label}
        accessibilityLabelledBy={`${id}-label`}
        aria-invalid={Boolean(error)}
        editable={editable}
        {...input}
        onFocus={(e) => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          input.onBlur?.(e);
        }}
        style={[
          styles.input,
          focused && styles.inputFocused,
          Boolean(error) && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      />
      {error ? (
        <AppText variant="bodySm" color={colors.error} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="bodySm" color={colors.onSurfaceVariant}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
