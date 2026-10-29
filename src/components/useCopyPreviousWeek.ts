import { formatShortDay } from '@/lib/dates';
import type { CopyMode } from '@/lib/schedule';
import type { StagedSchedule } from '@/lib/staged';
import { useDialog } from '@/ui/dialog';

/** "Copy Previous Week" into the staged schedule: asks Replace/Merge when needed, then reports skips. */
export function useCopyPreviousWeek(staged: StagedSchedule) {
  const { choose, notify } = useDialog();
  return async (targets: string[]) => {
    const hasExisting = staged.view?.assignments.some((a) => targets.includes(a.date));
    const mode = hasExisting
      ? await choose<CopyMode>('This already has shifts', 'Replace them with last week’s, or merge last week’s in?', [
          { label: 'Cancel', value: null as unknown as CopyMode },
          { label: 'Merge', value: 'merge', color: 'blue' },
          { label: 'Replace', value: 'replace', color: 'red' },
        ])
      : 'replace';
    if (!mode) return;
    const skipped = staged.copyPreviousWeek(targets, mode);
    if (skipped.length) {
      await notify(
        `Copied, ${skipped.length} skipped`,
        skipped.map((s) => `${formatShortDay(s.date)} · ${s.employeeName}: ${s.reason}`).join('\n'),
      );
    }
  };
}
