/**
 * Secure storage utility tests
 *
 * These tests verify that sensitive data storage uses sessionStorage
 * instead of localStorage for better security.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionSecureStorage, apiKeyStorage, STORAGE_KEYS } from '../secureStorage';

// Mock sessionStorage
const mockSessionStorage = {
  store: new Map<string, string>(),
  getItem: (key: string): string | null => {
    // Use has() to properly check if key exists (handles empty string case)
    if (!mockSessionStorage.store.has(key)) {
      return null;
    }
    return mockSessionStorage.store.get(key)!;
  },
  setItem: (key: string, value: string): void => {
    mockSessionStorage.store.set(key, value);
  },
  removeItem: (key: string): void => {
    mockSessionStorage.store.delete(key);
  },
  clear: (): void => {
    mockSessionStorage.store.clear();
  },
  get length(): number {
    return mockSessionStorage.store.size;
  },
  key: (index: number): string | null => {
    const keys = Array.from(mockSessionStorage.store.keys());
    return keys[index] || null;
  },
};

// Setup and teardown
beforeEach(() => {
  mockSessionStorage.clear();
  vi.stubGlobal('sessionStorage', mockSessionStorage);
  // Suppress console.warn output in tests
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SessionSecureStorage', () => {
  describe('setItem', () => {
    it('should store string values', () => {
      SessionSecureStorage.setItem('test-key', 'test-value');
      expect(sessionStorage.getItem('test-key')).toBe('test-value');
    });

    it('should store object values as JSON', () => {
      const obj = { foo: 'bar', num: 123 };
      SessionSecureStorage.setItem('test-key', obj);
      expect(sessionStorage.getItem('test-key')).toBe(JSON.stringify(obj));
    });

    it('should store array values as JSON', () => {
      const arr = ['a', 'b', 'c'];
      SessionSecureStorage.setItem('test-key', arr);
      expect(sessionStorage.getItem('test-key')).toBe(JSON.stringify(arr));
    });

    it('should handle empty string values', () => {
      // Note: sessionStorage stores empty string as empty string
      // But when retrieved via our getItem, it returns the stored value
      SessionSecureStorage.setItem('test-key', '');
      const result = SessionSecureStorage.getItem('test-key');
      expect(result).toBe('');
    });

    it('should handle sessionStorage unavailable gracefully', () => {
      vi.stubGlobal('sessionStorage', undefined);
      expect(() => SessionSecureStorage.setItem('test-key', 'value')).not.toThrow();
    });
  });

  describe('getItem', () => {
    it('should retrieve string values', () => {
      sessionStorage.setItem('test-key', 'test-value');
      const result = SessionSecureStorage.getItem('test-key');
      expect(result).toBe('test-value');
    });

    it('should return null for non-existent keys', () => {
      const result = SessionSecureStorage.getItem('non-existent');
      expect(result).toBeNull();
    });

    it('should parse JSON values when parse=true', () => {
      const obj = { foo: 'bar', num: 123 };
      sessionStorage.setItem('test-key', JSON.stringify(obj));
      const result = SessionSecureStorage.getItem('test-key', true);
      expect(result).toEqual(obj);
    });

    it('should return raw string when parse=false', () => {
      const obj = { foo: 'bar' };
      sessionStorage.setItem('test-key', JSON.stringify(obj));
      const result = SessionSecureStorage.getItem('test-key', false);
      expect(result).toBe(JSON.stringify(obj));
    });

    it('should return raw string by default (parse=false)', () => {
      sessionStorage.setItem('test-key', JSON.stringify({ foo: 'bar' }));
      const result = SessionSecureStorage.getItem('test-key');
      expect(result).toBe(JSON.stringify({ foo: 'bar' }));
    });

    it('should handle invalid JSON gracefully when parse=true', () => {
      sessionStorage.setItem('test-key', 'not-valid-json');
      const result = SessionSecureStorage.getItem('test-key', true);
      // Should return null when JSON.parse fails (error is caught)
      expect(result).toBeNull();
    });

    it('should handle sessionStorage unavailable gracefully', () => {
      vi.stubGlobal('sessionStorage', undefined);
      const result = SessionSecureStorage.getItem('test-key');
      expect(result).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should remove existing items', () => {
      sessionStorage.setItem('test-key', 'test-value');
      expect(sessionStorage.getItem('test-key')).toBe('test-value');

      SessionSecureStorage.removeItem('test-key');
      expect(sessionStorage.getItem('test-key')).toBeNull();
    });

    it('should handle removing non-existent items', () => {
      expect(() => SessionSecureStorage.removeItem('non-existent')).not.toThrow();
    });

    it('should handle sessionStorage unavailable gracefully', () => {
      vi.stubGlobal('sessionStorage', undefined);
      expect(() => SessionSecureStorage.removeItem('test-key')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all items', () => {
      sessionStorage.setItem('key1', 'value1');
      sessionStorage.setItem('key2', 'value2');
      sessionStorage.setItem('key3', 'value3');

      expect(sessionStorage.length).toBe(3);

      SessionSecureStorage.clear();

      expect(sessionStorage.length).toBe(0);
    });

    it('should handle empty sessionStorage', () => {
      expect(() => SessionSecureStorage.clear()).not.toThrow();
    });

    it('should handle sessionStorage unavailable gracefully', () => {
      vi.stubGlobal('sessionStorage', undefined);
      expect(() => SessionSecureStorage.clear()).not.toThrow();
    });
  });

  describe('hasItem', () => {
    it('should return true for existing items', () => {
      sessionStorage.setItem('test-key', 'test-value');
      expect(SessionSecureStorage.hasItem('test-key')).toBe(true);
    });

    it('should return false for non-existent items', () => {
      expect(SessionSecureStorage.hasItem('non-existent')).toBe(false);
    });

    it('should return false after item is removed', () => {
      sessionStorage.setItem('test-key', 'test-value');
      expect(SessionSecureStorage.hasItem('test-key')).toBe(true);

      sessionStorage.removeItem('test-key');
      expect(SessionSecureStorage.hasItem('test-key')).toBe(false);
    });

    it('should handle sessionStorage unavailable gracefully', () => {
      vi.stubGlobal('sessionStorage', undefined);
      expect(SessionSecureStorage.hasItem('test-key')).toBe(false);
    });
  });
});

describe('apiKeyStorage', () => {
  describe('setEndpointApiKey', () => {
    it('should store API key with trimmed whitespace', () => {
      apiKeyStorage.setEndpointApiKey('  sk-1234567890  ');
      expect(sessionStorage.getItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY)).toBe('sk-1234567890');
    });

    it('should store API key without modification if no whitespace', () => {
      apiKeyStorage.setEndpointApiKey('sk-1234567890');
      expect(sessionStorage.getItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY)).toBe('sk-1234567890');
    });

    it('should remove key when empty string is passed', () => {
      sessionStorage.setItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY, 'existing-key');
      apiKeyStorage.setEndpointApiKey('');
      expect(sessionStorage.getItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY)).toBeNull();
    });

    it('should remove key when whitespace-only string is passed', () => {
      sessionStorage.setItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY, 'existing-key');
      apiKeyStorage.setEndpointApiKey('   ');
      expect(sessionStorage.getItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY)).toBeNull();
    });
  });

  describe('getEndpointApiKey', () => {
    it('should return stored API key', () => {
      sessionStorage.setItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY, 'sk-1234567890');
      expect(apiKeyStorage.getEndpointApiKey()).toBe('sk-1234567890');
    });

    it('should return empty string when no key is stored', () => {
      expect(apiKeyStorage.getEndpointApiKey()).toBe('');
    });

    it('should return empty string when key is null', () => {
      sessionStorage.setItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY, 'sk-1234567890');
      sessionStorage.removeItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY);
      expect(apiKeyStorage.getEndpointApiKey()).toBe('');
    });
  });

  describe('removeEndpointApiKey', () => {
    it('should remove stored API key', () => {
      sessionStorage.setItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY, 'sk-1234567890');
      apiKeyStorage.removeEndpointApiKey();
      expect(sessionStorage.getItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY)).toBeNull();
    });

    it('should handle removing non-existent key', () => {
      expect(() => apiKeyStorage.removeEndpointApiKey()).not.toThrow();
    });
  });

  describe('hasEndpointApiKey', () => {
    it('should return true when API key is stored', () => {
      sessionStorage.setItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY, 'sk-1234567890');
      expect(apiKeyStorage.hasEndpointApiKey()).toBe(true);
    });

    it('should return false when no API key is stored', () => {
      expect(apiKeyStorage.hasEndpointApiKey()).toBe(false);
    });

    it('should return false after key is removed', () => {
      sessionStorage.setItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY, 'sk-1234567890');
      expect(apiKeyStorage.hasEndpointApiKey()).toBe(true);

      apiKeyStorage.removeEndpointApiKey();
      expect(apiKeyStorage.hasEndpointApiKey()).toBe(false);
    });
  });
});

describe('STORAGE_KEYS constant', () => {
  it('should have OPENAI_ENDPOINT_API_KEY constant', () => {
    expect(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY).toBe('openai_endpoint_api_key');
  });

  it('should have correct key values for all storage keys', () => {
    expect(Object.keys(STORAGE_KEYS)).toHaveLength(1);
    expect(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY).toBe('openai_endpoint_api_key');
  });
});

describe('Security considerations', () => {
  it('should use sessionStorage not localStorage', () => {
    // Verify we're using sessionStorage
    apiKeyStorage.setEndpointApiKey('sk-test-key');
    expect(sessionStorage.getItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY)).toBe('sk-test-key');
    // localStorage should not be used
    expect(localStorage.getItem(STORAGE_KEYS.OPENAI_ENDPOINT_API_KEY)).toBeNull();
  });

  it('should clear API keys when session ends (simulated)', () => {
    apiKeyStorage.setEndpointApiKey('sk-test-key');
    expect(apiKeyStorage.hasEndpointApiKey()).toBe(true);

    // Simulate session end by clearing sessionStorage
    // (In real browser, this happens when tab closes)
    sessionStorage.clear();

    expect(apiKeyStorage.hasEndpointApiKey()).toBe(false);
    expect(apiKeyStorage.getEndpointApiKey()).toBe('');
  });
});
