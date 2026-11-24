import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { ComplianceStats, Driver, DriverDocument } from '@/types/driver';
import { AppText } from '@packages/ui/AppText';
import { Avatar } from '@packages/ui/Avatar';
import { Badge } from '@packages/ui/Badge';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Icon, type IconName } from '@packages/ui/Icon';
import { IconButton } from '@packages/ui/IconButton';

import { ComplianceTile, OnDutyTile } from './ComplianceOverview';
import { styles } from './styles';

export type Decision = 'approving' | 'approved' | 'rejected' | 'reupload';

const DOC_ICON: Record<DriverDocument['icon'], IconName> = {
  license: 'badge',
  cpc: 'assignment',
  clearance: 'policy',
  capital: 'receipt-long',
  training: 'school',
};

const STAGE_TITLE: Record<number, string> = {
  1: 'Stage 1 of 3: Document Intake',
  2: 'Stage 2 of 3: Cooperative Officer Review',
  3: 'Stage 3 of 3: Final Administrative Approval',
};

const DEFAULT_REASON = 'Incomplete LTFRB Endorsement stamp';

type DriverDossierProps = {
  driver: Driver;
  stats: ComplianceStats;
  decision: Decision | undefined;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRequestReupload: () => void;
  onPreview: (doc: DriverDocument) => void;
  compact: boolean;
};

