-- FIX RLS RECURSION/COMPLEXITY ISSUE
-- We use a SECURITY DEFINER function to read the channel's server_id without triggering the Channels table RLS.
-- This breaks the chain: Messages -> Channels (RLS) -> Server_Members (RLS)

-- 1. Create Helper Function
create or replace function get_channel_server_id(c_id uuid)
returns uuid
language sql
security definer
set search_path = public -- Secure the search path
as $$
  select server_id from public.channels where id = c_id;
$$;

-- 2. Drop Old Policies
drop policy if exists "View messages if authorized" on public.messages;
drop policy if exists "Send messages if authorized" on public.messages;

-- 3. Create Optimized Policies
create policy "View messages if authorized"
on public.messages for select
using (
    (channel_id is not null and exists (
        select 1 from public.server_members sm
        where sm.server_id = get_channel_server_id(channel_id) -- Use function
        and sm.user_id = auth.uid()
    ))
    or
    (dm_id is not null and exists (
        select 1 from public.dm_participants dp
        where dp.dm_id = dm_id
        and dp.user_id = auth.uid()
    ))
);

create policy "Send messages if authorized"
on public.messages for insert
with check (
    (channel_id is not null and exists (
        select 1 from public.server_members sm
        where sm.server_id = get_channel_server_id(channel_id) -- Use function
        and sm.user_id = auth.uid()
    ))
    or
    (dm_id is not null and exists (
        select 1 from public.dm_participants dp
        where dp.dm_id = dm_id
        and dp.user_id = auth.uid()
    ))
);
