# ShiftManager Lite — Structure & Spec

App for managing employee shifts for **one store per admin account**.
Built with **Expo (React Native) + Supabase**: web first, iOS/Android later from the same codebase.
UI uses React Native's built-in components plus a small set of our own shared components (no UI kit for now;
gluestack-ui can be adopted once its NativeWind v5 stack is stable).
**Lite version:** only the **Admin (manager)** can add / edit / delete anything. **Viewers** can only view.

> Reference screenshots were provided for: Dashboard, Weekly Schedule, Monthly Schedule, Daily Schedule Detail, Employees List, Employee Detail, Edit Employee, Store Settings. Match their layout and visual style.

---

## 1. Roles & Permissions

| Action | Admin | Viewer |
|---|---|---|
| View dashboard, schedules, employees | ✅ | ✅ |
| Add / edit / delete shifts, employees, settings | ✅ | ❌ |
| Copy previous week | ✅ | ❌ |
| Access Settings page | ✅ | ❌ (hide nav link, block route) |

Rules:
- Viewers never see edit controls (Edit, Delete, ✏️, 🗑, `+ Add`, `+ Add Shift`, `Copy Previous Week`, `Done`, `Save`).
- Permission must be enforced **in the database** (Supabase Row Level Security), not only by hiding buttons.
- Admin: Supabase email + password account, **invite only** (created in the Supabase dashboard). One admin account = one store.
- Viewer: no login. Opens the store's private **share link** (`/s/[shareToken]`). Admin can regenerate the link to revoke old ones.
- Self sign-up for admins and employees is planned for the **Pro** version, not Lite.

---

## 2. Routes / Page Tree

```
/                         Admin: → /dashboard. Not logged in: → /login
/login                    Admin login
/s/[shareToken]           Viewer entry: remembers the token, → /dashboard (read-only)
/dashboard                Dashboard
/schedule/weekly          Weekly schedule (?week=YYYY-MM-DD)
/schedule/daily/[date]    Daily schedule detail (in-place edit)
/schedule/monthly         Monthly schedule (?month=YYYY-MM)
/employees                Employees list
/employees/new            Add employee
/employees/[id]           Employee detail
/employees/[id]/edit      Edit employee
/settings                 Settings (admin only)
```

**Top nav (every page):** `ShiftManager Lite` (logo → Dashboard) · Dashboard · Employees · Schedule · Settings (admin only) · store name · Log out (admin).
On phones the nav becomes a bottom tab bar.

---

## 3. Data Model

```ts
Store {
  id, name
  adminUserId                                    // Supabase auth user; one store per admin
  shareToken                                     // viewer link secret; regenerate to revoke
  openHours: { [day: 'sun'..'sat']: { isOpen: boolean; open: 'HH:mm'; close: 'HH:mm' } }
  breakTime: { start: 'HH:mm'; end: 'HH:mm' }    // optional per-day override
}

Role { id, storeId, name }                       // e.g. Server, Cook, Host

ShiftType {                                      // "Shift Hours" in settings
  id, storeId, name                              // e.g. Open Team, Morning, Night, Night 2
  startTime: 'HH:mm'
  endType: 'breakTime' | 'closing' | 'custom'
  endTime?: 'HH:mm'                              // only when endType = custom
}
// Period is derived, not stored: startTime < that day's break end → 'morning', else 'night'.

Employee {
  id, storeId, name, photoUrl?
  availability: {
    [day: 'sun'..'sat']: { available: boolean; allDay: boolean; shiftTypeId?: string }
  }
}

EmployeeUnavailability { id, employeeId, date: 'YYYY-MM-DD', reason? }

StoreUnavailability { id, storeId, date: 'YYYY-MM-DD', reason }   // holidays, closures

ShiftAssignment {
  id, storeId, employeeId, shiftTypeId
  roleId?                                        // role is chosen per assigned shift
  date: 'YYYY-MM-DD'
}
```

Derived display values:
- **End time** of a shift = break time start (`breakTime`), store close for that day shown as `closing` (`closing`), or `endTime` (`custom`).
- Time format everywhere: `10:30am - 3pm`, `4:00pm - closing`.

---

## 4. Shared Components

| Component | Used in | Notes |
|---|---|---|
| `WeekGrid` | Dashboard, Weekly, Monthly (below calendar) | 7 columns **Mon → Sun**, each split **Morning / Night** |
| `ShiftCard` | WeekGrid, Daily | Name + **role initial in a circle** + start–end time |
| `MonthCalendar` | Monthly schedule, Employee unavailability, Store unavailability | ← Month YYYY →, Sun-first grid, today = blue outline, selected/unavailable = red filled |
| `AvailabilityTable` | Employee detail | Rows Morning/Night × columns Sun–Sat |
| `AvailabilityEditor` | Add/Edit employee | Per day: checkbox · shift dropdown · All Day toggle |
| `InlineShiftForm` | Daily, Monthly week editor | Available / Others / Shift / Role dropdowns + Save / Cancel |
| `UnavailableBanner` | Daily, Monthly week editor | Red, **bold**, at top of each section |
| `RoleBadge` | ShiftCard, lists | Circle with first letter of role name |
| `Avatar` | Employees | Photo, or light-blue circle with first letter of name |

