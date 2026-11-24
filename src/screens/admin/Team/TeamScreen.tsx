import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { ROLES, ROLE_LABEL } from '@/constants/roles';
import { colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatRelative } from '@/utils/format';
import {
  useInviteMember,
  useResendInvite,
  useRevokeInvite,
  useSetMemberRole,
  useSetMemberStatus,
  useTeam,
  type Invite,
  type Member,
} from '@packages/tanstack/query/users';
import { useBreakpoint } from '@packages/responsive/useBreakpoint';
import { AppText } from '@packages/ui/AppText';
import { Avatar } from '@packages/ui/Avatar';
import { Badge } from '@packages/ui/Badge';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Dialog } from '@packages/ui/Dialog';
import { Icon } from '@packages/ui/Icon';
import { Select } from '@packages/ui/Select';
import { Toast } from '@packages/ui/Toast';

import { InviteDialog, InviteLink } from './InviteDialog';
import { styles } from './styles';

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

/** Team & Access (super admin): members, their roles, and email invites. */
export function TeamScreen() {
  const auth = useAuth();
  const team = useTeam();
  const invite = useInviteMember();
  const resend = useResendInvite();
  const revoke = useRevokeInvite();
  const setRole = useSetMemberRole();
  const setStatus = useSetMemberStatus();
  const { toast, show, dismiss } = useToast();
  const { isPhone } = useBreakpoint();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sent, setSent] = useState<{ email: string; url: string }>();
  const [resent, setResent] = useState<{ email: string; url: string }>();
  const [confirmDisable, setConfirmDisable] = useState<Member>();

  const myUid = auth.status === 'signedIn' ? auth.user.uid : undefined;
  const fail = (title: string) => (error: Error) =>
    show({ title, message: error.message, icon: 'error', tone: 'danger' });

  const members = team.data?.members ?? [];
  const invites = team.data?.invites ?? [];

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.page, isPhone && styles.pagePhone]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
              Super admin
            </AppText>
            <AppText variant="displaySm" bold accessibilityRole="header">
              Team & Access
            </AppText>
            <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
              Invite people by email with a role. They fill in their details from the email, then sign in.
            </AppText>
          </View>
          <Button
            label="Invite member"
            icon="person-add"
            variant="primary"
            size="lg"
            onPress={() => {
              invite.reset();
              setSent(undefined);
              setInviteOpen(true);
            }}
            testID="open-invite"
          />
        </View>

        {team.isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.primaryContainer} />
          </View>
        ) : team.error ? (
          <Card style={styles.empty}>
            <Icon name="cloud-off" size={28} color={colors.error} />
            <AppText variant="headlineSm" bold>
              The team could not be loaded
            </AppText>
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              {team.error.message}
            </AppText>
            <Button label="Try again" icon="refresh" onPress={() => void team.refetch()} />
          </Card>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <AppText variant="headlineSm" bold>
                  Members
                </AppText>
                <Badge label={`${members.filter((m) => m.status === 'active').length} active`} tone="telemetry" />
              </View>
              <Card padding="none" style={styles.list}>
                {members.map((m) => {
                  const self = m.uid === myUid;
                  const busyRole = setRole.isPending && setRole.variables?.uid === m.uid;
                  return (
                    <View
                      key={m.uid}
                      style={[styles.row, m.status === 'disabled' && styles.rowMuted]}
                      testID={`member-${m.email}`}>
                      <View style={styles.who}>
                        <Avatar name={m.name} size={36} />
                        <View style={styles.shrink}>
                          <View style={styles.rowWrap}>
                            <AppText variant="labelLg" bold numberOfLines={1}>
                              {m.name}
                            </AppText>
                            {self ? <Badge label="You" tone="brandSubtle" /> : null}
                            {m.status === 'disabled' ? <Badge label="Disabled" tone="warning" /> : null}
                          </View>
                          <AppText variant="bodySm" color={colors.onSurfaceVariant} numberOfLines={1}>
                            {m.email}
                            {m.phone ? ` • ${m.phone}` : ''}
                          </AppText>
                        </View>
                      </View>
                      <View style={styles.meta}>
                        <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                          Last sign-in {formatRelative(m.lastSignInAt)}
                        </AppText>
                      </View>
                      {self ? (
                        <Badge label={ROLE_LABEL[m.role]} tone="brand" />
                      ) : (
                        <Select
                          accessibilityLabel={`Role of ${m.name}`}
                          options={ROLE_OPTIONS}
                          value={m.role}
                          onChange={(role) =>
                            setRole.mutate(
                              { uid: m.uid, role },
                              {
                                onSuccess: () =>
                                  show({
                                    title: `${m.name} is now ${ROLE_LABEL[role]}`,
                                    message: 'They were signed out and will sign in again with the new role.',
                                    icon: 'manage-accounts',
                                  }),
                                onError: fail(`Could not change ${m.name}'s role`),
                              },
                            )
                          }
                          style={[styles.roleSelect, busyRole && styles.rowMuted]}
                        />
                      )}
                      <View style={styles.actions}>
                        {self ? null : m.status === 'active' ? (
                          <Button label="Disable" icon="block" variant="danger" onPress={() => setConfirmDisable(m)} />
                        ) : (
                          <Button
                            label="Enable"
                            icon="check-circle"
                            variant="outline"
                            loading={setStatus.isPending && setStatus.variables?.uid === m.uid}
                            onPress={() =>
                              setStatus.mutate(
                                { uid: m.uid, status: 'active' },
                                {
                                  onSuccess: () => show({ title: `${m.name} can sign in again`, icon: 'check-circle' }),
                                  onError: fail(`Could not enable ${m.name}`),
                                },
                              )
                            }
                          />
                        )}
                      </View>
                    </View>
                  );
                })}
              </Card>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <AppText variant="headlineSm" bold>
                  Invites
                </AppText>
                <Badge
                  label={`${invites.filter((i) => i.status === 'pending' && !i.expired).length} pending`}
                  tone="neutral"
                />
              </View>
              {resent ? <InviteLink email={resent.email} url={resent.url} /> : null}
              <Card padding="none" style={styles.list}>
                {invites.length === 0 ? (
                  <View style={styles.empty}>
                    <AppText variant="bodySm" color={colors.onSurfaceVariant}>
                      No open invites. Use Invite member to add someone.
                    </AppText>
                  </View>
                ) : (
                  invites.map((i) => (
                    <InviteRow
                      key={i.id}
                      invite={i}
                      resending={resend.isPending && resend.variables === i.id}
                      revoking={revoke.isPending && revoke.variables === i.id}
                      onResend={() =>
                        resend.mutate(i.id, {
                          onSuccess: (r) => {
                            setResent({ email: r.invite.email, url: r.inviteUrl });
                            show({
                              title: `New link sent to ${i.email}`,
                              message: 'The old link no longer works.',
                              icon: 'send',
                            });
                          },
                          onError: fail('Could not resend the invite'),
                        })
                      }
                      onRevoke={() =>
                        revoke.mutate(i.id, {
                          onSuccess: () =>
                            show({ title: `Invite for ${i.email} cancelled`, icon: 'cancel', tone: 'info' }),
                          onError: fail('Could not cancel the invite'),
                        })
                      }
                    />
                  ))
                )}
              </Card>
            </View>
          </>
        )}
      </ScrollView>

      {inviteOpen ? (
        <InviteDialog
          submitting={invite.isPending}
          serverError={invite.error?.message}
          sent={sent}
          onClose={() => setInviteOpen(false)}
          onInvite={(input) =>
            invite.mutate(input, { onSuccess: (r) => setSent({ email: r.invite.email, url: r.inviteUrl }) })
          }
        />
      ) : null}

      {confirmDisable ? (
        <Dialog
          visible
          title={`Disable ${confirmDisable.name}?`}
          subtitle="They are signed out right away and cannot sign in until you enable them again. Their records stay."
          onClose={() => setConfirmDisable(undefined)}
          width={440}
          footer={
            <View style={styles.dialogFooter}>
              <Button label="Cancel" variant="ghost" onPress={() => setConfirmDisable(undefined)} />
              <Button
                label="Disable"
                icon="block"
                variant="primary"
                loading={setStatus.isPending}
                onPress={() => {
                  const m = confirmDisable;
                  setStatus.mutate(
                    { uid: m.uid, status: 'disabled' },
                    {
                      onSuccess: () => {
                        setConfirmDisable(undefined);
                        show({ title: `${m.name} is disabled`, icon: 'block', tone: 'info' });
                      },
                      onError: (error) => {
                        setConfirmDisable(undefined);
                        fail(`Could not disable ${m.name}`)(error);
                      },
                    },
                  );
                }}
              />
            </View>
          }>
          <AppText variant="bodyMd">{confirmDisable.email}</AppText>
        </Dialog>
      ) : null}
      <Toast toast={toast} onDismiss={dismiss} />
    </View>
  );
}

