-- Add description field to techniques table
ALTER TABLE public.techniques
ADD COLUMN description TEXT;

-- Make instructions and tradition nullable (they are currently NOT NULL)
ALTER TABLE public.techniques
ALTER COLUMN instructions DROP NOT NULL,
ALTER COLUMN tradition DROP NOT NULL;

-- Add comment explaining the description field
COMMENT ON COLUMN public.techniques.description IS 'Optional short description or summary of the meditation technique';
