-- Fix RLS policies to allow deletion and editing of Global Library duplicates
-- Users should be able to delete/edit ANY technique they own, regardless of source

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Users can update their own editable techniques" ON public.techniques;
DROP POLICY IF EXISTS "Users can delete their own editable techniques" ON public.techniques;

-- Create new policies without the source_global_technique_id restriction
CREATE POLICY "Users can update their own techniques"
ON public.techniques
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own techniques"
ON public.techniques
FOR DELETE
USING (auth.uid() = user_id);

-- Rationale: Once a user duplicates a technique from Global Library to their personal library,
-- it becomes THEIR technique. They should have full control (edit/delete) over their copy.
-- The global library version remains unchanged.
