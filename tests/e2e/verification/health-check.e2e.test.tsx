/**
 * E2E Health Check Tests
 *
 * Basic tests to verify the E2E infrastructure works:
 * - Server starts and responds to health checks
 * - React app can make real HTTP requests to the server
 *
 * These tests use a real karenina-server with LLM calls mocked via fixtures.
 */

import { describe, it, expect } from 'vitest';

// Get server URL from environment (set by global-setup.ts)
const getServerUrl = () => process.env.VITE_E2E_API_BASE_URL || 'http://localhost:8081';

describe('E2E: Health Check', () => {
  describe('Server Infrastructure', () => {
    it('should respond to health check endpoint', async () => {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/health`);

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('healthy');
    });

    it('should return CSRF token', async () => {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/v2/auth/csrf-token`);

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty('token');
      expect(typeof data.token).toBe('string');
    });

    it('should list available presets', async () => {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/v2/presets`);

      expect(response.ok).toBe(true);

      const data = await response.json();
      // Presets endpoint returns an object with preset names as keys
      // or an array depending on the endpoint version
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });
  });
});
