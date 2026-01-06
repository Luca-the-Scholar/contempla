-- CRITICAL FIX: Allow deletion of ALL user-owned techniques
-- Previous migration may not have applied correctly

-- Step 1: Drop ALL existing DELETE policies on techniques table
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'techniques'
        AND cmd = 'DELETE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON techniques', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Create a single, simple DELETE policy
-- Uses authenticated user's ID, no restrictions on source_global_technique_id
CREATE POLICY "allow_delete_own_techniques"
ON techniques
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Step 3: Verify UPDATE policy is also unrestricted
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'techniques'
        AND cmd = 'UPDATE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON techniques', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "allow_update_own_techniques"
ON techniques
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 4: List current policies for verification
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'techniques'
ORDER BY cmd, policyname;
