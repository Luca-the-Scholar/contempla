
-- Update mastery formula: M_mid = 25000, k = 6000 for faster early progress (~1.1% per hour at start)
CREATE OR REPLACE FUNCTION public.calculate_mastery_from_minutes(cumulative_minutes numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  m_mid numeric := 25000;
  k numeric := 6000;
BEGIN
  RETURN 100.0 / (1.0 + exp(-1.0 * (cumulative_minutes - m_mid) / k));
END;
$$;

-- Update streak bonus to exponential: 1.05^streak_days
-- Day 1 = 1.05, Day 2 = 1.1025, Day 7 = ~1.407
CREATE OR REPLACE FUNCTION public.calculate_streak_bonus(streak_days integer)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF streak_days < 1 THEN
    RETURN 1.0;
  ELSE
    -- Exponential: 1.05^streak_days
    RETURN POWER(1.05, streak_days);
  END IF;
END;
$$;
