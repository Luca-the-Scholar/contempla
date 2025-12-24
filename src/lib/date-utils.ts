/**
 * Date utility functions for handling local dates (not UTC)
 * 
 * These functions ensure that dates are always handled in the user's local timezone,
 * preventing issues where sessions appear on the wrong day due to UTC conversion.
 */

/**
 * Get a local date key in YYYY-MM-DD format
 * Uses local time, not UTC, to prevent day shifting
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format a date for storage in the database
 * If the date has a time component, includes it with timezone offset; otherwise just the date
 * Always preserves the user's local timezone
 */
export function formatDateForStorage(date: Date, includeTime: boolean = false): string {
  if (includeTime) {
    // Format as YYYY-MM-DDTHH:mm:ss±HH:MM (local time WITH timezone offset)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    // Get timezone offset in minutes and convert to ±HH:MM format
    const tzOffset = -date.getTimezoneOffset(); // Inverted: negative offset means behind UTC
    const offsetHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
    const offsetMins = String(Math.abs(tzOffset) % 60).padStart(2, '0');
    const offsetStr = (tzOffset >= 0 ? '+' : '-') + offsetHours + ':' + offsetMins;

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetStr}`;
  } else {
    // Just the date part (no timezone needed for date-only values)
    return getLocalDateKey(date);
  }
}

/**
 * Parse a date string from storage (handles both YYYY-MM-DD and ISO format)
 * Returns a Date object in the user's local timezone
 *
 * Handles:
 * - YYYY-MM-DD (date only) - parsed as local midnight
 * - YYYY-MM-DDTHH:mm:ss±HH:MM (timestamp with timezone) - converted to local time
 * - YYYY-MM-DDTHH:mm:ssZ (UTC timestamp) - converted to local time
 * - YYYY-MM-DDTHH:mm:ss (legacy format without timezone) - assumed as local time
 */
export function parseStoredDate(dateStr: string): Date {
  // If it's just a date (YYYY-MM-DD), parse it as local midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  // If it has timezone info (Z or ±HH:MM), use native Date parser which handles timezones correctly
  if (/[Zz]$/.test(dateStr) || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }

  // Legacy format without timezone - assume it's local time
  // This handles old data that was stored as YYYY-MM-DDTHH:mm:ss without timezone
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);

  const timePart = dateStr.split('T')[1];
  if (timePart) {
    // Remove milliseconds if present
    const timeWithoutMs = timePart.split('.')[0];
    const [hours, minutes, seconds] = timeWithoutMs.split(':').map(Number);
    return new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
  }

  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Check if two dates are on the same local day
 */
export function isSameLocalDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

