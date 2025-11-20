-- Fix security warnings by setting search_path for all functions

-- Drop and recreate update_updated_at_column with proper search_path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_techniques_updated_at
  BEFORE UPDATE ON public.techniques
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mastery_scores_updated_at
  BEFORE UPDATE ON public.mastery_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Drop and recreate calculate_mastery_increase with proper search_path
DROP FUNCTION IF EXISTS calculate_mastery_increase(INTEGER);
CREATE OR REPLACE FUNCTION calculate_mastery_increase(duration_minutes INTEGER)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF duration_minutes < 5 THEN
    RETURN 0;
  ELSIF duration_minutes >= 40 THEN
    RETURN 3.0;
  ELSE
    RETURN 1.5;
  END IF;
END;
$$;

-- Drop and recreate apply_daily_decay with proper search_path
DROP FUNCTION IF EXISTS apply_daily_decay();
CREATE OR REPLACE FUNCTION apply_daily_decay()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mastery_scores
  SET 
    mastery_score = GREATEST(0, mastery_score - 0.5),
    last_decay_applied_at = NOW()
  WHERE 
    last_decay_applied_at < NOW() - INTERVAL '1 day'
    AND (last_practiced_at IS NULL OR last_practiced_at < NOW() - INTERVAL '1 day');
END;
$$;

-- Drop and recreate update_mastery_after_session with proper search_path
DROP FUNCTION IF EXISTS update_mastery_after_session(UUID, UUID, INTEGER);
CREATE OR REPLACE FUNCTION update_mastery_after_session(
  p_user_id UUID,
  p_technique_id UUID,
  p_duration_minutes INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mastery_increase DECIMAL;
BEGIN
  mastery_increase := calculate_mastery_increase(p_duration_minutes);
  
  INSERT INTO public.mastery_scores (user_id, technique_id, mastery_score, last_practiced_at)
  VALUES (p_user_id, p_technique_id, mastery_increase, NOW())
  ON CONFLICT (user_id, technique_id) 
  DO UPDATE SET
    mastery_score = LEAST(100, public.mastery_scores.mastery_score + mastery_increase),
    last_practiced_at = NOW(),
    updated_at = NOW();
END;
$$;