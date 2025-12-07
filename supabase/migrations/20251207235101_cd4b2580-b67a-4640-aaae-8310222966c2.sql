-- Convert boolean privacy fields to text for granular visibility control
-- Change show_streak_to_friends from boolean to text
ALTER TABLE public.profiles 
  ALTER COLUMN show_streak_to_friends DROP DEFAULT,
  ALTER COLUMN show_streak_to_friends TYPE text USING 
    CASE 
      WHEN show_streak_to_friends = true THEN 'friends'
      WHEN show_streak_to_friends = false THEN 'private'
      ELSE 'friends'
    END,
  ALTER COLUMN show_streak_to_friends SET DEFAULT 'friends';

-- Change show_techniques_to_friends from boolean to text
ALTER TABLE public.profiles 
  ALTER COLUMN show_techniques_to_friends DROP DEFAULT,
  ALTER COLUMN show_techniques_to_friends TYPE text USING 
    CASE 
      WHEN show_techniques_to_friends = true THEN 'friends'
      WHEN show_techniques_to_friends = false THEN 'private'
      ELSE 'friends'
    END,
  ALTER COLUMN show_techniques_to_friends SET DEFAULT 'friends';

-- Change show_practice_history from boolean to text
ALTER TABLE public.profiles 
  ALTER COLUMN show_practice_history DROP DEFAULT,
  ALTER COLUMN show_practice_history TYPE text USING 
    CASE 
      WHEN show_practice_history = true THEN 'friends'
      WHEN show_practice_history = false THEN 'private'
      ELSE 'friends'
    END,
  ALTER COLUMN show_practice_history SET DEFAULT 'friends';