-- Add 'about' column to profiles if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'about') then
        alter table public.profiles add column about text;
    end if;
end $$;
