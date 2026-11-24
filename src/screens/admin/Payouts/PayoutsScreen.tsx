import { useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  useCloseWeek,
  useConfirmReceived,
  useCurrentWeek,
  useDocumentUrl,
  useMarkPaid,
  useMarkRemitted,
  useRequestPayout,
  useRequestPayoutNow,
  useReviewPayout,
  useSettlements,
  type DocumentKind,
  type OpenWeek,
  type PayoutStatus,
  type Settlement,
  type SettlementLine,
} from '@packages/tanstack/query/payouts';
import { useBreakpoint } from '@packages/responsive/useBreakpoint';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Icon, type IconName } from '@packages/ui/Icon';
import { Toast } from '@packages/ui/Toast';

import { CurrentWeekSection } from './CurrentWeek';
import { CloseWeekDialog, DeclineDialog, MarkPaidDialog, RemitDialog, RequestPayoutDialog } from './PayoutDialogs';
import {
  ADMIN_STATUS,
  FLEET_STATUS,
  LINE_STATUS_LABEL,
  accountText,
  centavosText,
  manilaTime,
  microText,
  settlementCsv,
  weekText,
} from './payoutText';
import { styles } from './styles';

type Paying = { settlement: Settlement; line: SettlementLine };

/** The fleet records driver payments once Para's money is sent (the backend checks too). */
const canPayDrivers = (status: PayoutStatus) => status === 'sent' || status === 'received';

/** Para's view, by what needs doing: review, send, wait for the fleet, done. */
const ADMIN_GROUPS: { title: string; statuses: PayoutStatus[]; empty?: string }[] = [
  { title: 'Requests to review', statuses: ['requested'], empty: 'No payout requests waiting.' },
  { title: 'Approved • to send', statuses: ['approved'], empty: 'Nothing approved waiting to be sent.' },
  { title: 'Waiting for the fleet', statuses: ['ready', 'declined'] },
  { title: 'Sent', statuses: ['sent', 'received'] },
];

/**
 * Payouts (fleet-driver-payouts). Para pays each fleet, the fleet pays its drivers:
 * the week closes on Monday → the fleet requests its payout → Para approves (or declines with a reason) and sends
 * it → the fleet confirms it arrived and pays each driver by GCash, which creates the driver's receipt.
 * Para's staff see every fleet's payouts (to review and send); a fleet sees what it receives and what it owes its
 * drivers.
 */
