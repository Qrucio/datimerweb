-- REMOVE CHANNEL REQUIREMENT
-- Allow messages to exist with just a server_id (Server Chat) or dm_id (Direct Message).

-- 1. Drop the old check constraint that required channel_id
alter table public.messages drop constraint if exists check_target;

-- 2. Add new constraint: Must have (server_id OR dm_id)
alter table public.messages add constraint check_chat_target check (
    (server_id is not null) or 
    (dm_id is not null)
);

-- 3. Optional: Clean up old channel column references if creating new validation logic? 
-- No, keep the column for now to avoid breaking existing data, just make it nullable (it already is).
