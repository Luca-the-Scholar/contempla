-- Allow authenticated users to view profiles where share_sessions_in_feed = 'all'
-- This enables the "All" feed in Community tab to show public sessions

CREATE POLICY "Allow viewing public profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (share_sessions_in_feed = 'all');