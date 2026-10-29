import { useState } from 'react';
import { createStore } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Body, Button, Card, H1, Muted, Screen, TextField } from '@/ui';
import { colors } from '@/ui/theme';

/** Shown once, on an admin's first login, to create their store. */
export function StoreSetup() {
  const { session, reload, signOut } = useSession();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  if (session.status !== 'needsStore') return null;

  const submit = async () => {
    try {
      await createStore(session.db, session.userId, name.trim());
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen>
      <Card style={{ maxWidth: 420, width: '100%', alignSelf: 'center', gap: 14, marginTop: 40 }}>
        <H1>Welcome!</H1>
        <Muted>Name your store to get started. You can change open hours, shifts and roles in Settings.</Muted>
        <TextField label="Store name" value={name} onChangeText={setName} required onSubmit={submit} />
        {!!error && <Body style={{ color: colors.unavailableText }}>{error}</Body>}
        <Button title="Create store" color="green" onPress={submit} disabled={!name.trim()} />
        <Button title="Log out" color="grey" onPress={signOut} />
      </Card>
    </Screen>
  );
}
