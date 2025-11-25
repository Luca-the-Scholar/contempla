-- Create user roles table for admin functionality
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Global techniques table
CREATE TABLE public.global_techniques (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  instructions text NOT NULL,
  tradition text NOT NULL,
  tags text[] DEFAULT '{}',
  
  -- New fields for structured upload
  origin_story text,
  worldview_context text,
  lineage_info text,
  relevant_texts text[],
  external_links text[],
  home_region text,
  
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.global_techniques ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved techniques
CREATE POLICY "Anyone can view approved global techniques"
ON public.global_techniques
FOR SELECT
USING (approval_status = 'approved');

-- Users can view their own submitted techniques
CREATE POLICY "Users can view their own submissions"
ON public.global_techniques
FOR SELECT
USING (auth.uid() = submitted_by);

-- Users can submit new techniques
CREATE POLICY "Users can submit new techniques"
ON public.global_techniques
FOR INSERT
WITH CHECK (auth.uid() = submitted_by AND approval_status = 'pending');

-- Admins can view all techniques
CREATE POLICY "Admins can view all techniques"
ON public.global_techniques
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update techniques (for approval)
CREATE POLICY "Admins can update techniques"
ON public.global_techniques
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Conversations table for direct messaging
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_one uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_two uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(participant_one, participant_two),
  CHECK (participant_one < participant_two)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations
CREATE POLICY "Users can view their own conversations"
ON public.conversations
FOR SELECT
USING (auth.uid() = participant_one OR auth.uid() = participant_two);

-- Users can create conversations
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

-- Messages table
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their conversations
CREATE POLICY "Users can view their own messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id
      AND (participant_one = auth.uid() OR participant_two = auth.uid())
  )
);

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id
      AND (participant_one = auth.uid() OR participant_two = auth.uid())
  )
);

-- Users can mark messages as read
CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id
      AND (participant_one = auth.uid() OR participant_two = auth.uid())
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Function to update conversation timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Trigger to update conversation timestamp on new message
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- Function to get or create conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id uuid;
  user_one uuid;
  user_two uuid;
BEGIN
  -- Ensure consistent ordering
  IF auth.uid() < other_user_id THEN
    user_one := auth.uid();
    user_two := other_user_id;
  ELSE
    user_one := other_user_id;
    user_two := auth.uid();
  END IF;

  -- Try to find existing conversation
  SELECT id INTO conv_id
  FROM public.conversations
  WHERE participant_one = user_one AND participant_two = user_two;

  -- Create if doesn't exist
  IF conv_id IS NULL THEN
    INSERT INTO public.conversations (participant_one, participant_two)
    VALUES (user_one, user_two)
    RETURNING id INTO conv_id;
  END IF;

  RETURN conv_id;
END;
$$;