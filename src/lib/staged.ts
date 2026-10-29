import { useState } from 'react';
import { applyAssignmentChanges } from './api';
import { planCopy, type Assignment, type CopyMode, type ScheduleData } from './schedule';
import { useStore } from './session';
import { useWrite } from './queries';

let nextTempId = 1;
const isTemp = (id: string) => id.startsWith('new-');

/**
 * Schedule edits held locally until `commit` (the Done button).
 * `view` is the data with staged assignments applied, for rendering.
 */
export function useStagedSchedule(data: ScheduleData | undefined) {
  const { db, store } = useStore();
  const [staged, setStaged] = useState<Assignment[] | null>(null);
  const current = staged ?? data?.assignments ?? [];
  const edit = (fn: (list: Assignment[]) => Assignment[]) => setStaged(fn(current));
  const write = useWrite(applyAssignmentChanges);

  return {
    view: data && { ...data, assignments: current },
    dirty: staged !== null,
    pending: write.pending,
    add: (a: Omit<Assignment, 'id'>) => edit((l) => [...l, { ...a, id: `new-${nextTempId++}` }]),
    update: (a: Assignment) => edit((l) => l.map((x) => (x.id === a.id ? a : x))),
    remove: (id: string) => edit((l) => l.filter((x) => x.id !== id)),
    /** Stage a copy from 7 days before each target date. Returns what was skipped. */
    copyPreviousWeek: (targets: string[], mode: CopyMode) => {
      const plan = planCopy({ ...data!, assignments: current }, targets, mode);
      edit((l) => [
        ...l.filter((x) => !plan.toDelete.includes(x.id)),
        ...plan.toInsert.map((a) => ({ ...a, id: `new-${nextTempId++}` })),
      ]);
      return plan.skipped;
    },
    discard: () => setStaged(null),
    commit: async () => {
      if (!staged || !data) return;
      const keep = new Map(staged.map((a) => [a.id, a]));
      await write.run(db, store.id, {
        toDelete: data.assignments.filter((a) => !keep.has(a.id)).map((a) => a.id),
        toInsert: staged.filter((a) => isTemp(a.id)).map(({ id: _id, ...a }) => a),
        toUpdate: staged.filter((a) => {
          const orig = data.assignments.find((o) => o.id === a.id);
          return orig && (orig.employeeId !== a.employeeId || orig.shiftTypeId !== a.shiftTypeId || orig.roleId !== a.roleId);
        }),
      });
      setStaged(null);
    },
  };
}

export type StagedSchedule = ReturnType<typeof useStagedSchedule>;
