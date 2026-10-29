import { describe, expect, it } from 'vitest';
import { dayKey, formatEnd, formatShortDay, formatStart, mondayOf, monthGrid } from './dates';
import {
  closedReason, isAvailable, periodOf, planCopy, sectionCandidates, shiftTimeLabel,
  type ScheduleData, type ShiftType,
} from './schedule';

// Mirrors the reference screenshots: open Sun + Wed–Sat, break 3–4pm.
const open = (o: string, c: string) => ({ isOpen: true, open: o, close: c });
const shift = (id: string, startTime: string, endType: ShiftType['endType']): ShiftType =>
  ({ id, name: id, startTime, endType, endTime: null });
const base = (): ScheduleData => ({
  store: {
    id: 's', name: 'Store', shareToken: 't', breakTime: { start: '15:00', end: '16:00' },
    openHours: {
      sun: open('11:00', '20:00'), mon: { isOpen: false, open: '', close: '' }, tue: { isOpen: false, open: '', close: '' },
      wed: open('11:00', '21:00'), thu: open('11:00', '21:00'), fri: open('11:00', '22:00'), sat: open('11:00', '22:00'),
    },
  },
  shiftTypes: [shift('open', '10:30', 'breakTime'), shift('night', '16:00', 'closing'), shift('night2', '18:00', 'closing')],
  roles: [{ id: 'r', name: 'Server' }],
  employees: [
    { id: 'alice', name: 'Alice', photoPath: null, availability: { sun: { available: true, allDay: true }, wed: { available: true, allDay: false, shiftTypeId: 'open' } } },
    { id: 'bob', name: 'Bob', photoPath: null, availability: { wed: { available: true, allDay: false, shiftTypeId: 'night' } } },
  ],
  employeeUnavailability: [],
  storeUnavailability: [],
  assignments: [],
});
const WED = '2026-06-10';

describe('dates', () => {
  it('formats like the screenshots', () => {
    expect(formatStart('10:30')).toBe('10:30am');
    expect(formatStart('16:00')).toBe('4:00pm');
    expect(formatEnd('15:00')).toBe('3pm');
    expect(formatShortDay('2026-06-08')).toBe('Mon, 6/8');
  });
  it('weeks start Monday, month grids start Sunday', () => {
    expect(mondayOf('2026-06-14')).toBe('2026-06-08');
    expect(dayKey(WED)).toBe('wed');
    const grid = monthGrid('2026-06');
    expect(grid[0]).toEqual([null, '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06']);
    expect(grid.at(-1)![2]).toBe('2026-06-30');
  });
});

describe('periods and labels', () => {
  it('splits by start time against the break end', () => {
    const d = base();
    expect(periodOf(d.shiftTypes[0], d.store, WED)).toBe('morning'); // 10:30
    expect(periodOf(d.shiftTypes[1], d.store, WED)).toBe('night'); // 16:00
  });
  it('uses a per-day break override', () => {
    const d = base();
    d.store.openHours.wed = { ...d.store.openHours.wed!, breakStart: '17:00', breakEnd: '18:30' };
    expect(periodOf(d.shiftTypes[1], d.store, WED)).toBe('morning');
  });
  it('labels end as break start or closing', () => {
    const d = base();
    expect(shiftTimeLabel(d.shiftTypes[0], d.store, WED)).toBe('10:30am - 3pm');
    expect(shiftTimeLabel(d.shiftTypes[1], d.store, WED)).toBe('4:00pm - closing');
  });
  it('reports closed weekdays and store unavailability', () => {
    const d = base();
    expect(closedReason(d, '2026-06-08')).toBe('Closed');
    d.storeUnavailability = [{ id: 'x', date: WED, reason: 'Holiday' }];
    expect(closedReason(d, WED)).toBe('Holiday');
  });
});

describe('availability', () => {
  it('follows the selected shift period, or all day', () => {
    const d = base();
    const [alice, bob] = d.employees;
    expect(isAvailable(d, alice, WED, 'morning')).toBe(true);
    expect(isAvailable(d, alice, WED, 'night')).toBe(false);
    expect(isAvailable(d, bob, WED, 'night')).toBe(true);
    expect(isAvailable(d, alice, '2026-06-14', 'night')).toBe(true); // Sun all day
  });
  it('is false on an unavailable date', () => {
    const d = base();
    d.employeeUnavailability = [{ id: 'u', employeeId: 'alice', date: WED, reason: 'Doctor' }];
    expect(isAvailable(d, d.employees[0], WED, 'morning')).toBe(false);
  });
  it('groups section candidates and excludes people already in the section', () => {
    const d = base();
    let c = sectionCandidates(d, WED, 'morning');
    expect(c.available.map((e) => e.name)).toEqual(['Alice']);
    expect(c.others.map((e) => e.name)).toEqual(['Bob']);
    expect(c.unavailable.map((e) => e.name)).toEqual(['Bob']);
    d.assignments = [{ id: 'a', employeeId: 'alice', shiftTypeId: 'open', roleId: null, date: WED }];
    c = sectionCandidates(d, WED, 'morning');
    expect(c.available).toEqual([]);
    expect(sectionCandidates(d, WED, 'morning', 'alice').available.map((e) => e.name)).toEqual(['Alice']);
  });
});

describe('planCopy', () => {
  const PREV = '2026-06-03';
  it('copies from 7 days earlier and skips unavailable employees', () => {
    const d = base();
    d.assignments = [
      { id: '1', employeeId: 'alice', shiftTypeId: 'open', roleId: 'r', date: PREV },
      { id: '2', employeeId: 'alice', shiftTypeId: 'night', roleId: null, date: PREV }, // Alice not available at night on Wed
    ];
    const plan = planCopy(d, [WED], 'replace');
    expect(plan.toInsert).toEqual([{ employeeId: 'alice', shiftTypeId: 'open', roleId: 'r', date: WED }]);
    expect(plan.skipped).toEqual([{ date: WED, employeeName: 'Alice', reason: 'unavailable' }]);
  });
  it('replace deletes existing; merge keeps them and skips duplicates', () => {
    const d = base();
    d.assignments = [
      { id: '1', employeeId: 'alice', shiftTypeId: 'open', roleId: null, date: PREV },
      { id: '2', employeeId: 'alice', shiftTypeId: 'open', roleId: null, date: WED },
    ];
    expect(planCopy(d, [WED], 'replace')).toMatchObject({ toDelete: ['2'], toInsert: [{ employeeId: 'alice' }] });
    expect(planCopy(d, [WED], 'merge')).toMatchObject({ toDelete: [], toInsert: [] });
  });
  it('skips closed dates', () => {
    const d = base();
    d.assignments = [{ id: '1', employeeId: 'alice', shiftTypeId: 'open', roleId: null, date: '2026-06-01' }];
    expect(planCopy(d, ['2026-06-08'], 'replace').skipped[0].reason).toBe('store closed (Closed)');
  });
});
