-- Add teacher_attribution column to global_techniques
ALTER TABLE public.global_techniques
  ADD COLUMN IF NOT EXISTS teacher_attribution TEXT;

COMMENT ON COLUMN public.global_techniques.teacher_attribution IS 'Person or source who should be credited for this technique. Required for proper attribution.';