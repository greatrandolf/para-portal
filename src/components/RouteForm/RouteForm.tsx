import { useState } from 'react';
import { View } from 'react-native';

import { colors } from '@/constants/theme';
import type { CreateRouteInput, TransitRoute, UpdateRouteInput } from '@/types/route';
import { AppText } from '@packages/ui/AppText';
import { Button } from '@packages/ui/Button';
import { Dialog } from '@packages/ui/Dialog';
import { Icon } from '@packages/ui/Icon';
import { SegmentedControl } from '@packages/ui/SegmentedControl';
import { TextField } from '@packages/ui/TextField';

import { styles } from './styles';

/** Terminal names, kept so the first map clicks can name the terminal stops. */
export type NewRouteTerminals = { origin: string; destination: string };

type RouteFormProps = {
  visible: boolean;
  submitting: boolean;
  /** Error from the backend (e.g. duplicate code). */
  serverError?: string;
  onClose: () => void;
} & (
  | { mode: 'create'; onCreate: (input: CreateRouteInput, terminals: NewRouteTerminals) => void }
  | {
      mode: 'edit';
      route: TransitRoute;
      onUpdate: (input: UpdateRouteInput) => void;
      /** Soft delete (routesDelete). */
      onDelete: () => void;
      deleting: boolean;
    }
);

type Values = {
  code: string;
  origin: string;
  destination: string;
  name: string;
  outboundLabel: string;
  outboundVia: string;
  inboundLabel: string;
  inboundVia: string;
  baseFare: string;
  perKmRate: string;
  headway: string;
  speedCapKmh: string;
  speedCapZone: string;
  franchiseId: string;
  fleetUnits: string;
  status: 'active' | 'paused';
};

/** Fields filled from the terminals until the admin edits them. */
type Derived = 'name' | 'outboundLabel' | 'outboundVia' | 'inboundLabel' | 'inboundVia';

const INITIAL: Values = {
  code: '',
  origin: '',
  destination: '',
  name: '',
  outboundLabel: '',
  outboundVia: '',
  inboundLabel: '',
  inboundVia: '',
  baseFare: '15',
  perKmRate: '2.2',
  headway: '5m',
  speedCapKmh: '40',
  speedCapZone: 'City roads',
  franchiseId: '',
  fleetUnits: '0',
  status: 'paused',
};

/** Form values for an existing route (edit mode). */
function fromRoute(route: TransitRoute): Values {
  return {
    code: route.code,
    origin: '',
    destination: '',
    name: route.name,
    outboundLabel: route.directions.outbound.label,
    outboundVia: route.directions.outbound.via,
    inboundLabel: route.directions.inbound.label,
    inboundVia: route.directions.inbound.via,
    baseFare: String(route.baseFare),
    perKmRate: String(route.perKmRate),
    headway: route.headway,
    speedCapKmh: String(route.speedCapKmh),
    speedCapZone: route.speedCapZone,
    franchiseId: route.franchiseId,
    fleetUnits: String(route.fleetUnits),
    status: route.status,
  };
}

const ALL_EDITED: Record<Derived, boolean> = {
  name: true,
  outboundLabel: true,
  outboundVia: true,
  inboundLabel: true,
  inboundVia: true,
};

function derive(field: Derived, origin: string, destination: string): string {
  const o = origin.trim() || 'Origin';
  const d = destination.trim() || 'Destination';
  switch (field) {
    case 'name':
      return `${o} ⇄ ${d}`;
    case 'outboundLabel':
      return `Going to ${d}`;
    case 'outboundVia':
      return `${o} → ${d}`;
    case 'inboundLabel':
      return `Going back to ${o}`;
    case 'inboundVia':
      return `${d} → ${o}`;
  }
}

type Errors = Partial<Record<keyof Values, string>>;

const number = (text: string) => (text.trim() === '' ? NaN : Number(text));

