-- COMPLETE PROFILE SCHEMA FIX
-- Run this in the Supabase SQL Editor to fix 400 errors.

-- 1. Add 'about' column if missing
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'about') then
        alter table public.profiles add column about text;
    end if;
end $$;

-- 2. Add 'is_pro' column if missing
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'is_pro') then
        alter table public.profiles add column is_pro boolean default false;
    end if;
end $$;

-- 3. Add 'updated_at' column if missing
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'updated_at') then
        alter table public.profiles add column updated_at timestamptz default now();
    end if;
end $$;

-- 4. Add 'handle' unique constraint if missing
do $$
begin
    if not exists (select 1 from information_schema.constraint_column_usage where table_name = 'profiles' and constraint_name = 'profiles_handle_key') then
        alter table public.profiles add constraint profiles_handle_key unique (handle);
    end if;
end $$;
