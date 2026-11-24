import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { UpdateWaypointInput, Waypoint, WaypointKind } from '@/types/route';
import { AppText } from '@packages/ui/AppText';
import { Button } from '@packages/ui/Button';
import { Dialog } from '@packages/ui/Dialog';
import { Icon } from '@packages/ui/Icon';
import { TextField } from '@packages/ui/TextField';
import type { PressState } from '@packages/ui/utils/pressState';

import { styles } from './styles';
import { KIND_TITLE } from './waypointStyle';

type StopFormProps = {
  waypoint: Waypoint;
  /** "Origin terminal", "Stop 3 of 9", … shown under the title. */
  positionLabel: string;
  saving: boolean;
  serverError?: string;
  onSave: (patch: UpdateWaypointInput['patch']) => void;
  onClose: () => void;
};

type Values = {
  name: string;
  role: string;
  mapLabel: string;
  kind: WaypointKind;
  dwellSeconds: string;
  lat: string;
  lng: string;
  paxWaiting: string;
};

type Errors = Partial<Record<keyof Values, string>>;

const KINDS: WaypointKind[] = ['terminal', 'regular', 'mandatory', 'transfer', 'conditional'];

const toValues = (wp: Waypoint): Values => ({
  name: wp.name,
  role: wp.role,
  mapLabel: wp.mapLabel ?? '',
  kind: wp.kind,
  dwellSeconds: String(wp.dwellSeconds),
  lat: String(wp.lat),
  lng: String(wp.lng),
  paxWaiting: String(wp.paxWaiting),
});

const num = (text: string) => (text.trim() === '' ? NaN : Number(text));

function validate(v: Values): Errors {
  const errors: Errors = {};
  if (!v.name.trim()) errors.name = 'Enter the stop name.';
  else if (v.name.trim().length > 80) errors.name = 'Use at most 80 characters.';
  if (!v.role.trim()) errors.role = 'Enter a short role, e.g. Origin Hub.';
  else if (v.role.trim().length > 60) errors.role = 'Use at most 60 characters.';
  if (v.mapLabel.trim().length > 60) errors.mapLabel = 'Use at most 60 characters.';
  const dwell = num(v.dwellSeconds);
  if (!(Number.isInteger(dwell) && dwell >= 0 && dwell <= 900)) errors.dwellSeconds = 'Whole seconds from 0 to 900.';
  const lat = num(v.lat);
  if (!(lat >= -90 && lat <= 90)) errors.lat = 'Latitude from -90 to 90.';
  const lng = num(v.lng);
  if (!(lng >= -180 && lng <= 180)) errors.lng = 'Longitude from -180 to 180.';
  const pax = num(v.paxWaiting);
  if (!(Number.isInteger(pax) && pax >= 0 && pax <= 10000)) errors.paxWaiting = 'Enter a whole number.';
  return errors;
}

/** Edits one stop (any position, including the terminals) through waypointsUpdate. Only changed fields are sent. */
export function StopForm({ waypoint, positionLabel, saving, serverError, onSave, onClose }: StopFormProps) {
  const [values, setValues] = useState<Values>(() => toValues(waypoint));
  const [errors, setErrors] = useState<Errors>({});
  const [tried, setTried] = useState(false);

  const update = (next: Values) => {
    setValues(next);
    if (tried) setErrors(validate(next));
  };
  const field = (key: Exclude<keyof Values, 'kind'>) => ({
    value: values[key],
    onChangeText: (text: string) => update({ ...values, [key]: text }),
    error: errors[key],
  });

  const submit = () => {
    setTried(true);
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const before = toValues(waypoint);
    const patch: UpdateWaypointInput['patch'] = {};
    if (values.name.trim() !== before.name) patch.name = values.name.trim();
    if (values.role.trim() !== before.role) patch.role = values.role.trim();
    if (values.mapLabel.trim() !== before.mapLabel) patch.mapLabel = values.mapLabel.trim() || null;
    if (values.kind !== before.kind) patch.kind = values.kind;
    if (num(values.dwellSeconds) !== waypoint.dwellSeconds) patch.dwellSeconds = num(values.dwellSeconds);
    if (num(values.lat) !== waypoint.lat) patch.lat = num(values.lat);
    if (num(values.lng) !== waypoint.lng) patch.lng = num(values.lng);
    if (num(values.paxWaiting) !== waypoint.paxWaiting) patch.paxWaiting = num(values.paxWaiting);

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    onSave(patch);
  };

  return (
    <Dialog
      visible
      title={`Edit ${waypoint.name}`}
      subtitle={positionLabel}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button label="Cancel" variant="muted" onPress={onClose} />
          <Button
            label="Save stop"
            icon="save"
            variant="primary"
            loading={saving}
            onPress={submit}
            testID="save-stop"
          />
        </>
      }>
      {serverError ? (
        <View style={styles.formError} accessibilityRole="alert">
          <Icon name="error-outline" size={18} color={colors.onErrorContainer} />
          <AppText variant="bodySm" color={colors.onErrorContainer} style={styles.shrinkFlex}>
            {serverError}
          </AppText>
        </View>
      ) : null}

      <TextField label="Stop name" required {...field('name')} />
      <View style={styles.formRow}>
        <TextField
          label="Role"
          required
          hint="Shown under the name, e.g. Origin Hub."
          style={styles.formCell}
          {...field('role')}
        />
        <TextField
          label="Map label"
          hint="Optional text next to the pin."
          style={styles.formCell}
          {...field('mapLabel')}
        />
      </View>

      <View style={styles.formSection}>
        <AppText variant="labelMd" bold>
          Stop type
        </AppText>
        <View style={styles.chipRow} accessibilityRole="radiogroup">
          {KINDS.map((kind) => {
            const selected = values.kind === kind;
            return (
              <Pressable
                key={kind}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => update({ ...values, kind })}
                style={({ hovered }: PressState) => [
                  styles.chip,
                  hovered && !selected && styles.chipHover,
                  selected && styles.chipSelected,
                ]}>
                <AppText variant="labelMd" bold color={selected ? colors.onPrimary : colors.onSurface}>
                  {KIND_TITLE[kind]}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.formRow}>
        <TextField
          label="Dwell (seconds)"
          required
          keyboardType="number-pad"
          style={styles.formCellSm}
          {...field('dwellSeconds')}
        />
        <TextField label="Pax waiting" keyboardType="number-pad" style={styles.formCellSm} {...field('paxWaiting')} />
      </View>
      <View style={styles.formRow}>
        <TextField label="Latitude" required keyboardType="decimal-pad" style={styles.formCellSm} {...field('lat')} />
        <TextField label="Longitude" required keyboardType="decimal-pad" style={styles.formCellSm} {...field('lng')} />
      </View>
      <AppText variant="bodySm" color={colors.onSurfaceVariant}>
        Tip: dragging the pin on the map also moves the stop and snaps it to the nearest road.
      </AppText>
    </Dialog>
  );
}
