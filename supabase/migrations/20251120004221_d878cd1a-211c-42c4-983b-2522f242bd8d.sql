-- Update mastery function to handle streak calculation
CREATE OR REPLACE FUNCTION public.update_mastery_after_session(
  p_user_id uuid, 
  p_technique_id uuid, 
  p_duration_minutes integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mastery_increase DECIMAL;
  current_streak INTEGER;
  last_practice TIMESTAMP WITH TIME ZONE;
BEGIN
  mastery_increase := calculate_mastery_increase(p_duration_minutes);
  
  -- Get current streak and last practice date
  SELECT streak, last_practiced_at 
  INTO current_streak, last_practice
  FROM public.mastery_scores
  WHERE user_id = p_user_id AND technique_id = p_technique_id;
  
  -- Calculate new streak
  -- If no previous record or last practice was more than 2 days ago, reset to 1
  -- If last practice was yesterday or today, increment
  IF last_practice IS NULL THEN
    current_streak := 1;
  ELSIF last_practice < NOW() - INTERVAL '2 days' THEN
    current_streak := 1;
  ELSIF last_practice >= NOW() - INTERVAL '1 day' THEN
    current_streak := COALESCE(current_streak, 0) + 1;
  ELSE
    current_streak := COALESCE(current_streak, 1);
  END IF;
  
  INSERT INTO public.mastery_scores (user_id, technique_id, mastery_score, last_practiced_at, streak)
  VALUES (p_user_id, p_technique_id, mastery_increase, NOW(), current_streak)
  ON CONFLICT (user_id, technique_id) 
  DO UPDATE SET
    mastery_score = LEAST(100, public.mastery_scores.mastery_score + mastery_increase),
    last_practiced_at = NOW(),
    updated_at = NOW(),
    streak = current_streak;
END;
$$;

-- Add unique constraint to ensure one mastery record per user per technique
-- (This might already exist, but adding for safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'mastery_scores_user_technique_key'
  ) THEN
    ALTER TABLE public.mastery_scores 
    ADD CONSTRAINT mastery_scores_user_technique_key 
    UNIQUE (user_id, technique_id);
  END IF;
END
$$;