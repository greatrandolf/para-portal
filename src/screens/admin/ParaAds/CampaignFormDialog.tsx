import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { colors } from '@/constants/theme';
import { photoProblem, uploadAdPhoto } from '@/services/paraAdPhotos';
import { useParaAdsApi, useSaveCampaign, type Campaign } from '@packages/tanstack/query/paraAds';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Button } from '@packages/ui/Button';
import { Dialog } from '@packages/ui/Dialog';
import { Icon } from '@packages/ui/Icon';
import { TextField } from '@packages/ui/TextField';

import {
  PRICE_PICKS,
  countText,
  lastDay,
  manilaDate,
  manilaDayEnd,
  manilaDayStart,
  parsePesos,
  timeText,
  viewsFor,
} from './paraAdsText';
import { styles } from './styles';

export type RouteChoice = { id: string; code: string };

type Props = {
  /** The ad to edit, or null for a new one; the dialog is open while `open` is true. */
  campaign: Campaign | null;
  open: boolean;
  routes: RouteChoice[];
  onClose: () => void;
  onSaved: (message: string) => void;
};

type Photo = { uri: string; mimeType: string };

const centsText = (centavos: number) => (centavos / 100).toFixed(2);

/**
 * Create or edit a Para Ad (para-ads): photo, business, schedule, routes, purchase amount and price per view
 * (₱0.30 / ₱0.50 / ₱0.80 or any amount from ₱0.10 to ₱5.00). New ads are saved as drafts; Activate runs them.
 */
