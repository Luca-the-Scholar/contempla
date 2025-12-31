-- Update RLS policies on techniques table to enforce read-only for Global Library saved techniques

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own techniques" ON public.techniques;

-- Create new UPDATE policy that only allows updates on user-created techniques (not saved from Global Library)
CREATE POLICY "Users can update their own editable techniques" 
ON public.techniques 
FOR UPDATE 
USING (auth.uid() = user_id AND source_global_technique_id IS NULL);

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Users can delete their own techniques" ON public.techniques;

-- Create new DELETE policy that only allows deletes on user-created techniques (not saved from Global Library)
CREATE POLICY "Users can delete their own editable techniques" 
ON public.techniques 
FOR DELETE 
USING (auth.uid() = user_id AND source_global_technique_id IS NULL);