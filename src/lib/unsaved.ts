import { useEffect } from 'react';
import { Platform } from 'react-native';

// Screens with staged edits (daily, monthly week editor) mark themselves dirty;
// the nav bar and Back buttons ask before leaving.
let dirty = false;
export const hasUnsavedChanges = () => dirty;

export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    dirty = isDirty;
    if (Platform.OS !== 'web' || !isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);
  useEffect(() => () => void (dirty = false), []);
}
