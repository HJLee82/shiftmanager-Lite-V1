import { Redirect } from 'expo-router';
import { useSession } from '@/lib/session';

export default function Index() {
  const { session } = useSession();
  const hasStore = session.status === 'admin' || session.status === 'viewer';
  return <Redirect href={hasStore ? '/dashboard' : '/login'} />;
}
