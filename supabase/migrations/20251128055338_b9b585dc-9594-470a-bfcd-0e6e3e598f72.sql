
-- Update streak bonus to use linear formula: 1.0 + 0.05 × streak_days
-- Day 1 = 1.05, Day 2 = 1.10, Day 3 = 1.15, etc.
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
    -- Linear: 1.0 + 0.05 × streak_days
    RETURN 1.0 + (0.05 * streak_days);
  END IF;
END;
$$;
