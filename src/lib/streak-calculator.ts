import { format } from "date-fns";

/**
 * Calculate current meditation streak from session dates
 *
 * A streak is the number of consecutive days (including today or yesterday)
 * that the user has completed at least one meditation session.
 *
 * Rules:
 * - Streak starts from most recent session
 * - Must practice today OR yesterday to have an active streak
 * - Counts consecutive calendar days with at least 1 session
 * - Uses local timezone for "day" boundaries
 * - Stops counting at first gap (missing day)
 *
 * @param dates - Array of session date strings (any format that Date can parse)
 * @returns Current streak count (0 if broken)
 */
export function calculateStreakFromDates(dates: string[]): number {
  console.log('[Streak Calculator] Input dates:', dates.length);

  if (dates.length === 0) {
    console.log('[Streak Calculator] No sessions, streak = 0');
    return 0;
  }

  // Get unique calendar dates (remove duplicates, format as YYYY-MM-DD)
  const uniqueDates = new Set(
    dates.map(dateStr => {
      const date = new Date(dateStr);
      return format(date, "yyyy-MM-dd");
    })
  );

  console.log('[Streak Calculator] Unique dates:', Array.from(uniqueDates).sort().reverse().slice(0, 10));

  // Calculate today and yesterday in local timezone
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), "yyyy-MM-dd");

  console.log('[Streak Calculator] Today:', today, '| Yesterday:', yesterday);
  console.log('[Streak Calculator] Has today?', uniqueDates.has(today), '| Has yesterday?', uniqueDates.has(yesterday));

  // Check if practiced today or yesterday (grace period)
  // If last session was 2+ days ago, streak is broken
  if (!uniqueDates.has(today) && !uniqueDates.has(yesterday)) {
    console.log('[Streak Calculator] Last session was 2+ days ago, streak = 0');
    return 0;
  }

  // Count backwards from most recent day (today or yesterday)
  let streak = 0;
  let checkDate = uniqueDates.has(today) ? new Date() : new Date(Date.now() - 24 * 60 * 60 * 1000);

  console.log('[Streak Calculator] Starting count from:', format(checkDate, "yyyy-MM-dd"));

  // Count consecutive days
  while (uniqueDates.has(format(checkDate, "yyyy-MM-dd"))) {
    streak++;
    console.log('[Streak Calculator] Day', streak, ':', format(checkDate, "yyyy-MM-dd"), '✓');
    // Move back one day
    checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
  }

  console.log('[Streak Calculator] Final streak:', streak, 'days');
  console.log('[Streak Calculator] Next expected day (missing):', format(checkDate, "yyyy-MM-dd"));

  return streak;
}

/**
 * Calculate streak from full session objects
 * Extracts session_date field and delegates to calculateStreakFromDates
 *
 * @param sessions - Array of session objects with session_date field
 * @returns Current streak count
 */
export function calculateStreak(sessions: Array<{ session_date: string }>): number {
  const dates = sessions.map(s => s.session_date);
  return calculateStreakFromDates(dates);
}
