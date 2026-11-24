import { useState } from 'react';
import { View } from 'react-native';

import { colors } from '@/constants/theme';
import type { PayoutAccount, PayoutMethod, Settlement, SettlementLine } from '@packages/tanstack/query/payouts';
import { AppText } from '@packages/ui/AppText';
import { Button } from '@packages/ui/Button';
import { Dialog } from '@packages/ui/Dialog';
import { Icon } from '@packages/ui/Icon';
import { Select } from '@packages/ui/Select';
import { TextField } from '@packages/ui/TextField';

import { accountText, centavosText, pastMondays, weekText } from './payoutText';
import { styles } from './styles';

/** Same rule as the backend: 6 to 32 letters or digits (spaces are dropped). */
export const validReference = (value: string) => /^[A-Za-z0-9-]{6,32}$/.test(value.replace(/\s+/g, ''));

function ServerError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Icon name="error" size={18} color={colors.error} />
      <AppText variant="bodySm" style={styles.shrink}>
        {message}
      </AppText>
    </View>
  );
}

/** The fleet sent a driver their week by GCash: record the reference; Para issues the receipt. */
export function MarkPaidDialog({
  settlement,
  line,
  submitting,
  serverError,
  onClose,
  onConfirm,
}: {
  settlement: Settlement;
  line: SettlementLine;
  submitting: boolean;
  serverError?: string;
  onClose: () => void;
  onConfirm: (reference: string) => void;
}) {
  const [reference, setReference] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const error =
    submitted && !validReference(reference) ? 'Enter the GCash reference number from the receipt.' : undefined;
  return (
    <Dialog
      visible
      title={`Pay ${line.name}`}
      subtitle={`Week ${weekText(settlement.periodStart, settlement.periodEnd)}`}
      onClose={onClose}
      width={460}
      footer={
        <View style={styles.dialogFooter}>
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button
            label="Mark as paid"
            icon="check-circle"
            variant="primary"
            loading={submitting}
            disabled={submitting}
            testID="confirm-paid"
            onPress={() => {
              setSubmitted(true);
              if (validReference(reference)) onConfirm(reference.replace(/\s+/g, ''));
            }}
          />
        </View>
      }>
      <View style={styles.dialogBody}>
        <View style={styles.payBox}>
          <AppText variant="labelMd" color={colors.onSurfaceVariant}>
            Send by GCash
          </AppText>
          <AppText variant="displaySm" bold color={colors.primaryContainer} testID="pay-amount">
            {centavosText(line.payCentavos)}
          </AppText>
          <AppText variant="bodyMd">
            to <AppText bold>{line.gcash || 'no number on file'}</AppText>
            {line.driverNo ? ` • ${line.driverNo}` : ''}
          </AppText>
        </View>
        <TextField
          label="GCash reference number"
          required
          placeholder="e.g. 1009 876 543 210"
          autoCapitalize="characters"
          value={reference}
          onChangeText={setReference}
          error={error}
          hint="Send the money in GCash first, then copy the reference number here."
          testID="paid-reference"
        />
        <View style={styles.note}>
          <Icon name="receipt-long" size={18} color={colors.onSurfaceVariant} />
          <AppText variant="bodySm" color={colors.onSurfaceVariant} style={styles.shrink}>
            Para creates a numbered receipt for {line.name}. They see it in the driver app. A payment can&apos;t be
            changed once it&apos;s recorded.
          </AppText>
        </View>
        <ServerError message={serverError} />
      </View>
    </Dialog>
  );
}

const METHODS = [
  { value: 'GCash', label: 'GCash' },
  { value: 'Bank transfer', label: 'Bank transfer' },
  { value: 'InstaPay', label: 'InstaPay' },
  { value: 'Cash', label: 'Cash' },
] as const;
type Method = (typeof METHODS)[number]['value'];

