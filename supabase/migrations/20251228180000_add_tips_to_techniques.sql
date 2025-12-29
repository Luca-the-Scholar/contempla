-- Add tips column to both techniques tables for practice guidance

-- Add tips column to global_techniques
ALTER TABLE public.global_techniques
  ADD COLUMN IF NOT EXISTS tips TEXT;

-- Add tips column to techniques (user's personal library)
ALTER TABLE public.techniques
  ADD COLUMN IF NOT EXISTS tips TEXT;
