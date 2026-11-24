import { useEffect } from 'react';
import { View } from 'react-native';

import { AppText } from '../AppText';
import { Icon, type IconName } from '../Icon';
import { IconButton } from '../IconButton';
import { colors } from '../theme';
import { styles, toneBg } from './styles';

export type ToastMessage = {
  id: number;
  title: string;
  message?: string;
  icon?: IconName;
  tone?: keyof typeof toneBg;
};

export type ToastProps = {
  toast: ToastMessage | null;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. */
  duration?: number;
  placement?: 'inline' | 'floating';
};

export function Toast({ toast, onDismiss, duration = 5000, placement = 'floating' }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [toast, duration, onDismiss]);

  if (!toast) return null;
  const tone = toast.tone ?? 'success';
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.base, placement === 'floating' && styles.floating, { backgroundColor: toneBg[tone] }]}>
      <View style={styles.iconWrap}>
        <Icon name={toast.icon ?? 'check'} size={20} color={colors.onTertiary} />
      </View>
      <View style={styles.body}>
        <AppText variant="labelLg" bold color={colors.onTertiary}>
          {toast.title}
        </AppText>
        {toast.message ? (
          <AppText variant="bodySm" color={colors.onTertiary}>
            {toast.message}
          </AppText>
        ) : null}
      </View>
      <IconButton
        icon="close"
        size={18}
        color={colors.onTertiary}
        accessibilityLabel="Dismiss notification"
        onPress={onDismiss}
      />
    </View>
  );
}