/** Admin: Para sent the week's money to the fleet. */
export function RemitDialog({
  settlement,
  submitting,
  serverError,
  onClose,
  onConfirm,
}: {
  settlement: Settlement;
  submitting: boolean;
  serverError?: string;
  onClose: () => void;
  onConfirm: (input: { method: string; reference: string }) => void;
}) {
  const requested = settlement.request?.method === 'Bank transfer' ? 'Bank transfer' : 'GCash';
  const [method, setMethod] = useState<Method>(requested);
  const [reference, setReference] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const error = submitted && !validReference(reference) ? 'Enter the transfer reference number.' : undefined;
  return (
    <Dialog
      visible
      title={`Send to ${settlement.fleetName}`}
      subtitle={`${settlement.number} • ${weekText(settlement.periodStart, settlement.periodEnd)}`}
      onClose={onClose}
      width={460}
      footer={
        <View style={styles.dialogFooter}>
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button
            label="Mark as sent"
            icon="send"
            variant="primary"
            loading={submitting}
            disabled={submitting}
            testID="confirm-remit"
            onPress={() => {
              setSubmitted(true);
              if (validReference(reference)) onConfirm({ method, reference: reference.replace(/\s+/g, '') });
            }}
          />
        </View>
      }>
      <View style={styles.dialogBody}>
        <View style={styles.payBox}>
          <AppText variant="labelMd" color={colors.onSurfaceVariant}>
            Drivers {centavosText(settlement.driversPayCentavos)} + fleet {centavosText(settlement.fleetPayCentavos)}
          </AppText>
          <AppText variant="displaySm" bold color={colors.primaryContainer}>
            {centavosText(settlement.remitCentavos)}
          </AppText>
        </View>
        {settlement.request ? (
          <View style={styles.note} testID="remit-account">
            <Icon name="account-balance-wallet" size={18} color={colors.onSurfaceVariant} />
            <AppText variant="bodySm" style={styles.shrink}>
              Send to <AppText bold>{accountText(settlement.request)}</AppText>
              {settlement.request.note ? `\nNote from the fleet: ${settlement.request.note}` : ''}
            </AppText>
          </View>
        ) : null}
        <View style={{ gap: 4 }}>
          <AppText variant="labelMd" bold>
            Sent by
          </AppText>
          <Select accessibilityLabel="Payment method" options={METHODS} value={method} onChange={setMethod} />
        </View>
        <TextField
          label="Reference number"
          required
          placeholder="e.g. 1009 876 543 210"
          autoCapitalize="characters"
          value={reference}
          onChangeText={setReference}
          error={error}
          testID="remit-reference"
        />
        <ServerError message={serverError} />
      </View>
    </Dialog>
  );
}

/** Admin: close a past week by hand (the weekly run does it every Monday). */
export function CloseWeekDialog({
  submitting,
  serverError,
  result,
  onClose,
  onConfirm,
}: {
  submitting: boolean;
  serverError?: string;
  result?: { created: number; skipped: number };
  onClose: () => void;
  onConfirm: (periodStart: string) => void;
}) {
  const mondays = pastMondays();
  const options = mondays.map((m) => ({ value: m, label: weekText(m, addSix(m)) }));
  const [week, setWeek] = useState(mondays[0]);
  return (
    <Dialog
      visible
      title="Close a week"
      subtitle="Every Monday at 12:15 AM the past week closes on its own. Use this if a run was missed."
      onClose={onClose}
      width={460}
      footer={
        <View style={styles.dialogFooter}>
          <Button label={result ? 'Done' : 'Cancel'} variant="ghost" onPress={onClose} />
          {result ? null : (
            <Button
              label="Close week"
              icon="event-available"
              variant="primary"
              loading={submitting}
              disabled={submitting}
              testID="confirm-close-week"
              onPress={() => onConfirm(week)}
            />
          )}
        </View>
      }>
      <View style={styles.dialogBody}>
        <Select accessibilityLabel="Week" options={options} value={week} onChange={setWeek} />
        {result ? (
          <View style={styles.note}>
            <Icon name="check-circle" size={18} color={colors.telemetryStrong} />
            <AppText variant="bodySm" style={styles.shrink}>
              {result.created} new {result.created === 1 ? 'settlement' : 'settlements'}
              {result.skipped ? `; ${result.skipped} already existed and were left as they are` : ''}.
            </AppText>
          </View>
        ) : (
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            Fleets that already have a settlement for the week keep it unchanged.
          </AppText>
        )}
        <ServerError message={serverError} />
      </View>
    </Dialog>
  );
}

