import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hasUnsavedChanges } from '@/lib/unsaved';
import { useDialog } from '@/ui/dialog';
import { colors } from '@/ui/theme';

/** Folder tabs switching between the Weekly and Monthly schedule, keeping the week/month in view. */
export function ScheduleTabs({ active, week, month }: { active: 'weekly' | 'monthly'; week: string; month: string }) {
  const { confirm } = useDialog();
  const tabs: { key: typeof active; label: string; href: Href }[] = [
    { key: 'weekly', label: 'Weekly', href: { pathname: '/schedule/weekly', params: { week } } },
    { key: 'monthly', label: 'Monthly', href: { pathname: '/schedule/monthly', params: { month } } },
  ];
  const go = async (href: Href) => {
    if (hasUnsavedChanges() && !(await confirm('Leave without saving?', 'Your schedule changes will be lost.', 'Leave', 'red'))) return;
    router.navigate(href);
  };

  return (
    <View style={s.bar} accessibilityRole="tablist">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Pressable
            key={t.key}
            onPress={on ? undefined : () => go(t.href)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[s.tab, on && s.activeTab]}
          >
            <Text style={[s.text, on && s.activeText]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 4 },
  tab: {
    paddingHorizontal: 20, paddingVertical: 9, marginBottom: -1, backgroundColor: colors.subtle,
    borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 8, borderTopRightRadius: 8,
  },
  activeTab: { backgroundColor: '#fff', borderBottomColor: '#fff' },
  text: { fontSize: 14, color: colors.muted },
  activeText: { color: colors.blue, fontWeight: '600' },
});
