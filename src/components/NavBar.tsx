import { router, usePathname, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/lib/session';
import { hasUnsavedChanges } from '@/lib/unsaved';
import { useDialog } from '@/ui/dialog';
import { colors, MAX_WIDTH, PHONE_WIDTH } from '@/ui/theme';

const LINKS: { href: Href; label: string; match: string; adminOnly?: boolean }[] = [
  { href: '/dashboard', label: 'Dashboard', match: '/dashboard' },
  { href: '/employees', label: 'Employees', match: '/employees' },
  { href: '/schedule/weekly', label: 'Schedule', match: '/schedule' },
  { href: '/settings', label: 'Settings', match: '/settings', adminOnly: true },
];

/** Top bar on wide screens; on phones `position="bottom"` renders the tab bar. */
export function NavBar({ position }: { position: 'top' | 'bottom' }) {
  const { session, signOut } = useSession();
  const { confirm } = useDialog();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const phone = useWindowDimensions().width < PHONE_WIDTH;
  if (session.status !== 'admin' && session.status !== 'viewer') return null;
  if ((position === 'bottom') !== phone) return null;

  const isAdmin = session.status === 'admin';
  const links = LINKS.filter((l) => isAdmin || !l.adminOnly);
  const go = async (href: Href) => {
    if (hasUnsavedChanges() && !(await confirm('Leave without saving?', 'Your schedule changes will be lost.', 'Leave', 'red'))) return;
    router.navigate(href);
  };

  if (phone) {
    return (
      <View style={[s.tabs, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {links.map((l) => {
          const active = path.startsWith(l.match);
          return (
            <Pressable key={l.label} onPress={() => go(l.href)} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: active }}>
              <Text style={[s.tabText, active && { color: colors.blue, fontWeight: '600' }]}>{l.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[s.top, { paddingTop: insets.top }]}>
      <View style={s.topInner}>
        <View style={s.brand}>
          <Pressable onPress={() => go('/dashboard')}>
            <Text style={s.logo}>ShiftManager Lite</Text>
          </Pressable>
          <Text style={s.store}>{session.store.name}</Text>
        </View>
        <View style={s.links}>
          {links.map((l) => (
            <Pressable key={l.label} onPress={() => go(l.href)}>
              <Text style={[s.link, path.startsWith(l.match) && { color: colors.text, fontWeight: '600' }]}>{l.label}</Text>
            </Pressable>
          ))}
          {isAdmin && (
            <Pressable onPress={signOut}>
              <Text style={s.link}>Log out</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  top: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#fff' },
  topInner: { width: '100%', maxWidth: MAX_WIDTH + 32, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  logo: { fontSize: 19, fontWeight: '700', color: colors.text },
  links: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  link: { fontSize: 15, color: '#4b5563' },
  store: { fontSize: 13, color: colors.faint },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#fff', paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  tabText: { fontSize: 13, color: colors.muted },
});
