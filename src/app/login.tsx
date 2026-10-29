import { useState } from 'react';
import { useSession } from '@/lib/session';
import { adminDb } from '@/lib/supabase';
import { Body, Button, Card, H1, Muted, Screen, TextField } from '@/ui';
import { colors } from '@/ui/theme';

export default function Login() {
  const { session } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    setError('');
    const { error } = await adminDb.auth.signInWithPassword({ email: email.trim(), password });
    setPending(false);
    if (error) setError(error.message);
  };

  return (
    <Screen>
      <Card style={{ maxWidth: 380, width: '100%', alignSelf: 'center', gap: 14, marginTop: 40 }}>
        <H1>ShiftManager Lite</H1>
        {session.status === 'signedOut' && session.invalidLink && (
          <Body style={{ color: colors.unavailableText }}>This link is no longer valid. Ask your manager for the new one.</Body>
        )}
        <Muted>Managers log in here. Staff: open the schedule link your manager shared.</Muted>
        <TextField label="Email" value={email} onChangeText={setEmail} />
        <TextField label="Password" value={password} onChangeText={setPassword} secure onSubmit={submit} />
        {!!error && <Body style={{ color: colors.unavailableText }}>{error}</Body>}
        <Button title={pending ? 'Logging in…' : 'Log in'} onPress={submit} disabled={pending || !email || !password} />
      </Card>
    </Screen>
  );
}
