import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { colors } from '@/constants/theme';
import { VEHICLE_TYPE_LABEL, validateDriver, validateVehicle, type RouteInfo } from '@/services/fleetService';
import type { CreateVehicleInput, Driver, DriverFields, Vehicle, VehicleType } from '@/types/fleet';
import { AppText } from '@packages/ui/AppText';
import { Button } from '@packages/ui/Button';
import { Dialog } from '@packages/ui/Dialog';
import { Icon } from '@packages/ui/Icon';
import { TextField } from '@packages/ui/TextField';

import { styles } from './styles';

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.gapXs}>
      <AppText variant="labelMd" bold>
        {label}
      </AppText>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={[styles.chip, on && styles.chipOn]}>
              <AppText variant="labelMd" bold={on} color={on ? colors.neonOrangeDeep : colors.onSurface}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ServerError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={styles.warning}>
      <Icon name="error-outline" size={18} color={colors.onErrorContainer} />
      <AppText variant="bodySm" color={colors.onErrorContainer} style={styles.shrink}>
        {message}
      </AppText>
    </View>
  );
}

const TYPES = (Object.keys(VEHICLE_TYPE_LABEL) as VehicleType[]).map((value) => ({
  value,
  label: VEHICLE_TYPE_LABEL[value],
}));

const STATUSES = [
  { value: 'standby', label: 'Standby / Unassigned' },
  { value: 'inactive', label: 'Under Initial Inspection' },
] as const;

type VehicleValues = {
  code: string;
  plate: string;
  make: string;
  seats: string;
  specs: string;
  type: VehicleType;
  routeId: string;
  status: 'standby' | 'inactive';
};

const EMPTY_VEHICLE: VehicleValues = {
  code: '',
  plate: '',
  make: '',
  seats: '22',
  specs: '',
  type: 'modern',
  routeId: '',
  status: 'standby',
};

/** Register New Jeepney Unit. New units start on standby or inactive; Assign Driver puts them into service. */
export function RegisterVehicleDialog({
  vehicles,
  routes,
  submitting,
  serverError,
  onClose,
  onSave,
}: {
  vehicles: readonly Vehicle[];
  routes: ReadonlyMap<string, RouteInfo>;
  submitting: boolean;
  serverError?: string;
  onClose: () => void;
  onSave: (input: CreateVehicleInput) => void;
}) {
  const [values, setValues] = useState(EMPTY_VEHICLE);
  const [submitted, setSubmitted] = useState(false);
  const fields = {
    code: values.code.trim(),
    plate: values.plate.trim(),
    make: values.make.trim(),
    seats: Number(values.seats),
    specs: values.specs.trim(),
    type: values.type,
  };
  const errors = validateVehicle(fields, vehicles);
  const shown = submitted ? errors : {};
  const set = (patch: Partial<VehicleValues>) => setValues((v) => ({ ...v, ...patch }));

  return (
    <Dialog
      visible
      title="Register New Jeepney Unit"
      subtitle="Enter cooperative asset records and LTFRB franchise information to onboard the unit into the fleet tracking grid."
      onClose={onClose}
      footer={
        <View style={styles.dialogFooter}>
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button
            label="Save & Onboard Unit"
            icon="add-circle"
            variant="primary"
            loading={submitting}
            disabled={submitting}
            testID="save-vehicle"
            onPress={() => {
              setSubmitted(true);
              if (Object.keys(errors).length) return;
              onSave({ vehicle: fields, routeId: values.routeId || null, status: values.status });
            }}
          />
        </View>
      }>
      <View style={styles.dialogBody}>
        <View style={styles.formRow}>
          <TextField
            label="Vehicle Code"
            required
            placeholder="PARA-040"
            autoCapitalize="characters"
            value={values.code}
            onChangeText={(code) => set({ code })}
            error={shown.code}
            style={styles.formHalf}
          />
          <TextField
            label="LTO Plate Number"
            required
            placeholder="GMD-1782"
            autoCapitalize="characters"
            value={values.plate}
            onChangeText={(plate) => set({ plate })}
            error={shown.plate}
            style={styles.formHalf}
          />
        </View>
        <View style={styles.formRow}>
          <TextField
            label="Make & Model"
            required
            placeholder="Isuzu NLR"
            value={values.make}
            onChangeText={(make) => set({ make })}
            error={shown.make}
            style={styles.formHalf}
          />
          <TextField
            label="Seats"
            required
            keyboardType="number-pad"
            value={values.seats}
            onChangeText={(seats) => set({ seats: seats.replace(/\D/g, '') })}
            error={shown.seats}
            style={styles.formHalf}
          />
        </View>
        <TextField
          label="Key Specs"
          required
          placeholder="Euro IV Diesel • GPS Transponder #120"
          value={values.specs}
          onChangeText={(specs) => set({ specs })}
          error={shown.specs}
        />
        <Chips label="Vehicle Category / Spec" options={TYPES} value={values.type} onChange={(type) => set({ type })} />
        <Chips
          label="Assigned Franchise Route"
          options={[
            { value: '', label: 'None yet' },
            ...[...routes.values()].map((r) => ({ value: r.id, label: `${r.code} (${r.name})` })),
          ]}
          value={values.routeId}
          onChange={(routeId) => set({ routeId })}
        />
        <Chips
          label="Initial Operational Status"
          options={STATUSES}
          value={values.status}
          onChange={(status) => set({ status })}
        />
        <ServerError message={serverError} />
      </View>
    </Dialog>
  );
}

