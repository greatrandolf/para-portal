import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useLiveCampaigns } from '@/hooks/useLiveCampaigns';
import { useToast } from '@/hooks/useToast';
import { useBreakpoint } from '@packages/responsive/useBreakpoint';
import {
  useSetCampaignStatus,
  useTopUpCampaign,
  type Campaign,
} from '@packages/tanstack/query/paraAds';
import { useRoutes } from '@packages/tanstack/query/routes';
import { AppText } from '@packages/ui/AppText';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Dialog } from '@packages/ui/Dialog';
import { Icon } from '@packages/ui/Icon';
import { Toast } from '@packages/ui/Toast';

import { CampaignCard, type CampaignAction } from './CampaignCard';
import { CampaignFormDialog } from './CampaignFormDialog';
import { countText, pesoText, remainingMicro, shownStatus } from './paraAdsText';
import { styles } from './styles';
import { TopUpDialog } from './TopUpDialog';

/**
 * Para Ads (para-ads): ads local businesses buy from Para. Admins upload the photo, set the schedule, purchase amount
 * and price per view, and watch the money left go down after every counted view (live). Commuters with less than
 * ₱1 see a running Para Ad instead of a Google ad; drivers share each view's price like a ₱1 view.
 */
export function ParaAdsScreen() {
  const { isPhone } = useBreakpoint();
  const live = useLiveCampaigns();
  const routes = useRoutes();
  const setStatus = useSetCampaignStatus();
  const topUp = useTopUpCampaign();
  const { toast, show, dismiss } = useToast();
  const [editing, setEditing] = useState<{ campaign: Campaign | null } | undefined>();
  const [toppingUp, setToppingUp] = useState<Campaign | null>(null);
  const [ending, setEnding] = useState<Campaign | null>(null);
  // Now, refreshed every minute: ads past their end date show as Finished and leave the running totals.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const routeChoices = (routes.data ?? []).map((r) => ({ id: r.id, code: r.code }));
  const codeOf = new Map(routeChoices.map((r) => [r.id, r.code]));
  const running = live.campaigns.filter((c) => shownStatus(c, now) === 'active');
  const totalRemaining = running.reduce((sum, c) => sum + remainingMicro(c), 0);
  const totalViews = live.campaigns.reduce((sum, c) => sum + c.views, 0);
  const totalSpent = live.campaigns.reduce((sum, c) => sum + c.spentMicro, 0);

  const fail = (title: string) => (error: Error) => show({ title, message: error.message, icon: 'error', tone: 'danger' });

  const onAction = (action: CampaignAction, c: Campaign) => {
    if (action === 'edit') return setEditing({ campaign: c });
    if (action === 'topUp') return setToppingUp(c);
    if (action === 'end') return setEnding(c);
    setStatus.mutate(
      { id: c.id, status: action === 'activate' ? 'active' : 'paused' },
      {
        onSuccess: () =>
          show({
            title: action === 'activate' ? `${c.businessName} is running` : `${c.businessName} is paused`,
            icon: 'check-circle',
            tone: 'success',
          }),
        onError: fail(action === 'activate' ? 'Could not activate' : 'Could not pause'),
      },
    );
  };

  return (
    <View style={styles.flex} testID="screen-para-ads">
      <ScrollView contentContainerStyle={[styles.page, isPhone && styles.pagePhone]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
              Local business advertising
            </AppText>
            <AppText variant="displaySm" bold accessibilityRole="header">
              Para Ads
            </AppText>
            <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
              Commuters with less than ₱1 watch an ad to see live jeepneys. A running Para Ad is shown first; when none
              is running, Google ads are shown. Each view uses the ad&apos;s price per view, shared with the jeepneys
              coming the commuter&apos;s way (by default drivers 60%, fleets 20%, Para 20%).
            </AppText>
          </View>
          <Button
            label="New ad"
            icon="add"
            size="lg"
            onPress={() => setEditing({ campaign: null })}
            testID="new-campaign"
          />
        </View>

        <View style={styles.totals}>
          <Total label="Running" value={countText(running.length)} />
          <Total label="Remaining (running)" value={pesoText(totalRemaining)} strong />
          <Total label="Views" value={countText(totalViews)} />
          <Total label="Spent" value={pesoText(totalSpent)} />
        </View>

        {live.loading ? (
          <ActivityIndicator color={colors.brand} />
        ) : live.error ? (
          <View style={styles.error}>
            <Icon name="error" size={18} color={colors.error} />
            <AppText variant="bodyMd" color={colors.error}>
              {`Ads could not be loaded: ${live.error}`}
            </AppText>
          </View>
        ) : live.campaigns.length === 0 ? (
          <Card style={styles.empty}>
            <Icon name="campaign" size={36} color={colors.onSurfaceVariant} />
            <AppText variant="headlineSm">No Para Ads yet</AppText>
            <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
              Create one for a local business: upload a photo, set the schedule, amount and price per view.
            </AppText>
          </Card>
        ) : (
          <View style={styles.list}>
            {live.campaigns.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                routeCodes={c.routeIds.map((id) => codeOf.get(id) ?? '?')}
                now={now}
                busy={setStatus.isPending}
                onAction={onAction}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <CampaignFormDialog
        open={!!editing}
        campaign={editing?.campaign ?? null}
        routes={routeChoices}
        onClose={() => setEditing(undefined)}
        onSaved={(title) => {
          setEditing(undefined);
          show({ title, icon: 'check-circle', tone: 'success' });
        }}
      />

      <TopUpDialog
        campaign={toppingUp}
        busy={topUp.isPending}
        onClose={() => setToppingUp(null)}
        onTopUp={(addCentavos) =>
          toppingUp &&
          topUp.mutate(
            { id: toppingUp.id, addCentavos },
            {
              onSuccess: (r) => {
                setToppingUp(null);
                show({
                  title: `Added to ${toppingUp.businessName}`,
                  message: `${pesoText(r.remainingMicro)} left • ${countText(r.viewsLeft)} views`,
                  icon: 'check-circle',
                  tone: 'success',
                });
              },
              onError: fail('Could not top up'),
            },
          )
        }
      />

      <Dialog
        visible={!!ending}
        title="End this ad?"
        subtitle={ending ? `${ending.businessName} stops showing for good. What is left stays unspent.` : undefined}
        onClose={() => setEnding(null)}
        footer={
          <View style={styles.dialogFooter}>
            <Button label="Keep it" variant="ghost" onPress={() => setEnding(null)} />
            <Button
              label="End ad"
              icon="stop"
              variant="danger"
              loading={setStatus.isPending}
              onPress={() =>
                ending &&
                setStatus.mutate(
                  { id: ending.id, status: 'ended' },
                  {
                    onSuccess: () => {
                      show({ title: `${ending.businessName} ended`, icon: 'check-circle', tone: 'success' });
                      setEnding(null);
                    },
                    onError: fail('Could not end the ad'),
                  },
                )
              }
              testID="confirm-end"
            />
          </View>
        }>
        <View />
      </Dialog>

      <Toast toast={toast} onDismiss={dismiss} />
    </View>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={[styles.total, strong && styles.totalStrong]}>
      <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
        {label}
      </AppText>
      <AppText variant="metricTabular">{value}</AppText>
    </View>
  );
}