/** Right-hand "Verification Review Dossier" for the selected driver. */
export function DriverDossier({
  driver,
  stats,
  decision,
  onApprove,
  onReject,
  onRequestReupload,
  onPreview,
  compact,
}: DriverDossierProps) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(DEFAULT_REASON);
  const verified = driver.documents.filter((doc) => doc.status === 'verified').length;
  const allVerified = verified === driver.documents.length;
  const isPending = driver.tab === 'pending';

  return (
    <Card padding="none" elevated style={styles.dossier}>
      {/* Stage header */}
      <View style={styles.stageHeader}>
        <View style={[styles.rowSm, styles.shrink]}>
          <View style={styles.stageNumber}>
            <AppText variant="labelLg" bold color={colors.onPrimary}>
              {String(driver.stage).padStart(2, '0')}
            </AppText>
          </View>
          <View style={styles.shrink}>
            <AppText variant="labelSm" uppercase color={colors.neonOrangeDeep}>
              {isPending
                ? STAGE_TITLE[driver.stage]
                : driver.tab === 'active'
                  ? 'Active Driver Record'
                  : 'Suspension Record'}
            </AppText>
            <AppText variant="headlineSm" bold>
              Verification Review Dossier
            </AppText>
          </View>
        </View>
        <View style={styles.appId}>
          <AppText variant="labelSm" color={colors.onSurfaceVariant}>
            Application ID:
          </AppText>
          <AppText variant="labelMd" bold>
            {driver.applicationId}
          </AppText>
        </View>
      </View>

      <View style={styles.dossierBody}>
        {/* Profile + wallet */}
        <View style={[styles.profileRow, compact && styles.stack]}>
          <View style={[styles.rowMd, styles.shrink, styles.grow]}>
            <Avatar name={driver.name} size={88} marker={{ icon: 'badge', tone: 'brand' }} />
            <View style={[styles.shrink, styles.gapXs]}>
              <AppText variant="displaySm">{driver.name}</AppText>
              <View style={styles.rowWrapXs}>
                {driver.nickname ? (
                  <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                    “{driver.nickname}”
                  </AppText>
                ) : null}
                <Badge label={driver.level} tone="success" pill={false} uppercase={false} />
              </View>
              <ContactLine icon="call" text={driver.phone} />
              <ContactLine icon="mail" text={driver.email} />
              <ContactLine icon="location-on" text={driver.address} />
            </View>
          </View>
          <View style={styles.wallet}>
            <View style={styles.rowBetween}>
              <View style={styles.rowXs}>
                <Icon name="account-balance-wallet" size={16} color={colors.telemetryStrong} />
                <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                  GCash Transit Wallet
                </AppText>
              </View>
              <Badge
                label={driver.walletVerified ? 'Verified ✓' : 'Unpaired'}
                tone={driver.walletVerified ? 'telemetry' : 'warning'}
                pill={false}
                uppercase={false}
              />
            </View>
            <AppText variant="metricTabular">{driver.walletNumber}</AppText>
            <AppText variant="labelSm" color={colors.onSurfaceVariant}>
              Instant fare settlement route link
            </AppText>
          </View>
        </View>

        {/* Vehicle + telemetry */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <View style={[styles.rowXs, styles.shrink]}>
              <Icon name="directions-bus" size={18} color={colors.neonOrangeDeep} />
              <AppText variant="labelMd" bold uppercase style={styles.shrink}>
                Assigned Modern Vehicle & RTK Telemetry Unit
              </AppText>
            </View>
            <Badge label="Pairing Check: Normal" tone="telemetry" pill={false} uppercase={false} />
          </View>
          <View style={styles.vehicleGrid}>
            <View style={[styles.vehicleCell, compact && styles.vehicleCellHalf]}>
              <Card style={styles.vehicleTile}>
                <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                  Corridor Assignment
                </AppText>
                <View style={styles.rowXs}>
                  <Badge label={driver.routeCode} tone="brand" pill={false} />
                  <AppText variant="headlineSm" bold style={styles.shrink}>
                    {driver.routeName}
                  </AppText>
                </View>
              </Card>
            </View>
            <View style={[styles.vehicleCell, compact && styles.vehicleCellHalf]}>
              <Card style={styles.vehicleTile}>
                <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                  Plate / Conduction
                </AppText>
                <AppText variant="headlineLg" bold>
                  {driver.plate}
                </AppText>
                <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                  {driver.vehicleClass}
                </AppText>
              </Card>
            </View>
            <View style={[styles.vehicleCell, compact && styles.vehicleCellHalf]}>
              <OnDutyTile stats={stats} />
            </View>
            <View style={[styles.vehicleCell, compact && styles.vehicleCellHalf]}>
              <ComplianceTile rate={stats.complianceRate} />
            </View>
          </View>
        </View>

        {/* Documents */}
        <View style={styles.gapSm}>
          <View style={styles.rowBetween}>
            <View style={[styles.rowXs, styles.shrink]}>
              <Icon name="fact-check" size={18} color={colors.neonOrangeDeep} />
              <AppText variant="labelMd" bold uppercase style={styles.shrink}>
                Document Compliance Audit ({verified} of {driver.documents.length} Complete)
              </AppText>
            </View>
            {allVerified ? (
              <AppText variant="labelSm" color={colors.telemetryStrong}>
                All Signatures Valid
              </AppText>
            ) : null}
          </View>
          {driver.documents.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} onPreview={() => onPreview(doc)} compact={compact} />
          ))}
        </View>

        {/* Audit trail */}
        <View style={styles.audit}>
          <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
            Immutable Verification Audit Trail
          </AppText>
          {[
            ...driver.audit,
            ...(decision === 'approved'
              ? [{ label: 'Dispatcher Final Signoff • Smart ID issued', at: 'Just now', state: 'done' as const }]
              : []),
          ].map((event) => (
            <View key={event.label} style={styles.auditRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: event.state === 'done' ? colors.tertiary : colors.primaryContainer },
                ]}
              />
              <AppText variant="labelMd" bold color={event.state === 'done' ? colors.onSurface : colors.neonOrangeDeep}>
                {event.label}
              </AppText>
              <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                • {event.at}
              </AppText>
            </View>
          ))}
        </View>

        {/* Actions */}
        {isPending ? (
          <ActionStrip
            driver={driver}
            decision={decision}
            allVerified={allVerified}
            pendingDocs={driver.documents.length - verified}
            rejecting={rejecting}
            reason={reason}
            onReasonChange={setReason}
            onStartReject={() => setRejecting(true)}
            onCancelReject={() => {
              setRejecting(false);
              setReason(DEFAULT_REASON);
            }}
            onConfirmReject={() => {
              setRejecting(false);
              onReject(reason.trim() || DEFAULT_REASON);
            }}
            onApprove={onApprove}
            onRequestReupload={onRequestReupload}
            compact={compact}
          />
        ) : (
          <View style={styles.statusNote}>
            <Icon name="info-outline" size={18} color={colors.secondary} />
            <AppText variant="bodySm" color={colors.onSurfaceVariant} style={styles.shrink}>
              {driver.tab === 'active'
                ? `${driver.name} is cleared and dispatched on Route ${driver.routeCode}. No approval action is needed.`
                : `${driver.name} is suspended. Reinstatement opens after the pending items in the audit trail are resolved.`}
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );
}

function ContactLine({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.rowXs}>
      <Icon name={icon} size={14} color={colors.onSurfaceVariant} />
      <AppText variant="bodySm" color={colors.onSurfaceVariant} numberOfLines={1} style={styles.shrink}>
        {text}
      </AppText>
    </View>
  );
}

