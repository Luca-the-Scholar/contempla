ALTER TABLE public.global_techniques
  ADD COLUMN IF NOT EXISTS relevant_link TEXT;

COMMENT ON COLUMN public.global_techniques.relevant_link IS 'Optional URL to source material (book, article, video, website)';