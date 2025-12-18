-- Add hidden_from_feed column to sessions for soft-hide functionality
-- This allows users to hide sessions from the activity feed without deleting data
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS hidden_from_feed BOOLEAN NOT NULL DEFAULT false;

-- Add index for efficient filtering in activity feed queries
CREATE INDEX IF NOT EXISTS idx_sessions_hidden_from_feed 
ON public.sessions (hidden_from_feed) 
WHERE hidden_from_feed = false;

COMMENT ON COLUMN public.sessions.hidden_from_feed IS 'When true, session is hidden from activity feed but preserved for analytics';

