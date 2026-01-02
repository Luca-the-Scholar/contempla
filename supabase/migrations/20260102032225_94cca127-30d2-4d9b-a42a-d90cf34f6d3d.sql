-- Add optional fields to techniques table for Global Library parity
ALTER TABLE techniques 
ADD COLUMN IF NOT EXISTS lineage_info TEXT,
ADD COLUMN IF NOT EXISTS relevant_link TEXT;

COMMENT ON COLUMN techniques.lineage_info IS 
'Relevant texts, books, or sources (e.g., "Full Catastrophe Living by Jon Kabat-Zinn")';

COMMENT ON COLUMN techniques.relevant_link IS 
'URL to external resources about this technique';