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
 * If the date has a time component, includes it; otherwise just the date
 * Always uses local time, not UTC
 */
export function formatDateForStorage(date: Date, includeTime: boolean = false): string {
  if (includeTime) {
    // Format as YYYY-MM-DDTHH:mm:ss (local time, not UTC)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } else {
    // Just the date part
    return getLocalDateKey(date);
  }
}

/**
 * Parse a date string from storage (handles both YYYY-MM-DD and ISO format)
 * Returns a local Date object
 * 
 * Handles:
 * - YYYY-MM-DD (date only)
 * - YYYY-MM-DDTHH:mm:ss (local time, no timezone)
 * - YYYY-MM-DDTHH:mm:ssZ (UTC, converts to local)
 * - YYYY-MM-DDTHH:mm:ss+HH:MM (timezone offset, converts to local)
 */
export function parseStoredDate(dateStr: string): Date {
  // If it's just a date (YYYY-MM-DD), parse it as local
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Remove timezone suffix if present (Z, +HH:MM, -HH:MM)
  let cleanDateStr = dateStr.replace(/[Zz]$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
  
  // If it's an ISO string with time, extract date and time parts
  const datePart = cleanDateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  
  // If there's a time component, parse it too
  const timePart = cleanDateStr.split('T')[1];
  if (timePart) {
    // Remove milliseconds if present
    const timeWithoutMs = timePart.split('.')[0];
    const [hours, minutes, seconds] = timeWithoutMs.split(':').map(Number);
    return new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
  }
  
  return new Date(year, month - 1, day);
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

