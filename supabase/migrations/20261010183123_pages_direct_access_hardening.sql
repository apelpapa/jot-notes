-- Static Pages + direct Supabase access. No user data is deleted.
-- Keep the restored July migrations unchanged; they are already applied.
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
alter default privileges for role postgres in schema app_private
  revoke execute on functions from public;

create or replace function public.provision_profile(
  p_auth_user_id uuid, p_email text, p_first_name text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  email_name text := split_part(coalesce(p_email, ''), '@', 1);
  safe_name text := left(regexp_replace(lower(email_name), '[^a-z0-9_-]', '', 'g'), 32);
begin
  insert into public.users (auth_user_id, username, first_name, email, theme_preference, autosave)
  values (
    p_auth_user_id,
    coalesce(nullif(safe_name, ''), 'user') || '_' || replace(p_auth_user_id::text, '-', ''),
    left(coalesce(nullif(btrim(p_first_name), ''), nullif(email_name, ''), 'User'), 80),
    p_email, 'light', false
  ) on conflict (auth_user_id) do nothing;
end;
$$;
create or replace function public.handle_auth_user_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.provision_profile(new.id, new.email, new.raw_user_meta_data ->> 'first_name');
  return new;
end;
$$;
create or replace function public.handle_auth_user_email_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.users set email = new.email where auth_user_id = new.id;
  return new;
end;
$$;
revoke execute on function public.provision_profile(uuid,text,text),
  public.handle_auth_user_created(), public.handle_auth_user_email_changed()
  from public, anon, authenticated;
grant execute on function public.provision_profile(uuid,text,text),
  public.handle_auth_user_created(), public.handle_auth_user_email_changed() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_auth_user_created();
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_auth_user_email_changed();

-- Provision profiles omitted by the old Express-only setup; preserve existing profiles.
select public.provision_profile(id, email, raw_user_meta_data ->> 'first_name')
  from auth.users where not exists (
    select 1 from public.users u where u.auth_user_id = auth.users.id
  );

create or replace function public.current_profile_id()
returns bigint language sql stable security invoker set search_path = '' as $$
  select id from public.users where auth_user_id = (select auth.uid());
$$;
revoke execute on function public.current_profile_id() from public, anon;
grant execute on function public.current_profile_id() to authenticated, service_role;
alter table public.notes alter column user_id set default public.current_profile_id();
alter table public.global_notes alter column user_id set default public.current_profile_id();
create index if not exists notes_user_id_idx on public.notes(user_id);

alter table public.notes drop constraint if exists notes_title_length;
alter table public.notes add constraint notes_title_length
  check (char_length(btrim(title)) between 1 and 200) not valid;
alter table public.notes drop constraint if exists notes_content_length;
alter table public.notes add constraint notes_content_length
  check (content is null or char_length(content) <= 20000) not valid;
alter table public.global_notes drop constraint if exists global_notes_title_length;
alter table public.global_notes add constraint global_notes_title_length
  check (char_length(btrim(title)) between 1 and 200) not valid;
alter table public.users drop constraint if exists users_first_name_length;
alter table public.users add constraint users_first_name_length
  check (first_name is null or char_length(first_name) <= 80) not valid;
alter table public.users drop constraint if exists users_theme_preference;
alter table public.users add constraint users_theme_preference
  check (theme_preference is null or theme_preference in ('light','dark')) not valid;

alter table public.users enable row level security;
alter table public.notes enable row level security;
alter table public.global_notes enable row level security;

-- Table revocation alone leaves explicit column grants behind; remove both.
revoke all on table public.users, public.notes, public.global_notes from public, anon, authenticated;
revoke all (id,created_at,username,first_name,last_name,email,avatar,theme_preference,autosave,auth_user_id)
  on public.users from public, anon, authenticated;
revoke all (id,created_at,user_id,title,content)
  on public.notes from public, anon, authenticated;
revoke all (id,created_at,user_id,title,content)
  on public.global_notes from public, anon, authenticated;

grant select on public.users to authenticated;
grant update (first_name,theme_preference) on public.users to authenticated;
grant select, delete on public.notes to authenticated;
grant insert (title,content), update (title,content) on public.notes to authenticated;
grant select (id,created_at,title,content) on public.global_notes to anon, authenticated;
grant insert (title,content), update (title,content) on public.global_notes to authenticated;
grant delete on public.global_notes to authenticated;

revoke all on all sequences in schema public from public, anon, authenticated;
do $$
declare seq text; tbl text;
begin
  foreach tbl in array array['public.notes','public.global_notes'] loop
    seq := pg_get_serial_sequence(tbl, 'id');
    if seq is not null then execute format('grant usage on sequence %s to authenticated', seq); end if;
  end loop;
end;
$$;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

drop policy if exists "Global notes are visible to signed-in users" on public.global_notes;
drop policy if exists "Global notes are visible to everyone" on public.global_notes;
create policy "Global notes are visible to everyone" on public.global_notes
  for select to anon, authenticated using (true);

-- A separate, unexposed ledger survives deletion of public posts. Thus deleting
-- a post or backdating its created_at cannot reset the publishing allowance.
create table if not exists app_private.publication_events (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null
);
create index if not exists publication_events_user_time_idx
  on app_private.publication_events(auth_user_id,created_at);
alter table app_private.publication_events enable row level security;
revoke all on app_private.publication_events from public, anon, authenticated, service_role;

create or replace function app_private.enforce_note_limits()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  owner_id uuid;
  api_role text := current_setting('role', true);
  inserted_at timestamptz := clock_timestamp();
begin
  -- Serialize all insertions for an account, including multi-row requests.
  select auth_user_id into owner_id from public.users
    where id = new.user_id for update;
  if not found or owner_id is null then
    raise exception using errcode = 'P0001', message = 'Your account profile is unavailable.';
  end if;
  if api_role in ('anon','authenticated') and (actor is null or owner_id is distinct from actor) then
    raise exception using errcode = '42501', message = 'You cannot create notes for another account.';
  end if;

  if tg_table_name = 'notes' then
    if (select count(*) from public.notes where user_id = new.user_id) >= 1000 then
      raise exception using errcode = 'P0001',
        message = 'Your account has reached 1,000 private notes. Delete a note before adding another.';
    end if;
  elsif tg_table_name = 'global_notes' then
    delete from app_private.publication_events
      where auth_user_id = owner_id and created_at <= inserted_at - interval '24 hours';
    if (select count(*) from app_private.publication_events
        where auth_user_id = owner_id and created_at > inserted_at - interval '10 minutes') >= 10 then
      raise exception using errcode = 'P0001',
        message = 'You can publish 10 Global Notes every 10 minutes. Please try again later.';
    end if;
    if (select count(*) from app_private.publication_events where auth_user_id = owner_id) >= 100 then
      raise exception using errcode = 'P0001',
        message = 'You can publish 100 Global Notes in 24 hours. Please try again later.';
    end if;
    insert into app_private.publication_events(auth_user_id,created_at) values (owner_id,inserted_at);
  else
    raise exception 'Unsupported note table';
  end if;
  new.created_at := inserted_at;
  new.title := btrim(new.title);
  return new;
end;
$$;
revoke execute on function app_private.enforce_note_limits() from public, anon, authenticated, service_role;
drop trigger if exists enforce_note_limits on public.notes;
create trigger enforce_note_limits before insert on public.notes
  for each row execute function app_private.enforce_note_limits();
drop trigger if exists enforce_note_limits on public.global_notes;
create trigger enforce_note_limits before insert on public.global_notes
  for each row execute function app_private.enforce_note_limits();
notify pgrst, 'reload schema';
