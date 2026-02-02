import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS, HTTP_METHODS, HEADERS } from '../api';

describe('API Constants', () => {
  describe('API_ENDPOINTS', () => {
    it('should have static endpoint paths', () => {
      expect(API_ENDPOINTS.TIMESTAMP).toBe('/api/timestamp');
      expect(API_ENDPOINTS.START_VERIFICATION).toBe('/api/v2/verifications');
    });

    it('should generate dynamic endpoint paths correctly', () => {
      const testJobId = 'test-job-123';

      expect(API_ENDPOINTS.VERIFICATION_PROGRESS(testJobId)).toBe('/api/v2/verifications/test-job-123/progress');
      expect(API_ENDPOINTS.CANCEL_VERIFICATION(testJobId)).toBe('/api/v2/verifications/test-job-123');
    });

    it('should generate export endpoint with format parameter', () => {
      const testJobId = 'test-job-123';
      const format = 'csv';

      expect(API_ENDPOINTS.EXPORT_VERIFICATION(testJobId, format)).toBe(
        '/api/v2/verifications/test-job-123/export?fmt=csv'
      );
    });

    it('should handle special characters in parameters', () => {
      const jobIdWithSpecial = 'job-with-spaces and symbols!@#';

      // Function should work (encoding is handled by fetch/browser)
      expect(() => API_ENDPOINTS.VERIFICATION_PROGRESS(jobIdWithSpecial)).not.toThrow();
      expect(API_ENDPOINTS.VERIFICATION_PROGRESS(jobIdWithSpecial)).toContain(jobIdWithSpecial);
    });
  });

  describe('HTTP_METHODS', () => {
    it('should define standard HTTP methods', () => {
      expect(HTTP_METHODS.GET).toBe('GET');
      expect(HTTP_METHODS.POST).toBe('POST');
      expect(HTTP_METHODS.PUT).toBe('PUT');
      expect(HTTP_METHODS.DELETE).toBe('DELETE');
    });

    it('should be readonly at TypeScript level', () => {
      // This test verifies the structure is as expected
      // TypeScript prevents modification, but JS allows it at runtime
      expect(Object.keys(HTTP_METHODS)).toHaveLength(4);
      expect(HTTP_METHODS).toHaveProperty('GET');
      expect(HTTP_METHODS).toHaveProperty('POST');
      expect(HTTP_METHODS).toHaveProperty('PUT');
      expect(HTTP_METHODS).toHaveProperty('DELETE');
    });
  });

  describe('HEADERS', () => {
    it('should define content type headers', () => {
      expect(HEADERS.CONTENT_TYPE_JSON).toEqual({ 'Content-Type': 'application/json' });
    });

    it('should have proper header format', () => {
      expect(typeof HEADERS.CONTENT_TYPE_JSON).toBe('object');
      expect(HEADERS.CONTENT_TYPE_JSON['Content-Type']).toBe('application/json');
    });
  });

  describe('Constants integrity', () => {
    it('should not have undefined values', () => {
      expect(API_ENDPOINTS.TIMESTAMP).toBeDefined();
      expect(API_ENDPOINTS.START_VERIFICATION).toBeDefined();
      expect(HTTP_METHODS.GET).toBeDefined();
      expect(HEADERS.CONTENT_TYPE_JSON).toBeDefined();
    });

    it('should maintain consistent path structure', () => {
      // All API endpoints should start with /api/
      expect(API_ENDPOINTS.TIMESTAMP).toMatch(/^\/api\//);
      // V2 endpoints should start with /api/v2/
      expect(API_ENDPOINTS.START_VERIFICATION).toMatch(/^\/api\/v2\//);
    });
  });
});
