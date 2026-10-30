# ShiftManager Lite

Employee shift scheduling for a single store. The manager (admin) builds the weekly schedule; staff view it through a private link.

Built with **Expo (React Native) + Supabase**. Web first; iOS and Android builds come later from the same codebase.

- Full spec: [docs/structure.md](docs/structure.md)
- Database schema and access rules: [supabase/schema.sql](supabase/schema.sql)

## Features

| Area | What it does |
|---|---|
| **Dashboard** | This week's schedule, who is available each day (Morning / Night), shortcuts |
| **Weekly schedule** | Mon–Sun grid split into Morning and Night; tap a day for details |
| **Daily schedule** | Add, edit and delete shifts in place; unavailable employees shown first in bold red; Copy Previous Week; edits are saved together with **Done** |
| **Monthly schedule** | Month calendar with shift chips; tap a date to edit that week below |
| **Employees** | List, detail, add and edit: photo, weekly availability (a shift or All Day), unavailable dates |
| **Settings** (admin only) | Store name and viewer link, open hours, break time, shift hours, store closed dates, roles |

### Who can do what

| | Admin (manager) | Viewer (staff) |
|---|---|---|
| Access | Email + password (invite only) | Private share link, no login |
| View schedules and employees | ✅ | ✅ |
| Add / edit / delete anything | ✅ | ❌ |
| Settings | ✅ | ❌ |

One admin account owns one store. Permissions are enforced in the database (Supabase Row Level Security), not only by hiding buttons. Regenerating the viewer link in Settings stops the old link from working.

### Scheduling rules

- **Morning or Night** is automatic: a shift that starts before that day's break ends is Morning; otherwise Night.
- **Available** = the store is open, the employee's weekly availability covers that period, and they have no unavailable date. Everyone else can still be assigned from the **Others** list.
- **Copy Previous Week** copies from 7 days earlier. If the target already has shifts, it asks to **Replace** or **Merge**, and it reports what it skipped (store closed, employee unavailable).
- The role is chosen for each assigned shift and shown as a letter in a circle.

## Setup

### 1. Supabase (once per project)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: paste [supabase/schema.sql](supabase/schema.sql) and **Run**.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
4. **Authentication → Users → Add user**: create each manager's account with **Auto Confirm User** on.
   On first login the manager names their store.

### 2. Local environment

Requires Node.js 22.13+ or 24.3+ (Expo SDK 58).

```bash
npm install
cp .env.example .env.local
```

In `.env.local`, set the values from **Supabase → Project Settings → API**:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

The publishable key is designed to ship inside the app. Never put the secret or service-role key in this file.

## Run

```bash
npm run web      # browser, http://localhost:8081
npm start        # dev server; scan the QR code with Expo Go, or press i / a for the iOS / Android simulator
```

Log in as an admin. To see the viewer side, copy the link from **Settings → Store** and open it in a private window.

> Phones are not tested yet. On iOS, dropdowns currently appear as wheel pickers.

## Test

```bash
npm test           # unit tests for the scheduling rules (Vitest)
npm run typecheck  # TypeScript
npm run lint       # ESLint (Expo config)
```

## Project structure

```
src/
  app/            Screens. Each file is a route (Expo Router)
    _layout.tsx   Providers, navigation, and which screens admins / viewers can open
    s/[token].tsx Viewer entry from a share link
  components/     Schedule and employee building blocks (WeekGrid, ShiftCard, InlineShiftForm, …)
  lib/
    schedule.ts   Scheduling rules: Morning/Night, availability, Copy Previous Week (no UI, unit tested)
    dates.ts      Date helpers and formats ("Mon, 6/8", "10:30am - 3pm")
    api.ts        Supabase reads and writes
    session.tsx   Admin login / viewer link / signed out
    staged.ts     Holds schedule edits until Done
  ui/             Shared UI (Button, Card, Select, TimeSelect, dialogs) and theme colors
supabase/
  schema.sql      Tables, Row Level Security, photo storage
docs/
  structure.md    Product spec
```

## Roadmap

- **Next:** run on iOS / Android (simulator, then devices) and replace the iOS wheel dropdowns.
- **Pro version:** self sign-up for managers and employees.
