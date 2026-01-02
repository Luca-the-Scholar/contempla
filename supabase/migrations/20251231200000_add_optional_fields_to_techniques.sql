-- Add optional fields to techniques table to match Global Library schema

-- Add lineage_info column (for source/relevant text field)
ALTER TABLE public.techniques
  ADD COLUMN IF NOT EXISTS lineage_info TEXT;

COMMENT ON COLUMN public.techniques.lineage_info IS 'Source text, book reference, or lineage information for the technique';

-- Add relevant_link column (for URL to external resources)
ALTER TABLE public.techniques
  ADD COLUMN IF NOT EXISTS relevant_link TEXT;

COMMENT ON COLUMN public.techniques.relevant_link IS 'Optional URL to source material (book, article, video, website)';
