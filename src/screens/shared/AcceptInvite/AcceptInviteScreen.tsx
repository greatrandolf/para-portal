import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { ROLE_DESCRIPTION, isRole } from '@/constants/roles';
import { colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAcceptInvite, useInviteLookup } from '@packages/tanstack/query/users';
import { useBreakpoint } from '@packages/responsive/useBreakpoint';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Icon } from '@packages/ui/Icon';
import { TextField } from '@packages/ui/TextField';

import { styles } from './styles';

type Values = { name: string; phone: string; password: string; confirm: string };
type Errors = Partial<Record<keyof Values, string>>;

/** Same rules as the backend (para-backend users/model.ts); the server checks again. */
function validate(v: Values): Errors {
  const errors: Errors = {};
  if (!v.name.trim()) errors.name = 'Enter your full name.';
  else if (v.name.trim().length > 80) errors.name = 'Use at most 80 characters.';
  if (!/^09\d{2}-?\d{3}-?\d{4}$/.test(v.phone.trim())) errors.phone = 'Use a PH mobile number, e.g. 0917-552-8901.';
  if (v.password.length < 10 || !/[A-Za-z]/.test(v.password) || !/\d/.test(v.password)) {
    errors.password = 'At least 10 characters, with letters and numbers.';
  }
  if (v.confirm !== v.password) errors.confirm = 'The passwords do not match.';
  return errors;
}

/**
 * Step 2 of joining: the link from the invite email opens this page. The invitee fills in their details and
 * picks a password; the account is created with the invited role, then they sign in (step 3).
 */
export function AcceptInviteScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { isPhone } = useBreakpoint();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : undefined;
  const invite = useInviteLookup(token);
  const accept = useAcceptInvite();
  // name is null until edited, so the name the inviter typed shows as a starting value.
  const [values, setValues] = useState<Omit<Values, 'name'> & { name: string | null }>({
    name: null,
    phone: '',
    password: '',
    confirm: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const current: Values = { ...values, name: values.name ?? invite.data?.name ?? '' };
  const errors = validate(current);
  const shown = submitted ? errors : {};
  const set = (patch: Partial<Values>) => setValues((v) => ({ ...v, ...patch }));

  const submit = () => {
    setSubmitted(true);
    if (!token || Object.keys(errors).length) return;
    accept.mutate(
      { token, name: current.name.trim(), phone: current.phone.trim(), password: current.password },
      {
        onSuccess: ({ email }) => router.replace({ pathname: '/login', params: { email, welcome: '1' } }),
      },
    );
  };

  let body;
  if (!token) {
    body = <Problem title="Invite link incomplete" text="Open the link from your invite email again." />;
  } else if (invite.isLoading) {
    body = (
      <View style={styles.state}>
        <ActivityIndicator color={colors.primaryContainer} />
        <AppText variant="bodySm" color={colors.onSurfaceVariant}>
          Checking your invite…
        </AppText>
      </View>
    );
  } else if (invite.error || !invite.data) {
    body = (
      <Problem
        title="This invite can't be used"
        text={invite.error?.message ?? 'Ask your super admin for a new invite.'}
        onSignIn={() => router.replace('/login')}
      />
    );
  } else if (auth.status === 'signedIn') {
    body = (
      <Problem
        title="You're signed in as someone else"
        text={`Sign out of ${auth.user.email ?? 'this account'} to set up ${invite.data.email}.`}
        action={{ label: 'Sign out', onPress: () => void auth.signOut() }}
      />
    );
  } else {
    const role = invite.data.role;
    body = (
      <>
        <View style={styles.heading}>
          <AppText variant="headlineLg" bold accessibilityRole="header">
            Set up your account
          </AppText>
          <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
            Fill in your details and choose a password. You will sign in with this email next.
          </AppText>
        </View>
        <View style={styles.invite}>
          <Icon name="mark-email-read" size={22} color={colors.telemetryStrong} />
          <View style={styles.inviteText}>
            <AppText variant="labelLg" bold numberOfLines={1} testID="invite-email">
              {invite.data.email}
            </AppText>
            <AppText variant="labelSm" color={colors.onSurfaceVariant}>
              {isRole(role) ? ROLE_DESCRIPTION[role] : ''}
            </AppText>
          </View>
          <Badge label={invite.data.roleLabel} tone="brand" />
        </View>
        <View style={styles.form}>
          <TextField
            label="Full name"
            required
            placeholder="Juan B. Dela Cruz"
            autoComplete="name"
            value={current.name}
            onChangeText={(text) => set({ name: text })}
            error={shown.name}
            testID="invite-name"
          />
          <TextField
            label="Mobile number"
            required
            placeholder="0917-552-8901"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={current.phone}
            onChangeText={(phone) => set({ phone })}
            error={shown.phone}
            testID="invite-phone"
          />
          <TextField
            label="Password"
            required
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            hint="At least 10 characters, with letters and numbers."
            value={current.password}
            onChangeText={(password) => set({ password })}
            error={shown.password}
            testID="invite-password"
          />
          <TextField
            label="Confirm password"
            required
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            value={current.confirm}
            onChangeText={(confirm) => set({ confirm })}
            onSubmitEditing={submit}
            error={shown.confirm}
            testID="invite-confirm"
          />
        </View>
        {accept.error ? (
          <View style={styles.message} accessibilityRole="alert">
            <Icon name="error-outline" size={18} color={colors.onErrorContainer} />
            <AppText variant="bodySm" color={colors.onErrorContainer} style={styles.messageText}>
              {accept.error.message}
            </AppText>
          </View>
        ) : null}
        <Button
          label="Create my account"
          icon="how-to-reg"
          variant="primary"
          size="lg"
          fullWidth
          loading={accept.isPending}
          disabled={accept.isPending}
          onPress={submit}
          testID="invite-submit"
        />
        <AppText variant="bodySm" color={colors.onSurfaceVariant} style={styles.hint}>
          This link works once and expires on {new Date(invite.data.expiresAt).toDateString()}.
        </AppText>
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.page, isPhone && styles.pagePhone]}
        keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Icon name="directions-bus" size={22} color={colors.onPrimary} />
            </View>
            <View>
              <AppText variant="headlineSm" bold>
                Para
              </AppText>
              <AppText variant="bodySm" color={colors.onSurfaceVariant}>
                Coop Transit Portal • Team invite
              </AppText>
            </View>
          </View>
          {body}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Problem({
  title,
  text,
  onSignIn,
  action,
}: {
  title: string;
  text: string;
  onSignIn?: () => void;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.state}>
      <Icon name="link-off" size={32} color={colors.secondary} />
      <AppText variant="headlineSm" bold align="center">
        {title}
      </AppText>
      <AppText variant="bodyMd" color={colors.onSurfaceVariant} align="center">
        {text}
      </AppText>
      {action ? <Button label={action.label} icon="logout" onPress={action.onPress} /> : null}
      {onSignIn ? <Button label="Go to sign in" icon="login" variant="ghost" onPress={onSignIn} /> : null}
    </View>
  );
}
