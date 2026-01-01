-- Add teacher_attribution to techniques table
ALTER TABLE techniques 
ADD COLUMN IF NOT EXISTS teacher_attribution VARCHAR(100);

COMMENT ON COLUMN techniques.teacher_attribution IS 
'Name of the teacher or tradition holder (e.g., "Sharon Salzberg"). Preserved when duplicating from Global Library.';