const addSix = (monday: string) =>
  new Date(Date.parse(`${monday}T00:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10);

const PAYOUT_METHODS = [
  { value: 'GCash', label: 'GCash' },
  { value: 'Bank transfer', label: 'Bank transfer' },
] as const;

/** Same checks as the backend (asPayoutAccount). */
export function accountErrors(a: PayoutAccount): Partial<Record<keyof PayoutAccount, string>> {
  const errors: Partial<Record<keyof PayoutAccount, string>> = {};
  const number = a.accountNumber.replace(/[\s-]/g, '');
  if (!a.accountName.trim()) errors.accountName = 'Enter the account name.';
  if (a.method === 'GCash' && !/^09\d{9}$/.test(number))
    errors.accountNumber = 'Enter the GCash number, e.g. 0917 123 4567.';
  if (a.method === 'Bank transfer') {
    if (!/^\d{6,20}$/.test(number)) errors.accountNumber = 'Enter the account number (6 to 20 digits).';
    if (!a.bankName.trim()) errors.bankName = 'Enter the bank name.';
  }
  return errors;
}

/** The fleet asks Para for a closed week's payout, to its GCash or bank account. */
export function RequestPayoutDialog({
  settlement,
  saved,
  submitting,
  serverError,
  onClose,
  onConfirm,
}: {
  /** A closed week, or the running total for "Request payout now" (no number, no earlier request). */
  settlement: Pick<
    Settlement,
    'fleetName' | 'periodStart' | 'periodEnd' | 'remitCentavos' | 'driversPayCentavos' | 'fleetPayCentavos'
  > &
    Partial<Pick<Settlement, 'number' | 'request' | 'review'>>;
  /** The fleet's last payout account (prefill). */
  saved: PayoutAccount | null;
  submitting: boolean;
  serverError?: string;
  onClose: () => void;
  onConfirm: (input: { account: PayoutAccount; note: string }) => void;
}) {
  const start = settlement.request ?? saved;
  const [account, setAccount] = useState<PayoutAccount>({
    method: start?.method ?? 'GCash',
    accountName: start?.accountName ?? settlement.fleetName,
    accountNumber: start?.accountNumber ?? '',
    bankName: start?.bankName ?? '',
  });
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const errors = accountErrors(account);
  const shown = submitted ? errors : {};
  const set = (patch: Partial<PayoutAccount>) => setAccount((a) => ({ ...a, ...patch }));
  return (
    <Dialog
      visible
      title="Request payout"
      subtitle={`${settlement.number ? `${settlement.number} • ` : 'Everything so far • '}${weekText(settlement.periodStart, settlement.periodEnd)}`}
      onClose={onClose}
      width={480}
      footer={
        <View style={styles.dialogFooter}>
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button
            label="Send request"
            icon="send"
            variant="primary"
            loading={submitting}
            disabled={submitting}
            testID="confirm-request"
            onPress={() => {
              setSubmitted(true);
              if (Object.keys(errors).length) return;
              onConfirm({
                account: { ...account, accountNumber: account.accountNumber.replace(/[\s-]/g, '') },
                note: note.trim(),
              });
            }}
          />
        </View>
      }>
      <View style={styles.dialogBody}>
        <View style={styles.payBox}>
          <AppText variant="labelMd" color={colors.onSurfaceVariant}>
            You receive from Para
          </AppText>
          <AppText variant="displaySm" bold color={colors.primaryContainer}>
            {centavosText(settlement.remitCentavos)}
          </AppText>
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            {`For your drivers ${centavosText(settlement.driversPayCentavos)} + your share ${centavosText(settlement.fleetPayCentavos)}`}
          </AppText>
        </View>
        {settlement.review?.decision === 'declined' ? (
          <View style={styles.error} accessibilityRole="alert">
            <Icon name="info" size={18} color={colors.error} />
            <AppText variant="bodySm" style={styles.shrink}>
              Para declined the last request: {settlement.review.reason}
            </AppText>
          </View>
        ) : null}
        <View style={{ gap: 4 }}>
          <AppText variant="labelMd" bold>
            Send it to
          </AppText>
          <Select
            accessibilityLabel="Payout method"
            options={PAYOUT_METHODS}
            value={account.method}
            onChange={(method: PayoutMethod) => set({ method })}
          />
        </View>
        {account.method === 'Bank transfer' ? (
          <TextField
            label="Bank"
            required
            placeholder="e.g. BPI"
            value={account.bankName}
            onChangeText={(bankName) => set({ bankName })}
            error={shown.bankName}
            testID="request-bank"
          />
        ) : null}
        <TextField
          label="Account name"
          required
          value={account.accountName}
          onChangeText={(accountName) => set({ accountName })}
          error={shown.accountName}
          testID="request-name"
        />
        <TextField
          label={account.method === 'GCash' ? 'GCash number' : 'Account number'}
          required
          placeholder={account.method === 'GCash' ? '0917 123 4567' : '0012 3456 7890'}
          keyboardType="number-pad"
          value={account.accountNumber}
          onChangeText={(accountNumber) => set({ accountNumber })}
          error={shown.accountNumber}
          testID="request-number"
        />
        <TextField
          label="Note to Para (optional)"
          value={note}
          onChangeText={setNote}
          maxLength={300}
          testID="request-note"
        />
        <ServerError message={serverError} />
      </View>
    </Dialog>
  );
}

/** Para declines a request; the fleet sees the reason and can request again. */
export function DeclineDialog({
  settlement,
  submitting,
  serverError,
  onClose,
  onConfirm,
}: {
  settlement: Settlement;
  submitting: boolean;
  serverError?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const error = submitted && !reason.trim() ? 'Say why, so the fleet can fix it and request again.' : undefined;
  return (
    <Dialog
      visible
      title={`Decline ${settlement.fleetName}'s request?`}
      subtitle={`${settlement.number} • ${centavosText(settlement.remitCentavos)}`}
      onClose={onClose}
      width={460}
      footer={
        <View style={styles.dialogFooter}>
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button
            label="Decline"
            icon="block"
            variant="danger"
            loading={submitting}
            disabled={submitting}
            testID="confirm-decline"
            onPress={() => {
              setSubmitted(true);
              if (reason.trim()) onConfirm(reason.trim());
            }}
          />
        </View>
      }>
      <View style={styles.dialogBody}>
        <TextField
          label="Reason (the fleet sees this)"
          required
          placeholder="e.g. The GCash name does not match the fleet."
          value={reason}
          onChangeText={setReason}
          maxLength={300}
          error={error}
          testID="decline-reason"
        />
        <ServerError message={serverError} />
      </View>
    </Dialog>
  );
}
