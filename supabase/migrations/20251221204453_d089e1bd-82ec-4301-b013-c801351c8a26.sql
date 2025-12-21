-- Create spotify_settings table for storing user Spotify configuration
CREATE TABLE public.spotify_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  selected_playlist_id TEXT,
  selected_playlist_name TEXT,
  play_on_meditation_start BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.spotify_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own spotify settings" 
ON public.spotify_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own spotify settings" 
ON public.spotify_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spotify settings" 
ON public.spotify_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spotify settings" 
ON public.spotify_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_spotify_settings_updated_at
BEFORE UPDATE ON public.spotify_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();