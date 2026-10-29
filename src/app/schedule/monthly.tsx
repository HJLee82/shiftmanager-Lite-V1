import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { DateCalendar } from '@/components/DateCalendar';
import { useCopyPreviousWeek } from '@/components/useCopyPreviousWeek';
import { WeekGrid } from '@/components/WeekGrid';
import { addDays, formatMonth, formatMonthDay, isDate, isMonth, mondayOf, today, weekDates } from '@/lib/dates';
import { useScheduleData } from '@/lib/queries';
import { assignmentsFor, closedReason, PERIODS, type ScheduleData } from '@/lib/schedule';
import { useStore } from '@/lib/session';
import { useStagedSchedule } from '@/lib/staged';
import { hasUnsavedChanges, useUnsavedChanges } from '@/lib/unsaved';
import { Button, H1, H2, Loading, Row, Screen } from '@/ui';
import { useDialog } from '@/ui/dialog';
import { colors, periodColors } from '@/ui/theme';

export default function Monthly() {
  const params = useLocalSearchParams<{ month?: string; date?: string }>();
  const date = isDate(params.date) ? params.date : undefined;
  const month = isMonth(params.month) ? params.month : (date ?? today()).slice(0, 7);
  const { data } = useScheduleData(`${month}-01`, addDays(`${month}-01`, 31));
  const { confirm } = useDialog();

  const select = async (d: string) => {
    if (hasUnsavedChanges() && !(await confirm('Leave without saving?', 'Your changes to this week will be lost.', 'Leave', 'red'))) return;
    router.setParams({ month, date: d });
  };

  return (
    <Screen>
      <H1>{formatMonth(month)}</H1>
      {!data ? (
        <Loading />
      ) : (
        <DateCalendar
          month={month}
          onMonthChange={(m) => router.setParams({ month: m, date: undefined })}
          onPress={select}
          cellStyle={{ alignItems: 'stretch', paddingVertical: 0 }}
          renderCell={(d) => <DayCell data={data} date={d} selected={d === date} />}
        />
      )}
      {date && <WeekEditor key={mondayOf(date)} date={date} />}
    </Screen>
  );
}

/** Date number, up to 2 shift chips (name only), "+N more"; closed dates greyed with the reason. */
function DayCell({ data, date, selected }: { data: ScheduleData; date: string; selected: boolean }) {
  const closed = closedReason(data, date);
  const chips = PERIODS.flatMap((p) => assignmentsFor(data, date, p).map((a) => ({ p, name: a.employee.name.split(' ')[0] })));
  const isToday = date === today();
  return (
    <View
      style={{
        minHeight: 76, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.blue : colors.border, borderRadius: 8,
        padding: 6, gap: 3, backgroundColor: closed && !isToday ? '#f9fafb' : '#fff',
      }}
    >
      <View style={isToday ? { backgroundColor: colors.blue, borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' } : undefined}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: isToday ? '#fff' : colors.text }}>{Number(date.slice(8))}</Text>
      </View>
      {closed ? (
        <Text style={{ fontSize: 10, color: colors.faint }} numberOfLines={1}>{closed}</Text>
      ) : (
        <>
          {chips.slice(0, 2).map((c, i) => (
            <Text key={i} numberOfLines={1} style={{ fontSize: 11, backgroundColor: periodColors[c.p].bg, color: periodColors[c.p].text, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}>
              {c.name}
            </Text>
          ))}
          {chips.length > 2 && <Text style={{ fontSize: 10, color: colors.muted }}>+{chips.length - 2} more</Text>}
        </>
      )}
    </View>
  );
}

/** "Week of {Mon}" with in-place editing, Copy Previous Week and Done. */
function WeekEditor({ date }: { date: string }) {
  const { isAdmin } = useStore();
  const dates = weekDates(mondayOf(date));
  const { data } = useScheduleData(dates[0], dates[6]);
  const staged = useStagedSchedule(data);
  const copy = useCopyPreviousWeek(staged);
  useUnsavedChanges(staged.dirty);

  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <H2>Week of {formatMonthDay(dates[0])}</H2>
        {isAdmin && (
          <Row>
            <Button title="Copy Previous Week" color="grey" onPress={() => copy(dates)} disabled={!staged.view} />
            <Button title={staged.pending ? 'Saving…' : 'Done'} color="grey" onPress={staged.commit} disabled={!staged.dirty || staged.pending} />
          </Row>
        )}
      </Row>
      {staged.view ? (
        <WeekGrid data={staged.view} dates={dates} highlight={date} staged={isAdmin ? staged : undefined} />
      ) : (
        <Loading />
      )}
    </View>
  );
}