function validate(v: Values, editing: boolean): Errors {
  const errors: Errors = {};
  const code = v.code.trim();
  if (!code) errors.code = 'Enter a route code.';
  else if (!/^[A-Za-z0-9-]{1,12}$/.test(code)) errors.code = 'Use up to 12 letters, digits, or dashes.';
  if (!editing && !v.origin.trim()) errors.origin = 'Enter the origin terminal.';
  if (!editing && !v.destination.trim()) errors.destination = 'Enter the destination terminal.';
  if (editing) {
    for (const key of ['name', 'outboundLabel', 'outboundVia', 'inboundLabel', 'inboundVia'] as const) {
      if (!v[key].trim()) errors[key] = 'This field cannot be empty.';
    }
  }
  if (!v.franchiseId.trim()) errors.franchiseId = 'Enter the LTFRB franchise ID.';
  if (!v.headway.trim()) errors.headway = 'Enter the headway, e.g. 5m.';
  if (!v.speedCapZone.trim()) errors.speedCapZone = 'Enter the speed cap zone.';
  const fare = number(v.baseFare);
  if (!(fare >= 0 && fare <= 1000)) errors.baseFare = 'Enter an amount from 0 to 1000.';
  const perKm = number(v.perKmRate);
  if (!(perKm >= 0 && perKm <= 100)) errors.perKmRate = 'Enter an amount from 0 to 100.';
  const cap = number(v.speedCapKmh);
  if (!(Number.isInteger(cap) && cap >= 5 && cap <= 120)) errors.speedCapKmh = 'Enter a whole number from 5 to 120.';
  const fleet = number(v.fleetUnits);
  if (!(Number.isInteger(fleet) && fleet >= 0 && fleet <= 1000)) errors.fleetUnits = 'Enter a whole number.';
  return errors;
}

/**
 * Create mode: a route with its "Going to" and "Going back to" trips (stops are placed on the map afterwards).
 * Edit mode: the route's details and trip labels, plus soft delete.
 */
