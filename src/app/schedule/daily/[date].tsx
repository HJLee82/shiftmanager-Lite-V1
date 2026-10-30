import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { InlineShiftForm } from '@/components/InlineShiftForm';
import { useCopyPreviousWeek } from '@/components/useCopyPreviousWeek';
import { SectionBlock } from '@/components/WeekGrid';
import { addDays, formatLongDate, isDate, mondayOf, today } from '@/lib/dates';
import { useScheduleData } from '@/lib/queries';
import { closedReason, PERIODS } from '@/lib/schedule';
import { useStore } from '@/lib/session';
import { useStagedSchedule } from '@/lib/staged';
import { useUnsavedChanges } from '@/lib/unsaved';
import { Body, Button, Card, H1, Link, Loading, Row, Screen } from '@/ui';
import { useDialog } from '@/ui/dialog';
import { colors } from '@/ui/theme';

export default function Daily() {
  const params = useLocalSearchParams<{ date: string }>();
  const date = isDate(params.date) ? params.date : today();
  const { isAdmin } = useStore();
  // From 7 days earlier, so Copy Previous Week has its source.
  const { data } = useScheduleData(addDays(date, -7), date);
  const staged = useStagedSchedule(data);
  const copy = useCopyPreviousWeek(staged);
  const { confirm } = useDialog();
  const [adding, setAdding] = useState(false);
  useUnsavedChanges(staged.dirty);

  const weekly = () => router.navigate({ pathname: '/schedule/weekly', params: { week: mondayOf(date) } });
  const back = async () => {
    if (staged.dirty && !(await confirm('Leave without saving?', 'Your changes will be lost.', 'Leave', 'red'))) return;
    staged.discard();
    weekly();
  };
  const done = async () => {
    await staged.commit();
    weekly();
  };

  const view = staged.view;
  const closed = view && closedReason(view, date);
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={14}>
          <Link title="← Back" onPress={back} />
          <H1 style={{ fontSize: 22 }}>{formatLongDate(date)}</H1>
        </Row>
        {isAdmin && !closed && (
          <Row>
            <Button title="Copy Previous Week" color="grey" onPress={() => copy([date])} disabled={!view} />
            <Button title="+ Add Shift" color="green" onPress={() => setAdding(true)} disabled={!view} />
            <Button title={staged.pending ? 'Saving…' : 'Done'} color="grey" onPress={done} disabled={staged.pending} />
          </Row>
        )}
      </Row>

      {!view ? (
        <Loading />
      ) : closed ? (
        <Card>
          <Body style={{ color: colors.muted }}>Store closed: {closed}. Shifts can&apos;t be added on this date.</Body>
        </Card>
      ) : (
        <>
          {adding && (
            <Card title="Add Shift">
              <InlineShiftForm
                data={view}
                date={date}
                period={null}
                onCancel={() => setAdding(false)}
                onSave={(a) => {
                  staged.add(a);
                  setAdding(false);
                }}
              />
            </Card>
          )}
          {PERIODS.map((p) => (
            <Card key={p}>
              <SectionBlock data={view} date={date} period={p} staged={isAdmin ? staged : undefined} canAdd={false} large />
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
