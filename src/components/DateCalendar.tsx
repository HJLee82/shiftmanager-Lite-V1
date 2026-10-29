import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addMonths, DAY_KEYS, DAY_LABELS, formatMonth, monthGrid, today } from '@/lib/dates';
import { Link } from '@/ui';
import { colors } from '@/ui/theme';

/**
 * Compact Sunday-first month calendar. `marked` dates are red filled circles, today has a blue outline.
 * `renderCell` replaces the default number for larger calendars (Monthly schedule).
 */
export function DateCalendar({
  month, onMonthChange, marked, onPress, renderCell, cellStyle,
}: {
  month: string;
  onMonthChange: (m: string) => void;
  marked?: Set<string>;
  onPress?: (date: string) => void;
  renderCell?: (date: string) => React.ReactNode;
  cellStyle?: object;
}) {
  const now = today();
  return (
    <View style={{ gap: 10 }}>
      <View style={s.header}>
        <Link title="←" onPress={() => onMonthChange(addMonths(month, -1))} style={s.arrow} />
        <Text style={s.month}>{formatMonth(month)}</Text>
        <Link title="→" onPress={() => onMonthChange(addMonths(month, 1))} style={s.arrow} />
      </View>
      <View style={s.row}>
        {DAY_KEYS.map((d) => (
          <Text key={d} style={s.dow}>{DAY_LABELS[d]}</Text>
        ))}
      </View>
      {monthGrid(month).map((week, i) => (
        <View key={i} style={s.row}>
          {week.map((date, j) =>
            !date ? (
              <View key={j} style={[s.cell, cellStyle]} />
            ) : (
              <Pressable key={date} onPress={onPress && (() => onPress(date))} disabled={!onPress} style={[s.cell, cellStyle]} accessibilityLabel={date}>
                {renderCell ? (
                  renderCell(date)
                ) : (
                  <View style={[s.dot, marked?.has(date) ? s.marked : date === now && s.today]}>
                    <Text style={[s.num, marked?.has(date) && { color: '#fff' }, date === now && { fontWeight: '700' }]}>{Number(date.slice(8))}</Text>
                  </View>
                )}
              </Pressable>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8 },
  arrow: { fontSize: 20, color: colors.muted },
  month: { fontSize: 15, color: colors.text },
  row: { flexDirection: 'row', gap: 4 },
  dow: { flex: 1, textAlign: 'center', fontSize: 12, color: colors.faint },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  marked: { backgroundColor: colors.red },
  today: { borderWidth: 1.5, borderColor: colors.blue },
  num: { fontSize: 14, color: colors.text },
});
