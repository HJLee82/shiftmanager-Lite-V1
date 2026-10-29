import { router, useLocalSearchParams } from 'expo-router';
import { WeekGrid } from '@/components/WeekGrid';
import { addDays, formatMDY, isDate, mondayOf, monthName, today, weekDates } from '@/lib/dates';
import { useScheduleData } from '@/lib/queries';
import { Body, Button, H1, Link, Loading, Muted, Row, Screen } from '@/ui';

export default function Weekly() {
  const { week } = useLocalSearchParams<{ week?: string }>();
  const monday = mondayOf(isDate(week) ? week : today());
  const dates = weekDates(monday);
  const { data } = useScheduleData(dates[0], dates[6]);
  const go = (d: string) => router.setParams({ week: d });

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Weekly Schedule</H1>
        <Button
          title={`${monthName(monday.slice(0, 7))} Schedule`}
          color="orange"
          onPress={() => router.push({ pathname: '/schedule/monthly', params: { month: monday.slice(0, 7) } })}
        />
      </Row>
      <Row gap={16}>
        <Link title="←" onPress={() => go(addDays(monday, -7))} style={{ fontSize: 20 }} />
        <Body>
          {formatMDY(dates[0])} to {formatMDY(dates[6])}
        </Body>
        <Link title="→" onPress={() => go(addDays(monday, 7))} style={{ fontSize: 20 }} />
        <Button title="Today" color="outline" small onPress={() => go(today())} />
      </Row>
      <Muted>Tap a day to see its details.</Muted>
      {data ? (
        <WeekGrid data={data} dates={dates} onDayPress={(date) => router.push(`/schedule/daily/${date}`)} />
      ) : (
        <Loading />
      )}
    </Screen>
  );
}
