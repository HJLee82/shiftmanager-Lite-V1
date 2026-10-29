// Pure scheduling rules (see docs/structure.md §6). No UI or database code here.
import { addDays, dayKey, formatEnd, formatStart, type DayKey } from './dates';

export type Period = 'morning' | 'night';
export const PERIODS: Period[] = ['morning', 'night'];

export type OpenDay = { isOpen: boolean; open: string; close: string; breakStart?: string; breakEnd?: string };
export type Store = {
  id: string;
  name: string;
  shareToken: string;
  openHours: Partial<Record<DayKey, OpenDay>>;
  breakTime: { start?: string; end?: string };
};
export type ShiftType = {
  id: string;
  name: string;
  startTime: string;
  endType: 'breakTime' | 'closing' | 'custom';
  endTime: string | null;
};
export type Role = { id: string; name: string };
export type DayAvailability = { available: boolean; allDay: boolean; shiftTypeId?: string };
export type Employee = {
  id: string;
  name: string;
  photoPath: string | null;
  availability: Partial<Record<DayKey, DayAvailability>>;
};
export type DatedReason = { id: string; date: string; reason: string };
export type EmployeeUnavailability = DatedReason & { employeeId: string };
export type Assignment = { id: string; employeeId: string; shiftTypeId: string; roleId: string | null; date: string };

/** Everything the schedule screens need for one store. */
export type ScheduleData = {
  store: Store;
  shiftTypes: ShiftType[];
  roles: Role[];
  employees: Employee[];
  employeeUnavailability: EmployeeUnavailability[];
  storeUnavailability: DatedReason[];
  assignments: Assignment[];
};

/** That day's break: the day's override, else the store default. */
export function breakFor(store: Store, date: string): { start: string; end: string } | null {
  const day = store.openHours[dayKey(date)];
  const start = day?.breakStart || store.breakTime.start;
  const end = day?.breakEnd || store.breakTime.end;
  return start && end ? { start, end } : null;
}

/** Morning when the shift starts before that day's break ends; Night otherwise. No break → Morning. */
export function periodOf(shift: ShiftType, store: Store, date: string): Period {
  const brk = breakFor(store, date);
  return brk && shift.startTime >= brk.end ? 'night' : 'morning';
}

export const shiftsForPeriod = (data: ScheduleData, date: string, period: Period) =>
  data.shiftTypes.filter((s) => periodOf(s, data.store, date) === period).sort(byStart);

const byStart = (a: ShiftType, b: ShiftType) => a.startTime.localeCompare(b.startTime) || a.name.localeCompare(b.name);

/** "10:30am - 3pm", "4:00pm - closing". */
export function shiftTimeLabel(shift: ShiftType, store: Store, date?: string) {
  let end = 'closing';
  if (shift.endType === 'custom' && shift.endTime) end = formatEnd(shift.endTime);
  if (shift.endType === 'breakTime') {
    const start = date ? breakFor(store, date)?.start : store.breakTime.start;
    end = start ? formatEnd(start) : 'break';
  }
  return `${formatStart(shift.startTime)} - ${end}`;
}

/** Why nobody can be scheduled on this date, or null when the store is open. */
export function closedReason(data: Pick<ScheduleData, 'store' | 'storeUnavailability'>, date: string): string | null {
  const closure = data.storeUnavailability.find((u) => u.date === date);
  if (closure) return closure.reason || 'Closed';
  return data.store.openHours[dayKey(date)]?.isOpen ? null : 'Closed';
}

/** §6 rules 2–4: regular availability for the period, and no unavailable date. */
export function isAvailable(data: ScheduleData, emp: Employee, date: string, period: Period) {
  if (data.employeeUnavailability.some((u) => u.employeeId === emp.id && u.date === date)) return false;
  const day = emp.availability[dayKey(date)];
  if (!day?.available) return false;
  if (day.allDay) return true;
  const shift = data.shiftTypes.find((s) => s.id === day.shiftTypeId);
  return !!shift && periodOf(shift, data.store, date) === period;
}

export function assignmentsFor(data: ScheduleData, date: string, period: Period) {
  return data.assignments
    .filter((a) => a.date === date)
    .map((a) => ({ a, shift: data.shiftTypes.find((s) => s.id === a.shiftTypeId)! }))
    .filter(({ shift }) => shift && periodOf(shift, data.store, date) === period)
    .map(({ a, shift }) => ({ ...a, shift, employee: data.employees.find((e) => e.id === a.employeeId)! }))
    .filter((x) => x.employee)
    .sort((x, y) => x.shift.startTime.localeCompare(y.shift.startTime) || x.employee.name.localeCompare(y.employee.name));
}

/**
 * Dropdown groups for adding to a section. Employees already in the section are excluded
 * (except `keepId`, the row being edited). Unavailable employees appear in `others` and `unavailable`.
 */
export function sectionCandidates(data: ScheduleData, date: string, period: Period, keepId?: string) {
  const taken = new Set(assignmentsFor(data, date, period).map((a) => a.employeeId));
  taken.delete(keepId ?? '');
  const free = data.employees.filter((e) => !taken.has(e.id));
  const available = free.filter((e) => isAvailable(data, e, date, period));
  return {
    available,
    others: free.filter((e) => !available.includes(e)),
    unavailable: data.employees.filter((e) => !isAvailable(data, e, date, period)),
  };
}

export type CopyMode = 'replace' | 'merge';
export type CopySkip = { date: string; employeeName: string; reason: string };

/**
 * Copy assignments from 7 days before each target date.
 * Replace removes the targets' existing assignments first; Merge keeps them and skips duplicates.
 * Skips closed dates and employees who are now unavailable.
 */
export function planCopy(data: ScheduleData, targets: string[], mode: CopyMode) {
  const targetSet = new Set(targets);
  const existing = data.assignments.filter((a) => targetSet.has(a.date));
  const kept = mode === 'replace' ? [] : existing;
  const toInsert: Omit<Assignment, 'id'>[] = [];
  const skipped: CopySkip[] = [];

  for (const date of targets) {
    const source = data.assignments.filter((a) => a.date === addDays(date, -7));
    const closed = closedReason(data, date);
    for (const a of source) {
      const emp = data.employees.find((e) => e.id === a.employeeId);
      const shift = data.shiftTypes.find((s) => s.id === a.shiftTypeId);
      if (!emp || !shift) continue;
      const skip = (reason: string) => skipped.push({ date, employeeName: emp.name, reason });
      if (closed) skip(`store closed (${closed})`);
      else if (!isAvailable(data, emp, date, periodOf(shift, data.store, date))) skip('unavailable');
      else if (![...kept, ...toInsert].some((x) => x.date === date && x.employeeId === a.employeeId && x.shiftTypeId === a.shiftTypeId)) {
        toInsert.push({ employeeId: a.employeeId, shiftTypeId: a.shiftTypeId, roleId: a.roleId, date });
      }
    }
  }
  return { toDelete: mode === 'replace' ? existing.map((a) => a.id) : [], toInsert, skipped };
}
