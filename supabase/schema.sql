-- ShiftManager Lite — database schema.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
--
-- Access model
--   Admin  : a Supabase Auth user. One store per admin (stores.admin_user_id is unique). Full read/write.
--   Viewer : no login. The app sends the store's share token in the `x-share-token` request header.
--            Read-only access to that one store. Regenerating the token revokes old links.
--
-- Dates are 'YYYY-MM-DD' (date), times 'HH:MM' (text). Weekday keys: sun mon tue wed thu fri sat.

-- Supabase installs pgcrypto in the `extensions` schema, so its functions are called as extensions.*.
create extension if not exists pgcrypto with schema extensions;

-- ─── Tables ────────────────────────────────────────────────────────────────

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  share_token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  -- { "sun": { "isOpen": true, "open": "11:00", "close": "20:00", "breakStart"?: "15:00", "breakEnd"?: "16:00" }, ... }
  -- breakStart/breakEnd on a day override break_time for that day.
  open_hours jsonb not null default '{}',
  -- { "start": "15:00", "end": "16:00" } or {} for no break
  break_time jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null
);

create table public.shift_types (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  start_time text not null check (start_time ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  end_type text not null check (end_type in ('breakTime', 'closing', 'custom')),
  end_time text check (end_time is null or end_time ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  check (end_type <> 'custom' or end_time is not null)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  photo_path text,
  -- { "mon": { "available": true, "allDay": false, "shiftTypeId": "<uuid>" }, ... }
  availability jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.employee_unavailability (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  date date not null,
  reason text not null default '',
  unique (employee_id, date)
);

create table public.store_unavailability (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  date date not null,
  reason text not null default '',
  unique (store_id, date)
);

create table public.shift_assignments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  shift_type_id uuid not null references public.shift_types (id) on delete cascade,
  role_id uuid references public.roles (id) on delete set null,
  date date not null,
  unique (employee_id, shift_type_id, date)
);
create index shift_assignments_store_date on public.shift_assignments (store_id, date);

-- ─── Access helpers ────────────────────────────────────────────────────────

-- Share token sent by viewers, or '' when absent.
create or replace function public.request_share_token() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-share-token', '')
$$;

create or replace function public.is_store_admin(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from stores where id = sid and admin_user_id = auth.uid())
$$;

create or replace function public.can_view_store(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from stores
    where id = sid and (admin_user_id = auth.uid() or share_token = public.request_share_token())
  )
$$;

-- Admin only: issue a new share token, invalidating the old link.
create or replace function public.regenerate_share_token() returns text
language sql volatile security invoker set search_path = public as $$
  update stores set share_token = encode(extensions.gen_random_bytes(12), 'hex')
  where admin_user_id = auth.uid()
  returning share_token
$$;

-- ─── Row Level Security ────────────────────────────────────────────────────

alter table public.stores enable row level security;
-- Checks the row's own columns (not can_view_store), so INSERT … RETURNING can see the row it just created.
create policy "stores: view" on public.stores for select
  using (admin_user_id = auth.uid() or share_token = public.request_share_token());
create policy "stores: admin creates own" on public.stores for insert with check (admin_user_id = auth.uid());
create policy "stores: admin updates" on public.stores for update using (admin_user_id = auth.uid())
  with check (admin_user_id = auth.uid());
create policy "stores: admin deletes" on public.stores for delete using (admin_user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['roles', 'shift_types', 'employees', 'employee_unavailability',
                           'store_unavailability', 'shift_assignments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s: view" on public.%I for select using (public.can_view_store(store_id))', t, t);
    execute format('create policy "%s: admin writes" on public.%I for all using (public.is_store_admin(store_id))
                    with check (public.is_store_admin(store_id))', t, t);
  end loop;
end $$;

-- ─── Photo storage ─────────────────────────────────────────────────────────
-- Public bucket; files live at <store_id>/<random>.jpg so only the store's admin can write them.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Storage needs a select policy for the admin too: deletes and listings only see rows the user can select.
create policy "photos: admin reads" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.is_store_admin(((storage.foldername(name))[1])::uuid));
create policy "photos: admin writes" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_store_admin(((storage.foldername(name))[1])::uuid));
create policy "photos: admin updates" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and public.is_store_admin(((storage.foldername(name))[1])::uuid));
create policy "photos: admin deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_store_admin(((storage.foldername(name))[1])::uuid));
