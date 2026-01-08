/**
 * CSRF (Cross-Site Request Forgery) protection utilities
 *
 * This module provides client-side CSRF protection by:
 * 1. Fetching a CSRF token from the backend
 * 2. Including the token in all mutation requests (POST, PUT, DELETE, PATCH)
 * 3. Storing the token in memory only (not persisted for security)
 *
 * BACKEND REQUIREMENTS:
 * - Backend should provide an endpoint like /api/auth/csrf-token that returns { token: string }
 * - Backend should validate the CSRF token on all mutation requests
 * - Token should be tied to the user session
 *
 * USAGE:
 * ```ts
 * import { csrf } from './csrf';
 *
 * // Initialize on app load
 * await csrf.initialize();
 *
 * // Include in fetch calls
 * const response = await fetch('/api/some-endpoint', {
 *   method: 'POST',
 *   headers: {
 *     ...csrf.getHeaders(),
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify(data),
 * });
 * ```
 */

import { logger } from './logger';

interface CsrfTokenResponse {
  token: string;
}

/**
 * CSRF token manager
 */
class CsrfManager {
  private token: string | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<boolean> | null = null;
  private readonly tokenHeader = 'X-CSRF-Token';
  private readonly defaultEndpoint = '/api/auth/csrf-token';

  /**
   * Initialize CSRF protection by fetching a token from the backend
   * @param endpoint - Optional custom endpoint for fetching the token
   * @returns true if token was fetched successfully, false otherwise
   */
  async initialize(endpoint?: string): Promise<boolean> {
    // Return existing promise if initialization is in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Skip if already initialized
    if (this.isInitialized && this.token) {
      return true;
    }

    this.initializationPromise = this.fetchToken(endpoint);

    try {
      const success = await this.initializationPromise;
      this.isInitialized = success;
      return success;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Fetch CSRF token from backend
   */
  private async fetchToken(customEndpoint?: string): Promise<boolean> {
    const endpoint = customEndpoint || this.defaultEndpoint;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include', // Include cookies for session-based CSRF
      });

      if (!response.ok) {
        // If endpoint doesn't exist yet (404), log warning but don't fail
        if (response.status === 404) {
          logger.warning(
            'CSRF',
            `Token endpoint not found (${endpoint}). CSRF protection will be enabled when backend implements the endpoint.`,
            'csrf'
          );
          return false;
        }
        logger.error('CSRF', `Failed to fetch token: ${response.status}`, 'csrf');
        return false;
      }

      const data = (await response.json()) as CsrfTokenResponse;
      if (data.token && typeof data.token === 'string') {
        this.token = data.token;
        return true;
      }

      logger.error('CSRF', 'Invalid token response from server', 'csrf');
      return false;
    } catch (error) {
      logger.error('CSRF', 'Error fetching token', 'csrf', { error });
      return false;
    }
  }

  /**
   * Get headers object with CSRF token
   * @returns Headers object with X-CSRF-Token if available, empty object otherwise
   */
  getHeaders(): Record<string, string> {
    if (!this.token) {
      return {};
    }
    return {
      [this.tokenHeader]: this.token,
    };
  }

  /**
   * Get the current CSRF token
   * @returns The token string or null if not available
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Check if CSRF protection is active (token available)
   */
  isActive(): boolean {
    return this.token !== null;
  }

  /**
   * Refresh the CSRF token
   * @param endpoint - Optional custom endpoint for fetching the token
   * @returns true if token was refreshed successfully
   */
  async refresh(endpoint?: string): Promise<boolean> {
    this.token = null;
    return this.initialize(endpoint);
  }

  /**
   * Clear the stored token (e.g., after logout)
   */
  clear(): void {
    this.token = null;
    this.isInitialized = false;
  }

  /**
   * Wrap fetch with CSRF token automatically included
   * @param url - The URL to fetch
   * @param options - Fetch options
   * @returns Fetch response
   */
  async fetchWithCsrf(url: string, options: RequestInit = {}): Promise<Response> {
    const method = (options.method || 'GET').toUpperCase();

    // Only add CSRF token to state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const headers = {
        ...this.getHeaders(),
        ...((options.headers as Record<string, string>) || {}),
      };

      return fetch(url, {
        ...options,
        headers,
      });
    }

    // For GET requests and others, just use original options
    return fetch(url, options);
  }
}

// Singleton instance
export const csrf = new CsrfManager();

/**
 * Convenience function to initialize CSRF protection on app load
 */
export async function initializeCsrf(): Promise<boolean> {
  return csrf.initialize();
}

/**
 * Hook for React components to use CSRF protection
 */
export function useCsrf() {
  return {
    token: csrf.getToken(),
    isActive: csrf.isActive(),
    getHeaders: () => csrf.getHeaders(),
    refresh: () => csrf.refresh(),
    clear: () => csrf.clear(),
    fetchWithCsrf: (url: string, options?: RequestInit) => csrf.fetchWithCsrf(url, options),
  };
}
