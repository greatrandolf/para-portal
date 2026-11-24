import { View } from 'react-native';

import { colors } from '@/constants/theme';
import type { FleetOwner } from '@/types/fleet';
import { AppText } from '@packages/ui/AppText';
import { Card } from '@packages/ui/Card';
import { Icon } from '@packages/ui/Icon';
import { Select } from '@packages/ui/Select';

import { styles } from './styles';

export const ALL_ACCOUNTS = 'all';

/**
 * Admins only: which fleet account's records to show. Every unit, driver, and assignment belongs to one fleet
 * account, so new records need one account picked.
 */
export function FleetAccountPicker({
  owners,
  value,
  onChange,
}: {
  owners: FleetOwner[];
  value: string;
  onChange: (value: string) => void;
}) {
  const options = [
    { value: ALL_ACCOUNTS, label: `All fleet accounts (${owners.length})` },
    ...owners.map((o) => ({ value: o.uid, label: `${o.name}${o.status === 'disabled' ? ' (disabled)' : ''}` })),
  ];
  const picked = owners.find((o) => o.uid === value);
  let hint: string;
  if (owners.length === 0) hint = 'No fleet accounts yet. Invite one with the Fleet role in Team & Access.';
  else if (!picked) hint = 'Showing every fleet account. Pick one to register vehicles or add drivers for it.';
  else if (picked.status === 'disabled') hint = `${picked.email} is disabled; its records are read-only here.`;
  else hint = `New vehicles and drivers are added to ${picked.name} (${picked.email}).`;

  return (
    <Card style={[styles.accountBar, styles.layerTop]} testID="fleet-account-picker">
      <View style={styles.rowSm}>
        <Icon name="corporate-fare" size={20} color={colors.brand} />
        <AppText variant="labelLg" bold>
          Fleet account
        </AppText>
      </View>
      <Select
        accessibilityLabel="Fleet account"
        options={options}
        value={picked ? value : ALL_ACCOUNTS}
        onChange={onChange}
        style={styles.accountSelect}
      />
      <AppText variant="bodySm" color={colors.onSurfaceVariant} style={styles.accountHint}>
        {hint}
      </AppText>
    </Card>
  );
}
