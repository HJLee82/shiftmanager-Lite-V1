import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { DateCalendar } from '@/components/DateCalendar';
import {
  countAssignmentsForRole, countAssignmentsForShift, deleteRow, regenerateShareToken, saveRole,
  saveShiftType, saveStoreUnavailability, updateStore,
} from '@/lib/api';
import { DAY_KEYS, DAY_LABELS, formatLongDate, today, type DayKey } from '@/lib/dates';
import { useStoreData, useWrite } from '@/lib/queries';
import { periodOf, type OpenDay, type ScheduleData, type ShiftType, type Store } from '@/lib/schedule';
import { useSession, useStore } from '@/lib/session';
import { Body, Button, Card, Checkbox, H1, Label, Link, Loading, Muted, Row, Screen, Select, TextField, TimeSelect } from '@/ui';
import { useDialog } from '@/ui/dialog';
import { colors } from '@/ui/theme';

export default function Settings() {
  const { data } = useStoreData();
  return (
    <Screen>
      <H1>Store Settings</H1>
      {!data ? (
        <Loading />
      ) : (
        <>
          <StoreCard />
          <OpenHoursCard />
          <BreakCard />
          <ShiftHoursCard data={data} />
          <StoreUnavailabilityCard data={data} />
          <RolesCard data={data} />
        </>
      )}
    </Screen>
  );
}

/** Saves a changed copy of the store row, then reloads the session's store. */
function useSaveStore() {
  const { db } = useStore();
  const { reload } = useSession();
  return useWrite(async (store: Store) => {
    await updateStore(db, store);
    await reload();
  });
}

function StoreCard() {
  const { db, store } = useStore();
  const { reload } = useSession();
  const { confirm, notify } = useDialog();
  const save = useSaveStore();
  const [name, setName] = useState(store.name);
  const link = Platform.OS === 'web' ? `${window.location.origin}/s/${store.shareToken}` : Linking.createURL(`/s/${store.shareToken}`);

  const regenerate = async () => {
    if (!(await confirm('Regenerate viewer link?', 'The current link will stop working for everyone who has it.', 'Regenerate', 'red'))) return;
    await regenerateShareToken(db);
    await reload();
  };

  return (
    <Card title="Store">
      <View style={{ gap: 14 }}>
        <Row style={{ alignItems: 'flex-end' }}>
          <TextField label="Store name" value={name} onChangeText={setName} style={{ flex: 1, minWidth: 200 }} />
          <Button title="Save" onPress={() => save.run({ ...store, name: name.trim() })} disabled={!name.trim() || name === store.name} />
        </Row>
        <View style={{ gap: 6 }}>
          <Body style={{ fontWeight: '500' }}>Viewer link</Body>
          <Muted>Anyone with this link can view the schedule (read-only), without logging in.</Muted>
          <Row>
            <Body style={{ flex: 1, minWidth: 200, backgroundColor: colors.subtle, padding: 8, borderRadius: 6 }} numberOfLines={1}>{link}</Body>
            <Button title="Copy link" color="grey" onPress={async () => { await Clipboard.setStringAsync(link); await notify('Link copied'); }} />
            <Button title="Regenerate" color="red" onPress={regenerate} />
          </Row>
        </View>
      </View>
    </Card>
  );
}

function OpenHoursCard() {
  const { store } = useStore();
  const save = useSaveStore();
  const [hours, setHours] = useState(store.openHours);
  const day = (d: DayKey): OpenDay => hours[d] ?? { isOpen: false, open: '11:00', close: '21:00' };
  const set = (d: DayKey, patch: Partial<OpenDay>) => setHours({ ...hours, [d]: { ...day(d), ...patch } });
  const applyToAll = (from: DayKey) =>
    setHours(Object.fromEntries(DAY_KEYS.map((d) => [d, day(d).isOpen ? { ...day(d), open: day(from).open, close: day(from).close } : day(d)])));

  return (
    <Card title="Store Open Hours">
      <View style={{ gap: 10 }}>
        {DAY_KEYS.map((d) => (
          <Row key={d} gap={12}>
            <View style={{ width: 70 }}>
              <Checkbox label={DAY_LABELS[d]} checked={day(d).isOpen} onChange={(isOpen) => set(d, { isOpen })} />
            </View>
            {day(d).isOpen ? (
              <>
                <TimeSelect value={day(d).open} onChange={(open) => set(d, { open })} minutes={[0, 30]} />
                <Muted>to</Muted>
                <TimeSelect value={day(d).close} onChange={(close) => set(d, { close })} minutes={[0, 30]} />
                <Link title="Apply to all" color={colors.blue} onPress={() => applyToAll(d)} style={{ fontSize: 13 }} />
              </>
            ) : (
              <Muted>Closed</Muted>
            )}
          </Row>
        ))}
        <Row>
          <Button
            title="Save"
            disabled={save.pending}
            // Keep each day's break override, which the Break Time card owns.
            onPress={() => save.run({
              ...store,
              openHours: Object.fromEntries(DAY_KEYS.map((d) => [d, { ...store.openHours[d], ...day(d), breakStart: store.openHours[d]?.breakStart, breakEnd: store.openHours[d]?.breakEnd }])),
            })}
          />
        </Row>
      </View>
    </Card>
  );
}

