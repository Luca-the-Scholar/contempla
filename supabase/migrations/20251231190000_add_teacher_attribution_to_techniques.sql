-- Add teacher_attribution column to techniques table
-- This field stores who created/taught the meditation technique (e.g., "Sharon Salzberg", "Jon Kabat-Zinn")

ALTER TABLE public.techniques
  ADD COLUMN IF NOT EXISTS teacher_attribution TEXT;

COMMENT ON COLUMN public.techniques.teacher_attribution IS 'The teacher or person who created/taught this meditation technique (e.g., Sharon Salzberg, Jon Kabat-Zinn, etc.)';
