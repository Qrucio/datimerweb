-- FIX RLS & POLICIES FOR PROFILES
-- Ensures profiles are publicly readable so availability checks work.

-- 1. Enable RLS (idempotent)
alter table public.profiles enable row level security;

-- 2. Drop existing restrictive policies (if any)
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- 3. Create permissive policies for standard social app behavior
-- READ: Everyone can see profiles (needed for availability check)
create policy "Public profiles are viewable by everyone"
on public.profiles for select
using ( true );

-- INSERT: Users can insert their own profile
create policy "Users can insert their own profile"
on public.profiles for insert
with check ( auth.uid() = id );

-- UPDATE: Users can update only their own profile
create policy "Users can update own profile"
on public.profiles for update
using ( auth.uid() = id );