function BreakCard() {
  const { store } = useStore();
  const save = useSaveStore();
  const [brk, setBrk] = useState({ start: store.breakTime.start ?? '15:00', end: store.breakTime.end ?? '16:00' });
  const [hours, setHours] = useState(store.openHours);
  const overridden = DAY_KEYS.filter((d) => hours[d]?.breakStart);
  const setDay = (d: DayKey, patch: Partial<OpenDay>) => setHours({ ...hours, [d]: { ...hours[d]!, ...patch } });

  return (
    <Card title="Break Time">
      <View style={{ gap: 12 }}>
        <Row gap={12}>
          <TimeSelect value={brk.start} onChange={(start) => setBrk({ ...brk, start })} minutes={[0, 15, 30, 45]} />
          <Muted>to</Muted>
          <TimeSelect value={brk.end} onChange={(end) => setBrk({ ...brk, end })} minutes={[0, 15, 30, 45]} />
        </Row>
        <Muted>Shifts starting before the break ends show under Morning; the rest under Night.</Muted>
        <Body style={{ fontWeight: '500' }}>Different break on some days</Body>
        {DAY_KEYS.filter((d) => hours[d]?.isOpen).map((d) => {
          const custom = !!hours[d]?.breakStart;
          return (
            <Row key={d} gap={12}>
              <View style={{ width: 70 }}>
                <Checkbox
                  label={DAY_LABELS[d]}
                  checked={custom}
                  onChange={(on) => setDay(d, on ? { breakStart: brk.start, breakEnd: brk.end } : { breakStart: undefined, breakEnd: undefined })}
                />
              </View>
              {custom ? (
                <>
                  <TimeSelect value={hours[d]!.breakStart!} onChange={(breakStart) => setDay(d, { breakStart })} />
                  <Muted>to</Muted>
                  <TimeSelect value={hours[d]!.breakEnd!} onChange={(breakEnd) => setDay(d, { breakEnd })} />
                </>
              ) : (
                <Muted>Same as above</Muted>
              )}
            </Row>
          );
        })}
        <Row>
          <Button
            title="Save"
            disabled={save.pending}
            // Only the break fields; open/close times belong to the Open Hours card.
            onPress={() => save.run({
              ...store,
              breakTime: brk,
              openHours: Object.fromEntries(DAY_KEYS.map((d) => [d, { ...store.openHours[d]!, breakStart: hours[d]?.breakStart, breakEnd: hours[d]?.breakEnd }])),
            })}
          />
          {overridden.length > 0 && (
            <Button
              title="Apply to all"
              color="grey"
              onPress={() => setHours(Object.fromEntries(DAY_KEYS.map((d) => [d, { ...hours[d]!, breakStart: undefined, breakEnd: undefined }])))}
            />
          )}
        </Row>
      </View>
    </Card>
  );
}

const END_OPTIONS = [
  { label: 'Break Time', value: 'breakTime' },
  { label: 'Closing', value: 'closing' },
  { label: 'Custom', value: 'custom' },
];

function ShiftRow({ shift, onDone }: { shift?: ShiftType; onDone?: () => void }) {
  const { db, store } = useStore();
  const { confirm } = useDialog();
  const save = useWrite(saveShiftType);
  const del = useWrite(deleteRow);
  const [v, setV] = useState<Omit<ShiftType, 'id'>>(shift ?? { name: '', startTime: '10:00', endType: 'breakTime', endTime: null });
  const changed = !shift || JSON.stringify({ ...shift, id: undefined }) !== JSON.stringify({ ...v, id: undefined });
  // Period on a typical day: the default break decides.
  const period = periodOf({ ...v, id: '' }, { ...store, openHours: {} }, today());

  const remove = async () => {
    const used = await countAssignmentsForShift(db, shift!.id);
    const msg = used ? `It is used in ${used} scheduled shift(s), which will be removed too.` : undefined;
    if (await confirm(`Delete "${shift!.name}"?`, msg, 'Delete', 'red')) await del.run(db, 'shift_types', shift!.id);
  };

  return (
    <Row gap={8} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
      <TextField value={v.name} onChangeText={(name) => setV({ ...v, name })} placeholder="Shift name" style={{ width: 140 }} />
      <TimeSelect value={v.startTime} onChange={(startTime) => setV({ ...v, startTime })} />
      <Muted>to</Muted>
      <Select style={{ width: 120 }} value={v.endType} onChange={(endType) => setV({ ...v, endType: endType as ShiftType['endType'], endTime: endType === 'custom' ? (v.endTime ?? '17:00') : null })} options={END_OPTIONS} />
      {v.endType === 'custom' && <TimeSelect value={v.endTime ?? '17:00'} onChange={(endTime) => setV({ ...v, endTime })} />}
      <Label style={{ color: period === 'morning' ? colors.morningText : colors.nightText }}>{period === 'morning' ? 'Morning' : 'Night'}</Label>
      {changed && (
        <Button title={shift ? 'Save' : 'Add'} small color={shift ? 'blue' : 'green'} disabled={!v.name.trim() || save.pending}
          onPress={async () => { await save.run(db, store.id, { ...v, name: v.name.trim(), id: shift?.id }); onDone?.(); }} />
      )}
      {shift ? <Link title="🗑" onPress={remove} /> : <Link title="Cancel" onPress={() => onDone?.()} />}
    </Row>
  );
}

