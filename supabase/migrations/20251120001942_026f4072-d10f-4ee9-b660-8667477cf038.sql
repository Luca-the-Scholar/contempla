-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create techniques table for user-generated meditations
CREATE TABLE public.techniques (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instructions TEXT NOT NULL,
  tradition TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table to track meditation history
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mastery_scores table with daily decay tracking
CREATE TABLE public.mastery_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
  mastery_score DECIMAL(5,2) DEFAULT 0.0 CHECK (mastery_score >= 0 AND mastery_score <= 100),
  last_practiced_at TIMESTAMP WITH TIME ZONE,
  last_decay_applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, technique_id)
);

-- Enable RLS
ALTER TABLE public.techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastery_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for techniques
CREATE POLICY "Users can view their own techniques"
  ON public.techniques FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own techniques"
  ON public.techniques FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own techniques"
  ON public.techniques FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own techniques"
  ON public.techniques FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for sessions
CREATE POLICY "Users can view their own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for mastery_scores
CREATE POLICY "Users can view their own mastery scores"
  ON public.mastery_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mastery scores"
  ON public.mastery_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mastery scores"
  ON public.mastery_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_techniques_updated_at
  BEFORE UPDATE ON public.techniques
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mastery_scores_updated_at
  BEFORE UPDATE ON public.mastery_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate mastery increase based on session duration
CREATE OR REPLACE FUNCTION calculate_mastery_increase(duration_minutes INTEGER)
RETURNS DECIMAL AS $$
BEGIN
  IF duration_minutes < 5 THEN
    RETURN 0;
  ELSIF duration_minutes >= 40 THEN
    RETURN 3.0;
  ELSE
    RETURN 1.5;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to apply daily decay to all mastery scores
CREATE OR REPLACE FUNCTION apply_daily_decay()
RETURNS void AS $$
BEGIN
  UPDATE public.mastery_scores
  SET 
    mastery_score = GREATEST(0, mastery_score - 0.5),
    last_decay_applied_at = NOW()
  WHERE 
    last_decay_applied_at < NOW() - INTERVAL '1 day'
    AND (last_practiced_at IS NULL OR last_practiced_at < NOW() - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update mastery after session
CREATE OR REPLACE FUNCTION update_mastery_after_session(
  p_user_id UUID,
  p_technique_id UUID,
  p_duration_minutes INTEGER
)
RETURNS void AS $$
DECLARE
  mastery_increase DECIMAL;
BEGIN
  mastery_increase := calculate_mastery_increase(p_duration_minutes);
  
  INSERT INTO public.mastery_scores (user_id, technique_id, mastery_score, last_practiced_at)
  VALUES (p_user_id, p_technique_id, mastery_increase, NOW())
  ON CONFLICT (user_id, technique_id) 
  DO UPDATE SET
    mastery_score = LEAST(100, public.mastery_scores.mastery_score + mastery_increase),
    last_practiced_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;