-- Allow authenticated users to view basic profile info for users who share publicly
-- This enables the "All" feed to show sessions from users with share_sessions_in_feed = 'all'

CREATE POLICY "Users can view public profiles"
ON public.profiles
FOR SELECT
USING (
  -- Users can view profiles of anyone who shares publicly
  share_sessions_in_feed = 'all'
);
