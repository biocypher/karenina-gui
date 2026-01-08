/**
 * Secure storage utilities for sensitive data
 *
 * This module provides safer alternatives to localStorage for storing
 * sensitive information like API keys.
 *
 * IMPORTANT: sessionStorage is used instead of localStorage because:
 * - Data is only available for the current browser session
 * - Data is cleared when the tab/window closes
 * - Data does NOT persist across browser restarts
 *
 * Note: sessionStorage is still accessible to any JavaScript code on the page,
 * so proper XSS protection (like DOMPurify) is essential.
 */

/**
 * Secure storage keys - constants to avoid typos and enable centralized management
 */
export const STORAGE_KEYS = {
  OPENAI_ENDPOINT_API_KEY: 'openai_endpoint_api_key',
} as const;

/**
 * Session-based storage wrapper for sensitive data
 *
 * Uses sessionStorage instead of localStorage for better security.
 * sessionStorage clears when the tab/window closes.
 */
export class SessionSecureStorage {
  /**
   * Store a value in sessionStorage
   * @param key - The storage key
   * @param value - The value to store (will be stringified if not a string)
   */
  static setItem<T = string>(key: string, value: T): void {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      sessionStorage.setItem(key, stringValue);
    } catch (error) {
      // Fail silently if sessionStorage is not available (e.g., in some iframe contexts)
      console.warn(
        `Failed to store item in sessionStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve a value from sessionStorage
   * @param key - The storage key
   * @param parse - Whether to parse the value as JSON (default: false)
   * @returns The stored value or null if not found
   */
  static getItem<T = string>(key: string, parse = false): T | null {
    try {
      const value = sessionStorage.getItem(key);
      if (value === null) {
        return null;
      }
      if (parse) {
        return JSON.parse(value) as T;
      }
      return value as T;
    } catch (error) {
      console.warn(
        `Failed to retrieve item from sessionStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return null;
    }
  }

  /**
   * Remove a value from sessionStorage
   * @param key - The storage key
   */
  static removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(
        `Failed to remove item from sessionStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clear all values from sessionStorage
   * WARNING: This clears ALL sessionStorage data, not just our app's data
   */
  static clear(): void {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn(`Failed to clear sessionStorage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a key exists in sessionStorage
   * @param key - The storage key
   * @returns True if the key exists
   */
  static hasItem(key: string): boolean {
    try {
      return sessionStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }
}

/**
 * Convenience functions for API key storage
 */
export const apiKeyStorage = {
  /**
   * Store the OpenAI endpoint API key
   */
  setEndpointApiKey: (key: string): void => {
    if (key && key.trim()) {
      SessionSecureStorage.setItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY, key.trim());
    } else {
      SessionSecureStorage.removeItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY);
    }
  },

  /**
   * Get the stored OpenAI endpoint API key
   */
  getEndpointApiKey: (): string => {
    return SessionSecureStorage.getItem<string>(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY) || '';
  },

  /**
   * Remove the stored OpenAI endpoint API key
   */
  removeEndpointApiKey: (): void => {
    SessionSecureStorage.removeItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY);
  },

  /**
   * Check if an API key is stored
   */
  hasEndpointApiKey: (): boolean => {
    return SessionSecureStorage.hasItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY);
  },
};
