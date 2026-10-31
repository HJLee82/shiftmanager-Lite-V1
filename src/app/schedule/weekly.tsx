import { router, useLocalSearchParams } from 'expo-router';
import { ScheduleTabs } from '@/components/ScheduleTabs';
import { useCopyPreviousWeek } from '@/components/useCopyPreviousWeek';
import { WeekGrid } from '@/components/WeekGrid';
import { addDays, formatMDY, isDate, mondayOf, today, weekDates } from '@/lib/dates';
import { useScheduleData } from '@/lib/queries';
import { useStore } from '@/lib/session';
import { useStagedSchedule } from '@/lib/staged';
import { useUnsavedChanges } from '@/lib/unsaved';
import { Body, Button, H1, Link, Loading, Muted, Row, Screen } from '@/ui';
import { useDialog } from '@/ui/dialog';

export default function Weekly() {
  const { isAdmin } = useStore();
  const { confirm } = useDialog();
  const { week } = useLocalSearchParams<{ week?: string }>();
  const monday = mondayOf(isDate(week) ? week : today());
  const dates = weekDates(monday);
  // From the week before, so Copy Previous Week has its source.
  const { data } = useScheduleData(addDays(dates[0], -7), dates[6]);
  const staged = useStagedSchedule(data);
  const copy = useCopyPreviousWeek(staged);
  useUnsavedChanges(staged.dirty);

  /** Leaves the copied-but-unsaved week only after confirming. */
  const leave = async (then: () => void) => {
    if (staged.dirty && !(await confirm('Leave without saving?', 'The copied week will be lost.', 'Leave', 'red'))) return;
    staged.discard();
    then();
  };
  const go = (d: string) => leave(() => router.setParams({ week: d }));

  return (
    <Screen>
      {/* A week spanning two months belongs to the month holding its Thursday. */}
      <ScheduleTabs active="weekly" week={monday} month={dates[3].slice(0, 7)} />
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Weekly Schedule</H1>
        {isAdmin &&
          (staged.dirty ? (
            <Row>
              <Button title="Cancel" color="grey" onPress={staged.discard} disabled={staged.pending} />
              <Button title={staged.pending ? 'Saving…' : 'Save'} onPress={staged.commit} disabled={staged.pending} />
            </Row>
          ) : (
            <Button title="Copy Previous Week" color="grey" onPress={() => copy(dates)} disabled={!staged.view} />
          ))}
      </Row>
      <Row gap={16}>
        <Link title="←" onPress={() => go(addDays(monday, -7))} style={{ fontSize: 20 }} />
        <Body>
          {formatMDY(dates[0])} to {formatMDY(dates[6])}
        </Body>
        <Link title="→" onPress={() => go(addDays(monday, 7))} style={{ fontSize: 20 }} />
        <Button title="Today" color="outline" small onPress={() => go(today())} />
      </Row>
      <Muted>{staged.dirty ? 'Copied from last week. Save to keep the changes.' : 'Tap a day to see its details.'}</Muted>
      {staged.view ? (
        <WeekGrid
          data={staged.view}
          dates={dates}
          onDayPress={(date) => leave(() => router.push(`/schedule/daily/${date}`))}
        />
      ) : (
        <Loading />
      )}
    </Screen>
  );
}
