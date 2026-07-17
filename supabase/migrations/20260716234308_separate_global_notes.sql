-- Applied to Supabase as migration version 20260716234308.
-- Private account notes and public Global Notes intentionally use separate tables.
create table public.global_notes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id bigint not null references public.users(id) on delete cascade,
  title text not null,
  content text,
  constraint global_notes_title_length check (char_length(title) between 1 and 200),
  constraint global_notes_content_length check (content is null or char_length(content) <= 20000)
);

create index global_notes_user_id_idx on public.global_notes (user_id);

alter table public.global_notes enable row level security;

revoke all on table public.global_notes from public, anon;
grant select, insert, update, delete on table public.global_notes to authenticated;
grant usage, select on sequence public.global_notes_id_seq to authenticated;

create policy "Global notes are visible to signed-in users"
  on public.global_notes
  for select
  to authenticated
  using (true);

create policy "Users can create their own Global Notes"
  on public.global_notes
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.users
      where users.id = global_notes.user_id
        and users.auth_user_id = (select auth.uid())
    )
  );

create policy "Users can update their own Global Notes"
  on public.global_notes
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.users
      where users.id = global_notes.user_id
        and users.auth_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.users
      where users.id = global_notes.user_id
        and users.auth_user_id = (select auth.uid())
    )
  );

create policy "Users can delete their own Global Notes"
  on public.global_notes
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.users
      where users.id = global_notes.user_id
        and users.auth_user_id = (select auth.uid())
    )
  );
