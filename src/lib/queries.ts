import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getScheduleData } from './api';
import { useStore } from './session';

/** Schedule data for the current store with assignments in `from`…`to`. */
export function useScheduleData(from: string, to: string) {
  const { db, store } = useStore();
  return useQuery({
    queryKey: ['schedule', store.id, store, from, to],
    queryFn: () => getScheduleData(db, store, from, to),
  });
}

/** Store data for screens that don't show a schedule (employees, settings). */
export const useStoreData = () => useScheduleData('0001-01-01', '0001-01-01');

/** Wraps a write; refreshes every query afterwards. Errors are shown with `alert`. */
export function useWrite<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (args: A) => fn(...args),
    onSettled: () => qc.invalidateQueries(),
    onError: (e) => alert(e instanceof Error ? e.message : String(e)),
  });
  return { run: (...args: A) => m.mutateAsync(args), pending: m.isPending };
}
