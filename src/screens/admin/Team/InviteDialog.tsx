import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ROLES, ROLE_DESCRIPTION, ROLE_LABEL, type Role } from '@/constants/roles';
import { colors } from '@/constants/theme';
import { AppText } from '@packages/ui/AppText';
import { Button } from '@packages/ui/Button';
import { Dialog } from '@packages/ui/Dialog';
import { Icon } from '@packages/ui/Icon';
import { TextField } from '@packages/ui/TextField';

import { styles } from './styles';

/** The emailed link, shown so it can also be shared by hand (email may not be set up yet). */
export function InviteLink({ email, url }: { email: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <View style={styles.linkBox} testID="invite-link">
      <View style={styles.rowSm}>
        <Icon name="mark-email-read" size={20} color={colors.telemetryStrong} />
        <AppText variant="labelLg" bold style={styles.shrink}>
          Invite queued for {email}
        </AppText>
      </View>
      <AppText variant="bodySm" color={colors.telemetryInk}>
        The email goes out once the email extension is set up. You can also send this link yourself. It works once and
        expires in 7 days.
      </AppText>
      <AppText variant="labelSm" selectable numberOfLines={2} style={styles.linkText} testID="invite-url">
        {url}
      </AppText>
      <Button
        label={copied ? 'Copied' : 'Copy link'}
        icon={copied ? 'check' : 'content-copy'}
        variant="outline"
        onPress={() => {
          void Clipboard.setStringAsync(url).then(() => setCopied(true));
        }}
      />
    </View>
  );
}

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Step 1 of joining: a super admin invites an email with a role. */
export function InviteDialog({
  submitting,
  serverError,
  sent,
  onInvite,
  onClose,
}: {
  submitting: boolean;
  serverError?: string;
  /** Set after a successful invite: shows the link instead of the form. */
  sent?: { email: string; url: string };
  onInvite: (input: { email: string; role: Role; name?: string }) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('fleet');
  const [submitted, setSubmitted] = useState(false);
  const emailError = submitted && !isEmail(email) ? 'Enter a valid email address.' : undefined;

  return (
    <Dialog
      visible
      title={sent ? 'Invite sent' : 'Invite a team member'}
      subtitle={
        sent
          ? undefined
          : 'They get an email with a link to fill in their details and choose a password, then they sign in.'
      }
      onClose={onClose}
      footer={
        <View style={styles.dialogFooter}>
          {sent ? (
            <Button label="Done" variant="primary" onPress={onClose} />
          ) : (
            <>
              <Button label="Cancel" variant="ghost" onPress={onClose} />
              <Button
                label="Send invite"
                icon="send"
                variant="primary"
                loading={submitting}
                disabled={submitting}
                testID="send-invite"
                onPress={() => {
                  setSubmitted(true);
                  if (!isEmail(email)) return;
                  onInvite({ email: email.trim(), role, name: name.trim() || undefined });
                }}
              />
            </>
          )}
        </View>
      }>
      {sent ? (
        <InviteLink email={sent.email} url={sent.url} />
      ) : (
        <View style={styles.dialogBody}>
          <TextField
            label="Email"
            required
            placeholder="name@cooperative.ph"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            testID="invite-email-input"
          />
          <TextField
            label="Name (optional)"
            placeholder="Shown on their form; they can change it"
            value={name}
            onChangeText={setName}
          />
          <View style={styles.gapXs}>
            <AppText variant="labelMd" bold>
              Role
            </AppText>
            <View style={styles.roleCards} accessibilityRole="radiogroup" accessibilityLabel="Role">
              {ROLES.map((r) => {
                const on = r === role;
                return (
                  <Pressable
                    key={r}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => setRole(r)}
                    style={[styles.roleCard, on && styles.roleCardOn]}
                    testID={`invite-role-${r}`}>
                    <Icon
                      name={on ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={20}
                      color={on ? colors.brand : colors.outline}
                    />
                    <View style={styles.roleCardText}>
                      <AppText variant="labelLg" bold>
                        {ROLE_LABEL[r]}
                      </AppText>
                      <AppText variant="bodySm" color={colors.onSurfaceVariant}>
                        {ROLE_DESCRIPTION[r]}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {serverError ? (
            <View style={styles.warning} accessibilityRole="alert">
              <Icon name="error-outline" size={18} color={colors.onErrorContainer} />
              <AppText variant="bodySm" color={colors.onErrorContainer} style={styles.shrink}>
                {serverError}
              </AppText>
            </View>
          ) : null}
        </View>
      )}
    </Dialog>
  );
}
