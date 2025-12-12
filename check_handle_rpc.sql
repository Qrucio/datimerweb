-- RPC Function to check handle availability securely
-- Run this in Supabase SQL Editor

-- Drop first to ensure clean state
drop function if exists check_handle;

create or replace function check_handle(handle_str text)
returns boolean
language plpgsql
security definer -- Bypass RLS
set search_path = public -- Secure search path
as $$
declare
  is_available boolean;
begin
  -- Returns TRUE if handle is available (not taken by anyone else)
  -- Returns FALSE if taken
  
  -- Force exact match check (lowercase)
  select not exists (
    select 1 from profiles
    where lower(handle) = lower(handle_str)
    and id != auth.uid() -- Ignore self
  ) into is_available;
  
  return is_available;
end;
$$;