function DocumentRow({ doc, onPreview, compact }: { doc: DriverDocument; onPreview: () => void; compact: boolean }) {
  const badge =
    doc.status === 'verified'
      ? ({ label: 'Verified', tone: 'verified', icon: 'check' } as const)
      : doc.status === 'pending'
        ? ({ label: 'Pending', tone: 'neutral', icon: 'schedule' } as const)
        : ({ label: 'Re-scan', tone: 'warning', icon: 'error-outline' } as const);
  return (
    <View style={[styles.docRow, doc.status === 'rejected' && styles.docRowRejected, compact && styles.docRowCompact]}>
      <View style={[styles.rowMd, styles.shrink, styles.grow]}>
        <View style={styles.docIcon}>
          <Icon name={DOC_ICON[doc.icon]} size={20} color={colors.neonOrangeDeep} />
        </View>
        <View style={styles.shrink}>
          <AppText variant="headlineSm" bold>
            {doc.title}
          </AppText>
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            {doc.detail}
          </AppText>
        </View>
      </View>
      <View style={styles.docMeta}>
        <AppText variant="labelSm" color={colors.onSurfaceVariant} style={styles.docMetaText}>
          {doc.meta}
        </AppText>
        <Badge label={badge.label} tone={badge.tone} icon={badge.icon} pill={false} uppercase={false} />
        <IconButton
          icon="visibility"
          size={18}
          color={colors.onSurfaceVariant}
          accessibilityLabel={`Preview ${doc.title}`}
          onPress={onPreview}
        />
      </View>
    </View>
  );
}

type ActionStripProps = {
  driver: Driver;
  decision: Decision | undefined;
  allVerified: boolean;
  pendingDocs: number;
  rejecting: boolean;
  reason: string;
  onReasonChange: (reason: string) => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onConfirmReject: () => void;
  onApprove: () => void;
  onRequestReupload: () => void;
  compact: boolean;
};

function ActionStrip({
  driver,
  decision,
  allVerified,
  pendingDocs,
  rejecting,
  reason,
  onReasonChange,
  onStartReject,
  onCancelReject,
  onConfirmReject,
  onApprove,
  onRequestReupload,
  compact,
}: ActionStripProps) {
  if (decision === 'rejected') {
    return (
      <View style={[styles.statusNote, styles.statusNoteDanger]}>
        <Icon name="cancel" size={18} color={colors.error} />
        <AppText variant="bodySm" color={colors.onErrorContainer} style={styles.shrink}>
          {driver.applicationId} moved to Suspended / Incomplete. The driver has been notified with the rejection
          reason.
        </AppText>
      </View>
    );
  }

  if (rejecting) {
    return (
      <View style={styles.rejectBox}>
        <AppText variant="labelMd" bold>
          Rejection reason for Cooperative Audit Records
        </AppText>
        <TextInput
          value={reason}
          onChangeText={onReasonChange}
          accessibilityLabel="Rejection reason"
          style={styles.reasonInput}
          autoFocus
          testID="reject-reason"
        />
        <View style={styles.rowWrap}>
          <Button
            label="Confirm Rejection"
            icon="cancel"
            variant="danger"
            onPress={onConfirmReject}
            testID="confirm-reject"
          />
          <Button label="Cancel" variant="ghost" onPress={onCancelReject} />
        </View>
      </View>
    );
  }

  const approved = decision === 'approved';
  return (
    <View style={[styles.actions, compact && styles.actionsStacked]}>
      <View style={styles.rowWrap}>
        <Button
          label="Reject Application"
          icon="highlight-off"
          variant="danger"
          onPress={onStartReject}
          disabled={approved}
          testID="reject-button"
        />
        <Button label="Request Re-upload" icon="flag" variant="muted" onPress={onRequestReupload} disabled={approved} />
      </View>
      <View style={[styles.approveWrap, compact && styles.approveWrapStacked]}>
        <Button
          label={
            approved
              ? 'Approved & Dispatched'
              : decision === 'approving'
                ? `Authorizing Route ${driver.routeCode} Grid…`
                : `Approve & Issue Driver Smart ID + Assign to Route ${driver.routeCode}`
          }
          icon={approved ? 'check-circle' : 'badge'}
          variant={approved ? 'success' : 'primary'}
          size="lg"
          loading={decision === 'approving'}
          disabled={approved || !allVerified}
          onPress={onApprove}
          testID="approve-button"
        />
        {!allVerified && !approved ? (
          <AppText variant="labelSm" color={colors.onSurfaceVariant} align="right">
            Resolve {pendingDocs} outstanding document{pendingDocs === 1 ? '' : 's'} before approval.
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
