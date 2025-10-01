import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBenchmarkStore } from '../../stores/useBenchmarkStore';

describe('useBenchmarkStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { result } = renderHook(() => useBenchmarkStore());
    act(() => {
      result.current.setRubricEnabled(false);
      result.current.setCorrectnessEnabled(true);
      result.current.setFewShotEnabled(false);
      result.current.setFewShotMode('all');
      result.current.setFewShotK(3);
    });
  });

  it('should have default evaluation settings', () => {
    const { result } = renderHook(() => useBenchmarkStore());

    expect(result.current.rubricEnabled).toBe(false);
    expect(result.current.correctnessEnabled).toBe(true);
    expect(result.current.fewShotEnabled).toBe(false);
    expect(result.current.fewShotMode).toBe('all');
    expect(result.current.fewShotK).toBe(3);
  });

  it('should update rubricEnabled', () => {
    const { result } = renderHook(() => useBenchmarkStore());

    act(() => {
      result.current.setRubricEnabled(true);
    });

    expect(result.current.rubricEnabled).toBe(true);
  });

  it('should update correctnessEnabled', () => {
    const { result } = renderHook(() => useBenchmarkStore());

    act(() => {
      result.current.setCorrectnessEnabled(false);
    });

    expect(result.current.correctnessEnabled).toBe(false);
  });

  it('should update fewShotEnabled', () => {
    const { result } = renderHook(() => useBenchmarkStore());

    act(() => {
      result.current.setFewShotEnabled(true);
    });

    expect(result.current.fewShotEnabled).toBe(true);
  });

  it('should update fewShotMode', () => {
    const { result } = renderHook(() => useBenchmarkStore());

    act(() => {
      result.current.setFewShotMode('k-shot');
    });

    expect(result.current.fewShotMode).toBe('k-shot');
  });

  it('should update fewShotK', () => {
    const { result } = renderHook(() => useBenchmarkStore());

    act(() => {
      result.current.setFewShotK(5);
    });

    expect(result.current.fewShotK).toBe(5);
  });

  it('should persist state across hook remounts', () => {
    // First render - set some values
    const { result: result1, unmount } = renderHook(() => useBenchmarkStore());

    act(() => {
      result1.current.setRubricEnabled(true);
      result1.current.setCorrectnessEnabled(false);
      result1.current.setFewShotEnabled(true);
      result1.current.setFewShotMode('k-shot');
      result1.current.setFewShotK(7);
    });

    // Unmount (simulates switching tabs)
    unmount();

    // Second render - values should persist
    const { result: result2 } = renderHook(() => useBenchmarkStore());

    expect(result2.current.rubricEnabled).toBe(true);
    expect(result2.current.correctnessEnabled).toBe(false);
    expect(result2.current.fewShotEnabled).toBe(true);
    expect(result2.current.fewShotMode).toBe('k-shot');
    expect(result2.current.fewShotK).toBe(7);
  });
});
