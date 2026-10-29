// Database reads and writes. Row Level Security decides what each client may do;
// these functions only translate between table rows and the app's types.
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Assignment, DatedReason, Employee, EmployeeUnavailability, Role, ScheduleData, ShiftType, Store,
} from './schedule';

type Db = SupabaseClient;

/** Throws on a Supabase error; otherwise returns the data (non-null for successful list/select calls). */
function must<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// Raw PostgREST rows are untyped.
const toStore = (r: any): Store => ({
  id: r.id, name: r.name, shareToken: r.share_token, openHours: r.open_hours ?? {}, breakTime: r.break_time ?? {},
});
const toShift = (r: any): ShiftType => ({
  id: r.id, name: r.name, startTime: r.start_time, endType: r.end_type, endTime: r.end_time,
});
const toEmployee = (r: any): Employee => ({
  id: r.id, name: r.name, photoPath: r.photo_path, availability: r.availability ?? {},
});
const toUnavail = (r: any): EmployeeUnavailability => ({ id: r.id, employeeId: r.employee_id, date: r.date, reason: r.reason });
const toAssignment = (r: any): Assignment => ({
  id: r.id, employeeId: r.employee_id, shiftTypeId: r.shift_type_id, roleId: r.role_id, date: r.date,
});

// ─── Store ───────────────────────────────────────────────────────────────

export async function getAdminStore(db: Db, userId: string) {
  const row = must(await db.from('stores').select('*').eq('admin_user_id', userId).maybeSingle());
  return row ? toStore(row) : null;
}

export async function getViewerStore(db: Db, shareToken: string) {
  const row = must(await db.from('stores').select('*').eq('share_token', shareToken).maybeSingle());
  return row ? toStore(row) : null;
}

const DEFAULT_OPEN_HOURS = Object.fromEntries(
  ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d) => [d, { isOpen: true, open: '11:00', close: '21:00' }]),
);

export async function createStore(db: Db, userId: string, name: string) {
  return toStore(
    must(
      await db
        .from('stores')
        .insert({ admin_user_id: userId, name, open_hours: DEFAULT_OPEN_HOURS, break_time: { start: '15:00', end: '16:00' } })
        .select()
        .single(),
    ),
  );
}

export async function updateStore(db: Db, store: Store) {
  must(
    await db
      .from('stores')
      .update({ name: store.name, open_hours: store.openHours, break_time: store.breakTime })
      .eq('id', store.id),
  );
}

export async function regenerateShareToken(db: Db) {
  return must(await db.rpc('regenerate_share_token')) as string;
}

// ─── Schedule data ───────────────────────────────────────────────────────

/** Everything for one store; assignments limited to `from`…`to`. */
export async function getScheduleData(db: Db, store: Store, from: string, to: string): Promise<ScheduleData> {
  const sid = store.id;
  const [shifts, roles, employees, empUnavail, storeUnavail, assignments] = await Promise.all([
    db.from('shift_types').select('*').eq('store_id', sid),
    db.from('roles').select('*').eq('store_id', sid).order('name'),
    db.from('employees').select('*').eq('store_id', sid).order('name'),
    db.from('employee_unavailability').select('*').eq('store_id', sid).order('date'),
    db.from('store_unavailability').select('*').eq('store_id', sid).order('date'),
    db.from('shift_assignments').select('*').eq('store_id', sid).gte('date', from).lte('date', to),
  ]);
  return {
    store,
    shiftTypes: must(shifts).map(toShift),
    roles: must(roles) as Role[],
    employees: must(employees).map(toEmployee),
    employeeUnavailability: must(empUnavail).map(toUnavail),
    storeUnavailability: must(storeUnavail) as DatedReason[],
    assignments: must(assignments).map(toAssignment),
  };
}

// ─── Settings ────────────────────────────────────────────────────────────

export async function saveShiftType(db: Db, storeId: string, s: Omit<ShiftType, 'id'> & { id?: string }) {
  const row = { store_id: storeId, name: s.name, start_time: s.startTime, end_type: s.endType, end_time: s.endType === 'custom' ? s.endTime : null };
  must(s.id ? await db.from('shift_types').update(row).eq('id', s.id) : await db.from('shift_types').insert(row));
}

