/**
 * Migration script to fix session dates stored in UTC format
 * 
 * This script converts all session_date values from UTC ISO strings to local date strings.
 * Run this once after deploying the date-utils changes.
 * 
 * Usage:
 * 1. Import and call this function from a component or admin panel
 * 2. Or run it manually in the browser console after logging in
 */

import { supabase } from '@/integrations/supabase/client';
import { parseStoredDate, formatDateForStorage } from './date-utils';

export interface MigrationResult {
  success: boolean;
  totalSessions: number;
  updatedSessions: number;
  errors: string[];
}

/**
 * Migrate all session dates from UTC to local time format
 * 
 * This function:
 * 1. Fetches all sessions
 * 2. Parses each session_date (handling both UTC ISO and local formats)
 * 3. Converts to local date format
 * 4. Updates sessions that need changes
 */
export async function migrateSessionDates(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    totalSessions: 0,
    updatedSessions: 0,
    errors: [],
  };

  try {
    // Fetch all sessions
    const { data: sessions, error: fetchError } = await supabase
      .from('sessions')
      .select('id, session_date');

    if (fetchError) {
      result.errors.push(`Failed to fetch sessions: ${fetchError.message}`);
      return result;
    }

    if (!sessions || sessions.length === 0) {
      result.success = true;
      result.totalSessions = 0;
      return result;
    }

    result.totalSessions = sessions.length;

    // Process each session
    const updates: Array<{ id: string; newDate: string }> = [];

    for (const session of sessions) {
      try {
        // Parse the stored date (handles both UTC ISO and local formats)
        const parsedDate = parseStoredDate(session.session_date);
        
        // Format as local date (with time if it was present)
        const hasTime = session.session_date.includes('T');
        const newDate = formatDateForStorage(parsedDate, hasTime);
        
        // Only update if the date format changed
        if (newDate !== session.session_date) {
          updates.push({ id: session.id, newDate });
        }
      } catch (error) {
        result.errors.push(
          `Failed to process session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Batch update sessions
    if (updates.length > 0) {
      // Update in batches to avoid overwhelming the database
      const BATCH_SIZE = 50;
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        
        for (const update of batch) {
          const { error: updateError } = await supabase
            .from('sessions')
            .update({ session_date: update.newDate })
            .eq('id', update.id);

          if (updateError) {
            result.errors.push(
              `Failed to update session ${update.id}: ${updateError.message}`
            );
          } else {
            result.updatedSessions++;
          }
        }
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(
      `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return result;
  }
}

/**
 * Check if migration is needed by counting sessions with UTC dates
 */
export async function checkMigrationNeeded(): Promise<{
  needed: boolean;
  count: number;
  sample?: string;
}> {
  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('session_date')
      .limit(100);

    if (error || !sessions) {
      return { needed: false, count: 0 };
    }

    // Check if any sessions have UTC ISO format (ends with Z or has timezone offset)
    const utcSessions = sessions.filter(s => {
      const dateStr = s.session_date;
      return dateStr.includes('T') && (dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.includes('-', 10));
    });

    return {
      needed: utcSessions.length > 0,
      count: utcSessions.length,
      sample: utcSessions[0]?.session_date,
    };
  } catch {
    return { needed: false, count: 0 };
  }
}