function ShiftHoursCard({ data }: { data: ScheduleData }) {
  const [adding, setAdding] = useState(false);
  const shifts = [...data.shiftTypes].sort((a, b) => a.startTime.localeCompare(b.startTime));
  return (
    <Card title="Shift Hours">
      {shifts.length === 0 && !adding && <Muted>No shifts yet.</Muted>}
      {shifts.map((s) => (
        <ShiftRow key={`${s.id}:${s.name}:${s.startTime}:${s.endType}:${s.endTime}`} shift={s} />
      ))}
      {adding && <ShiftRow onDone={() => setAdding(false)} />}
      {!adding && (
        <Row style={{ marginTop: 10 }}>
          <Button title="+ Add Shift" color="green" onPress={() => setAdding(true)} />
        </Row>
      )}
    </Card>
  );
}

function StoreUnavailabilityCard({ data }: { data: ScheduleData }) {
  const { db, store } = useStore();
  const save = useWrite(saveStoreUnavailability);
  const del = useWrite(deleteRow);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [date, setDate] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const existing = data.storeUnavailability.find((u) => u.date === date);

  const pick = (d: string) => {
    setDate(d);
    setReason(data.storeUnavailability.find((u) => u.date === d)?.reason ?? '');
  };

  return (
    <Card title="Store Unavailability">
      <DateCalendar month={month} onMonthChange={setMonth} marked={new Set(data.storeUnavailability.map((u) => u.date))} onPress={pick} />
      {date && (
        <View style={{ gap: 8, marginTop: 14, padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
          <Body style={{ fontWeight: '600' }}>{formatLongDate(date)}</Body>
          <TextField label="Reason" value={reason} onChangeText={setReason} placeholder="e.g. Holiday" />
          <Row>
            <Button title="Save" disabled={!reason.trim() || save.pending} onPress={async () => { await save.run(db, store.id, date, reason.trim()); setDate(null); }} />
            {existing && <Button title="Delete" color="red" onPress={async () => { await del.run(db, 'store_unavailability', existing.id); setDate(null); }} />}
            <Button title="Cancel" color="grey" onPress={() => setDate(null)} />
          </Row>
        </View>
      )}
      <View style={{ gap: 6, marginTop: 14 }}>
        {data.storeUnavailability.map((u) => (
          <Row key={u.id}>
            <Body style={{ flex: 1 }}>{formatLongDate(u.date)} — {u.reason}</Body>
            <Link title="✏️" onPress={() => { setMonth(u.date.slice(0, 7)); pick(u.date); }} />
            <Link title="🗑" onPress={() => del.run(db, 'store_unavailability', u.id)} />
          </Row>
        ))}
      </View>
    </Card>
  );
}

function RolesCard({ data }: { data: ScheduleData }) {
  const { db, store } = useStore();
  const { confirm } = useDialog();
  const save = useWrite(saveRole);
  const del = useWrite(deleteRow);
  const [names, setNames] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');

  const remove = async (id: string, name: string) => {
    const used = await countAssignmentsForRole(db, id);
    const msg = used ? `${used} scheduled shift(s) use this role; they will show no role.` : undefined;
    if (await confirm(`Delete role "${name}"?`, msg, 'Delete', 'red')) await del.run(db, 'roles', id);
  };

  return (
    <Card title="Roles">
      <View style={{ gap: 8 }}>
        {data.roles.length === 0 && <Muted>No roles yet.</Muted>}
        {data.roles.map((r) => {
          const value = names[r.id] ?? r.name;
          return (
            <Row key={r.id}>
              <TextField value={value} onChangeText={(v) => setNames({ ...names, [r.id]: v })} style={{ flex: 1, minWidth: 160 }} />
              {value !== r.name && <Button title="Save" small disabled={!value.trim()} onPress={() => save.run(db, store.id, value.trim(), r.id)} />}
              <Link title="🗑" onPress={() => remove(r.id, r.name)} />
            </Row>
          );
        })}
        <Row style={{ marginTop: 6 }}>
          <TextField value={newName} onChangeText={setNewName} placeholder="New role (e.g. Server)" style={{ flex: 1, minWidth: 160 }} />
          <Button title="+ Add" color="green" disabled={!newName.trim()} onPress={async () => { await save.run(db, store.id, newName.trim()); setNewName(''); }} />
        </Row>
      </View>
    </Card>
  );
}
