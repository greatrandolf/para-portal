import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

import { USE_AUTH_EMULATOR } from '@/constants/api';
import { colors } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/hooks/useAuth';
import { AppText } from '@packages/ui/AppText';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Icon } from '@packages/ui/Icon';

import { styles } from './styles';

type Notice = { tone: 'error' | 'info'; text: string } | null;

/** Sign-in for team members. Accounts without a role see a "no access" panel. */
export function LoginScreen() {
  const auth = useAuth();
  // After accepting an invite, /login?email=…&welcome=1 fills in the address.
  const params = useLocalSearchParams<{ email?: string; welcome?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(
    params.welcome === '1' ? { tone: 'info', text: 'Your account is ready. Sign in with your new password.' } : null,
  );

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setNotice(null);
    try {
      await task();
    } catch (error) {
      setNotice({ tone: 'error', text: authErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = () => run(() => auth.signIn(email, password));

  const handleReset = () => {
    if (!email.trim()) {
      setNotice({ tone: 'error', text: 'Enter your email first, then choose "Forgot password?".' });
      return;
    }
    void run(async () => {
      await auth.resetPassword(email);
      setNotice({ tone: 'info', text: `If ${email.trim()} has an account, a reset link is on its way.` });
    });
  };

  const noAccess = auth.status === 'signedIn' && auth.role === null;

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Icon name="directions-bus" size={22} color={colors.onPrimary} />
            </View>
            <View>
              <View style={styles.row}>
                <AppText variant="headlineSm" bold>
                  Para
                </AppText>
                <View style={styles.adminTag}>
                  <AppText variant="labelSm" color={colors.onPrimary} uppercase>
                    Admin
                  </AppText>
                </View>
              </View>
              <AppText variant="bodySm" color={colors.onSurfaceVariant}>
                Coop Transit Portal
              </AppText>
            </View>
          </View>

          {noAccess ? (
            <>
              <View style={styles.heading}>
                <AppText variant="headlineLg" bold>
                  No access yet
                </AppText>
                <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
                  {auth.user.email ?? 'This account'} is signed in but has no role, or its role was removed. Ask a super
                  admin for an invite or a role, then check again.
                </AppText>
              </View>
              {notice ? <NoticeBox notice={notice} /> : null}
              <View style={styles.actions}>
                <Button
                  label="Check again"
                  icon="refresh"
                  variant="primary"
                  loading={busy}
                  onPress={() => void run(auth.refreshClaims)}
                  fullWidth
                />
                <Button label="Sign out" icon="logout" onPress={() => void run(auth.signOut)} fullWidth />
              </View>
            </>
          ) : (
            <>
              <View style={styles.heading}>
                <AppText variant="headlineLg" bold>
                  Sign in
                </AppText>
                <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
                  Manage routes, fleet, and driver records for your cooperative. New team members join through an email
                  invite from a super admin.
                </AppText>
              </View>

              <View style={styles.form}>
                <View style={styles.field}>
                  <AppText variant="labelMd" bold nativeID="email-label">
                    Email
                  </AppText>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    placeholder="you@cooperative.ph"
                    placeholderTextColor={colors.secondary}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="username"
                    accessibilityLabelledBy="email-label"
                    accessibilityLabel="Email"
                    editable={!busy}
                    style={[styles.input, focused === 'email' && styles.inputFocused]}
                    testID="login-email"
                  />
                </View>
                <View style={styles.field}>
                  <AppText variant="labelMd" bold nativeID="password-label">
                    Password
                  </AppText>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    onSubmitEditing={() => void handleSignIn()}
                    placeholder="Password"
                    placeholderTextColor={colors.secondary}
                    secureTextEntry
                    autoComplete="current-password"
                    textContentType="password"
                    accessibilityLabelledBy="password-label"
                    accessibilityLabel="Password"
                    editable={!busy}
                    style={[styles.input, focused === 'password' && styles.inputFocused]}
                    testID="login-password"
                  />
                </View>
                <View style={styles.linkRow}>
                  <Pressable accessibilityRole="button" onPress={handleReset} style={styles.link} disabled={busy}>
                    <AppText variant="labelMd" bold color={colors.brand}>
                      Forgot password?
                    </AppText>
                  </Pressable>
                </View>
              </View>

              {notice ? <NoticeBox notice={notice} /> : null}

              <Button
                label="Sign in"
                icon="login"
                variant="primary"
                size="lg"
                loading={busy || auth.status === 'loading'}
                onPress={() => void handleSignIn()}
                fullWidth
                testID="login-submit"
              />
            </>
          )}

          {USE_AUTH_EMULATOR ? (
            <AppText variant="bodySm" color={colors.onSurfaceVariant} style={styles.footnote}>
              Local Auth emulator. Test accounts (one per role) come from `npm run seed` in para-backend/functions.
            </AppText>
          ) : null}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function NoticeBox({ notice }: { notice: NonNullable<Notice> }) {
  const error = notice.tone === 'error';
  return (
    <View
      style={[styles.message, error ? styles.messageError : styles.messageInfo]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <Icon
        name={error ? 'error-outline' : 'mark-email-read'}
        size={18}
        color={error ? colors.onErrorContainer : colors.telemetryInk}
      />
      <AppText
        variant="bodySm"
        color={error ? colors.onErrorContainer : colors.telemetryInk}
        style={styles.messageText}
        testID="login-notice">
        {notice.text}
      </AppText>
    </View>
  );
}
