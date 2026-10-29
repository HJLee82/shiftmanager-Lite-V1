import { createContext, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Body, Button, H2 } from '.';
import { colors } from './theme';

type Choice<T> = { label: string; value: T; color?: 'blue' | 'green' | 'red' | 'grey' };
type Request = { title: string; message?: string; choices: Choice<unknown>[]; resolve: (v: unknown) => void };

const DialogContext = createContext<((r: Omit<Request, 'resolve'>) => Promise<unknown>) | null>(null);

/** One modal at a time; works the same on web and phones. */
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [req, setReq] = useState<Request | null>(null);
  const open = useCallback((r: Omit<Request, 'resolve'>) => new Promise((resolve) => setReq({ ...r, resolve })), []);
  const close = (v: unknown) => {
    req?.resolve(v);
    setReq(null);
  };
  return (
    <DialogContext.Provider value={open}>
      {children}
      <Modal transparent visible={!!req} animationType="fade" onRequestClose={() => close(null)}>
        <Pressable style={s.backdrop} onPress={() => close(null)}>
          <Pressable style={s.box} onPress={() => {}}>
            <H2>{req?.title}</H2>
            {req?.message && <Body style={{ color: colors.muted }}>{req.message}</Body>}
            <View style={s.buttons}>
              {req?.choices.map((c) => (
                <Button key={c.label} title={c.label} color={c.color ?? 'grey'} onPress={() => close(c.value)} />
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const open = useContext(DialogContext);
  if (!open) throw new Error('useDialog outside DialogProvider');
  return {
    /** Resolves to the chosen value, or null when dismissed. */
    choose: <T,>(title: string, message: string | undefined, choices: Choice<T>[]) =>
      open({ title, message, choices: choices as Choice<unknown>[] }) as Promise<T | null>,
    confirm: async (title: string, message?: string, confirmLabel = 'OK', color: Choice<boolean>['color'] = 'blue') =>
      (await open({ title, message, choices: [{ label: 'Cancel', value: false }, { label: confirmLabel, value: true, color }] })) === true,
    notify: async (title: string, message?: string) => {
      await open({ title, message, choices: [{ label: 'OK', value: true, color: 'blue' }] });
    },
  };
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  box: { backgroundColor: '#fff', borderRadius: 12, padding: 20, gap: 10, width: '100%', maxWidth: 420 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 8 },
});
