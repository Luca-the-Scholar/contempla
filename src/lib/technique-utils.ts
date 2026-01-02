/**
 * Utility functions for formatting and handling meditation techniques
 */

interface TechniqueWithAttribution {
  name: string;
  teacher_attribution?: string | null;
}

/**
 * Formats a technique name with its attribution if available
 * @param technique - Technique object with name and optional teacher_attribution
 * @returns Formatted string like "Name as practiced by Teacher" or just "Name"
 */
export function formatTechniqueName(technique: TechniqueWithAttribution): string {
  if (technique.teacher_attribution) {
    return `${technique.name} as practiced by ${technique.teacher_attribution}`;
  }
  return technique.name;
}

/**
 * Checks if a technique was saved from the Global Library (read-only)
 * @param technique - Technique object with optional source_global_technique_id
 * @returns true if technique is from Global Library and should be read-only
 */
export function isGlobalLibraryTechnique(technique: { source_global_technique_id?: string | null }): boolean {
  return !!technique.source_global_technique_id;
}

import { supabase } from "@/integrations/supabase/client";

/**
 * Submits a personal technique to the Global Library for admin review
 * @param techniqueId - The ID of the technique to submit
 * @param userId - The ID of the user submitting the technique
 * @returns The created global_techniques record
 */
export async function submitTechniqueToGlobalLibrary(techniqueId: string, userId: string) {
  // 1. Fetch the technique from user's personal library
  const { data: technique, error: fetchError } = await supabase
    .from('techniques')
    .select('*')
    .eq('id', techniqueId)
    .eq('user_id', userId)
    .single();
    
  if (fetchError || !technique) {
    throw new Error('Technique not found');
  }
  
  // 2. Validate required fields (frontend validates too, but double-check)
  if (!technique.name || !technique.teacher_attribution || !technique.instructions) {
    throw new Error('Missing required fields: name, teacher_attribution, and instructions are required');
  }
  
  // 3. Check if already submitted (prevent duplicates)
  const { data: existing } = await supabase
    .from('global_techniques')
    .select('id')
    .eq('submitted_by', userId)
    .eq('name', technique.name)
    .maybeSingle();
    
  if (existing) {
    throw new Error('You have already submitted a technique with this name');
  }
  
  // 4. Insert into global_techniques table with approval_status pending
  const { data: submission, error: submitError } = await supabase
    .from('global_techniques')
    .insert({
      name: technique.name,
      teacher_attribution: technique.teacher_attribution,
      origin_story: technique.description || null,
      instructions: technique.instructions,
      tips: technique.tips || null,
      tradition: technique.tradition || null,
      lineage_info: technique.lineage_info || null,
      relevant_link: technique.relevant_link || null,
      tags: technique.tags || [],
      submitted_by: userId,
      approval_status: 'pending'
    })
    .select()
    .single();
    
  if (submitError) {
    throw new Error('Failed to submit technique: ' + submitError.message);
  }
  
  return submission;
}
