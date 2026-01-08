/**
 * URL validation and sanitization utilities
 *
 * These utilities help prevent XSS attacks through dangerous URL schemes
 * like javascript:, data:, vbscript:, etc.
 */

/**
 * List of safe URL protocols that can be rendered as clickable links
 */
const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:', 'ftp:'] as const;

/**
 * List of dangerous URL protocols that should never be rendered as links
 */
const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'about:',
  'chrome:',
  'chrome-extension:',
  'moz-extension:',
  'ms-help:',
  'res:',
  'resource:',
  'sidebar:',
  'view-source:',
] as const;

/**
 * Sanitizes a URL for safe rendering in an anchor tag href attribute.
 *
 * If the URL uses a safe protocol (http, https, mailto, tel, ftp), it is returned as-is.
 * If the URL uses a dangerous protocol or is malformed, it returns null to prevent rendering as a link.
 *
 * @param url - The URL to sanitize
 * @returns The sanitized URL, or null if the URL is dangerous
 *
 * @example
 * ```ts
 * sanitizeUrl('https://example.com') // Returns 'https://example.com'
 * sanitizeUrl('javascript:alert(1)') // Returns null
 * sanitizeUrl('data:text/html,<script>') // Returns null
 * ```
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Trim whitespace
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return null;
  }

  try {
    // Parse the URL to extract the protocol
    let protocol: string;

    // Check for protocol-like pattern (protocol:)
    const protocolMatch = trimmedUrl.match(/^([^:]+):/);
    if (protocolMatch) {
      protocol = protocolMatch[1].toLowerCase() + ':';
    } else {
      // No protocol specified - assume https for safety
      // This handles cases like "example.com" or "www.example.com"
      return 'https://' + trimmedUrl;
    }

    // Check against dangerous protocols
    if (DANGEROUS_PROTOCOLS.includes(protocol as (typeof DANGEROUS_PROTOCOLS)[number])) {
      return null;
    }

    // Check if it's a safe protocol
    if (SAFE_PROTOCOLS.includes(protocol as (typeof SAFE_PROTOCOLS)[number])) {
      return trimmedUrl;
    }

    // Unknown protocol - err on the side of caution
    return null;
  } catch {
    // If URL parsing fails, don't render as a link
    return null;
  }
}

/**
 * Validates whether a URL is safe to render as a clickable link.
 *
 * @param url - The URL to validate
 * @returns true if the URL is safe, false otherwise
 *
 * @example
 * ```ts
 * isUrlSafe('https://example.com') // Returns true
 * isUrlSafe('javascript:alert(1)') // Returns false
 * ```
 */
export function isUrlSafe(url: string): boolean {
  return sanitizeUrl(url) !== null;
}

/**
 * Returns a safe version of the URL for display purposes.
 * If the URL is dangerous, returns the original URL as plain text (not as a link).
 *
 * @param url - The URL to make safe for rendering
 * @returns An object with the safe href (or null) and the display text
 *
 * @example
 * ```ts
 * const result = makeUrlSafe('https://example.com');
 * // { href: 'https://example.com', text: 'https://example.com' }
 *
 * const dangerous = makeUrlSafe('javascript:alert(1)');
 * // { href: null, text: 'javascript:alert(1)' }
 * ```
 */
export function makeUrlSafe(url: string): { href: string | null; text: string } {
  if (!url || typeof url !== 'string') {
    return { href: null, text: String(url ?? '') };
  }

  const safeUrl = sanitizeUrl(url);
  return {
    href: safeUrl,
    text: url, // Always return original text for display
  };
}
