-- Fix handle_new_user function to properly handle both OAuth and email/password signups
-- Google OAuth provides: full_name, name, email, avatar_url
-- Email/password signup provides: name (set by frontend)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name TEXT;
BEGIN
  -- Try to get name from various possible metadata fields
  -- Google OAuth uses 'full_name', email/password uses 'name'
  display_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'email',
    'User'
  );
  
  -- Insert profile with the display name
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, display_name)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Creates a profile for new users. Handles both OAuth (Google uses full_name) and email/password (uses name) signups.';