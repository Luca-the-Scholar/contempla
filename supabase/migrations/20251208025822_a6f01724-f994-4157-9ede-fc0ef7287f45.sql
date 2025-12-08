-- Add privacy setting for sharing sessions in feed
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS share_sessions_in_feed text NOT NULL DEFAULT 'friends';

-- Create table for session kudos (likes)
CREATE TABLE public.session_kudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Enable RLS on session_kudos
ALTER TABLE public.session_kudos ENABLE ROW LEVEL SECURITY;

-- Users can view kudos on sessions they can see (their own or friends')
CREATE POLICY "Users can view kudos"
ON public.session_kudos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_kudos.session_id
    AND (
      s.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
        AND ((f.user_id = auth.uid() AND f.friend_id = s.user_id)
          OR (f.friend_id = auth.uid() AND f.user_id = s.user_id))
      )
    )
  )
);

-- Users can add kudos to sessions they can see
CREATE POLICY "Users can give kudos"
ON public.session_kudos
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.id = session_kudos.session_id
    AND s.user_id != auth.uid()
    AND (
      p.share_sessions_in_feed = 'all'
      OR (p.share_sessions_in_feed = 'friends' AND EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
        AND ((f.user_id = auth.uid() AND f.friend_id = s.user_id)
          OR (f.friend_id = auth.uid() AND f.user_id = s.user_id))
      ))
    )
  )
);

-- Users can remove their own kudos
CREATE POLICY "Users can remove their kudos"
ON public.session_kudos
FOR DELETE
USING (auth.uid() = user_id);

-- Add policy for users to view friends' public profiles
CREATE POLICY "Users can view friends profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
    AND ((f.user_id = auth.uid() AND f.friend_id = profiles.id)
      OR (f.friend_id = auth.uid() AND f.user_id = profiles.id))
  )
);

-- Update sessions policy to allow friends to view based on privacy settings
CREATE POLICY "Friends can view shared sessions"
ON public.sessions
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.friendships f ON f.status = 'accepted'
    WHERE p.id = sessions.user_id
    AND (
      (p.share_sessions_in_feed = 'all')
      OR (p.share_sessions_in_feed = 'friends' AND (
        (f.user_id = auth.uid() AND f.friend_id = sessions.user_id)
        OR (f.friend_id = auth.uid() AND f.user_id = sessions.user_id)
      ))
    )
  )
);