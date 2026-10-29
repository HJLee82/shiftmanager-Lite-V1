// Dates are "YYYY-MM-DD" strings, months "YYYY-MM", times "HH:MM" (24h).
// Weeks run Monday → Sunday; month calendars run Sunday → Saturday.

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export const DAY_LABELS: Record<DayKey, string> = {
  sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat',
};

const pad = (n: number) => String(n).padStart(2, '0');

function toUTC(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
const fromUTC = (d: Date) => d.toISOString().slice(0, 10);

export function isDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && fromUTC(toUTC(s)) === s;
}
export function isMonth(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function today() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

export function addDays(date: string, n: number) {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUTC(d);
}

export const dayKey = (date: string): DayKey => DAY_KEYS[toUTC(date).getUTCDay()];

export function mondayOf(date: string) {
  return addDays(date, -((toUTC(date).getUTCDay() + 6) % 7));
}

export const weekDates = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

export function addMonths(month: string, n: number) {
  const [y, m] = month.split('-').map(Number);
  return fromUTC(new Date(Date.UTC(y, m - 1 + n, 1))).slice(0, 7);
}

/** Sunday-first weeks covering the month; dates outside the month are null. */
export function monthGrid(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const lead = toUTC(first).getUTCDay();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = first; d.startsWith(month); d = addDays(d, 1)) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  toUTC(date).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });

/** "06/08/2026" */
export const formatMDY = (date: string) => `${date.slice(5, 7)}/${date.slice(8)}/${date.slice(0, 4)}`;
/** "Mon, 6/8" */
export const formatShortDay = (date: string) =>
  `${DAY_LABELS[dayKey(date)]}, ${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;
/** "Wednesday, June 10, 2026" */
export const formatLongDate = (date: string) =>
  fmt(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
/** "June 8" */
export const formatMonthDay = (date: string) => fmt(date, { month: 'long', day: 'numeric' });
/** "June 2026" */
export const formatMonth = (month: string) => fmt(`${month}-01`, { month: 'long', year: 'numeric' });
/** "June" */
export const monthName = (month: string) => fmt(`${month}-01`, { month: 'long' });

/** Start times always show minutes: "10:30am", "4:00pm". */
export function formatStart(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)}${h < 12 ? 'am' : 'pm'}`;
}

/** End times drop ":00": "3pm", "10:30pm". */
export function formatEnd(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}${m ? `:${pad(m)}` : ''}${h < 12 ? 'am' : 'pm'}`;
}
