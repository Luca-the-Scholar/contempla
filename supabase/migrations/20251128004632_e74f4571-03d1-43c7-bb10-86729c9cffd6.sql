-- Create table for technique presets
CREATE TABLE public.technique_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  technique_id UUID NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 20,
  sound TEXT NOT NULL DEFAULT 'singing-bowl',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technique_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own presets"
ON public.technique_presets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own presets"
ON public.technique_presets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
ON public.technique_presets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
ON public.technique_presets
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_technique_presets_updated_at
BEFORE UPDATE ON public.technique_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_technique_presets_user_technique ON public.technique_presets(user_id, technique_id);