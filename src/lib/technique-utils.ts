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
