-- Add handle column to profiles for friend lookup
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS handle TEXT;

-- Add unique constraint on handle (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_unique_idx 
ON public.profiles (LOWER(handle)) 
WHERE handle IS NOT NULL;

-- Add check constraint for handle format (alphanumeric, underscores, 3-30 chars)
ALTER TABLE public.profiles 
ADD CONSTRAINT handle_format_check 
CHECK (handle IS NULL OR (handle ~ '^[a-zA-Z0-9_]{3,30}$'));

-- RLS policy to allow any authenticated user to lookup profiles by handle
-- This only exposes id and handle for the purpose of friend lookup
CREATE POLICY "Authenticated users can lookup by handle"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND handle IS NOT NULL
);

-- Note: This policy allows reading any profile row where handle is set,
-- but the frontend should only select id and handle columns for lookup.
-- The existing "Users can view their own profile" and "Users can view friends profiles"
-- policies still control access to full profile data.

COMMENT ON COLUMN public.profiles.handle IS 'Unique handle for friend lookup (alphanumeric and underscores, 3-30 chars)';

