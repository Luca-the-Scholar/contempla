
-- Fix the variable type in recalculate_technique_mastery (session_date_idx should be date, not integer)
CREATE OR REPLACE FUNCTION public.recalculate_technique_mastery(p_user_id uuid, p_technique_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_rec RECORD;
  total_effective numeric := 0;
  new_mastery numeric;
  last_session_date date;
  current_streak integer := 0;
  duration_multiplier numeric;
  streak_bonus numeric;
  session_effective numeric;
  global_dates date[];
  global_date date;  -- Fixed: was integer, should be date
  prev_global_date date := NULL;
BEGIN
  -- First, get ALL unique meditation dates across ALL techniques for this user (for global streak)
  SELECT ARRAY_AGG(DISTINCT session_date::date ORDER BY session_date::date ASC)
  INTO global_dates
  FROM public.sessions
  WHERE user_id = p_user_id;

  -- Process all sessions for THIS technique in chronological order
  FOR session_rec IN
    SELECT id, duration_minutes, session_date::date as sess_date
    FROM public.sessions
    WHERE user_id = p_user_id AND technique_id = p_technique_id
    ORDER BY session_date ASC
  LOOP
    -- Find the global streak up to this session's date
    -- Calculate streak by looking at consecutive days in global_dates up to sess_date
    current_streak := 0;
    prev_global_date := NULL;
    
    IF global_dates IS NOT NULL THEN
      FOREACH global_date IN ARRAY global_dates
      LOOP
        EXIT WHEN global_date > session_rec.sess_date;
        
        IF prev_global_date IS NULL THEN
          current_streak := 1;
        ELSIF global_date = prev_global_date + 1 THEN
          current_streak := current_streak + 1;
        ELSIF global_date > prev_global_date + 1 THEN
          -- Gap in days, reset streak
          current_streak := 1;
        END IF;
        -- Same day doesn't change streak
        
        IF global_date != prev_global_date THEN
          prev_global_date := global_date;
        END IF;
      END LOOP;
    ELSE
      current_streak := 1;
    END IF;
    
    -- Calculate duration multiplier
    duration_multiplier := calculate_duration_multiplier(session_rec.duration_minutes);
    
    -- Calculate streak bonus using global streak (exponential: 1.05^streak)
    streak_bonus := calculate_streak_bonus(current_streak);
    
    -- Calculate effective minutes for this session
    session_effective := session_rec.duration_minutes * duration_multiplier * streak_bonus;
    
    -- Update the session's effective_minutes
    UPDATE public.sessions
    SET effective_minutes = session_effective
    WHERE id = session_rec.id;
    
    -- Add to total
    total_effective := total_effective + session_effective;
    
    last_session_date := session_rec.sess_date;
  END LOOP;
  
  -- Calculate new mastery using logistic curve
  new_mastery := calculate_mastery_from_minutes(total_effective);
  
  -- Update or insert mastery score
  INSERT INTO public.mastery_scores (user_id, technique_id, mastery_score, cumulative_effective_minutes, last_practiced_at, streak)
  VALUES (p_user_id, p_technique_id, new_mastery, total_effective, last_session_date, current_streak)
  ON CONFLICT (user_id, technique_id) 
  DO UPDATE SET
    mastery_score = new_mastery,
    cumulative_effective_minutes = total_effective,
    last_practiced_at = last_session_date,
    streak = current_streak,
    updated_at = NOW();
  
  -- Record history point
  INSERT INTO public.mastery_history (user_id, technique_id, mastery_score, cumulative_effective_minutes, recorded_at)
  VALUES (p_user_id, p_technique_id, new_mastery, total_effective, NOW());
END;
$$;
