import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AvailabilityTable } from '@/components/Availability';
import { DateCalendar } from '@/components/DateCalendar';
import { deleteEmployee } from '@/lib/api';
import { formatLongDate, today } from '@/lib/dates';
import { useStoreData, useWrite } from '@/lib/queries';
import { useStore } from '@/lib/session';
import { photoUrl } from '@/lib/supabase';
import { Avatar, Body, Button, Card, Label, Link, Loading, Muted, Row, Screen } from '@/ui';
import { useDialog } from '@/ui/dialog';

export default function EmployeeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, isAdmin } = useStore();
  const { data } = useStoreData();
  const { confirm } = useDialog();
  const del = useWrite(deleteEmployee);
  const [month, setMonth] = useState(today().slice(0, 7));
  const emp = data?.employees.find((e) => e.id === id);

  if (!data) return <Loading />;
  if (!emp) return <Screen><Muted>Employee not found.</Muted></Screen>;
  const unavailable = data.employeeUnavailability.filter((u) => u.employeeId === emp.id);

  const remove = async () => {
    if (!(await confirm(`Delete ${emp.name}?`, 'They will be removed from all schedules.', 'Delete', 'red'))) return;
    await del.run(db, emp);
    router.replace('/employees');
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Link title="← Back" onPress={() => router.navigate('/employees')} />
        {isAdmin && (
          <Row>
            <Button title="Edit" onPress={() => router.push(`/employees/${emp.id}/edit`)} />
            <Button title="Delete" color="red" onPress={remove} disabled={del.pending} />
          </Row>
        )}
      </Row>
      <Card title="Employee Info">
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 4 }}>
            <Label>Name</Label>
            <Body style={{ fontSize: 16 }}>{emp.name}</Body>
          </View>
          <Avatar name={emp.name} url={photoUrl(emp.photoPath)} size={140} />
        </Row>
      </Card>
      <Card title="Availability">
        <AvailabilityTable data={data} employee={emp} />
      </Card>
      <Card title="Unavailability">
        <DateCalendar month={month} onMonthChange={setMonth} marked={new Set(unavailable.map((u) => u.date))} />
        <View style={{ gap: 6, marginTop: 16 }}>
          <Body style={{ fontWeight: '600' }}>Unavailable Dates</Body>
          {unavailable.length === 0 && <Muted>None</Muted>}
          {unavailable.map((u) => (
            <Body key={u.id}>
              {formatLongDate(u.date)}
              {u.reason ? ` — ${u.reason}` : ''}
            </Body>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
