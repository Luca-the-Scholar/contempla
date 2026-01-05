-- Migration 1: Allow admins to delete global technique duplicates
CREATE POLICY "Admins can delete global techniques"
ON public.global_techniques
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Migration 2: Add share_visibility column to sessions for per-session privacy
-- This tracks the user's privacy setting at the time the session was created
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS share_visibility TEXT DEFAULT 'inherit';

COMMENT ON COLUMN public.sessions.share_visibility IS 
'Privacy setting at session creation: inherit (use profile setting), all (public), friends_only, or none (private)';