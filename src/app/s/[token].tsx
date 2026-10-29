import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/session';
import { Loading } from '@/ui';

/** Viewer entry from a share link: remember the token, then show the read-only dashboard. */
export default function ShareLink() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { openShareLink } = useSession();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (token) openShareLink(token).then(() => setDone(true));
  }, [token, openShareLink]);

  // The index route sends viewers to the dashboard, or to login (with an "invalid link" note) on failure.
  return done ? <Redirect href="/" /> : <Loading />;
}
