-- OPTIMIZATION: Denormalize server_id to avoid RLS recursion
-- This replaces the complex join with a direct check.

-- 1. Add server_id to messages
alter table public.messages 
add column if not exists server_id uuid references public.servers(id) on delete cascade;

-- 2. Backfill existing messages (if any)
update public.messages m
set server_id = c.server_id
from public.channels c
where m.channel_id = c.id
and m.server_id is null;

-- 3. Drop Old Policies (Aggressively to be sure)
drop policy if exists "View messages if authorized" on public.messages;
drop policy if exists "Send messages if authorized" on public.messages;
-- Also drop the function if it exists, to clean up
drop function if exists get_channel_server_id(uuid);


-- 4. Create DIRECT Simplistic Policies
create policy "View messages direct"
on public.messages for select
using (
    (server_id is not null and exists (
        select 1 from public.server_members sm
        where sm.server_id = messages.server_id -- Direct match
        and sm.user_id = auth.uid()
    ))
    or
    (dm_id is not null and exists (
        select 1 from public.dm_participants dp
        where dp.dm_id = messages.dm_id
        and dp.user_id = auth.uid()
    ))
);

create policy "Send messages direct"
on public.messages for insert
with check (
    -- For Insert, we just trust the server_id being passed is valid for the user
    (server_id is not null and exists (
        select 1 from public.server_members sm
        where sm.server_id = messages.server_id
        and sm.user_id = auth.uid()
    ))
    or
    (dm_id is not null and exists (
        select 1 from public.dm_participants dp
        where dp.dm_id = messages.dm_id
        and dp.user_id = auth.uid()
    ))
);
