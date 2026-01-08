/**
 * XSS safety tests for CodeEditor component
 *
 * These tests verify that malicious code snippets cannot execute scripts
 * through the syntax-highlighted code display.
 */

import { describe, it, expect } from 'vitest';
import DOMPurify from 'dompurify';

/**
 * This is the sanitization function used in CodeEditor.tsx
 * We test it here to ensure XSS protection works correctly
 */
const sanitizeHighlightedCode = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['span', 'br'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
  });
};

describe('CodeEditor XSS Protection', () => {
  describe('Direct script injection attempts', () => {
    it('should strip script tags from HTML', () => {
      const malicious = '<span class="token keyword">def</span><script>alert("XSS")</script>';
      const sanitized = sanitizeHighlightedCode(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert("XSS")');
    });

    it('should strip onerror attributes', () => {
      const malicious = '<span onerror="alert(\'XSS\')">class</span>';
      const sanitized = sanitizeHighlightedCode(malicious);
      expect(sanitized).not.toContain('onerror');
    });

    it('should strip onclick attributes', () => {
      const malicious = '<span onclick="alert(\'XSS\')">class</span>';
      const sanitized = sanitizeHighlightedCode(malicious);
      expect(sanitized).not.toContain('onclick');
    });

    it('should strip onload attributes', () => {
      const malicious = '<span onload="alert(\'XSS\')">class</span>';
      const sanitized = sanitizeHighlightedCode(malicious);
      expect(sanitized).not.toContain('onload');
    });
  });

  describe('JavaScript protocol in attributes', () => {
    it('should strip href attributes with javascript:', () => {
      const malicious = '<span class="token" href="javascript:alert(\'XSS\')">class</span>';
      const sanitized = sanitizeHighlightedCode(malicious);
      expect(sanitized).not.toContain('javascript:');
    });

    it('should strip data attributes with JS', () => {
      const malicious = '<span data-x="javascript:alert(\'XSS\')">class</span>';
      const sanitized = sanitizeHighlightedCode(malicious);
      expect(sanitized).not.toContain('data-x');
    });
  });

  describe('SVG and iframe injection', () => {
    it('should strip SVG tags with embedded scripts', () => {
      const malicious = '<svg onload="alert(\'XSS\')"><span class="token">class</span></svg>';
      const sanitized = sanitizeHighlightedCode(malicious);
      expect(sanitized).not.toContain('<svg');
      expect(sanitized).not.toContain('onload');
    });

    it('should strip iframe tags', () => {
      const malicious = '<iframe src="javascript:alert(\'XSS\')"></iframe>';
      const sanitized = sanitizeHighlightedCode(malicious);
      expect(sanitized).not.toContain('<iframe');
    });
  });

  describe('Event handler variants', () => {
    it('should strip onmouseover', () => {
      const malicious = '<span onmouseover="alert(\'XSS\')">class</span>';
      const sanitized = sanitizeHighlightedCode(malicious);
      expect(sanitized).not.toContain('onmouseover');
    });

    it('should strip onfocus', () => {
      const malicious = '<span onfocus="alert(\'XSS\')">class</span>';
      const sanitized = sanitizeHighlightedCode(malicious);
      expect(sanitized).not.toContain('onfocus');
    });

    it('should strip onblur', () => {
      const malicious = '<span onblur="alert(\'XSS\')">class</span>';
      const sanitized = sanitizeHighlightedCode(malicious);
      expect(sanitized).not.toContain('onblur');
    });
  });

  describe('Legitimate Prism.js output is preserved', () => {
    it('should allow legitimate span tags with class attributes', () => {
      const legitimate = '<span class="token keyword">def</span>';
      const sanitized = sanitizeHighlightedCode(legitimate);
      expect(sanitized).toBe(legitimate);
    });

    it('should allow br tags', () => {
      const legitimate = '<span class="token">line1</span><br/><span class="token">line2</span>';
      const sanitized = sanitizeHighlightedCode(legitimate);
      expect(sanitized).toContain('<br');
      expect(sanitized).toContain('<span class="token">line1</span>');
    });

    it('should preserve legitimate Prism token classes', () => {
      const legitimate = '<span class="token keyword">def</span> <span class="token function">foo</span>()';
      const sanitized = sanitizeHighlightedCode(legitimate);
      expect(sanitized).toContain('token keyword');
      expect(sanitized).toContain('token function');
    });

    it('should preserve string token highlighting', () => {
      const legitimate = '<span class="token string">"hello world"</span>';
      const sanitized = sanitizeHighlightedCode(legitimate);
      expect(sanitized).toContain('token string');
    });

    it('should preserve comment token highlighting', () => {
      const legitimate = '<span class="token comment"># This is a comment</span>';
      const sanitized = sanitizeHighlightedCode(legitimate);
      expect(sanitized).toContain('token comment');
    });
  });

  describe('Combined attack vectors', () => {
    it('should handle mixed legitimate and malicious content', () => {
      const mixed =
        '<span class="token keyword">def</span><script>alert("XSS")</script><span class="token function">foo</span>';
      const sanitized = sanitizeHighlightedCode(mixed);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('token keyword');
      expect(sanitized).toContain('token function');
    });

    it('should strip data attributes with payloads', () => {
      const malicious = '<span class="token" data-text="foo" data-onclick="alert(1)">class</span>';
      const sanitized = sanitizeHighlightedCode(malicious);
      // Only class attribute should remain
      expect(sanitized).toContain('class=');
      expect(sanitized).not.toContain('data-text');
      expect(sanitized).not.toContain('data-onclick');
    });
  });

  describe('XSS via CSS expressions', () => {
    it('should strip style attributes', () => {
      const malicious = '<span style="background:url(\'javascript:alert(1)\')">class</span>';
      const sanitized = sanitizeHighlightedCode(malicious);
      expect(sanitized).not.toContain('style=');
      expect(sanitized).not.toContain('javascript:');
    });
  });

  describe('Meta tags and other HTML injections', () => {
    it('should strip meta tags', () => {
      const malicious = '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">';
      const sanitized = sanitizeHighlightedCode(malicious);
      expect(sanitized).not.toContain('<meta');
      expect(sanitized).not.toContain('javascript:');
    });

    it('should strip link tags', () => {
      const malicious = '<link rel="stylesheet" href="javascript:alert(\'XSS\')">';
      const sanitized = sanitizeHighlightedCode(malicious);
      expect(sanitized).not.toContain('<link');
    });
  });
});