export function CampaignFormDialog({ campaign, open, routes, onClose, onSaved }: Props) {
  // Today's date (Manila) for a new ad's schedule, read once when the dialog mounts.
  const [today] = useState(() => manilaDate(Date.now()));
  const [form, setForm] = useState(() => initialForm(campaign, today));
  const [formFor, setFormFor] = useState<string | null | undefined>(undefined);
  // Reset the fields whenever the dialog opens for another ad (or a new one).
  const key = open ? (campaign?.id ?? 'new') : undefined;
  if (key !== formFor) {
    setFormFor(key);
    if (open) setForm(initialForm(campaign, today));
  }
  const [photo, setPhoto] = useState<Photo | undefined>();
  const [problem, setProblem] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const api = useParaAdsApi();
  const save = useSaveCampaign();

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const budget = parsePesos(form.budget);
  const price = parsePesos(form.price);
  const views = viewsFor(budget, price);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    const mimeType = asset.mimeType ?? asset.file?.type ?? 'image/jpeg';
    const issue = photoProblem(mimeType, asset.fileSize ?? asset.file?.size);
    setProblem(issue);
    if (!issue) setPhoto({ uri: asset.uri, mimeType });
  };

  const submit = async () => {
    const startAt = manilaDayStart(form.start);
    const endAt = manilaDayEnd(form.end);
    const issue =
      !campaign && !photo
        ? 'Choose a photo for the ad.'
        : startAt === undefined || endAt === undefined
          ? 'Enter the dates as YYYY-MM-DD.'
          : budget === undefined
            ? 'Enter the purchase amount in pesos.'
            : price === undefined
              ? 'Enter the price per view in pesos.'
              : undefined;
    setProblem(issue);
    if (issue || startAt === undefined || endAt === undefined || budget === undefined || price === undefined) return;
    setSaving(true);
    try {
      const id = campaign?.id ?? (await api.newId());
      const image = photo
        ? await uploadAdPhoto(id, photo.uri, photo.mimeType)
        : { imagePath: campaign?.imagePath ?? '', imageUrl: campaign?.imageUrl ?? '' };
      await save.mutateAsync({
        id,
        businessName: form.businessName,
        headline: form.headline,
        ctaLabel: form.ctaLabel || undefined,
        ctaUrl: form.ctaUrl || undefined,
        ...image,
        startAt,
        endAt,
        dailyFrom: form.dailyFrom || undefined,
        dailyTo: form.dailyTo || undefined,
        routeIds: form.routeIds,
        budgetCentavos: budget,
        priceCentavos: price,
      });
      onSaved(campaign ? 'Ad saved' : 'Ad saved as a draft. Activate it to start showing it.');
    } catch (error) {
      setProblem((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleRoute = (id: string) =>
    set({ routeIds: form.routeIds.includes(id) ? form.routeIds.filter((r) => r !== id) : [...form.routeIds, id] });

  return (
    <Dialog
      visible={open}
      title={campaign ? 'Edit Para Ad' : 'New Para Ad'}
      subtitle="Shown to commuters with less than ₱1 instead of a Google ad, while it runs and has money left."
      onClose={onClose}
      width={720}
      footer={
        <View style={styles.dialogFooter}>
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button
            label={campaign ? 'Save' : 'Save draft'}
            icon="save"
            loading={saving}
            onPress={() => void submit()}
            testID="save-campaign"
          />
        </View>
      }>
      <View style={styles.dialogBody} testID="campaign-form">
        <View style={styles.photoBox}>
          <Pressable
            style={styles.photo}
            onPress={() => void pickPhoto()}
            accessibilityRole="button"
            accessibilityLabel="Choose the ad photo">
            {photo || campaign?.imageUrl ? (
              <Image
                source={{ uri: photo?.uri ?? campaign?.imageUrl }}
                style={styles.photo}
                resizeMode="cover"
                testID="photo-preview"
              />
            ) : (
              <Icon name="add-photo-alternate" size={36} color={colors.onSurfaceVariant} />
            )}
          </Pressable>
          <View style={styles.rowItem}>
            <Button
              label={photo || campaign ? 'Change photo' : 'Upload photo'}
              icon="upload"
              variant="outline"
              onPress={() => void pickPhoto()}
              testID="pick-photo"
            />
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              JPG, PNG or WebP, up to 2 MB. Shown wide (16:9).
            </AppText>
          </View>
        </View>

        <View style={styles.row}>
          <TextField
            label="Business name"
            required
            value={form.businessName}
            onChangeText={(businessName) => set({ businessName })}
            maxLength={60}
            style={styles.rowItem}
            testID="field-business"
          />
          <TextField
            label="Headline"
            required
            value={form.headline}
            onChangeText={(headline) => set({ headline })}
            maxLength={120}
            style={styles.rowItem}
            testID="field-headline"
          />
        </View>
        <View style={styles.row}>
          <TextField
            label="Button label"
            hint="Optional, e.g. Order now"
            value={form.ctaLabel}
            onChangeText={(ctaLabel) => set({ ctaLabel })}
            maxLength={24}
            style={styles.rowItem}
          />
          <TextField
            label="Link"
            hint="Optional, https://…"
            value={form.ctaUrl}
            onChangeText={(ctaUrl) => set({ ctaUrl })}
            autoCapitalize="none"
            style={styles.rowItem}
          />
        </View>

        <AppText variant="labelLg">Schedule (Manila time)</AppText>
        <View style={styles.row}>
          <TextField
            label="Start date"
            required
            hint="YYYY-MM-DD"
            value={form.start}
            onChangeText={(start) => set({ start })}
            style={styles.rowItem}
            testID="field-start"
          />
          <TextField
            label="End date"
            required
            hint="YYYY-MM-DD, last day shown"
            value={form.end}
            onChangeText={(end) => set({ end })}
            style={styles.rowItem}
            testID="field-end"
          />
          <TextField
            label="Daily from"
            hint="Optional, e.g. 06:00"
            value={form.dailyFrom}
            onChangeText={(dailyFrom) => set({ dailyFrom })}
            style={styles.rowItem}
          />
          <TextField
            label="Daily to"
            hint="Optional, e.g. 20:00"
            value={form.dailyTo}
            onChangeText={(dailyTo) => set({ dailyTo })}
            style={styles.rowItem}
          />
        </View>

        <AppText variant="labelLg">Routes</AppText>
        <View style={styles.routes}>
          <Pressable onPress={() => set({ routeIds: [] })} accessibilityRole="button" testID="routes-all">
            <Badge label="Every route" tone={form.routeIds.length ? 'neutral' : 'brand'} pill />
          </Pressable>
          {routes.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => toggleRoute(r.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: form.routeIds.includes(r.id) }}
              testID={`route-${r.code}`}>
              <Badge label={r.code} tone={form.routeIds.includes(r.id) ? 'brand' : 'neutral'} pill />
            </Pressable>
          ))}
        </View>

        <AppText variant="labelLg">Purchase</AppText>
        <View style={styles.row}>
          <TextField
            label="Purchase amount (₱)"
            required
            keyboardType="decimal-pad"
            value={form.budget}
            onChangeText={(budget) => set({ budget })}
            style={styles.rowItem}
            testID="field-budget"
          />
          <View style={styles.rowItem}>
            <TextField
              label="Price per view (₱)"
              required
              keyboardType="decimal-pad"
              value={form.price}
              onChangeText={(price) => set({ price })}
              testID="field-price"
            />
            <View style={styles.picks}>
              {PRICE_PICKS.map((p) => (
                <Button
                  key={p}
                  label={`₱${centsText(p)}`}
                  variant={price === p ? 'primary' : 'outline'}
                  onPress={() => set({ price: centsText(p) })}
                  testID={`price-${p}`}
                />
              ))}
            </View>
          </View>
        </View>
        <View style={styles.estimate} testID="views-estimate">
          <AppText variant="labelLg">{views ? `≈ ${countText(views)} views` : 'Enter the amount and price'}</AppText>
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            Each counted view (the ad open 5 seconds) uses the price per view. By default drivers get 60%, fleets 20%, Para 20%.
          </AppText>
        </View>

        {problem ? (
          <View style={styles.error} testID="campaign-form-error">
            <Icon name="error" size={18} color={colors.error} />
            <AppText variant="bodyMd" color={colors.error}>
              {problem}
            </AppText>
          </View>
        ) : null}
      </View>
    </Dialog>
  );
}

function initialForm(c: Campaign | null, today: string) {
  return {
    businessName: c?.businessName ?? '',
    headline: c?.headline ?? '',
    ctaLabel: c?.ctaLabel ?? '',
    ctaUrl: c?.ctaUrl ?? '',
    start: c ? manilaDate(c.startAt) : today,
    end: c ? lastDay(c.endAt) : today,
    dailyFrom: c?.dailyFrom != null ? timeText(c.dailyFrom) : '',
    dailyTo: c?.dailyTo != null ? timeText(c.dailyTo) : '',
    routeIds: c?.routeIds ?? [],
    budget: c ? (c.budgetMicro / 1_000_000).toFixed(2) : '',
    price: c ? (c.pricePerViewMicro / 1_000_000).toFixed(2) : '0.80',
  };
}