const EMPTY_DRIVER = { name: '', phone: '', gcash: '', licenseNo: '', licenseExpiry: '', tenure: '' };

/** Add Driver Account. New drivers start as available for assignment; the server assigns the DRV number. */
export function AddDriverDialog({
  drivers,
  submitting,
  serverError,
  onClose,
  onSave,
}: {
  drivers: readonly Driver[];
  submitting: boolean;
  serverError?: string;
  onClose: () => void;
  onSave: (input: DriverFields) => void;
}) {
  const [values, setValues] = useState(EMPTY_DRIVER);
  const [submitted, setSubmitted] = useState(false);
  const input: DriverFields = {
    name: values.name.trim(),
    phone: values.phone.trim(),
    // Payouts go to the phone number when no GCash number is given.
    ...(values.gcash.trim() ? { gcash: values.gcash.trim() } : {}),
    licenseNo: values.licenseNo.trim(),
    licenseExpiry: values.licenseExpiry.trim(),
    tenure: values.tenure.trim() || 'Newly Certified • Pending Orientation',
    shares: 0,
    shareNote: 'Probationary',
  };
  const errors = validateDriver(input, drivers);
  const shown = submitted ? errors : {};
  const set = (patch: Partial<typeof EMPTY_DRIVER>) => setValues((v) => ({ ...v, ...patch }));

  return (
    <Dialog
      visible
      title="Add Driver Account"
      subtitle="Create a certified operator account. The driver can be paired with a unit once saved."
      onClose={onClose}
      footer={
        <View style={styles.dialogFooter}>
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button
            label="Save Driver Account"
            icon="person-add"
            variant="primary"
            loading={submitting}
            disabled={submitting}
            testID="save-driver"
            onPress={() => {
              setSubmitted(true);
              if (Object.keys(errors).length) return;
              onSave(input);
            }}
          />
        </View>
      }>
      <View style={styles.dialogBody}>
        <TextField
          label="Operator Full Name"
          required
          placeholder="Juan B. Dela Cruz"
          value={values.name}
          onChangeText={(name) => set({ name })}
          error={shown.name}
        />
        <TextField
          label="Contact Phone"
          required
          placeholder="0917-552-8901"
          keyboardType="phone-pad"
          value={values.phone}
          onChangeText={(phone) => set({ phone })}
          error={shown.phone}
        />
        <TextField
          label="GCash Number for Payouts"
          placeholder="Same as the contact phone"
          hint="The fleet sends the driver's weekly share here. Leave empty to use the contact phone."
          keyboardType="phone-pad"
          value={values.gcash}
          onChangeText={(gcash) => set({ gcash })}
          error={shown.gcash}
          testID="driver-gcash"
        />
        <View style={styles.formRow}>
          <TextField
            label="LTO Professional License"
            required
            placeholder="N01-24-118944"
            autoCapitalize="characters"
            value={values.licenseNo}
            onChangeText={(licenseNo) => set({ licenseNo })}
            error={shown.licenseNo}
            style={styles.formHalf}
          />
          <TextField
            label="Valid Until (YYYY-MM)"
            required
            placeholder="2029-10"
            value={values.licenseExpiry}
            onChangeText={(licenseExpiry) => set({ licenseExpiry })}
            error={shown.licenseExpiry}
            style={styles.formHalf}
          />
        </View>
        <TextField
          label="Tenure / Notes"
          placeholder="Newly Certified • Class 2 Endorsed"
          value={values.tenure}
          onChangeText={(tenure) => set({ tenure })}
        />
        <ServerError message={serverError} />
      </View>
    </Dialog>
  );
}
