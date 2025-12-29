-- Add teacher_attribution column to global_techniques table
-- This field tracks who taught the practitioner this technique
-- Essential for proper attribution and tracking transmission pathways

ALTER TABLE public.global_techniques
  ADD COLUMN IF NOT EXISTS teacher_attribution TEXT;

COMMENT ON COLUMN public.global_techniques.teacher_attribution IS 'Teacher, course, or source where the practitioner learned this technique. Essential for tracking transmission and giving proper credit.';
