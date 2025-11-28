-- Add fields to track global library source and original author
ALTER TABLE public.techniques
ADD COLUMN source_global_technique_id uuid REFERENCES public.global_techniques(id) ON DELETE SET NULL,
ADD COLUMN original_author_name text;

-- Add index for faster lookups
CREATE INDEX idx_techniques_source_global ON public.techniques(source_global_technique_id) WHERE source_global_technique_id IS NOT NULL;