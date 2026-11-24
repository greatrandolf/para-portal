import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';

import { AppText } from '../AppText';
import { IconButton } from '../IconButton';
import { colors } from '../theme';
import { styles } from './styles';

export type DialogProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Action buttons, right-aligned under a divider. */
  footer?: ReactNode;
  /** Max panel width in px (default 560). */
  width?: number;
};

/** Centred modal panel with a title, scrollable body, and optional footer. Tapping the backdrop closes it. */
export function Dialog({ visible, title, subtitle, onClose, children, footer, width = 560 }: DialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close dialog" />
        <View style={[styles.panel, { maxWidth: width }]} accessibilityViewIsModal role="dialog" aria-label={title}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <AppText variant="headlineLg" bold>
                {title}
              </AppText>
              {subtitle ? (
                <AppText variant="bodySm" color={colors.onSurfaceVariant}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            <IconButton icon="close" color={colors.onSurfaceVariant} accessibilityLabel="Close" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
