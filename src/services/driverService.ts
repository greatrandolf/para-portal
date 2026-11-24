import type { ComplianceStats, Driver, QueueTab } from '@/types/driver';

import { COMPLIANCE_STATS, DRIVERS, ROUTE_FILTERS } from './mock/driverData';

export type RouteFilter = (typeof ROUTE_FILTERS)[number]['value'];

export { ROUTE_FILTERS };

/** Mock data; replace with the cooperative registry API. */
export function getDrivers(): Driver[] {
  return DRIVERS.map((driver) => ({ ...driver, documents: [...driver.documents], audit: [...driver.audit] }));
}

export function getComplianceStats(): ComplianceStats {
  return COMPLIANCE_STATS;
}

/** Filters the queue by tab, corridor, and a free-text query (name, nickname, ID, plate, application ID). */
export function filterQueue(drivers: readonly Driver[], tab: QueueTab, route: RouteFilter, query: string): Driver[] {
  const q = query.trim().toLowerCase();
  return drivers.filter((driver) => {
    if (driver.tab !== tab) return false;
    if (route !== 'all' && driver.routeCode !== route) return false;
    if (!q) return true;
    return [driver.name, driver.nickname ?? '', driver.id, driver.plate, driver.applicationId].some((field) =>
      field.toLowerCase().includes(q),
    );
  });
}
