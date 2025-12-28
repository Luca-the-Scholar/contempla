import DOMPurify from 'dompurify';

/**
 * Sanitizes user-generated content to prevent XSS attacks
 *
 * This is specifically for content from the Global Library where users
 * can submit techniques that other users will view.
 *
 * Allowed: Plain text, basic formatting (newlines preserved as text)
 * Blocked: HTML tags, scripts, event handlers, inline styles
 *
 * @param content - User-generated text to sanitize
 * @returns Sanitized text safe for rendering
 */
export function sanitizeUserContent(content: string | null | undefined): string {
  if (!content) return '';

  // Configure DOMPurify to strip ALL HTML tags
  // This ensures only plain text is returned
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],        // No HTML tags allowed
    ALLOWED_ATTR: [],        // No attributes allowed
    KEEP_CONTENT: true,      // Keep text content when stripping tags
    RETURN_DOM: false,       // Return string, not DOM
    RETURN_DOM_FRAGMENT: false,
  });

  return sanitized.trim();
}

/**
 * Sanitizes an array of user-generated content strings
 * Useful for instruction steps, tags, etc.
 *
 * @param items - Array of user-generated strings
 * @returns Array of sanitized strings
 */
export function sanitizeUserContentArray(items: (string | null | undefined)[]): string[] {
  return items
    .filter((item): item is string => typeof item === 'string' && item.length > 0)
    .map(sanitizeUserContent);
}
