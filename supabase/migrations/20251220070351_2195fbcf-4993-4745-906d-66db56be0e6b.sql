-- Add SELECT policy for handle-based friend discovery
DROP POLICY IF EXISTS "Authenticated users can lookup by handle" ON public.profiles;

CREATE POLICY "Authenticated users can lookup by handle"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND handle IS NOT NULL
);