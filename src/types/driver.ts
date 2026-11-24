export type QueueTab = 'pending' | 'active' | 'suspended';

export type QueueStatus = 'ready' | 'documents' | 'action' | 'dispatched' | 'suspended';

export type DocumentStatus = 'verified' | 'pending' | 'rejected';

export type DriverDocument = {
  id: string;
  title: string;
  detail: string;
  meta: string;
  icon: 'license' | 'cpc' | 'clearance' | 'capital' | 'training';
  status: DocumentStatus;
};

export type AuditEvent = { label: string; at: string; state: 'done' | 'pending' };

export type Driver = {
  id: string;
  applicationId: string;
  name: string;
  nickname?: string;
  level: string;
  tab: QueueTab;
  status: QueueStatus;
  submitted: string;
  routeCode: string;
  routeName: string;
  vehicle: string;
  vehicleClass: string;
  plate: string;
  phone: string;
  email: string;
  address: string;
  walletNumber: string;
  walletVerified: boolean;
  /** Footer line of the queue card. */
  note: string;
  queueLabel: string;
  stage: number;
  documents: DriverDocument[];
  audit: AuditEvent[];
};

export type ComplianceStats = {
  totalEnrolled: number;
  shareVerified: number;
  pending: number;
  oldestPending: string;
  activeOnDuty: number;
  corridors: number;
  onRoute17B: number;
  complianceRate: number;
  tabCounts: Record<QueueTab, number>;
};