### ShiftCard (required content)
```
[ Alice  (S) ]        ← employee first name + initial of the role assigned for this shift
  10:30am - 3pm       ← shift start time - end
```
- Morning cards: light blue background, blue text.
- Night cards: light purple background, purple text.
- Long times truncate with `…` in narrow columns.

### WeekGrid rules
- Header pill per day: `Mon, 6/8`. **Today** = solid blue pill with white text.
- Every day column has a `Morning` label and a `Night` label, separated by a divider.
- Empty section shows `-`.
- Store-closed days (from open hours) and store-unavailable dates show greyed out with `Closed`.
- Cards inside a section sorted by start time, then name.

---

## 5. Pages

### 5.1 Entry (`/`, `/login`, `/s/[shareToken]`)
- No store selection: an admin account has exactly one store.
- `/login`: email + password. On an admin's first login, ask for the store name and create the store.
- `/s/[shareToken]`: viewer entry. Remember the token on the device, then open the read-only dashboard.
  Invalid / regenerated token → "This link is no longer valid."

### 5.2 Dashboard (`/dashboard`)
1. **This Week's Schedule** — `MM/DD/YYYY to MM/DD/YYYY` (current Mon–Sun) + read-only `WeekGrid`.
   - Empty state box: `No schedule yet.`
2. **Available Employees This Week** — weekly calendar (Mon–Sun × Morning/Night) listing who is *available* each section based on their availability, minus employee unavailable dates and store unavailable dates.
3. **Employees** — buttons: `Employee List` (blue), `Add Employee` (green, admin only).
4. **Schedule** — button: `Weekly Schedule` (purple).

### 5.3 Weekly Schedule (`/schedule/weekly`)
- Header: `Weekly Schedule` + orange button `{Month} Schedule` → monthly page.
- Controls: `←` · `06/08/2026 to 06/14/2026` · `→` · `Today` button.
- `WeekGrid` (read-only view).
- **Click a day column header / day** → `/schedule/daily/[date]`.

### 5.4 Daily Schedule Detail (`/schedule/daily/[date]`)
Header row: `← Back` · **Wednesday, June 10, 2026** · buttons (admin only):
- `Copy Previous Week` — copy assignments for this **same weekday from 7 days earlier** into this day (see §6).
- `+ Add Shift` (green) — opens `InlineShiftForm` (choose Morning or Night by shift type).
- `Done` — saves all pending changes and returns to weekly view.

Body: two cards — **Morning** and **Night**. Each card:
1. **Unavailable employees at the top** — red/pink box, **bold** red names (employee unavailable date, or not available that weekday/period). Always visible so the manager sees them first.
2. Existing assignments as rows: name + role circle + time · ✏️ edit · 🗑 delete.
3. In-place edit / add form (`InlineShiftForm`):
   - **Available** dropdown — employees available for this day & period and not yet assigned in this section.
   - **Others** dropdown — everyone else not on this shift (not available, but still assignable). Choosing from one dropdown clears the other.
   - **Shift** dropdown — shift types for this period, e.g. `Open Team (10:30am)`.
   - **Role** dropdown — role for this assignment (optional).
   - `Save` (blue) / `Cancel` (grey).
- Prevent assigning the same employee twice in the same section.
- If date is store-closed / store unavailable: show reason, disable adding.

### 5.5 Monthly Schedule (`/schedule/monthly`)
- Title `June 2026` · `←  June 2026  →`.
- `MonthCalendar` (Sun → Sat). Each date cell shows:
  - date number (today = blue filled circle),
  - up to 2 shift chips (morning = blue, night = purple; name only),
  - `+N more` if more.
  - Store-unavailable dates greyed with reason tooltip.
- **Click a date** → below the calendar show **Week of {Mon date}** with an editable `WeekGrid`:
  - Each section has `+ Add` (green, admin) → `InlineShiftForm` inline in that section.
  - Each card has ✏️ edit and 🗑 delete.
  - Unavailable employees shown at top of each section (same red bold style).
  - Buttons: `Copy Previous Week` · `Done`.
  - Clicked date's column is highlighted.

### 5.6 Employees List (`/employees`)
- Title `Employees` + `+ Add Employee` (green, admin).
- Row cards: `Avatar` · name · `→`. Click → detail. (No role line: roles are per assigned shift.)
- Optional: search by name.

### 5.7 Employee Detail (`/employees/[id]`)
- `← Back` · `Edit` (blue) · `Delete` (red, with confirm) — admin only.
- **Employee Info** card: Name, large avatar on the right.
- **Availability** — `AvailabilityTable`: columns Sun–Sat, rows Morning / Night.
  - `All Day` chip (blue in morning row, purple in night row).
  - Shift chip: shift name + time (e.g. `Open Team 10:30am - 3pm`, `Night 4:00pm - closing`).
  - `Closed` (light grey) for store-closed days, `-` when not available.
