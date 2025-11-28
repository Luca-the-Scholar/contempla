
-- Create mastery_history table for tracking progression over time
CREATE TABLE IF NOT EXISTS public.mastery_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  technique_id uuid NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
  mastery_score numeric NOT NULL,
  cumulative_effective_minutes numeric NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mastery_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own mastery history" 
ON public.mastery_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mastery history" 
ON public.mastery_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_mastery_history_user_technique ON public.mastery_history(user_id, technique_id, recorded_at DESC);

-- Update duration multiplier function with new formula
CREATE OR REPLACE FUNCTION public.calculate_duration_multiplier(duration_minutes integer)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  slope numeric := (1.8 - 1.0) / 29.0;
BEGIN
  IF duration_minutes <= 30 THEN
    RETURN 1.0;
  ELSE
    -- multiplier = 1 + slope × (minutes - 30), no cap
    RETURN 1.0 + slope * (duration_minutes - 30);
  END IF;
END;
$$;

-- Update mastery calculation to use logistic growth curve
-- mastery = 100 / (1 + exp(-(E - M_mid) / k))
-- M_mid = 50000, k = 9000
CREATE OR REPLACE FUNCTION public.calculate_mastery_from_minutes(cumulative_minutes numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  m_mid numeric := 50000;
  k numeric := 9000;
BEGIN
  RETURN 100.0 / (1.0 + exp(-1.0 * (cumulative_minutes - m_mid) / k));
END;
$$;

-- Calculate streak bonus (1.05^(streak_days - 1) for streak >= 2, else 1.0)
CREATE OR REPLACE FUNCTION public.calculate_streak_bonus(streak_days integer)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF streak_days < 2 THEN
    RETURN 1.0;
  ELSE
    RETURN POWER(1.05, streak_days - 1);
  END IF;
END;
$$;

-- Update apply_daily_decay with new formula
-- daily_decay = base_decay × (1 - mastery/100)^2.5
-- minimum floor of 0.0025%
-- compound by 1.10x per consecutive missed day
CREATE OR REPLACE FUNCTION public.apply_daily_decay()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_rec RECORD;
  mastery_rec RECORD;
  base_decay_rate numeric := 0.5;
  actual_decay_rate numeric;
  decay_floor numeric := 0.0025;
  missed_days_multiplier numeric;
  new_cumulative numeric;
  new_mastery numeric;
BEGIN
  -- First, update consecutive_missed_days for users who didn't meditate yesterday
  UPDATE public.profiles
  SET consecutive_missed_days = consecutive_missed_days + 1
  WHERE last_meditation_date IS NULL 
     OR last_meditation_date < CURRENT_DATE - INTERVAL '1 day';

  -- Apply decay to each technique for users who missed meditation
  FOR user_rec IN 
    SELECT id, consecutive_missed_days 
    FROM public.profiles 
    WHERE last_meditation_date IS NULL 
       OR last_meditation_date < CURRENT_DATE
  LOOP
    -- Calculate missed days multiplier (1.10 compound per day)
    missed_days_multiplier := POWER(1.10, GREATEST(0, user_rec.consecutive_missed_days - 1));
    
    FOR mastery_rec IN
      SELECT id, mastery_score, cumulative_effective_minutes
      FROM public.mastery_scores
      WHERE user_id = user_rec.id
        AND mastery_score > 0
        AND (last_decay_applied_at IS NULL OR last_decay_applied_at < CURRENT_DATE)
    LOOP
      -- Calculate decay: daily_decay = base_decay × (1 - mastery/100)^2.5
      actual_decay_rate := base_decay_rate * POWER(1.0 - mastery_rec.mastery_score / 100.0, 2.5);
      
      -- Apply minimum floor
      actual_decay_rate := GREATEST(actual_decay_rate, decay_floor);
      
      -- Apply missed days multiplier
      actual_decay_rate := actual_decay_rate * missed_days_multiplier;
      
      -- Apply decay to mastery score directly
      new_mastery := GREATEST(0, mastery_rec.mastery_score * (1.0 - actual_decay_rate / 100.0));
      
      -- Reverse-calculate cumulative minutes from new mastery
      -- From: mastery = 100 / (1 + exp(-(E - 50000) / 9000))
      -- Solve for E: E = 50000 - 9000 * ln((100/mastery) - 1)
      IF new_mastery > 0.001 THEN
        new_cumulative := 50000 - 9000 * LN((100.0 / new_mastery) - 1);
        new_cumulative := GREATEST(0, new_cumulative);
      ELSE
        new_cumulative := 0;
      END IF;
      
      UPDATE public.mastery_scores
      SET 
        mastery_score = new_mastery,
        cumulative_effective_minutes = new_cumulative,
        last_decay_applied_at = CURRENT_DATE
      WHERE id = mastery_rec.id;
    END LOOP;
  END LOOP;
END;
$$;

-- Update mastery after session with streak bonus
CREATE OR REPLACE FUNCTION public.update_mastery_after_session(p_user_id uuid, p_technique_id uuid, p_duration_minutes integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  duration_multiplier numeric;
  streak_bonus numeric;
  effective_mins numeric;
  current_cumulative numeric;
  new_mastery numeric;
  current_streak integer;
  last_practice date;
BEGIN
  -- Calculate duration multiplier
  duration_multiplier := calculate_duration_multiplier(p_duration_minutes);
  
  -- Get current streak and last practice date
  SELECT streak, last_practiced_at::date INTO current_streak, last_practice
  FROM public.mastery_scores
  WHERE user_id = p_user_id AND technique_id = p_technique_id;
  
  current_streak := COALESCE(current_streak, 0);
  
  -- Update streak based on last practice
  IF last_practice IS NULL THEN
    current_streak := 1;
  ELSIF last_practice = CURRENT_DATE THEN
    -- Same day, keep streak (already counted)
    NULL;
  ELSIF last_practice = CURRENT_DATE - 1 THEN
    -- Consecutive day, increment streak
    current_streak := current_streak + 1;
  ELSE
    -- Missed days, reset streak
    current_streak := 1;
  END IF;
  
  -- Calculate streak bonus for this session
  streak_bonus := calculate_streak_bonus(current_streak);
  
  -- Calculate effective minutes
  effective_mins := p_duration_minutes * duration_multiplier * streak_bonus;
  
  -- Get current cumulative
  SELECT cumulative_effective_minutes INTO current_cumulative
  FROM public.mastery_scores
  WHERE user_id = p_user_id AND technique_id = p_technique_id;
  
  current_cumulative := COALESCE(current_cumulative, 0) + effective_mins;
  
  -- Calculate new mastery
  new_mastery := calculate_mastery_from_minutes(current_cumulative);
  
  -- Upsert mastery score
  INSERT INTO public.mastery_scores (user_id, technique_id, mastery_score, cumulative_effective_minutes, last_practiced_at, streak)
  VALUES (p_user_id, p_technique_id, new_mastery, current_cumulative, NOW(), current_streak)
  ON CONFLICT (user_id, technique_id) 
  DO UPDATE SET
    mastery_score = new_mastery,
    cumulative_effective_minutes = current_cumulative,
    last_practiced_at = NOW(),
    streak = current_streak,
    updated_at = NOW();
  
  -- Record history
  INSERT INTO public.mastery_history (user_id, technique_id, mastery_score, cumulative_effective_minutes, recorded_at)
  VALUES (p_user_id, p_technique_id, new_mastery, current_cumulative, NOW());
    
  -- Update user's last meditation date and reset consecutive missed days
  UPDATE public.profiles 
  SET last_meditation_date = CURRENT_DATE, consecutive_missed_days = 0
  WHERE id = p_user_id;
END;
$$;

-- Update manual session function with streak bonus
CREATE OR REPLACE FUNCTION public.add_manual_session(p_user_id uuid, p_technique_id uuid, p_duration_minutes integer, p_session_date date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  duration_multiplier numeric;
  streak_bonus numeric;
  effective_mins numeric;
  session_id uuid;
  session_streak integer;
BEGIN
  -- Calculate duration multiplier
  duration_multiplier := calculate_duration_multiplier(p_duration_minutes);
  
  -- For manual entries, we calculate streak at the time of the session date
  -- This is simplified - for full retroactive streak calculation, we'd need more complex logic
  streak_bonus := 1.0; -- Default no bonus for manual entries (simplified)
  
  -- Calculate effective minutes
  effective_mins := p_duration_minutes * duration_multiplier * streak_bonus;
  
  -- Insert session
  INSERT INTO public.sessions (user_id, technique_id, duration_minutes, effective_minutes, session_date, manual_entry)
  VALUES (p_user_id, p_technique_id, p_duration_minutes, effective_mins, p_session_date::timestamp with time zone, true)
  RETURNING id INTO session_id;
  
  -- Recalculate mastery from all sessions
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

-- Update recalculate function to use new formulas
CREATE OR REPLACE FUNCTION public.recalculate_technique_mastery(p_user_id uuid, p_technique_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_effective numeric;
  new_mastery numeric;
  last_session_date date;
  current_streak integer;
BEGIN
  -- Sum all effective minutes for this technique
  SELECT COALESCE(SUM(
    CASE 
      WHEN effective_minutes > 0 THEN effective_minutes
      ELSE duration_minutes * calculate_duration_multiplier(duration_minutes)
    END
  ), 0)
  INTO total_effective
  FROM public.sessions
  WHERE user_id = p_user_id AND technique_id = p_technique_id;
  
  -- Calculate new mastery using logistic curve
  new_mastery := calculate_mastery_from_minutes(total_effective);
  
  -- Get latest session date
  SELECT session_date::date INTO last_session_date
  FROM public.sessions
  WHERE user_id = p_user_id AND technique_id = p_technique_id
  ORDER BY session_date DESC
  LIMIT 1;
  
  -- Update or insert mastery score
  INSERT INTO public.mastery_scores (user_id, technique_id, mastery_score, cumulative_effective_minutes, last_practiced_at, streak)
  VALUES (p_user_id, p_technique_id, new_mastery, total_effective, last_session_date, 1)
  ON CONFLICT (user_id, technique_id) 
  DO UPDATE SET
    mastery_score = new_mastery,
    cumulative_effective_minutes = total_effective,
    updated_at = NOW();
  
  -- Record history point
  INSERT INTO public.mastery_history (user_id, technique_id, mastery_score, cumulative_effective_minutes, recorded_at)
  VALUES (p_user_id, p_technique_id, new_mastery, total_effective, NOW());
END;
$$;
