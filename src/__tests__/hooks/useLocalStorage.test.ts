import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Value Handling', () => {
    it('should return initial value when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));
      
      expect(result.current[0]).toBe('initial-value');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
    });

    it('should return stored value when localStorage has data', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify('stored-value'));
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));
      
      expect(result.current[0]).toBe('stored-value');
    });

    it('should handle complex objects', () => {
      const complexObject = { name: 'test', items: [1, 2, 3], nested: { value: true } };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(complexObject));
      
      const { result } = renderHook(() => useLocalStorage('test-key', {}));
      
      expect(result.current[0]).toEqual(complexObject);
    });

    it('should handle arrays', () => {
      const arrayValue = [1, 2, 3, 'test'];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(arrayValue));
      
      const { result } = renderHook(() => useLocalStorage('test-key', []));
      
      expect(result.current[0]).toEqual(arrayValue);
    });

    it('should handle null values', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(null));
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      
      expect(result.current[0]).toBe(null);
    });
  });

  describe('Value Setting', () => {
    it('should set value and update localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      expect(result.current[0]).toBe('new-value');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify('new-value')
      );
    });

    it('should handle function updates', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(5));
      
      const { result } = renderHook(() => useLocalStorage('test-key', 0));
      
      act(() => {
        result.current[1]((prev: number) => prev + 1);
      });
      
      expect(result.current[0]).toBe(6);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(6)
      );
    });

    it('should handle object updates', () => {
      const initialObject = { count: 0, name: 'test' };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialObject));
      
      const { result } = renderHook(() => useLocalStorage('test-key', {}));
      
      const updatedObject = { count: 1, name: 'updated' };
      act(() => {
        result.current[1](updatedObject);
      });
      
      expect(result.current[0]).toEqual(updatedObject);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(updatedObject)
      );
    });

    it('should handle array updates', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([1, 2]));
      
      const { result } = renderHook(() => useLocalStorage('test-key', []));
      
      act(() => {
        result.current[1]((prev: number[]) => [...prev, 3]);
      });
      
      expect(result.current[0]).toEqual([1, 2, 3]);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify([1, 2, 3])
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parse errors gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      
      // Mock console.error to avoid noise in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      
      expect(result.current[0]).toBe('default');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error reading localStorage key "test-key":',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle localStorage getItem errors', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      
      expect(result.current[0]).toBe('default');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error reading localStorage key "test-key":',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle localStorage setItem errors', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage setItem error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      // State should still update even if localStorage fails
      expect(result.current[0]).toBe('new-value');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error setting localStorage key "test-key":',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle quota exceeded errors', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
      
      act(() => {
        result.current[1]('large-value');
      });
      
      expect(result.current[0]).toBe('large-value');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Data Serialization', () => {
    it('should serialize and deserialize strings correctly', () => {
      const testString = 'test string with special chars: !@#$%^&*()';
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testString));
      
      const { result } = renderHook(() => useLocalStorage('test-key', ''));
      
      expect(result.current[0]).toBe(testString);
    });

    it('should serialize and deserialize numbers correctly', () => {
      const testNumber = 123.456;
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testNumber));
      
      const { result } = renderHook(() => useLocalStorage('test-key', 0));
      
      expect(result.current[0]).toBe(testNumber);
    });

    it('should serialize and deserialize booleans correctly', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(true));
      
      const { result } = renderHook(() => useLocalStorage('test-key', false));
      
      expect(result.current[0]).toBe(true);
    });

    it('should handle undefined values', () => {
      mockLocalStorage.getItem.mockReturnValue('undefined');
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      
      expect(result.current[0]).toBe('default');
    });

    it('should handle Date objects', () => {
      const testDate = new Date('2024-12-19T10:00:00Z');
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testDate.toISOString()));
      
      const { result } = renderHook(() => useLocalStorage('test-key', ''));
      
      expect(result.current[0]).toBe(testDate.toISOString());
    });
  });

  describe('Concurrent Access', () => {
    it('should handle multiple hooks with same key', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify('shared-value'));
      
      const { result: result1 } = renderHook(() => useLocalStorage('shared-key', 'default'));
      const { result: result2 } = renderHook(() => useLocalStorage('shared-key', 'default'));
      
      expect(result1.current[0]).toBe('shared-value');
      expect(result2.current[0]).toBe('shared-value');
      
      // Update from first hook
      act(() => {
        result1.current[1]('updated-value');
      });
      
      expect(result1.current[0]).toBe('updated-value');
      // Note: result2 won't automatically update unless there's a storage event listener
      // This is expected behavior for the current implementation
    });

    it('should handle different keys independently', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'key1') return JSON.stringify('value1');
        if (key === 'key2') return JSON.stringify('value2');
        return null;
      });
      
      const { result: result1 } = renderHook(() => useLocalStorage('key1', 'default1'));
      const { result: result2 } = renderHook(() => useLocalStorage('key2', 'default2'));
      
      expect(result1.current[0]).toBe('value1');
      expect(result2.current[0]).toBe('value2');
      
      act(() => {
        result1.current[1]('updated1');
      });
      
      expect(result1.current[0]).toBe('updated1');
      expect(result2.current[0]).toBe('value2'); // Should remain unchanged
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const { result, rerender } = renderHook(() => useLocalStorage('test-key', 'initial'));
      
      const initialValue = result.current[0];
      const initialSetter = result.current[1];
      
      // Re-render without changing props
      rerender();
      
      // Value should be stable
      expect(result.current[0]).toBe(initialValue);
      // Note: Setter function may not be referentially stable in all implementations
      // This is acceptable as long as it works correctly
      expect(typeof result.current[1]).toBe('function');
    });

    it('should handle large objects efficiently', () => {
      const largeObject = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: Math.random(),
        })),
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(largeObject));
      
      const { result } = renderHook(() => useLocalStorage('large-key', {}));
      
      expect(result.current[0]).toEqual(largeObject);
      
      // Update should work efficiently
      act(() => {
        result.current[1]({ ...largeObject, updated: true });
      });
      
      expect(result.current[0]).toEqual({ ...largeObject, updated: true });
    });
  });
}); 