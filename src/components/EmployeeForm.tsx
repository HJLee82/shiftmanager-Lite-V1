import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { saveEmployee, type EmployeeInput } from '@/lib/api';
import { formatLongDate, today } from '@/lib/dates';
import { useWrite } from '@/lib/queries';
import type { Employee, ScheduleData } from '@/lib/schedule';
import { useStore } from '@/lib/session';
import { photoUrl } from '@/lib/supabase';
import { Avatar, Body, Button, Card, H1, Link, Muted, Row, Screen, TextField } from '@/ui';
import { colors } from '@/ui/theme';
import { AvailabilityEditor } from './Availability';
import { DateCalendar } from './DateCalendar';

/** Add (no `employee`) or edit an employee. */
export function EmployeeForm({ data, employee }: { data: ScheduleData; employee?: Employee }) {
  const { db, store } = useStore();
  const save = useWrite(saveEmployee);
  const [name, setName] = useState(employee?.name ?? '');
  const [availability, setAvailability] = useState(employee?.availability ?? {});
  const [unavailable, setUnavailable] = useState(
    data.employeeUnavailability.filter((u) => u.employeeId === employee?.id).map(({ date, reason }) => ({ date, reason })),
  );
  const [photo, setPhoto] = useState<EmployeeInput['photo']>(undefined);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [error, setError] = useState('');

  const preview = photo ? photo.uri : photo === null ? null : photoUrl(employee?.photoPath ?? null);
  const back = () => (employee ? router.navigate(`/employees/${employee.id}`) : router.navigate('/employees'));

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    const asset = res.assets?.[0];
    if (asset) setPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
  };

  const toggleDate = (date: string) =>
    setUnavailable((list) => (list.some((u) => u.date === date) ? list.filter((u) => u.date !== date) : [...list, { date, reason: '' }].sort((a, b) => a.date.localeCompare(b.date))));

  const submit = async () => {
    if (!name.trim()) return setError('Employee name is required.');
    const id = await save.run(db, store.id, { name: name.trim(), availability, unavailable, photo }, employee);
    router.replace(`/employees/${id}`);
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>{employee ? 'Edit Employee' : 'Add Employee'}</H1>
        <Link title="← Back" onPress={back} />
      </Row>

      <Card title="Employee Info">
        <Row gap={20} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <TextField label="Employee Name" required value={name} onChangeText={setName} placeholder="Enter employee name" />
            {!!error && <Body style={{ color: colors.unavailableText, marginTop: 6 }}>{error}</Body>}
          </View>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Avatar name={name || '?'} url={preview} size={120} />
            <Row>
              <Button title="Choose photo" color="grey" small onPress={pickPhoto} />
              {preview && <Button title="Remove" color="grey" small onPress={() => setPhoto(null)} />}
            </Row>
          </View>
        </Row>
      </Card>

      <Card title="Availability">
        {data.shiftTypes.length === 0 ? (
          <Muted>Add shift hours in Settings first.</Muted>
        ) : (
          <AvailabilityEditor data={data} value={availability} onChange={setAvailability} />
        )}
      </Card>

      <Card title="Unavailability">
        <DateCalendar month={month} onMonthChange={setMonth} marked={new Set(unavailable.map((u) => u.date))} onPress={toggleDate} />
        <View style={{ gap: 8, marginTop: 16 }}>
          <Body style={{ fontWeight: '600' }}>Selected Dates</Body>
          {unavailable.length === 0 && <Muted>Tap dates on the calendar.</Muted>}
          {unavailable.map((u, i) => (
            <Row key={u.date}>
              <Body style={{ width: 230 }}>{formatLongDate(u.date)}</Body>
              <TextField
                style={{ flex: 1, minWidth: 160 }}
                value={u.reason}
                placeholder="Reason (optional)"
                onChangeText={(reason) => setUnavailable((l) => l.map((x, j) => (j === i ? { ...x, reason } : x)))}
              />
              <Link title="×" onPress={() => toggleDate(u.date)} style={{ fontSize: 20 }} />
            </Row>
          ))}
        </View>
      </Card>

      <Row>
        <Button title={save.pending ? 'Saving…' : employee ? 'Save' : 'Add Employee'} color="green" onPress={submit} disabled={save.pending} />
        <Button title="Cancel" color="grey" onPress={back} />
      </Row>
    </Screen>
  );
}
