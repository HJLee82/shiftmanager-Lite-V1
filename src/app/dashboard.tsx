import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { WeekGrid } from '@/components/WeekGrid';
import { formatLongDate, formatMDY, mondayOf, monthName, today, weekDates } from '@/lib/dates';
import { useScheduleData } from '@/lib/queries';
import { closedReason, isAvailable, PERIODS, type ScheduleData } from '@/lib/schedule';
import { photoUrl } from '@/lib/supabase';
import { Avatar, Body, Button, Card, H1, H2, Loading, Muted, Row, Screen } from '@/ui';
import { colors, periodColors } from '@/ui/theme';

export default function Dashboard() {
  const dates = weekDates(mondayOf(today()));
  const month = today().slice(0, 7);
  const { data } = useScheduleData(dates[0], dates[6]);

  return (
    <Screen>
      <H1>Dashboard</H1>
      <View style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row>
            <H2>This Week&apos;s Schedule</H2>
            <Muted>
              {formatMDY(dates[0])} to {formatMDY(dates[6])}
            </Muted>
          </Row>
          <Button
            title={`${monthName(month)} Schedule`}
            color="orange"
            small
            onPress={() => router.push({ pathname: '/schedule/monthly', params: { month } })}
          />
        </Row>
        {!data ? (
          <Loading />
        ) : data.assignments.length === 0 ? (
          <Card>
            <Muted>No schedule yet.</Muted>
          </Card>
        ) : (
          <WeekGrid data={data} dates={dates} onDayPress={() => router.push('/schedule/weekly')} />
        )}
      </View>

      {data && <AvailableToday data={data} date={today()} />}
    </Screen>
  );
}

/**
 * Employees not on a shift today who are available by their regular availability and unavailable dates,
 * Morning-available first, then Night.
 */
function AvailableToday({ data, date }: { data: ScheduleData; date: string }) {
  const closed = closedReason(data, date);
  const onShift = new Set(data.assignments.filter((a) => a.date === date).map((a) => a.employeeId));
  const available = data.employees
    .filter((e) => !onShift.has(e.id))
    .map((e) => ({ e, periods: PERIODS.filter((p) => isAvailable(data, e, date, p)) }))
    .filter((x) => x.periods.length > 0)
    .sort((a, b) => PERIODS.indexOf(a.periods[0]) - PERIODS.indexOf(b.periods[0]));

  return (
    <View style={{ gap: 10 }}>
      <Row>
        <H2>Available Employees Today</H2>
        <Muted>{formatLongDate(date)}</Muted>
      </Row>
      <Card style={{ padding: 0 }}>
        {closed ? (
          <Muted style={{ padding: 14 }}>{closed}</Muted>
        ) : available.length === 0 ? (
          <Muted style={{ padding: 14 }}>No one else is available today.</Muted>
        ) : (
          available.map(({ e, periods }, i) => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
              <Avatar name={e.name} url={photoUrl(e.photoPath)} size={36} />
              <Body style={{ flex: 1 }}>{e.name}</Body>
              {periods.map((p) => (
                <Text key={p} style={{ fontSize: 12, backgroundColor: periodColors[p].bg, color: periodColors[p].text, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                  {p === 'morning' ? 'Morning' : 'Night'}
                </Text>
              ))}
            </View>
          ))
        )}
      </Card>
    </View>
  );
}
