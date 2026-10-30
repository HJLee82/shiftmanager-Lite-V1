import { StyleSheet, Text, View } from 'react-native';
import type { Period } from '@/lib/schedule';
import { Link, RoleBadge } from '@/ui';
import { colors, periodColors } from '@/ui/theme';

/** Employee first name + role initial circle, then "start - end". Blue for morning, purple for night. */
export function ShiftCard({
  name, role, time, period, onEdit, onDelete, large,
}: {
  name: string;
  role?: string;
  time: string;
  period: Period;
  onEdit?: () => void;
  onDelete?: () => void;
  large?: boolean;
}) {
  const c = periodColors[period];
  return (
    <View style={[s.card, { backgroundColor: c.bg }, large && { padding: 12 }]}>
      <View style={s.top}>
        <Text style={[s.name, { color: c.text }]} numberOfLines={1}>
          {large ? name : name.split(' ')[0]}
        </Text>
        <RoleBadge name={role} color={c.text} />
        {(onEdit || onDelete) && (
          <View style={s.actions}>
            {onEdit && <Link title="✏️" label={`Edit ${name}`} onPress={onEdit} style={{ fontSize: 11 }} />}
            {onDelete && <Link title="🗑" label={`Delete ${name}`} onPress={onDelete} style={{ fontSize: 11 }} />}
          </View>
        )}
      </View>
      <Text style={[s.time, { color: c.sub }]} numberOfLines={1}>
        {time}
      </Text>
    </View>
  );
}

/** Red, bold names of employees who can't work this section. */
export function UnavailableBanner({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <View style={s.banner}>
      <Text style={s.bannerTitle}>Unavailable</Text>
      <Text style={s.bannerNames}>{names.join(', ')}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 8, gap: 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  name: { fontWeight: '700', fontSize: 14, flexShrink: 1 },
  time: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 3, marginLeft: 'auto' },
  banner: { backgroundColor: colors.unavailableBg, borderRadius: 8, padding: 8, gap: 2 },
  bannerTitle: { color: colors.unavailableText, fontSize: 11 },
  bannerNames: { color: colors.unavailableText, fontWeight: '700', fontSize: 13 },
});
