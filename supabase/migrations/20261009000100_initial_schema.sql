-- PC Build Bench initial Supabase schema.
-- Run in the Supabase SQL Editor or apply with the Supabase CLI.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    'user'
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
revoke all on function public.handle_new_user() from public, anon, authenticated;

create table if not exists public.components (
  id text primary key,
  category text not null check (category in ('CPU', 'Motherboard', 'RAM', 'GPU', 'Storage', 'PSU', 'Case')),
  name text not null,
  brand text not null,
  price numeric(12,2) not null default 0 check (price >= 0),
  power numeric(10,2) not null default 0 check (power >= 0),
  specs jsonb not null default '{}'::jsonb,
  source_url text,
  price_checked_at date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, name)
);
create index if not exists components_category_idx on public.components (category) where is_active;
create index if not exists components_name_idx on public.components (lower(name)) where is_active;

create table if not exists public.saved_builds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  budget numeric(12,2) not null default 80000 check (budget >= 0),
  workloads text[] not null default '{}',
  requirements jsonb not null default '{}'::jsonb,
  build_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists saved_builds_user_updated_idx on public.saved_builds (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists components_set_updated_at on public.components;
create trigger components_set_updated_at before update on public.components
for each row execute procedure public.set_updated_at();
drop trigger if exists saved_builds_set_updated_at on public.saved_builds;
create trigger saved_builds_set_updated_at before update on public.saved_builds
for each row execute procedure public.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

-- This function is used by the component-write policies. A user cannot promote
-- their own profile through the client because profiles has no client write policy.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.components enable row level security;
alter table public.saved_builds enable row level security;

-- Users may read only their own profile. Profile role changes are done by an administrator.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using ((select auth.uid()) = id);

-- The catalogue is readable by guests and signed-in users.
drop policy if exists "components_read_active" on public.components;
drop policy if exists "components_read_active_anon" on public.components;
drop policy if exists "components_read_active_authenticated" on public.components;
create policy "components_read_active_anon" on public.components
for select to anon
using (is_active = true);
create policy "components_read_active_authenticated" on public.components
for select to authenticated
using (is_active = true or (select public.is_admin()));

-- Only administrator profiles may modify the shared catalogue.
drop policy if exists "components_admin_insert" on public.components;
create policy "components_admin_insert" on public.components
for insert to authenticated
with check ((select public.is_admin()));
drop policy if exists "components_admin_update" on public.components;
create policy "components_admin_update" on public.components
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
drop policy if exists "components_admin_delete" on public.components;
create policy "components_admin_delete" on public.components
for delete to authenticated
using ((select public.is_admin()));

-- Saved configurations are private to their owner.
drop policy if exists "saved_builds_select_own" on public.saved_builds;
create policy "saved_builds_select_own" on public.saved_builds
for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "saved_builds_insert_own" on public.saved_builds;
create policy "saved_builds_insert_own" on public.saved_builds
for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists "saved_builds_update_own" on public.saved_builds;
create policy "saved_builds_update_own" on public.saved_builds
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "saved_builds_delete_own" on public.saved_builds;
create policy "saved_builds_delete_own" on public.saved_builds
for delete to authenticated
using ((select auth.uid()) = user_id);

-- Table privileges required by the browser Data API.
grant select on public.components to anon, authenticated;
grant insert, update, delete on public.components to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.saved_builds to authenticated;
