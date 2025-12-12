-- FIX RECURSIVE AUTH POLICIES (Final Solution)
-- We use SECURITY DEFINER functions to check membership. This bypasses the RLS recursion loop.

-- 1. Helper Function: Check DM Membership
create or replace function public.is_dm_member(_dm_id uuid, _user_id uuid)
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

-- 2. Helper Function: Check Server Membership
create or replace function public.is_server_member(_server_id uuid, _user_id uuid)
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

-- 3. Drop Broken/Recursive Policies
drop policy if exists "Participants can view other participants" on public.dm_participants;
drop policy if exists "Participants can view their DMs" on public.dm_conversations;
drop policy if exists "Server members can view channels" on public.channels;
drop policy if exists "Server admins/owners can insert channels" on public.channels;

-- 4. Create New SAFELY Non-Recursive Policies

-- DM Tables
create policy "View dm participants safely"
on public.dm_participants for select
using ( is_dm_member(dm_id, auth.uid()) );

create policy "View dm conversations safely"
on public.dm_conversations for select
using ( is_dm_member(id, auth.uid()) );

-- Channels Table
create policy "View channels safely"
on public.channels for select
using ( is_server_member(server_id, auth.uid()) );

create policy "Insert channels if admin"
on public.channels for insert
with check (
  exists (
    select 1 from public.server_members
    where server_id = channels.server_id
    and user_id = auth.uid()
    and role in ('owner', 'admin')
  )
);
