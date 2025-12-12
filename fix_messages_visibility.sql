-- FIX MESSAGE VISIBILITY & POLICIES (Comprehensive)

-- 1. Ensure Helper Function Exists (idempotent)
create or replace function public.check_server_access(_server_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.server_members
    where server_id = _server_id
    and user_id = _user_id
  );
$$;

create or replace function public.check_dm_access(_dm_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dm_participants
    where dm_id = _dm_id
    and user_id = _user_id
  );
$$;

-- 2. Ensure Messages has server_id (Schema Fix)
alter table public.messages 
add column if not exists server_id uuid references public.servers(id) on delete cascade;

-- 3. AUTO-FIX: Backfill server_id for any messages that have channel_id but missing server_id
-- (This fixes messages sent by older frontend versions or during bugs)
update public.messages m
set server_id = c.server_id
from public.channels c
where m.channel_id = c.id
and m.server_id is null;

-- 4. Reset Policies on Messages (Clean Slate)
drop policy if exists "View messages if authorized" on public.messages;
drop policy if exists "Send messages if authorized" on public.messages;
drop policy if exists "View messages direct" on public.messages;
drop policy if exists "Send messages direct" on public.messages;
drop policy if exists "View messages safely" on public.messages;

-- 5. Create Final, Simple Policies
create policy "View messages final"
on public.messages for select
using (
    (server_id is not null and check_server_access(server_id, auth.uid()))
    or
    (dm_id is not null and check_dm_access(dm_id, auth.uid()))
);

create policy "Insert messages final"
on public.messages for insert
with check (
    (server_id is not null and check_server_access(server_id, auth.uid()))
    or
    (dm_id is not null and check_dm_access(dm_id, auth.uid()))
);

-- 6. Grant Permissions (Just in case)
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all functions in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
