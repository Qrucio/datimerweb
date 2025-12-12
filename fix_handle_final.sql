-- FINAL HANDLE FIX & LOCKDOWN
-- This script fixes "Hidden" duplicates caused by spaces (e.g. "qrucio " vs "qrucio")

-- 1. TRIM Whitespace from all handles
UPDATE profiles SET handle = trim(handle);

-- 2. RESOLVE DUPLICATES (Aggressive)
-- Finds any handles that are identical when lowercased (and trimmed)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id, handle 
        FROM (
            SELECT id, handle, ROW_NUMBER() OVER(PARTITION BY lower(trim(handle)) ORDER BY created_at) as rn
            FROM profiles
            WHERE handle IS NOT NULL AND trim(handle) != ''
        ) t
        WHERE rn > 1
    LOOP
        -- Rename duplicate to handle_duplicate_XXXX
        UPDATE profiles 
        SET handle = r.handle || '_dup_' || substr(md5(random()::text), 1, 4)
        WHERE id = r.id;
    END LOOP;
END $$;

-- 3. DROP weak indexes/constraints
DROP INDEX IF EXISTS profiles_handle_lower_idx;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_handle_key;

-- 4. CREATE THE IRONCLAD CONSTRAINT
-- This prevents ANY duplicates (case-insensitive, trimmed)
CREATE UNIQUE INDEX profiles_handle_unique_idx ON profiles (lower(trim(handle)));

-- 5. REFRESH RPC (Ensure it checks against the cleaned data)
CREATE OR REPLACE FUNCTION check_handle(handle_str text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Returns TRUE if available
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE lower(trim(handle)) = lower(trim(handle_str))
    AND id != auth.uid()
  );
END;
$$;
