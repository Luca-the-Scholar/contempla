-- ============================================================
-- CLEANUP: Remove unused mastery SECURITY DEFINER functions
-- ============================================================
-- These functions are part of an unimplemented mastery score feature
-- and have been flagged as security vulnerabilities.

-- Step 1: Drop SECURITY DEFINER mastery functions (in dependency order)
-- apply_daily_decay depends on calculate functions but is never called
DROP FUNCTION IF EXISTS public.apply_daily_decay();

-- update_mastery_after_session is never called directly
DROP FUNCTION IF EXISTS public.update_mastery_after_session(uuid, uuid, integer);

-- recalculate_technique_mastery is called by add_manual_session (we'll update that)
DROP FUNCTION IF EXISTS public.recalculate_technique_mastery(uuid, uuid);

-- Step 2: Drop the helper functions (IMMUTABLE but also unused)
DROP FUNCTION IF EXISTS public.calculate_mastery_from_minutes(numeric);
DROP FUNCTION IF EXISTS public.calculate_mastery_increase(integer);
DROP FUNCTION IF EXISTS public.calculate_streak_bonus(integer);
DROP FUNCTION IF EXISTS public.calculate_duration_multiplier(integer);

-- Step 3: Recreate add_manual_session WITHOUT mastery calculations
-- This simplified version just inserts the session
CREATE OR REPLACE FUNCTION public.add_manual_session(
  p_user_id uuid, 
  p_technique_id uuid, 
  p_duration_minutes integer, 
  p_session_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_id uuid;
BEGIN
  -- Insert session (simplified - no mastery calculations)
  INSERT INTO public.sessions (
    user_id, 
    technique_id, 
    duration_minutes, 
    effective_minutes, 
    session_date, 
    manual_entry
  )
  VALUES (
    p_user_id, 
    p_technique_id, 
    p_duration_minutes, 
    p_duration_minutes, -- effective_minutes = duration_minutes (no multiplier)
    p_session_date::timestamp with time zone, 
    true
  )
  RETURNING id INTO session_id;
  
  -- Update last meditation date
  UPDATE public.profiles 
  SET 
    last_meditation_date = GREATEST(COALESCE(last_meditation_date, p_session_date), p_session_date),
    consecutive_missed_days = CASE 
      WHEN p_session_date >= CURRENT_DATE - INTERVAL '1 day' THEN 0 
      ELSE consecutive_missed_days 
    END
  WHERE id = p_user_id;
  
  RETURN session_id;
END;
$$;