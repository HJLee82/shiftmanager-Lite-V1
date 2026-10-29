# shiftmanager-Lite-V1

Employee shift scheduling for one store per manager. Expo (React Native) + Supabase: runs on the web now, iOS/Android later from the same code.
Spec: [docs/structure.md](docs/structure.md).

## Supabase setup (once)

1. **SQL Editor → New query**: paste [supabase/schema.sql](supabase/schema.sql) and **Run**.
2. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up" (Lite is invite only).
3. **Authentication → Users → Add user → Create new user**: email + password for each manager, with "Auto Confirm User" on.
   On first login the manager names their store.

## Run

```bash
npm install
cp .env.example .env.local   # set the Supabase URL and publishable key
npm run web                  # or: npm start, then press i / a for iOS / Android
```

Staff open the **viewer link** from Settings → Store (read-only, no login).

## Check

```bash
npm test          # scheduling rules
npm run typecheck
npm run lint
```
