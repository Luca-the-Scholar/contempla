-- Add handle column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN handle text;

-- Add unique constraint
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_handle_unique UNIQUE (handle);

-- Add length validation (3-30 characters) - only validates non-null values
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_handle_length CHECK (
  handle IS NULL OR (char_length(handle) >= 3 AND char_length(handle) <= 30)
);

-- Refresh the schema cache so PostgREST picks up the new column
NOTIFY pgrst, 'reload schema';