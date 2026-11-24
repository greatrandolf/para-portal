import { useState } from 'react';
import { View } from 'react-native';

import { colors } from '@/constants/theme';
import type { Campaign } from '@packages/tanstack/query/paraAds';
import { AppText } from '@packages/ui/AppText';
import { Button } from '@packages/ui/Button';
import { Dialog } from '@packages/ui/Dialog';
import { TextField } from '@packages/ui/TextField';

import { countText, parsePesos, pesoText, remainingMicro, viewsFor } from './paraAdsText';
import { styles } from './styles';

type Props = {
  campaign: Campaign | null;
  busy?: boolean;
  onClose: () => void;
  onTopUp: (addCentavos: number) => void;
};

/** Adds money to an ad's purchase amount (the business paid Para more); a used-up ad runs again. */
export function TopUpDialog({ campaign: open, busy, onClose, onTopUp }: Props) {
  const [amount, setAmount] = useState('');
  // Keep showing the last ad while the dialog fades out (it read "About 0 views left" when it went blank), and start
  // with an empty amount when it opens for another ad.
  const [last, setLast] = useState<Campaign | null>(open);
  if (open && open !== last) {
    if (open.id !== last?.id) setAmount('');
    setLast(open);
  }
  const campaign = open ?? last;
  const add = parsePesos(amount);
  const priceCentavos = campaign ? campaign.pricePerViewMicro / 10_000 : 0;
  const remainingCentavos = campaign ? Math.floor(remainingMicro(campaign) / 10_000) : 0;
  return (
    <Dialog
      visible={!!open}
      title="Top up"
      subtitle={campaign ? `${campaign.businessName} • ${pesoText(remainingMicro(campaign))} left` : undefined}
      onClose={onClose}
      footer={
        <View style={styles.dialogFooter}>
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button
            label={add ? `Add ${pesoText(add * 10_000)}` : 'Add'}
            icon="add-card"
            disabled={!add}
            loading={busy}
            onPress={() => add && onTopUp(add)}
            testID="confirm-top-up"
          />
        </View>
      }>
      <View style={styles.dialogBody}>
        <TextField
          label="Amount the business paid (₱)"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          testID="field-top-up"
        />
        <AppText variant="bodySm" color={colors.onSurfaceVariant}>
          {add
            ? `About ${countText(viewsFor(remainingCentavos + add, priceCentavos))} views left after this.`
            : 'Enter the amount in pesos.'}
        </AppText>
      </View>
    </Dialog>
  );
}
