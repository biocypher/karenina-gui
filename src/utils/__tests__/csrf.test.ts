/**
 * CSRF protection utility tests
 *
 * These tests verify CSRF token management and request header injection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { csrf, initializeCsrf, useCsrf } from '../csrf';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Suppress console output during tests
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('CsrfManager', () => {
  beforeEach(() => {
    // Reset CSRF state before each test
    csrf.clear();
    // Clear initialization flag by setting isInitialized to false
    csrf['isInitialized'] = false;
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should fetch token from default endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-csrf-token-123' }),
      });

      const result = await csrf.initialize();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/v2/auth/csrf-token', {
        method: 'GET',
        credentials: 'include',
      });
      expect(csrf.getToken()).toBe('test-csrf-token-123');
    });

    it('should fetch token from custom endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'custom-token' }),
      });

      const result = await csrf.initialize('/api/custom/csrf');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/custom/csrf', {
        method: 'GET',
        credentials: 'include',
      });
      expect(csrf.getToken()).toBe('custom-token');
    });

    it('should return false when endpoint returns 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Not found' }),
      });

      const result = await csrf.initialize();

      expect(result).toBe(false);
      expect(csrf.getToken()).toBeNull();
    });

    it('should return false when endpoint returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Internal server error' }),
      });

      const result = await csrf.initialize();

      expect(result).toBe(false);
      expect(csrf.getToken()).toBeNull();
    });

    it('should return false when response has no token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'no-token' }),
      });

      const result = await csrf.initialize();

      expect(result).toBe(false);
      expect(csrf.getToken()).toBeNull();
    });

    it('should return false when fetch throws error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await csrf.initialize();

      expect(result).toBe(false);
      expect(csrf.getToken()).toBeNull();
    });

    it('should return true immediately if already initialized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'first-token' }),
      });

      await csrf.initialize();
      const result = await csrf.initialize();

      expect(result).toBe(true);
      expect(csrf.getToken()).toBe('first-token');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent initialization with single fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'shared-token' }),
      });

      const [result1, result2] = await Promise.all([csrf.initialize(), csrf.initialize()]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getHeaders', () => {
    it('should return empty object when no token', () => {
      const headers = csrf.getHeaders();
      expect(headers).toEqual({});
    });

    it('should return headers with token when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token' }),
      });

      await csrf.initialize();
      const headers = csrf.getHeaders();

      expect(headers).toEqual({
        'X-CSRF-Token': 'test-token',
      });
    });

    it('should preserve existing headers when merging', () => {
      // Manually set token for this test
      csrf['token'] = 'test-token';

      const baseHeaders = { 'Content-Type': 'application/json' };
      const merged = { ...csrf.getHeaders(), ...baseHeaders };

      expect(merged).toEqual({
        'X-CSRF-Token': 'test-token',
        'Content-Type': 'application/json',
      });
    });
  });

  describe('getToken', () => {
    it('should return null when not initialized', () => {
      expect(csrf.getToken()).toBeNull();
    });

    it('should return token after successful initialization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'my-token' }),
      });

      await csrf.initialize();
      expect(csrf.getToken()).toBe('my-token');
    });
  });

  describe('isActive', () => {
    it('should return false when no token', () => {
      expect(csrf.isActive()).toBe(false);
    });

    it('should return true when token is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'active-token' }),
      });

      await csrf.initialize();
      expect(csrf.isActive()).toBe(true);
    });
  });

  describe('refresh', () => {
    it('should clear existing token and fetch new one', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'old-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'new-token' }),
        });

      await csrf.initialize();
      expect(csrf.getToken()).toBe('old-token');

      const result = await csrf.refresh();
      expect(result).toBe(true);
      expect(csrf.getToken()).toBe('new-token');
    });

    it('should return false if refresh fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'old-token' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ detail: 'Server error' }),
        });

      await csrf.initialize();
      const result = await csrf.refresh();

      expect(result).toBe(false);
      expect(csrf.getToken()).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear the stored token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'clear-me' }),
      });

      await csrf.initialize();
      expect(csrf.isActive()).toBe(true);

      csrf.clear();
      expect(csrf.isActive()).toBe(false);
      expect(csrf.getToken()).toBeNull();
    });

    it('should require re-initialization after clear', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'token-1' }),
      });

      await csrf.initialize();
      csrf.clear();

      // Second fetch for re-initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'token-2' }),
      });

      await csrf.initialize();
      expect(csrf.getToken()).toBe('token-2');
    });
  });

  describe('fetchWithCsrf', () => {
    beforeEach(async () => {
      // Initialize CSRF token for fetch tests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'csrf-123' }),
      });
      await csrf.initialize();
      mockFetch.mockReset();
    });

    it('should add CSRF header to POST requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await csrf.fetchWithCsrf('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'csrf-123',
        },
      });
    });

    it('should add CSRF header to PUT requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await csrf.fetchWithCsrf('/api/test', { method: 'PUT' });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'PUT',
        headers: { 'X-CSRF-Token': 'csrf-123' },
      });
    });

    it('should add CSRF header to DELETE requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await csrf.fetchWithCsrf('/api/test', { method: 'DELETE' });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': 'csrf-123' },
      });
    });

    it('should add CSRF header to PATCH requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await csrf.fetchWithCsrf('/api/test', { method: 'PATCH' });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'PATCH',
        headers: { 'X-CSRF-Token': 'csrf-123' },
      });
    });

    it('should NOT add CSRF header to GET requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'response' }),
      });

      await csrf.fetchWithCsrf('/api/test', { method: 'GET' });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
      });
    });

    it('should NOT add CSRF header to HEAD requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'response' }),
      });

      await csrf.fetchWithCsrf('/api/test', { method: 'HEAD' });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'HEAD',
      });
    });

    it('should NOT add CSRF header when no token available', async () => {
      csrf.clear();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await csrf.fetchWithCsrf('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should default to GET when no method specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'response' }),
      });

      await csrf.fetchWithCsrf('/api/test', {});

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {});
    });

    it('should preserve other request options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const body = JSON.stringify({ foo: 'bar' });

      await csrf.fetchWithCsrf('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        credentials: 'include',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'csrf-123',
        },
        body,
        credentials: 'include',
      });
    });
  });
});

describe('initializeCsrf', () => {
  beforeEach(() => {
    csrf.clear();
    csrf['isInitialized'] = false;
    mockFetch.mockReset();
  });

  it('should initialize the singleton CSRF manager', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'init-token' }),
    });

    const result = await initializeCsrf();

    expect(result).toBe(true);
    expect(csrf.getToken()).toBe('init-token');
  });
});

describe('useCsrf hook', () => {
  beforeEach(() => {
    csrf.clear();
    csrf['isInitialized'] = false;
    mockFetch.mockReset();
  });

  it('should return CSRF utilities', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'hook-token' }),
    });

    await csrf.initialize();
    const csrfUtils = useCsrf();

    expect(csrfUtils.token).toBe('hook-token');
    expect(csrfUtils.isActive).toBe(true);
    expect(typeof csrfUtils.getHeaders).toBe('function');
    expect(typeof csrfUtils.refresh).toBe('function');
    expect(typeof csrfUtils.clear).toBe('function');
    expect(typeof csrfUtils.fetchWithCsrf).toBe('function');
  });

  it('should getHeaders return correct headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'test-token' }),
    });

    await csrf.initialize();
    const csrfUtils = useCsrf();

    expect(csrfUtils.getHeaders()).toEqual({
      'X-CSRF-Token': 'test-token',
    });
  });

  it('should clear work correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'test-token' }),
    });

    await csrf.initialize();
    const csrfUtils = useCsrf();

    expect(csrfUtils.isActive).toBe(true);
    csrfUtils.clear();

    // Note: useCsrf returns a snapshot, not a reactive object
    // After clear, need to call the hook again to get updated state
    const csrfUtilsAfter = useCsrf();
    expect(csrfUtilsAfter.isActive).toBe(false);
  });
});
