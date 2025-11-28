
-- Update recalculate function to properly handle streaks from historical data
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
  prev_date date := NULL;
  duration_multiplier numeric;
  streak_bonus numeric;
  session_effective numeric;
BEGIN
  -- Process all sessions in chronological order to calculate streaks and effective minutes
  FOR session_rec IN
    SELECT id, duration_minutes, session_date::date as sess_date
    FROM public.sessions
    WHERE user_id = p_user_id AND technique_id = p_technique_id
    ORDER BY session_date ASC
  LOOP
    -- Calculate streak based on consecutive days
    IF prev_date IS NULL THEN
      current_streak := 1;
    ELSIF session_rec.sess_date = prev_date THEN
      -- Same day, keep streak (don't increment)
      NULL;
    ELSIF session_rec.sess_date = prev_date + 1 THEN
      -- Consecutive day, increment streak
      current_streak := current_streak + 1;
    ELSE
      -- Missed days, reset streak
      current_streak := 1;
    END IF;
    
    -- Calculate duration multiplier
    duration_multiplier := calculate_duration_multiplier(session_rec.duration_minutes);
    
    -- Calculate streak bonus (1.05^(streak-1) for streak >= 2)
    streak_bonus := calculate_streak_bonus(current_streak);
    
    -- Calculate effective minutes for this session
    session_effective := session_rec.duration_minutes * duration_multiplier * streak_bonus;
    
    -- Update the session's effective_minutes
    UPDATE public.sessions
    SET effective_minutes = session_effective
    WHERE id = session_rec.id;
    
    -- Add to total
    total_effective := total_effective + session_effective;
    
    -- Update prev_date only if this is a new day
    IF prev_date IS NULL OR session_rec.sess_date != prev_date THEN
      prev_date := session_rec.sess_date;
    END IF;
    
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

-- Also update add_manual_session to update the user's last meditation date correctly
CREATE OR REPLACE FUNCTION public.add_manual_session(p_user_id uuid, p_technique_id uuid, p_duration_minutes integer, p_session_date date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  duration_multiplier numeric;
  effective_mins numeric;
  session_id uuid;
BEGIN
  -- Calculate initial duration multiplier (streak will be recalculated)
  duration_multiplier := calculate_duration_multiplier(p_duration_minutes);
  effective_mins := p_duration_minutes * duration_multiplier;
  
  -- Insert session
  INSERT INTO public.sessions (user_id, technique_id, duration_minutes, effective_minutes, session_date, manual_entry)
  VALUES (p_user_id, p_technique_id, p_duration_minutes, effective_mins, p_session_date::timestamp with time zone, true)
  RETURNING id INTO session_id;
  
  -- Recalculate mastery from all sessions (this will recalculate streaks and effective minutes)
  PERFORM recalculate_technique_mastery(p_user_id, p_technique_id);
  
  -- Update last meditation date if this is the most recent session
  UPDATE public.profiles 
  SET last_meditation_date = GREATEST(COALESCE(last_meditation_date, p_session_date), p_session_date),
      consecutive_missed_days = CASE 
        WHEN p_session_date >= CURRENT_DATE - INTERVAL '1 day' THEN 0 
        ELSE consecutive_missed_days 
      END
  WHERE id = p_user_id;
  
  RETURN session_id;
END;
$$;
