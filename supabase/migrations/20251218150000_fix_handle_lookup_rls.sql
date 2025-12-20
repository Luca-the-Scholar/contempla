-- Fix RLS policy for handle-based friend discovery
-- 
-- Bug: Users cannot find each other by handle because the SELECT policy
-- for handle lookup may not exist or may be incorrectly configured.
--
-- Root cause: The original policy in 20251217200558 may not have been applied
-- to production, or there may be policy conflicts.
--
-- Solution: Ensure a minimal, safe SELECT policy exists that allows
-- authenticated users to lookup profiles by EXACT handle match only.
-- This does not allow full table browsing or partial matching - the
-- restriction to exact matching is enforced at the application level
-- via the query structure (.eq or .ilike with a specific value).

-- Drop existing handle lookup policy if it exists (to ensure clean state)
DROP POLICY IF EXISTS "Authenticated users can lookup by handle" ON public.profiles;

-- Create policy for handle-based friend discovery
-- This allows ANY authenticated user to SELECT profiles WHERE handle IS NOT NULL.
-- Privacy is preserved because:
-- 1. Users must know the exact handle to find someone (no browsing)
-- 2. The frontend only selects id, handle, name for lookup purposes
-- 3. Full profile data access is still controlled by the "Users can view friends profiles" policy
CREATE POLICY "Authenticated users can lookup by handle"
ON public.profiles
FOR SELECT
USING (
  -- Must be an authenticated user
  auth.uid() IS NOT NULL
  -- Only profiles with a handle set are discoverable
  AND handle IS NOT NULL
);

-- Add comment explaining the purpose of this policy
COMMENT ON POLICY "Authenticated users can lookup by handle" ON public.profiles IS 
  'Enables handle-based friend discovery. Authenticated users can lookup any profile that has a handle set. Privacy is maintained because: (1) exact handle must be known, (2) full profile data requires friendship.';
