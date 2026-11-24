import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useToast } from '@/hooks/useToast';
import { filterQueue, getComplianceStats, getDrivers, type RouteFilter } from '@/services/driverService';
import type { Driver, QueueTab } from '@/types/driver';
import { Toast } from '@packages/ui/Toast';
import { useBreakpoint } from '@packages/responsive/useBreakpoint';

import { ComplianceBanner, StatsStrip } from './ComplianceOverview';
import { DriverDossier, type Decision } from './DriverDossier';
import { QueueControls, QueueList } from './DriverQueue';
import { styles } from './styles';

const SWEEP_SECONDS = 14 * 60 + 22;

/** Stitch "Driver Registration & Cooperative Approvals". */
export function DriverRegistrationScreen() {
  const [drivers, setDrivers] = useState<Driver[]>(getDrivers);
  const [stats] = useState(getComplianceStats);
  const [tab, setTab] = useState<QueueTab>('pending');
  const [query, setQuery] = useState('');
  const [route, setRoute] = useState<RouteFilter>('all');
  const [selectedId, setSelectedId] = useState<string | undefined>(drivers[0]?.id);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [secondsLeft, setSecondsLeft] = useState(SWEEP_SECONDS);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { toast, show, dismiss } = useToast();
  const { atLeastMd, atLeastXl, isPhone, bp } = useBreakpoint();

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => (s <= 1 ? SWEEP_SECONDS : s - 1)), 1000);
    const pending = timers.current;
    return () => {
      clearInterval(id);
      pending.forEach(clearTimeout);
    };
  }, []);

  const queue = useMemo(() => filterQueue(drivers, tab, route, query), [drivers, tab, route, query]);
  // Keep a dossier open: the selection, else the first visible driver.
  const selected = queue.find((d) => d.id === selectedId) ?? queue[0];
  const approvedIds = useMemo(
    () =>
      new Set(
        Object.entries(decisions)
          .filter(([, d]) => d === 'approved')
          .map(([id]) => id),
      ),
    [decisions],
  );

  const setDecision = (id: string, decision: Decision) => setDecisions((prev) => ({ ...prev, [id]: decision }));

  const handleApprove = (driver: Driver) => {
    setDecision(driver.id, 'approving');
    timers.current.push(
      setTimeout(() => {
        setDecision(driver.id, 'approved');
        show({
          title: 'Smart ID Issued & Synchronized',
          message: `${driver.name}${driver.nickname ? ` “${driver.nickname}”` : ''} is cleared for dispatch on Route ${driver.routeCode} (PUV ${driver.plate}).`,
          icon: 'verified',
        });
      }, 800),
    );
  };

  const handleReject = (driver: Driver, reason: string) => {
    setDecision(driver.id, 'rejected');
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driver.id ? { ...d, tab: 'suspended', status: 'suspended', note: `Rejected: ${reason}` } : d,
      ),
    );
    show({
      title: 'Application Rejected',
      message: `${driver.applicationId} moved to incomplete status with reason: ${reason}`,
      icon: 'close',
      tone: 'danger',
    });
  };

  const statColumns = bp === 'sm' ? 1 : atLeastXl ? 4 : 2;

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.page, isPhone && styles.pagePhone]}
        keyboardShouldPersistTaps="handled">
        <ComplianceBanner
          secondsLeft={secondsLeft}
          onRefresh={() => {
            setSecondsLeft(SWEEP_SECONDS);
            show({
              title: 'Audit sweep complete',
              message: 'All 68 driver signatures re-validated against LTFRB and SSS records.',
              icon: 'refresh',
              tone: 'info',
            });
          }}
        />
        <StatsStrip stats={stats} columns={statColumns} />
        <View style={styles.controlsLayer}>
          <QueueControls
            tab={tab}
            onTabChange={setTab}
            counts={stats.tabCounts}
            query={query}
            onQueryChange={setQuery}
            route={route}
            onRouteChange={setRoute}
            onExport={() =>
              show({
                title: 'Compliance roster export queued',
                message: 'The CSV will be ready in Driver Payouts.',
                icon: 'file-download',
                tone: 'info',
              })
            }
            stacked={!atLeastXl}
          />
        </View>
        <View style={[styles.split, atLeastXl && styles.splitRow]}>
          <View style={[styles.queueCol, atLeastXl && styles.queueColWide]}>
            <QueueList
              drivers={queue}
              total={stats.tabCounts[tab]}
              selectedId={selected?.id}
              onSelect={setSelectedId}
              approvedIds={approvedIds}
            />
          </View>
          {selected ? (
            <View style={[styles.dossierCol, atLeastXl && styles.dossierColWide]}>
              <DriverDossier
                key={selected.id}
                driver={selected}
                stats={stats}
                decision={decisions[selected.id]}
                onApprove={() => handleApprove(selected)}
                onReject={(reason) => handleReject(selected, reason)}
                onRequestReupload={() => {
                  setDecision(selected.id, 'reupload');
                  show({
                    title: 'Deficiency Notification Sent',
                    message: `A secure SMS prompt was sent to ${selected.phone} for document re-upload.`,
                    icon: 'send',
                    tone: 'info',
                  });
                }}
                onPreview={(doc) =>
                  show({ title: doc.title, message: `${doc.detail} • ${doc.meta}`, icon: 'visibility', tone: 'info' })
                }
                compact={!atLeastMd}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
      <Toast toast={toast} onDismiss={dismiss} />
    </View>
  );
}