- **Unavailability** — `MonthCalendar` with unavailable dates as red filled circles, today blue outline. Below: **Unavailable Dates** list (date + reason).

### 5.8 Add / Edit Employee (`/employees/new`, `/employees/[id]/edit`)
- **Employee Info**: Name (input), Profile picture upload (preview in avatar circle; fallback = initial).
- **Availability** (`AvailabilityEditor`), one row per day Sun–Sat:
  - Checkbox (available that day)
  - Shift dropdown (earliest shift they can start) — disabled when unchecked
  - `All Day` toggle (green when on) — when on, shift dropdown disabled
  - Store-closed days: whole row disabled/greyed.
- **Unavailability**: `MonthCalendar`, click dates to toggle (red = selected). Below: **Selected Dates** list with optional reason + remove (×).
- Buttons: `Save` / `Cancel`. Validate name required.

### 5.9 Settings (`/settings`, admin only)
Sections as separate cards, each with its own `Save`.

1. **Store** — store name (rename) and **Viewer link**: copy link, `Regenerate` (confirm: old link stops working).
2. **Store Open Hours** — per day Sun–Sat:
   - Checkbox (open) · open time `[hour] [AM/PM]` · `to` · close time `[hour] [AM/PM]`.
   - Unchecked → shows `Closed`.
   - **Apply to all** button: copy one day's times to all checked days.
3. **Break Time** — `[start] PM to [end] PM`. Optional per-day override with **Apply to all**.
4. **Shift Hours** — table of shift types:
   - Name · start `[hour] [:00/:15/:30/:45] [AM/PM]` · end (`Break Time` / `Closing` / custom time).
   - Show the derived period (Morning/Night) next to each shift as a read-only label.
   - `+ Add Shift`, ✏️ edit, 🗑 delete (block delete or warn if shift is used in assignments).
5. **Store Unavailability** — `MonthCalendar`; click a date → below calendar: date, **Reason** input, `Save` button. Existing dates listed with edit/delete.
6. **Roles** — list; add / rename / delete (warn if employees use the role).

---

## 6. Business Logic

**Week** = Monday → Sunday (dashboard/weekly/monthly week editor). **Month calendar** = Sunday-first.

**Morning / Night:** a shift whose start time is before that day's break end → Morning; otherwise Night.
Example (break 3–4pm): Open Team 10:30am → Morning; Night 4:00pm → Night. No break that day → Morning.

**Who is "available" for a date + period:**
1. Store is open that weekday and date isn't store-unavailable.
2. Employee `availability[day].available === true`.
3. `allDay` → available for morning & night; otherwise the period of their selected `shiftTypeId`.
4. Date is not in the employee's unavailable dates.

Everyone failing 2–4 → listed as **Unavailable** (red, bold, top of section).

**Copy Previous Week:**
- Daily page: copy the same weekday from 7 days earlier. Weekly/monthly week editor: copy all 7 days.
- If target already has assignments → confirm: *Replace* or *Merge*.
- Skip (and report in a toast) assignments where the employee is now unavailable, deleted, or the store is closed.

**Done / Save:** edits are staged locally; `Done` commits them; leaving with unsaved changes shows a confirm.

---

## 7. Visual Style (from screenshots)

| Element | Style |
|---|---|
| Page bg | White, centered max-width container |
| Cards | White, 1px light-grey border, rounded corners |
| Morning | Light blue bg / blue text |
| Night | Light purple bg / purple text |
| Unavailable | Light red bg / **bold red** text |
| Today | Solid blue pill (week) / blue circle (calendar) |
| Buttons | Blue = primary/edit · Green = add · Red = delete · Purple = weekly schedule · Orange = monthly · Grey = secondary (Copy, Done, Cancel) |
| Section labels | Small grey text (`Morning`, `Night`) |
| Empty | `-` in light grey |

Responsive: on narrow screens WeekGrid scrolls horizontally inside its container (no page-level horizontal scroll).
Phones: bottom tab bar instead of the top nav; cards and forms stack to one column.

---

## 8. Build Order (suggested)

1. Data model + seed data (1 store, 3 roles, 4 shift types, 6 employees: Alice, Bob, Carol, David, Emma, Frank)
2. Auth (admin login, viewer share link, RLS) + layout/nav
3. Settings (store + viewer link, open hours, break, shift hours, roles, store unavailability)
4. Employees list / detail / add / edit
5. Shared `WeekGrid`, `ShiftCard`, `MonthCalendar`
6. Dashboard → Weekly → Daily (in-place edit) → Monthly (+ week editor)
7. Copy Previous Week
8. Viewer-mode pass: confirm every edit control is hidden and every write is blocked server-side
