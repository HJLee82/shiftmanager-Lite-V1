# ShiftManager Lite

Employee shift scheduling for a single store. The manager (admin) builds the weekly schedule; staff view it through a private link.

Built with **Expo (React Native) + Supabase**. Web first; iOS and Android builds come later from the same codebase.

- Full spec: [docs/structure.md](docs/structure.md)
- Database schema and access rules: [supabase/schema.sql](supabase/schema.sql)

## Features

| Area | What it does |
|---|---|
| **Dashboard** | This week's schedule, who is available today (admin only), shortcuts |
| **Weekly schedule** | Mon–Sun grid split into Morning and Night; tap a day for details |
| **Daily schedule** | Add, edit and delete shifts in place; unavailable employees shown first in bold red; Copy Previous Week; edits are saved together with **Done** |
| **Monthly schedule** | Month calendar with shift chips; tap a date to edit that week below |
| **Employees** (admin only) | List, detail, add and edit: photo, weekly availability (a shift or All Day), unavailable dates |
| **Settings** (admin only) | Store name and viewer link, open hours, break time, shift hours, store closed dates, roles |

### Who can do what

| | Admin (manager) | Viewer (staff) |
|---|---|---|
| Access | Email + password (invite only) | Private share link, no login |
| View schedules | ✅ | ✅ (reload for the latest) |
| Employees pages | ✅ | ❌ |
| Add / edit / delete anything | ✅ | ❌ |
| Settings | ✅ | ❌ |

One admin account owns one store. Permissions are enforced in the database (Supabase Row Level Security), not only by hiding buttons. Regenerating the viewer link in Settings stops the old link from working.

### Scheduling rules

- **Available** = the store is open, the employee's weekly availability covers that period, and they have no unavailable date. Everyone else can still be assigned from the **Others** list.
- **Copy Previous Week** copies from 7 days earlier. If the target already has shifts, it asks to **Replace** or **Merge**, and it reports what it skipped (store closed, employee unavailable).
- The role is chosen for each assigned shift and shown as a letter in a circle.
- Shift cards are blue for Morning and purple for Night. Morning shifts that run to closing (for example 3pm - closing) are inverted: solid blue with light text.
- In Night, people who didn't work that Morning are listed first, inverted: solid purple with light text.

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

On phone browsers (under 700px wide) screens switch to a phone layout: bottom tabs, one day per row in schedules, stacked forms. **Add to Home Screen** installs it as "Shifts" (`public/manifest.json`).

> The native iOS / Android apps are not tested yet. On iOS, dropdowns currently appear as wheel pickers.

## Test

```bash
npm test           # unit tests for the scheduling rules (Vitest)
npm run typecheck  # TypeScript
npm run lint       # ESLint (Expo config)
```

## Deploy

The web app is hosted on EAS Hosting at **https://shiftmanager-lite.expo.app** (Expo account `hjlee82`). The Supabase values in `.env.local` are built into the bundle.

```bash
npx expo export -p web               # build to dist/
npx eas-cli@latest deploy --prod     # upload and make it the live version
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
public/          Web page template, home-screen manifest and icons
supabase/
  schema.sql      Tables, Row Level Security, photo storage
docs/
  structure.md    Product spec
```

## Roadmap

- **Next:** run on iOS / Android (simulator, then devices) and replace the iOS wheel dropdowns.
- **Pro version:** self sign-up for managers and employees.
