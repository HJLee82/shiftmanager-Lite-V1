import { StyleSheet, Text, View } from 'react-native';
import { DAY_KEYS, DAY_LABELS, type DayKey } from '@/lib/dates';
import { periodOf, shiftTimeLabel, type Employee, type ScheduleData } from '@/lib/schedule';
import { Checkbox, Row, Select, Toggle } from '@/ui';
import { colors, periodColors } from '@/ui/theme';

// Availability is per weekday, so periods use a reference date with that weekday (2026-06-07 is a Sunday).
const refDate = (d: DayKey) => `2026-06-${String(7 + DAY_KEYS.indexOf(d)).padStart(2, '0')}`;

/** Read-only grid: Morning/Night rows × Sun–Sat columns. */
export function AvailabilityTable({ data, employee }: { data: ScheduleData; employee: Employee }) {
  return (
    <View style={s.table}>
      <View style={s.row}>
        <View style={s.head} />
        {DAY_KEYS.map((d) => (
          <Text key={d} style={[s.cell, s.headText]}>{DAY_LABELS[d]}</Text>
        ))}
      </View>
      {(['morning', 'night'] as const).map((period) => (
        <View key={period} style={[s.row, { borderTopWidth: 1, borderTopColor: colors.border }]}>
          <Text style={[s.head, s.headText]}>{period === 'morning' ? 'Morning' : 'Night'}</Text>
          {DAY_KEYS.map((d) => {
            const c = periodColors[period];
            const date = refDate(d);
            const day = employee.availability[d];
            const shift = data.shiftTypes.find((x) => x.id === day?.shiftTypeId);
            let content = <Text style={s.dash}>-</Text>;
            if (!data.store.openHours[d]?.isOpen) content = <Text style={s.dash}>Closed</Text>;
            else if (day?.available && day.allDay) content = <Text style={[s.chip, { backgroundColor: c.bg, color: c.text }]}>All Day</Text>;
            else if (day?.available && shift && periodOf(shift, data.store, date) === period) {
              content = (
                <Text style={[s.chip, { backgroundColor: c.bg, color: c.text }]}>
                  {shift.name}
                  {'\n'}
                  <Text style={{ color: c.sub }}>{shiftTimeLabel(shift, data.store, date)}</Text>
                </Text>
              );
            }
            return <View key={d} style={s.cell}>{content}</View>;
          })}
        </View>
      ))}
    </View>
  );
}

/** Per day: available checkbox · earliest shift dropdown · All Day toggle. Store-closed days are disabled. */
export function AvailabilityEditor({
  data, value, onChange,
}: {
  data: ScheduleData;
  value: Employee['availability'];
  onChange: (v: Employee['availability']) => void;
}) {
  const shifts = [...data.shiftTypes].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const set = (d: DayKey, patch: Partial<NonNullable<Employee['availability'][DayKey]>>) => {
    const cur = value[d] ?? { available: false, allDay: false, shiftTypeId: shifts[0]?.id };
    onChange({ ...value, [d]: { ...cur, ...patch } });
  };
  return (
    <View style={{ gap: 10 }}>
      {DAY_KEYS.map((d) => {
        const closed = !data.store.openHours[d]?.isOpen;
        const day = value[d];
        const on = !!day?.available && !closed;
        return (
          <Row key={d} gap={14} style={{ opacity: closed ? 0.45 : 1 }}>
            <View style={{ width: 64 }}>
              <Checkbox label={DAY_LABELS[d]} checked={on} disabled={closed} onChange={(v) => set(d, { available: v })} />
            </View>
            <Select
              style={{ width: 230 }}
              disabled={!on || day?.allDay}
              value={day?.shiftTypeId ?? shifts[0]?.id ?? ''}
              onChange={(id) => set(d, { shiftTypeId: id })}
              options={shifts.map((x) => ({ label: `${x.name} (${shiftTimeLabel(x, data.store, refDate(d))})`, value: x.id }))}
            />
            <Toggle label="All Day" value={on && !!day?.allDay} disabled={!on} onChange={(v) => set(d, { allDay: v })} />
          </Row>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: 6 },
  row: { flexDirection: 'row' },
  head: { width: 72, padding: 8 },
  headText: { fontSize: 12, color: colors.muted, textAlign: 'center', paddingVertical: 8 },
  cell: { flex: 1, minHeight: 56, padding: 4, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: colors.border },
  dash: { color: colors.faint, fontSize: 11, paddingTop: 8 },
  chip: { fontSize: 11, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 6, textAlign: 'center', overflow: 'hidden' },
});
