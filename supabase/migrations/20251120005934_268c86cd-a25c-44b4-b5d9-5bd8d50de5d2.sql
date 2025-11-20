-- Add tags field to techniques table
ALTER TABLE public.techniques 
ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Add comment explaining the tags
COMMENT ON COLUMN public.techniques.tags IS 'Array of predefined tags for grouping and connecting techniques (e.g., breathing, body-scan, visualization, concentration, loving-kindness)';