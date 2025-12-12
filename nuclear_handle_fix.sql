-- NUCLEAR FIX FOR DUPLICATE HANDLES
-- 1. Fix Duplicates: Appends '_duplicate' to any existing duplicates so we can apply the constraint.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id, handle 
        FROM (
            SELECT id, handle, ROW_NUMBER() OVER(PARTITION BY lower(handle) ORDER BY created_at) as rn
            FROM profiles
            WHERE handle IS NOT NULL
        ) t
        WHERE rn > 1
    LOOP
        UPDATE profiles 
        SET handle = r.handle || '_' || substr(md5(random()::text), 1, 4)
        WHERE id = r.id;
    END LOOP;
END $$;

-- 2. Drop weak constraints
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_handle_key;

-- 3. Create STRONG Case-Insensitive Unique Index
-- This physically prevents any future duplicates, ever.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_lower_idx ON profiles (lower(handle));

-- 4. Verify RPC logic (Case Insensitive)
CREATE OR REPLACE FUNCTION check_handle(handle_str text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE lower(handle) = lower(handle_str)
    AND id != auth.uid()
  );
END;
$$;