export function PayoutsScreen() {
  const auth = useAuth();
  const admin = auth.can('payouts:remit');
  const settlements = useSettlements();
  const current = useCurrentWeek();
  const requestPayout = useRequestPayout();
  const requestNow = useRequestPayoutNow();
  const reviewPayout = useReviewPayout();
  const markRemitted = useMarkRemitted();
  const confirmReceived = useConfirmReceived();
  const markPaid = useMarkPaid();
  const closeWeek = useCloseWeek();
  const documentUrl = useDocumentUrl();
  const { toast, show, dismiss } = useToast();
  const { isPhone } = useBreakpoint();
  const [paying, setPaying] = useState<Paying>();
  const [requesting, setRequesting] = useState<Settlement>();
  const [requestingNow, setRequestingNow] = useState<OpenWeek>();
  const [declining, setDeclining] = useState<Settlement>();
  const [sending, setSending] = useState<Settlement>();
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState<{ created: number; skipped: number }>();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const list = settlements.data?.settlements ?? [];
  const fail = (title: string) => (error: Error) =>
    show({ title, message: error.message, icon: 'error', tone: 'danger' });

  /** Opens a receipt or statement PDF. On the web the tab opens first so the browser does not block it. */
  const openDocument = (kind: DocumentKind, id: string) => {
    const tab = Platform.OS === 'web' && typeof window !== 'undefined' ? window.open('', '_blank') : null;
    documentUrl.mutate(
      { kind, id },
      {
        onSuccess: (url) => {
          if (tab) tab.location.href = url;
          else void Linking.openURL(url);
        },
        onError: (error) => {
          tab?.close();
          fail('Could not open the document')(error);
        },
      },
    );
  };

  const exportCsv = (s: Settlement) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      show({ title: 'CSV export works in the web portal', icon: 'info', tone: 'info' });
      return;
    }
    const blob = new Blob([`﻿${settlementCsv(s)}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Para-payouts-${s.periodStart}-${s.fleetName.replace(/[^A-Za-z0-9]+/g, '-')}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const approve = (s: Settlement) =>
    reviewPayout.mutate(
      { settlementId: s.id, decision: 'approve' },
      {
        onSuccess: () =>
          show({
            title: `${s.fleetName}'s payout approved`,
            message: 'Send it, then record the reference.',
            icon: 'check-circle',
          }),
        onError: fail('Could not approve'),
      },
    );

  const confirm = (s: Settlement) =>
    confirmReceived.mutate(s.id, {
      onSuccess: () =>
        show({ title: 'Marked as received', message: 'You can keep paying your drivers.', icon: 'check-circle' }),
      onError: fail('Could not confirm'),
    });

  const card = (s: Settlement, index: number) => (
    <SettlementCard
      key={s.id}
      settlement={s}
      admin={admin}
      open={open[s.id] ?? (admin ? s.payoutStatus === 'requested' : index === 0 || s.unpaidCount > 0)}
      busy={
        (reviewPayout.isPending && reviewPayout.variables?.settlementId === s.id) ||
        (confirmReceived.isPending && confirmReceived.variables === s.id)
      }
      onToggle={(next) => setOpen((o) => ({ ...o, [s.id]: next }))}
      onRequest={() => {
        requestPayout.reset();
        setRequesting(s);
      }}
      onApprove={() => approve(s)}
      onDecline={() => {
        reviewPayout.reset();
        setDeclining(s);
      }}
      onSend={() => {
        markRemitted.reset();
        setSending(s);
      }}
      onConfirmReceived={() => confirm(s)}
      onPay={(line) => {
        markPaid.reset();
        setPaying({ settlement: s, line });
      }}
      onStatement={() => openDocument('statement', s.id)}
      onReceipt={(line) => line.payoutId && openDocument('receipt', line.payoutId)}
      onCsv={() => exportCsv(s)}
    />
  );

  // Fleet: what needs its action first (request, confirm, drivers to pay), then the rest.
  const fleetNeeds = (s: Settlement) =>
    s.payoutStatus === 'ready' ||
    s.payoutStatus === 'declined' ||
    s.payoutStatus === 'sent' ||
    (canPayDrivers(s.payoutStatus) && s.unpaidCount > 0);
  const fleetFirst = [...list.filter(fleetNeeds), ...list.filter((s) => !fleetNeeds(s))];

  return (
    <View style={styles.flex} testID="screen-payouts">
      <ScrollView contentContainerStyle={[styles.page, isPhone && styles.pagePhone]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
              {admin ? 'Para • every fleet' : 'Your fleet'}
            </AppText>
            <AppText variant="displaySm" bold accessibilityRole="header">
              {admin ? 'Fleet Payouts' : 'Payouts'}
            </AppText>
            <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
              {admin
                ? "Fleets request their payouts: any time from ₱1.00, or after Monday's weekly close. You approve each request (or decline with a reason) and send it; the fleet then pays its drivers."
                : 'Request your payout any time from ₱1.00 (or wait for Monday’s weekly close). Once Para sends it, pay each driver by GCash and record the reference, which creates their receipt.'}
            </AppText>
          </View>
          {admin ? (
            <Button
              label="Close a week"
              icon="event-available"
              variant="outline"
              size="lg"
              onPress={() => {
                closeWeek.reset();
                setClosed(undefined);
                setClosing(true);
              }}
              testID="open-close-week"
            />
          ) : null}
        </View>

        <View style={styles.flowRow}>
          <FlowStep
            icon="event-available"
            title="1. Shares add up"
            text="Drivers' 60% + fleet's 20% of each ₱1 view."
          />
          <FlowStep
            icon="request-quote"
            title="2. Fleet requests"
            text="Any time it has ₱1.00 or more, or after Monday's close."
          />
          <FlowStep icon="account-balance" title="3. Para approves & sends" text="Or declines with a reason." />
          <FlowStep icon="send-to-mobile" title="4. Fleet pays drivers" text="By GCash; each gets a receipt." />
        </View>

        <CurrentWeekSection
          week={current.data}
          loading={current.isLoading}
          error={current.error ? `This week could not be loaded: ${current.error.message}` : undefined}
          refreshing={current.isFetching && !current.isLoading}
          showFleet={admin}
          admin={admin}
          onRefresh={() => void current.refetch()}
          onRequestNow={
            admin
              ? undefined
              : (w) => {
                  requestNow.reset();
                  setRequestingNow(w);
                }
          }
        />

        {settlements.isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.primaryContainer} />
          </View>
        ) : settlements.error ? (
          <Card style={styles.empty}>
            <Icon name="cloud-off" size={28} color={colors.error} />
            <AppText variant="headlineSm" bold>
              Payouts could not be loaded
            </AppText>
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              {settlements.error.message}
            </AppText>
            <Button label="Try again" icon="refresh" onPress={() => void settlements.refetch()} />
          </Card>
        ) : list.length === 0 ? (
          <>
            <AppText variant="headlineLg" bold accessibilityRole="header">
              Payouts
            </AppText>
            <Card style={styles.empty}>
              <Icon name="event-note" size={28} color={colors.onSurfaceVariant} />
              <AppText variant="headlineSm" bold>
                No payouts yet
              </AppText>
              <AppText variant="bodySm" color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
                {admin
                  ? 'A payout appears here when a fleet requests one, or on Monday when the week closes.'
                  : 'Request your running total any time above, or it closes on Monday.'}
              </AppText>
            </Card>
          </>
        ) : admin ? (
          ADMIN_GROUPS.map((g) => {
            const rows = list.filter((s) => g.statuses.includes(s.payoutStatus));
            if (!rows.length && !g.empty) return null;
            return (
              <View key={g.title} style={styles.section} testID={`group-${g.statuses[0]}`}>
                <View style={styles.rowWrap}>
                  <AppText variant="headlineLg" bold accessibilityRole="header">
                    {g.title}
                  </AppText>
                  <Badge label={String(rows.length)} tone={rows.length ? 'brandSubtle' : 'neutral'} />
                  {rows.length ? (
                    <AppText variant="bodySm" color={colors.onSurfaceVariant}>
                      {centavosText(rows.reduce((t, s) => t + s.remitCentavos, 0))}
                    </AppText>
                  ) : null}
                </View>
                {rows.length ? (
                  rows.map(card)
                ) : (
                  <AppText variant="bodySm" color={colors.onSurfaceVariant}>
                    {g.empty}
                  </AppText>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.section}>
            <AppText variant="headlineLg" bold accessibilityRole="header">
              Payouts
            </AppText>
            {fleetFirst.map(card)}
          </View>
        )}
      </ScrollView>

      {requesting ? (
        <RequestPayoutDialog
          settlement={requesting}
          saved={settlements.data?.account ?? null}
          submitting={requestPayout.isPending}
          serverError={requestPayout.error?.message}
          onClose={() => setRequesting(undefined)}
          onConfirm={(input) =>
            requestPayout.mutate(
              { settlementId: requesting.id, ...input },
              {
                onSuccess: () => {
                  setRequesting(undefined);
                  show({ title: 'Payout requested', message: 'Para will review it.', icon: 'send' });
                },
              },
            )
          }
        />
      ) : null}

      {requestingNow ? (
        <RequestPayoutDialog
          settlement={requestingNow}
          saved={settlements.data?.account ?? null}
          submitting={requestNow.isPending}
          serverError={requestNow.error?.message}
          onClose={() => setRequestingNow(undefined)}
          onConfirm={(input) =>
            requestNow.mutate(input, {
              onSuccess: (s) => {
                setRequestingNow(undefined);
                show({
                  title: `Payout of ${centavosText(s.remitCentavos)} requested`,
                  message: 'Para will review it. New ₱1 views start your next payout.',
                  icon: 'send',
                });
              },
            })
          }
        />
      ) : null}

      {declining ? (
        <DeclineDialog
          settlement={declining}
          submitting={reviewPayout.isPending}
          serverError={reviewPayout.error?.message}
          onClose={() => setDeclining(undefined)}
          onConfirm={(reason) =>
            reviewPayout.mutate(
              { settlementId: declining.id, decision: 'decline', reason },
              {
                onSuccess: () => {
                  setDeclining(undefined);
                  show({
                    title: `${declining.fleetName}'s request declined`,
                    message: 'They see your reason.',
                    icon: 'block',
                    tone: 'info',
                  });
                },
              },
            )
          }
        />
      ) : null}

      {sending ? (
        <RemitDialog
          settlement={sending}
          submitting={markRemitted.isPending}
          serverError={markRemitted.error?.message}
          onClose={() => setSending(undefined)}
          onConfirm={(input) =>
            markRemitted.mutate(
              { settlementId: sending.id, ...input },
              {
                onSuccess: () => {
                  setSending(undefined);
                  show({
                    title: `Sent to ${sending.fleetName}`,
                    message: 'The fleet can now pay its drivers.',
                    icon: 'send',
                  });
                },
              },
            )
          }
        />
      ) : null}

      {paying ? (
        <MarkPaidDialog
          settlement={paying.settlement}
          line={paying.line}
          submitting={markPaid.isPending}
          serverError={markPaid.error?.message}
          onClose={() => setPaying(undefined)}
          onConfirm={(reference) =>
            markPaid.mutate(
              { settlementId: paying.settlement.id, driverId: paying.line.driverId, reference },
              {
                onSuccess: (r) => {
                  setPaying(undefined);
                  show({
                    title: `${paying.line.name} is paid`,
                    message: `Receipt ${r.receiptNo} is in their driver app.`,
                    icon: 'check-circle',
                  });
                },
              },
            )
          }
        />
      ) : null}

      {closing ? (
        <CloseWeekDialog
          submitting={closeWeek.isPending}
          serverError={closeWeek.error?.message}
          result={closed}
          onClose={() => setClosing(false)}
          onConfirm={(periodStart) =>
            closeWeek.mutate(periodStart, {
              onSuccess: (r) => setClosed({ created: r.created.length, skipped: r.skipped.length }),
            })
          }
        />
      ) : null}
      <Toast toast={toast} onDismiss={dismiss} />
    </View>
  );
}

function FlowStep({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View style={styles.flowStep}>
      <View style={styles.rowWrap}>
        <Icon name={icon} size={18} color={colors.primaryContainer} />
        <AppText variant="labelLg" bold>
          {title}
        </AppText>
      </View>
      <AppText variant="bodySm" color={colors.onSurfaceVariant}>
        {text}
      </AppText>
    </View>
  );
}

function SettlementCard({
  settlement: s,
  admin,
  open,
  busy,
  onToggle,
  onRequest,
  onApprove,
  onDecline,
  onSend,
  onConfirmReceived,
  onPay,
  onStatement,
  onReceipt,
  onCsv,
}: {
  settlement: Settlement;
  admin: boolean;
  open: boolean;
  busy: boolean;
  onToggle: (open: boolean) => void;
  onRequest: () => void;
  onApprove: () => void;
  onDecline: () => void;
  onSend: () => void;
  onConfirmReceived: () => void;
  onPay: (line: SettlementLine) => void;
  onStatement: () => void;
  onReceipt: (line: SettlementLine) => void;
  onCsv: () => void;
}) {
  const status = (admin ? ADMIN_STATUS : FLEET_STATUS)[s.payoutStatus];
  const payable = s.lines.filter((l) => l.status !== 'carried').length;
  const paid = s.lines.filter((l) => l.status === 'paid').length;
  const problems = s.lines.filter((l) => l.driverResponse?.response === 'problem').length;
  const payDrivers = !admin && canPayDrivers(s.payoutStatus);
  return (
    <Card style={styles.card} testID={`settlement-${s.id}`}>
      <View style={styles.cardHead}>
        <View style={styles.cardTitle}>
          <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
            {admin ? `${s.fleetName} • ${s.number}` : s.number}
          </AppText>
          <AppText variant="headlineLg" bold>
            {weekText(s.periodStart, s.periodEnd)}
          </AppText>
          <View style={styles.rowWrap}>
            <View testID={`status-${s.id}`}>
              <Badge label={status.label} tone={status.tone} />
            </View>
            {s.partial ? <Badge label="Requested mid-week" tone="info" /> : null}
            {canPayDrivers(s.payoutStatus) ? (
              <Badge
                label={`Drivers: ${paid} of ${payable} paid`}
                tone={payable > 0 && paid === payable ? 'success' : 'brandSubtle'}
              />
            ) : null}
            {problems ? <Badge label={`${problems} problem reported`} tone="warning" /> : null}
          </View>
        </View>
        <View style={styles.actions}>
          {admin && s.payoutStatus === 'requested' ? (
            <>
              <Button
                label="Approve"
                icon="check"
                variant="primary"
                loading={busy}
                onPress={onApprove}
                testID={`approve-${s.id}`}
              />
              <Button label="Decline" icon="block" variant="danger" onPress={onDecline} testID={`decline-${s.id}`} />
            </>
          ) : null}
          {admin && s.payoutStatus === 'approved' ? (
            <Button label="Mark sent" icon="send" variant="primary" onPress={onSend} testID={`send-${s.id}`} />
          ) : null}
          {!admin && (s.payoutStatus === 'ready' || s.payoutStatus === 'declined') ? (
            <Button
              label={s.payoutStatus === 'declined' ? 'Request again' : 'Request payout'}
              icon="request-quote"
              variant="primary"
              onPress={onRequest}
              testID={`request-${s.id}`}
            />
          ) : null}
          {!admin && s.payoutStatus === 'sent' ? (
            <Button
              label="Confirm received"
              icon="check-circle"
              variant="primary"
              loading={busy}
              onPress={onConfirmReceived}
              testID={`received-${s.id}`}
            />
          ) : null}
          <Button label="Statement" icon="picture-as-pdf" variant="outline" onPress={onStatement} />
          {!admin ? <Button label="CSV" icon="download" variant="ghost" onPress={onCsv} /> : null}
          <Button
            label={open ? 'Hide drivers' : 'Show drivers'}
            icon={open ? 'expand-less' : 'expand-more'}
            variant="ghost"
            onPress={() => onToggle(!open)}
          />
        </View>
      </View>

      {admin ? (
        <View style={styles.totals}>
          <Total label="Pay out to fleet" value={centavosText(s.remitCentavos)} strong />
          <Total label="For its drivers" value={centavosText(s.driversPayCentavos)} />
          <Total label="Fleet share" value={centavosText(s.fleetPayCentavos)} />
          <Total label="Para fee (kept)" value={microText(s.paraFeeMicro)} />
          <Total label="Views shared" value={String(s.views)} />
        </View>
      ) : (
        <View style={styles.totals}>
          <Total label="Receive from Para" value={centavosText(s.remitCentavos)} strong />
          <Total label="Pay to drivers" value={centavosText(s.driversPayCentavos)} />
          <Total label="Your share" value={centavosText(s.fleetPayCentavos)} />
          <Total label="Views shared" value={String(s.views)} />
        </View>
      )}

      <View style={styles.note} testID={`status-note-${s.id}`}>
        <Icon name="info" size={18} color={colors.onSurfaceVariant} />
        <View style={[styles.shrink, { gap: 2 }]}>
          <AppText variant="bodySm">{status.note}</AppText>
          {s.request ? (
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              {`Requested ${manilaTime(s.request.at)} • to ${accountText(s.request, admin)}${s.request.note ? ` • “${s.request.note}”` : ''}`}
            </AppText>
          ) : null}
          {s.review?.decision === 'declined' ? (
            <AppText variant="bodySm" color={colors.error}>
              {`Declined ${manilaTime(s.review.at)}: ${s.review.reason}`}
            </AppText>
          ) : s.review?.decision === 'approved' ? (
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              {`Approved ${manilaTime(s.review.at)}`}
            </AppText>
          ) : null}
          {s.remittance ? (
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              {`Sent by ${s.remittance.method} ${manilaTime(s.remittance.sentAt)} • ref ${s.remittance.reference}`}
              {s.receivedAt ? ` • received ${manilaTime(s.receivedAt)}` : ''}
            </AppText>
          ) : null}
        </View>
      </View>

      {open ? (
        <View style={styles.lines}>
          {s.lines.map((l) => (
            <LineRow
              key={l.driverId}
              line={l}
              canPay={payDrivers}
              waiting={!admin && !payDrivers}
              onPay={() => onPay(l)}
              onReceipt={() => onReceipt(l)}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={[styles.total, strong && styles.totalStrong]}>
      <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
        {label}
      </AppText>
      <AppText variant="metricTabular" color={strong ? colors.primaryContainer : colors.onSurface}>
        {value}
      </AppText>
    </View>
  );
}

function LineRow({
  line: l,
  canPay,
  waiting,
  onPay,
  onReceipt,
}: {
  line: SettlementLine;
  canPay: boolean;
  /** The fleet sees the button but has to wait for Para's money. */
  waiting: boolean;
  onPay: () => void;
  onReceipt: () => void;
}) {
  const response = l.driverResponse;
  return (
    <View style={styles.line} testID={`line-${l.driverId}`}>
      <View style={styles.lineWho}>
        <AppText variant="labelLg" bold numberOfLines={1}>
          {l.name}
        </AppText>
        <AppText variant="bodySm" color={colors.onSurfaceVariant} numberOfLines={1}>
          {[l.driverNo, `GCash ${l.gcash || '—'}`, `${l.views} ${l.views === 1 ? 'view' : 'views'}`]
            .filter(Boolean)
            .join(' • ')}
        </AppText>
      </View>
      <View style={styles.lineMeta}>
        <View style={styles.rowWrap}>
          <Badge
            label={l.status === 'paid' && l.receiptNo ? `Paid • ${l.receiptNo}` : LINE_STATUS_LABEL[l.status]}
            tone={l.status === 'paid' ? 'success' : l.status === 'unpaid' ? 'brandSubtle' : 'neutral'}
            uppercase={false}
          />
          {response ? (
            <Badge
              label={response.response === 'received' ? 'Driver confirmed' : 'Problem reported'}
              tone={response.response === 'received' ? 'telemetry' : 'warning'}
              uppercase={false}
            />
          ) : null}
        </View>
        {l.status === 'paid' && l.paidAt ? (
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            {manilaTime(l.paidAt)} • ref {l.reference}
          </AppText>
        ) : l.status === 'carried' ? (
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            Under ₱0.01 — added to next week
          </AppText>
        ) : null}
        {response?.response === 'problem' && response.note ? (
          <AppText variant="bodySm" color={colors.error}>
            “{response.note}”
          </AppText>
        ) : null}
      </View>
      <View style={styles.lineAmount}>
        <AppText variant="metricTabular">{centavosText(l.payCentavos)}</AppText>
      </View>
      <View style={styles.lineActions}>
        {l.status === 'unpaid' && canPay ? (
          <Button label="Mark paid" icon="check" variant="primary" onPress={onPay} testID={`pay-${l.driverId}`} />
        ) : null}
        {l.status === 'unpaid' && waiting ? (
          <AppText variant="bodySm" color={colors.onSurfaceVariant} testID={`wait-${l.driverId}`}>
            Pay after Para sends
          </AppText>
        ) : null}
        {l.status === 'paid' ? (
          <Button label="Receipt" icon="receipt-long" variant="outline" onPress={onReceipt} />
        ) : null}
      </View>
    </View>
  );
}