export async function countAssignmentsForShift(db: Db, shiftTypeId: string) {
  const { count, error } = await db.from('shift_assignments').select('id', { count: 'exact', head: true }).eq('shift_type_id', shiftTypeId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function deleteRow(db: Db, table: 'shift_types' | 'roles' | 'store_unavailability' | 'employees', id: string) {
  must(await db.from(table).delete().eq('id', id));
}

export async function saveRole(db: Db, storeId: string, name: string, id?: string) {
  must(id ? await db.from('roles').update({ name }).eq('id', id) : await db.from('roles').insert({ store_id: storeId, name }));
}

export async function countAssignmentsForRole(db: Db, roleId: string) {
  const { count, error } = await db.from('shift_assignments').select('id', { count: 'exact', head: true }).eq('role_id', roleId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function saveStoreUnavailability(db: Db, storeId: string, date: string, reason: string) {
  must(await db.from('store_unavailability').upsert({ store_id: storeId, date, reason }, { onConflict: 'store_id,date' }));
}

// ─── Employees ───────────────────────────────────────────────────────────

export type EmployeeInput = {
  name: string;
  availability: Employee['availability'];
  unavailable: { date: string; reason: string }[];
  /** New photo to upload, or null to remove the current one; undefined keeps it. */
  photo?: { uri: string; mimeType: string } | null;
};

async function uploadPhoto(db: Db, storeId: string, photo: { uri: string; mimeType: string }) {
  const body = await (await fetch(photo.uri)).arrayBuffer();
  const ext = photo.mimeType.split('/')[1] ?? 'jpg';
  const path = `${storeId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  must(await db.storage.from('photos').upload(path, body, { contentType: photo.mimeType }));
  return path;
}

/** Create (no id) or update an employee, including photo and unavailable dates. Returns the id. */
export async function saveEmployee(db: Db, storeId: string, input: EmployeeInput, existing?: Employee) {
  const row: Record<string, unknown> = { store_id: storeId, name: input.name, availability: input.availability };
  if (input.photo) row.photo_path = await uploadPhoto(db, storeId, input.photo);
  if (input.photo === null) row.photo_path = null;

  const id = existing
    ? (must(await db.from('employees').update(row).eq('id', existing.id)), existing.id)
    : (must(await db.from('employees').insert(row).select('id').single()) as { id: string }).id;

  if (existing?.photoPath && input.photo !== undefined) await db.storage.from('photos').remove([existing.photoPath]);

  must(await db.from('employee_unavailability').delete().eq('employee_id', id));
  if (input.unavailable.length) {
    must(
      await db
        .from('employee_unavailability')
        .insert(input.unavailable.map((u) => ({ store_id: storeId, employee_id: id, date: u.date, reason: u.reason }))),
    );
  }
  return id;
}

export async function deleteEmployee(db: Db, emp: Employee) {
  must(await db.from('employees').delete().eq('id', emp.id));
  if (emp.photoPath) await db.storage.from('photos').remove([emp.photoPath]);
}

// ─── Assignments ─────────────────────────────────────────────────────────

/** Apply staged schedule edits: deletes first, then inserts, then updates. */
export async function applyAssignmentChanges(
  db: Db,
  storeId: string,
  changes: { toDelete: string[]; toInsert: Omit<Assignment, 'id'>[]; toUpdate?: Assignment[] },
) {
  if (changes.toDelete.length) must(await db.from('shift_assignments').delete().in('id', changes.toDelete));
  if (changes.toInsert.length) {
    must(
      await db.from('shift_assignments').insert(
        changes.toInsert.map((a) => ({
          store_id: storeId, employee_id: a.employeeId, shift_type_id: a.shiftTypeId, role_id: a.roleId, date: a.date,
        })),
      ),
    );
  }
  for (const a of changes.toUpdate ?? []) {
    must(
      await db
        .from('shift_assignments')
        .update({ employee_id: a.employeeId, shift_type_id: a.shiftTypeId, role_id: a.roleId })
        .eq('id', a.id),
    );
  }
}
