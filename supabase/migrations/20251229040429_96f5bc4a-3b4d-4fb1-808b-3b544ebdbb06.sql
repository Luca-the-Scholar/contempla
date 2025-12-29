-- Migration: Add tips column to techniques tables
-- Created: 2024-12-28

-- Add tips to global_techniques table
ALTER TABLE public.global_techniques 
  ADD COLUMN IF NOT EXISTS tips TEXT;

-- Add tips to techniques table (My Library)
ALTER TABLE public.techniques 
  ADD COLUMN IF NOT EXISTS tips TEXT;

-- Add comment
COMMENT ON COLUMN public.global_techniques.tips IS 'Optional practice tips formatted as bullet list';
COMMENT ON COLUMN public.techniques.tips IS 'Optional practice tips formatted as bullet list';