-- Add share_visibility column to sessions to capture privacy setting at creation time
-- This makes privacy non-retroactive: changing profile privacy doesn't affect old posts

-- Add column with default 'friends' (most common setting)
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS share_visibility TEXT NOT NULL DEFAULT 'friends';

-- Add check constraint to ensure valid values
ALTER TABLE public.sessions
ADD CONSTRAINT sessions_share_visibility_check
CHECK (share_visibility IN ('none', 'friends', 'all'));

-- Add index for efficient filtering in activity feed
CREATE INDEX IF NOT EXISTS idx_sessions_share_visibility
ON public.sessions (share_visibility, created_at DESC);

-- Add comment explaining the column
COMMENT ON COLUMN public.sessions.share_visibility IS
  'Privacy setting captured at session creation time. Values: none (hidden), friends (friends only), all (public). This makes privacy non-retroactive - changing profile privacy does not affect old sessions.';

-- Backfill existing sessions: set based on current user privacy setting
-- This is a one-time migration to give existing sessions a visibility level
UPDATE public.sessions s
SET share_visibility = COALESCE(p.share_sessions_in_feed, 'friends')
FROM public.profiles p
WHERE s.user_id = p.id
  AND s.share_visibility = 'friends'; -- Only update records that still have default

-- Note: After this migration, all new sessions will capture the user's privacy
-- setting at the moment of creation, stored directly on the session record.
