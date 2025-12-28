-- Step 1: Drop the overly permissive policy that exposes all profile data
DROP POLICY IF EXISTS "Authenticated users can lookup by handle" ON public.profiles;

-- Step 2: Create a public_profiles VIEW exposing only safe, non-sensitive columns
-- This view only includes profiles that have a handle set
CREATE VIEW public.public_profiles AS
SELECT 
  id,
  handle,
  name,
  created_at
FROM public.profiles
WHERE handle IS NOT NULL;

-- Step 3: Enable RLS on the view
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Step 4: Grant SELECT on the view to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Step 5: Create a security definer function to safely lookup profiles by handle
-- This avoids RLS recursion issues when querying the view
CREATE OR REPLACE FUNCTION public.lookup_profile_by_handle(lookup_handle text)
RETURNS TABLE (
  id uuid,
  handle text,
  name text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.handle, p.name, p.created_at
  FROM public.profiles p
  WHERE p.handle = lookup_handle
    AND p.handle IS NOT NULL;
$$;