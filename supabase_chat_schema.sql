-- CHAT FEATURE SCHEMA

-- 1. CHANNELS TABLE (For Server Chats)
create table public.channels (
    id uuid default gen_random_uuid() primary key,
    server_id uuid references public.servers(id) on delete cascade not null,
    name text not null,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by uuid references auth.users(id)
);

-- 2. DM CONVERSATIONS (For Direct Messages)
create table public.dm_conversations (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. DM PARTICIPANTS (Linking Users to DMs)
create table public.dm_participants (
    dm_id uuid references public.dm_conversations(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (dm_id, user_id)
);

-- 4. MESSAGES TABLE (Unified for both Servers and DMs)
create table public.messages (
    id uuid default gen_random_uuid() primary key,
    content text, -- Encrypted content could be stored here if client-side encryption is used, but for now standard text
    sender_id uuid references auth.users(id) not null,
    channel_id uuid references public.channels(id) on delete cascade, -- Null if DM
    dm_id uuid references public.dm_conversations(id) on delete cascade, -- Null if Channel
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    constraint check_target check (
        (channel_id is not null and dm_id is null) or 
        (channel_id is null and dm_id is not null)
    )
);

-- 5. ENABLE RLS
alter table public.channels enable row level security;
alter table public.dm_conversations enable row level security;
alter table public.dm_participants enable row level security;
alter table public.messages enable row level security;

-- 6. RLS POLICIES

-- CHANNELS: Visible if you are a member of the server
create policy "Server members can view channels"
on public.channels for select
using (
    exists (
        select 1 from public.server_members
        where server_members.server_id = channels.server_id
        and server_members.user_id = auth.uid()
    )
);

create policy "Server admins/owners can insert channels"
on public.channels for insert
with check (
    exists (
        select 1 from public.server_members
        where server_members.server_id = channels.server_id
        and server_members.user_id = auth.uid()
        and server_members.role in ('owner', 'admin')
    )
);

-- DM CONVERSATIONS: Visible if you are a participant
create policy "Participants can view their DMs"
on public.dm_conversations for select
using (
    exists (
        select 1 from public.dm_participants
        where dm_participants.dm_id = dm_conversations.id
        and dm_participants.user_id = auth.uid()
    )
);

create policy "Users can create DMs"
on public.dm_conversations for insert
with check (true); 

-- DM PARTICIPANTS: Visible if you are in the DM
create policy "Participants can view other participants"
on public.dm_participants for select
using (
    exists (
        select 1 from public.dm_participants as my_p
        where my_p.dm_id = dm_participants.dm_id
        and my_p.user_id = auth.uid()
    )
);

create policy "Users can add participants to DMs"
on public.dm_participants for insert
with check (
    -- Allow self-insert (joining) or creating (logic usually handled by server or strict client flow)
    true 
);

-- MESSAGES:
-- Select:
-- 1. If Channel Message: Must be member of Server
-- 2. If DM Message: Must be participant of DM
create policy "View messages if authorized"
on public.messages for select
using (
    (channel_id is not null and exists (
        select 1 from public.server_members sm
        join public.channels c on c.id = messages.channel_id
        where sm.server_id = c.server_id
        and sm.user_id = auth.uid()
    ))
    or
    (dm_id is not null and exists (
        select 1 from public.dm_participants dp
        where dp.dm_id = messages.dm_id
        and dp.user_id = auth.uid()
    ))
);

-- Insert:
-- Similar logic
create policy "Send messages if authorized"
on public.messages for insert
with check (
    (channel_id is not null and exists (
        select 1 from public.server_members sm
        join public.channels c on c.id = messages.channel_id
        where sm.server_id = c.server_id
        and sm.user_id = auth.uid()
    ))
    or
    (dm_id is not null and exists (
        select 1 from public.dm_participants dp
        where dp.dm_id = messages.dm_id
        and dp.user_id = auth.uid()
    ))
);

-- 7. REALTIME SETUP (Supabase Realtime)
-- You typically need to enable replication for these tables in the dashboard or via SQL:
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table channels;
alter publication supabase_realtime add table dm_conversations;
