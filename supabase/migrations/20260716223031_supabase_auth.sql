-- Applied to Supabase as migration version 20260716223031.
alter table public.users
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

alter table public.users
  drop column if exists password_hash;

create unique index if not exists users_auth_user_id_key
  on public.users (auth_user_id);

drop policy if exists "Enable read access for all users" on public.users;
drop policy if exists "Enable read access for all users" on public.notes;

drop policy if exists "Users can read their own profile" on public.users;
drop policy if exists "Users can update their own profile" on public.users;
drop policy if exists "Users can read their own notes" on public.notes;
drop policy if exists "Users can create their own notes" on public.notes;
drop policy if exists "Users can update their own notes" on public.notes;
drop policy if exists "Users can delete their own notes" on public.notes;

alter table public.users enable row level security;
alter table public.notes enable row level security;

revoke all on table public.users from anon;
revoke all on table public.notes from anon;
revoke all on table public.users from public;
revoke all on table public.notes from public;

grant select, update on table public.users to authenticated;
grant select, insert, update, delete on table public.notes to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy "Users can read their own profile"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = auth_user_id);

create policy "Users can update their own profile"
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = auth_user_id)
  with check ((select auth.uid()) = auth_user_id);

create policy "Users can read their own notes"
  on public.notes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users
      where users.id = notes.user_id
        and users.auth_user_id = (select auth.uid())
    )
  );

create policy "Users can create their own notes"
  on public.notes
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.users
      where users.id = notes.user_id
        and users.auth_user_id = (select auth.uid())
    )
  );

create policy "Users can update their own notes"
  on public.notes
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.users
      where users.id = notes.user_id
        and users.auth_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.users
      where users.id = notes.user_id
        and users.auth_user_id = (select auth.uid())
    )
  );

create policy "Users can delete their own notes"
  on public.notes
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.users
      where users.id = notes.user_id
        and users.auth_user_id = (select auth.uid())
    )
  );
