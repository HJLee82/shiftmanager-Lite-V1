import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatShortDay, today } from '@/lib/dates';
import {
  assignmentsFor, closedReason, PERIODS, sectionCandidates, shiftTimeLabel,
  type Assignment, type Period, type ScheduleData,
} from '@/lib/schedule';
import type { StagedSchedule } from '@/lib/staged';
import { Link } from '@/ui';
import { colors } from '@/ui/theme';
import { InlineShiftForm } from './InlineShiftForm';
import { ShiftCard, UnavailableBanner } from './ShiftCard';

/**
 * One date's Morning or Night list. With `staged`, shows the unavailable banner,
 * ✏️/🗑 on each card, and "+ Add" (when `canAdd`), editing in place.
 */
export function SectionBlock({
  data, date, period, staged, canAdd = true, large,
}: {
  data: ScheduleData;
  date: string;
  period: Period;
  staged?: StagedSchedule;
  canAdd?: boolean;
  large?: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null); // assignment id, 'new', or null
  const items = assignmentsFor(data, date, period);
  const form = (initial?: Assignment) => (
    <InlineShiftForm
      key={initial?.id ?? 'new'}
      data={data}
      date={date}
      period={period}
      initial={initial}
      onCancel={() => setEditing(null)}
      onSave={(a) => {
        if (initial) staged?.update({ ...a, id: initial.id });
        else staged?.add(a);
        setEditing(null);
      }}
    />
  );

  return (
    <View style={{ gap: 6 }}>
      <View style={s.labelRow}>
        <Text style={s.label}>{period === 'morning' ? 'Morning' : 'Night'}</Text>
        {staged && canAdd && editing !== 'new' && <Link title="+ Add" color={colors.green} onPress={() => setEditing('new')} style={{ fontSize: 12 }} />}
      </View>
      {staged && <UnavailableBanner names={sectionCandidates(data, date, period).unavailable.map((e) => e.name)} />}
      {editing === 'new' && form()}
      {items.map((a) =>
        editing === a.id ? (
          <View key={a.id}>{form(a)}</View>
        ) : (
          <ShiftCard
            key={a.id}
            large={large}
            name={a.employee.name}
            role={data.roles.find((r) => r.id === a.roleId)?.name}
            time={shiftTimeLabel(a.shift, data.store, date)}
            period={period}
            onEdit={staged && (() => setEditing(a.id))}
            onDelete={staged && (() => staged.remove(a.id))}
          />
        ),
      )}
      {items.length === 0 && editing !== 'new' && <Text style={s.empty}>-</Text>}
    </View>
  );
}

/** 7 day columns (Mon → Sun), each split Morning / Night. Scrolls sideways on narrow screens. */
export function WeekGrid({
  data, dates, staged, highlight, onDayPress,
}: {
  data: ScheduleData;
  dates: string[];
  staged?: StagedSchedule;
  highlight?: string;
  onDayPress?: (date: string) => void;
}) {
  const now = today();
  // Columns share the visible width (min 122px, then scroll); without a fixed width
  // a horizontal ScrollView sizes each column to its longest unwrapped text.
  const [width, setWidth] = useState(0);
  const colWidth = Math.max(122, (width - 6 * GAP) / 7);
  return (
    <ScrollView horizontal contentContainerStyle={s.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {dates.map((date) => {
        const closed = closedReason(data, date);
        return (
          <View key={date} style={[s.column, { width: colWidth }, date === highlight && s.highlight, closed && { backgroundColor: '#fafafa' }]}>
            <Pressable onPress={onDayPress && (() => onDayPress(date))} disabled={!onDayPress} accessibilityRole={onDayPress ? 'link' : undefined}>
              <View style={[s.pill, date === now && s.todayPill]}>
                <Text style={[s.pillText, date === now && { color: '#fff' }]}>{formatShortDay(date)}</Text>
              </View>
            </Pressable>
            {closed ? (
              <Text style={s.closed}>{closed}</Text>
            ) : (
              PERIODS.map((period, i) => (
                <View key={period} style={i > 0 && s.divider}>
                  <SectionBlock data={data} date={date} period={period} staged={staged} />
                </View>
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const GAP = 8;
const s = StyleSheet.create({
  grid: { gap: GAP, alignItems: 'flex-start' },
  column: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 7, gap: 8 },
  highlight: { borderColor: colors.blue, borderWidth: 2 },
  pill: { borderRadius: 6, paddingVertical: 4, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  todayPill: { backgroundColor: colors.blue, borderBottomWidth: 0 },
  pillText: { fontSize: 12, fontWeight: '700', color: '#4b5563' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 11, color: colors.faint },
  empty: { textAlign: 'center', color: colors.faint, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  closed: { color: colors.faint, textAlign: 'center', paddingVertical: 16, fontSize: 13 },
});
