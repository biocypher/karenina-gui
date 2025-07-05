import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce, useDebouncedCallback } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce string values correctly', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 300 },
    });

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated', delay: 300 });
    expect(result.current).toBe('initial'); // Should still be initial

    // Fast forward time by 299ms (just before delay)
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('initial'); // Should still be initial

    // Fast forward by 1ms more (completing the delay)
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated'); // Should now be updated
  });

  it('should reset timer when value changes rapidly', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    });

    // Rapid changes
    rerender({ value: 'change1' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'change2' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'final' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should still be initial because timer keeps resetting
    expect(result.current).toBe('initial');

    // Complete the full delay from last change
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('final');
  });

  it('should work with different data types', () => {
    // Test with numbers
    const { result: numberResult, rerender: numberRerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: 42 },
    });

    numberRerender({ value: 100 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(numberResult.current).toBe(100);

    // Test with objects
    const initialObj = { id: 1, name: 'test' };
    const updatedObj = { id: 2, name: 'updated' };

    const { result: objectResult, rerender: objectRerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: initialObj },
    });

    objectRerender({ value: updatedObj });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(objectResult.current).toBe(updatedObj);
  });

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(({ delay }) => useDebounce('test', delay), {
      initialProps: { delay: 500 },
    });

    rerender({ delay: 100 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should work with new delay
    expect(result.current).toBe('test');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce callback execution', () => {
    const mockCallback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(mockCallback, 300));

    // Call the debounced function multiple times
    act(() => {
      result.current('arg1');
      result.current('arg2');
      result.current('arg3');
    });

    // Callback should not have been called yet
    expect(mockCallback).not.toHaveBeenCalled();

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Callback should be called only once with the last arguments
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('arg3');
  });

  it('should cancel previous timeouts when called repeatedly', () => {
    const mockCallback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(mockCallback, 300));

    // Rapid calls
    act(() => {
      result.current('call1');
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current('call2');
    });

    // Only the last call should execute after full delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('call2');
  });

  it('should handle multiple arguments correctly', () => {
    const mockCallback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(mockCallback, 300));

    act(() => {
      result.current('arg1', 'arg2', { key: 'value' });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockCallback).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
  });

  it('should clean up timeout on unmount', () => {
    const mockCallback = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(mockCallback, 300));

    act(() => {
      result.current('test');
    });

    // Unmount before timeout completes
    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Callback should not be called after unmount
    expect(mockCallback).not.toHaveBeenCalled();
  });
});