function InviteRow({
  invite,
  resending,
  revoking,
  onResend,
  onRevoke,
}: {
  invite: Invite;
  resending: boolean;
  revoking: boolean;
  onResend: () => void;
  onRevoke: () => void;
}) {
  const open = invite.status === 'pending';
  const state = invite.status === 'revoked' ? 'Cancelled' : invite.expired ? 'Expired' : 'Pending';
  return (
    <View style={[styles.row, !open && styles.rowMuted]} testID={`invite-${invite.email}`}>
      <View style={styles.who}>
        <Icon name="mail-outline" size={22} color={colors.secondary} />
        <View style={styles.shrink}>
          <AppText variant="labelLg" bold numberOfLines={1}>
            {invite.email}
          </AppText>
          <AppText variant="bodySm" color={colors.onSurfaceVariant} numberOfLines={1}>
            {invite.name ? `${invite.name} • ` : ''}Invited {formatRelative(invite.createdAt)}
            {invite.invitedByEmail ? ` by ${invite.invitedByEmail}` : ''}
          </AppText>
        </View>
      </View>
      <View style={styles.meta}>
        <View style={styles.rowWrap}>
          <Badge label={ROLE_LABEL[invite.role]} tone="brandSubtle" />
          <Badge label={state} tone={state === 'Pending' ? 'telemetry' : state === 'Expired' ? 'warning' : 'neutral'} />
        </View>
        {open && !invite.expired ? (
          <AppText variant="labelSm" color={colors.onSurfaceVariant}>
            Expires {new Date(invite.expiresAt).toDateString()}
          </AppText>
        ) : null}
      </View>
      {open ? (
        <View style={styles.actions}>
          <Button label="Resend" icon="send" variant="outline" loading={resending} onPress={onResend} />
          <Button label="Cancel" icon="close" variant="danger" loading={revoking} onPress={onRevoke} />
        </View>
      ) : null}
    </View>
  );
}
