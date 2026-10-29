import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { WeekGrid } from '@/components/WeekGrid';
import { formatMDY, formatShortDay, mondayOf, today, weekDates } from '@/lib/dates';
import { useScheduleData } from '@/lib/queries';
import { closedReason, isAvailable, PERIODS, type ScheduleData } from '@/lib/schedule';
import { useStore } from '@/lib/session';
import { Body, Button, Card, H1, H2, Loading, Muted, Row, Screen } from '@/ui';
import { colors, periodColors } from '@/ui/theme';

export default function Dashboard() {
  const { isAdmin } = useStore();
  const dates = weekDates(mondayOf(today()));
  const { data } = useScheduleData(dates[0], dates[6]);

  return (
    <Screen>
      <H1>Dashboard</H1>
      <View style={{ gap: 10 }}>
        <Row>
          <H2>This Week&apos;s Schedule</H2>
          <Muted>
            {formatMDY(dates[0])} to {formatMDY(dates[6])}
          </Muted>
        </Row>
        {!data ? (
          <Loading />
        ) : data.assignments.length === 0 ? (
          <Card>
            <Muted>No schedule yet.</Muted>
          </Card>
        ) : (
          <WeekGrid data={data} dates={dates} />
        )}
      </View>

      {data && <AvailableThisWeek data={data} dates={dates} />}

      <View style={{ gap: 10 }}>
        <H2>Employees</H2>
        <Row>
          <Button title="Employee List" onPress={() => router.push('/employees')} />
          {isAdmin && <Button title="Add Employee" color="green" onPress={() => router.push('/employees/new')} />}
        </Row>
      </View>
      <View style={{ gap: 10 }}>
        <H2>Schedule</H2>
        <Row>
          <Button title="Weekly Schedule" color="purple" onPress={() => router.push('/schedule/weekly')} />
        </Row>
      </View>
    </Screen>
  );
}

/** Mon–Sun × Morning/Night: who is available by their regular availability and unavailable dates. */
function AvailableThisWeek({ data, dates }: { data: ScheduleData; dates: string[] }) {
  return (
    <View style={{ gap: 10 }}>
      <H2>Available Employees This Week</H2>
      <Card style={{ padding: 0 }}>
        {dates.map((date, i) => {
          const closed = closedReason(data, date);
          return (
            <View key={date} style={{ flexDirection: 'row', borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, padding: 10, gap: 10 }}>
              <Text style={{ width: 70, fontWeight: '600', color: colors.text, fontSize: 13 }}>{formatShortDay(date)}</Text>
              {closed ? (
                <Muted>{closed}</Muted>
              ) : (
                PERIODS.map((p) => {
                  const names = data.employees.filter((e) => isAvailable(data, e, date, p)).map((e) => e.name.split(' ')[0]);
                  return (
                    <View key={p} style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: colors.faint, width: 48 }}>{p === 'morning' ? 'Morning' : 'Night'}</Text>
                      {names.length ? (
                        names.map((n) => (
                          <Text key={n} style={{ fontSize: 12, backgroundColor: periodColors[p].bg, color: periodColors[p].text, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            {n}
                          </Text>
                        ))
                      ) : (
                        <Body style={{ color: colors.faint }}>-</Body>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          );
        })}
      </Card>
    </View>
  );
}
