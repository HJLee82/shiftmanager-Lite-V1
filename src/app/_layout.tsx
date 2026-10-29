import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavBar } from '@/components/NavBar';
import { StoreSetup } from '@/components/StoreSetup';
import { SessionProvider, useSession } from '@/lib/session';
import { Loading } from '@/ui';
import { DialogProvider } from '@/ui/dialog';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <DialogProvider>
            <Shell />
          </DialogProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const { session } = useSession();
  if (session.status === 'loading') return <Loading />;
  if (session.status === 'needsStore') return <StoreSetup />;

  const hasStore = session.status === 'admin' || session.status === 'viewer';
  // Client-side routing only; Supabase Row Level Security is what actually blocks viewer writes.
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <NavBar position="top" />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="s/[token]" />
          <Stack.Protected guard={!hasStore}>
            <Stack.Screen name="login" />
          </Stack.Protected>
          <Stack.Protected guard={hasStore} redirectTo="/login">
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="schedule/weekly" />
            <Stack.Screen name="schedule/monthly" />
            <Stack.Screen name="schedule/daily/[date]" />
            <Stack.Screen name="employees/index" />
            <Stack.Screen name="employees/[id]/index" />
            <Stack.Protected guard={session.status === 'admin'} redirectTo="/dashboard">
              <Stack.Screen name="employees/new" />
              <Stack.Screen name="employees/[id]/edit" />
              <Stack.Screen name="settings" />
            </Stack.Protected>
          </Stack.Protected>
        </Stack>
      </View>
      <NavBar position="bottom" />
    </View>
  );
}