export function RouteForm(props: RouteFormProps) {
  const { visible, submitting, serverError, onClose } = props;
  const editing = props.mode === 'edit';
  const [values, setValues] = useState<Values>(() => (props.mode === 'edit' ? fromRoute(props.route) : INITIAL));
  const [edited, setEdited] = useState<Partial<Record<Derived, boolean>>>(editing ? ALL_EDITED : {});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [tried, setTried] = useState(false);

  const value = (field: keyof Values) =>
    field in DERIVED_FIELDS && !edited[field as Derived]
      ? derive(field as Derived, values.origin, values.destination)
      : values[field];

  const set = (field: keyof Values) => (text: string) => {
    if (field in DERIVED_FIELDS) setEdited((e) => ({ ...e, [field]: true }));
    const next = { ...values, [field]: text };
    setValues(next);
    if (tried) setErrors(validate(next, editing));
  };

  const close = () => {
    setValues(INITIAL);
    setEdited({});
    setErrors({});
    setTried(false);
    onClose();
  };

  const submit = () => {
    setTried(true);
    const found = validate(values, editing);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const route = {
      code: values.code.trim().toUpperCase(),
      name: String(value('name')).trim(),
      status: values.status,
      headway: values.headway.trim(),
      baseFare: number(values.baseFare),
      perKmRate: number(values.perKmRate),
      speedCapKmh: number(values.speedCapKmh),
      speedCapZone: values.speedCapZone.trim(),
      franchiseId: values.franchiseId.trim(),
      fleetUnits: number(values.fleetUnits),
    };
    const directions = {
      outbound: { label: String(value('outboundLabel')).trim(), via: String(value('outboundVia')).trim() },
      inbound: { label: String(value('inboundLabel')).trim(), via: String(value('inboundVia')).trim() },
    };
    if (props.mode === 'edit') {
      props.onUpdate({ routeId: props.route.id, patch: route, directions });
      return;
    }
    const origin = values.origin.trim();
    const destination = values.destination.trim();
    props.onCreate(
      {
        route: {
          code: values.code.trim().toUpperCase(),
          name: String(value('name')).trim(),
          status: values.status,
          headway: values.headway.trim(),
          baseFare: number(values.baseFare),
          perKmRate: number(values.perKmRate),
          speedCapKmh: number(values.speedCapKmh),
          speedCapZone: values.speedCapZone.trim(),
          franchiseId: values.franchiseId.trim(),
          fleetUnits: number(values.fleetUnits),
        },
        directions: {
          outbound: { label: String(value('outboundLabel')).trim(), via: String(value('outboundVia')).trim() },
          inbound: { label: String(value('inboundLabel')).trim(), via: String(value('inboundVia')).trim() },
        },
      },
      { origin, destination },
    );
  };

  const field = (key: keyof Values) => ({ value: String(value(key)), onChangeText: set(key), error: errors[key] });

  return (
    <Dialog
      visible={visible}
      title={editing ? `Edit route ${values.code}` : 'New route'}
      subtitle={
        editing
          ? 'Change the route details and trip labels. Stops are edited on the map.'
          : 'Name the corridor and its two trips. You place the terminals and stops on the map next.'
      }
      onClose={close}
      width={640}
      footer={
        props.mode === 'edit' && confirmDelete ? (
          <>
            <AppText variant="bodySm" color={colors.onErrorContainer} style={styles.shrinkFlex}>
              Delete route {props.route.code}? It disappears from the portal and the fleet. Its data is kept (soft
              delete) and can be restored in Firestore.
            </AppText>
            <Button label="Keep route" variant="muted" onPress={() => setConfirmDelete(false)} />
            <Button
              label="Delete route"
              icon="delete-outline"
              variant="danger"
              loading={props.deleting}
              onPress={props.onDelete}
              testID="confirm-delete-route"
            />
          </>
        ) : (
          <>
            {editing ? (
              <Button
                label="Delete route"
                icon="delete-outline"
                variant="danger"
                onPress={() => setConfirmDelete(true)}
                style={styles.footerStart}
                testID="delete-route"
              />
            ) : null}
            <Button label="Cancel" variant="muted" onPress={close} />
            <Button
              label={editing ? 'Save changes' : 'Create route'}
              icon={editing ? 'save' : 'add-road'}
              variant="primary"
              loading={submitting}
              onPress={submit}
              testID={editing ? 'save-route' : 'create-route'}
            />
          </>
        )
      }>
      {serverError ? (
        <View style={styles.formError} accessibilityRole="alert">
          <Icon name="error-outline" size={18} color={colors.onErrorContainer} />
          <AppText variant="bodySm" color={colors.onErrorContainer} style={styles.shrinkFlex}>
            {serverError}
          </AppText>
        </View>
      ) : null}

      <View style={styles.formSection}>
        <View style={styles.formRow}>
          <TextField
            label="Route code"
            required
            placeholder="04L"
            autoCapitalize="characters"
            hint="Shown on the jeepney signboard."
            style={styles.formCellSm}
            {...field('code')}
          />
          {editing ? null : (
            <>
              <TextField
                label="Origin terminal"
                required
                placeholder="IT Park"
                style={styles.formCell}
                {...field('origin')}
              />
              <TextField
                label="Destination terminal"
                required
                placeholder="Sto. Niño"
                style={styles.formCell}
                {...field('destination')}
              />
            </>
          )}
        </View>
        <TextField label="Route name" {...field('name')} />
      </View>

      <View style={styles.formRow}>
        <View style={[styles.tripCard, styles.formCell]}>
          <AppText variant="labelMd" bold>
            → Going to
          </AppText>
          <TextField label="Trip label" {...field('outboundLabel')} />
          <TextField label="Via" hint="Main roads of this trip." {...field('outboundVia')} />
        </View>
        <View style={[styles.tripCard, styles.formCell]}>
          <AppText variant="labelMd" bold>
            ← Going back to
          </AppText>
          <TextField label="Trip label" {...field('inboundLabel')} />
          <TextField label="Via" hint="Can differ from the outbound roads." {...field('inboundVia')} />
        </View>
      </View>

      <View style={styles.formSection}>
        <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
          Fares & operations
        </AppText>
        <View style={styles.formRow}>
          <TextField
            label="Base fare (₱)"
            required
            keyboardType="decimal-pad"
            style={styles.formCellSm}
            {...field('baseFare')}
          />
          <TextField
            label="Per km (₱)"
            required
            keyboardType="decimal-pad"
            style={styles.formCellSm}
            {...field('perKmRate')}
          />
          <TextField label="Headway" required style={styles.formCellSm} {...field('headway')} />
          <TextField label="Fleet units" keyboardType="number-pad" style={styles.formCellSm} {...field('fleetUnits')} />
        </View>
        <View style={styles.formRow}>
          <TextField
            label="Speed cap (km/h)"
            required
            keyboardType="number-pad"
            style={styles.formCellSm}
            {...field('speedCapKmh')}
          />
          <TextField label="Speed cap zone" required style={styles.formCell} {...field('speedCapZone')} />
          <TextField
            label="LTFRB franchise ID"
            required
            placeholder="CEB-04L-2026-001"
            autoCapitalize="characters"
            style={styles.formCell}
            {...field('franchiseId')}
          />
        </View>
        <View style={styles.formSection}>
          <AppText variant="labelMd" bold>
            Status
          </AppText>
          <SegmentedControl
            value={values.status}
            onChange={(status) => setValues((v) => ({ ...v, status }))}
            segments={[
              { value: 'paused', label: 'Paused (draft)' },
              { value: 'active', label: 'Active' },
            ]}
          />
        </View>
      </View>
    </Dialog>
  );
}

const DERIVED_FIELDS: Record<Derived, true> = {
  name: true,
  outboundLabel: true,
  outboundVia: true,
  inboundLabel: true,
  inboundVia: true,
};
