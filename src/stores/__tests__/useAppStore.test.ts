import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../useAppStore';
import { act, renderHook } from '@testing-library/react';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.getState().resetAppState();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAppStore());
    
    expect(result.current.activeTab).toBe('extractor');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.sessionId).toMatch(/^otarbench_\d+_[a-z0-9]+$/);
  });

  it('should update active tab', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.setActiveTab('generator');
    });
    
    expect(result.current.activeTab).toBe('generator');
  });

  it('should update loading state', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.setIsLoading(true);
    });
    
    expect(result.current.isLoading).toBe(true);
  });

  it('should reset app state', () => {
    const { result } = renderHook(() => useAppStore());
    
    // Modify state
    act(() => {
      result.current.setActiveTab('benchmark');
      result.current.setIsLoading(true);
    });
    
    const originalSessionId = result.current.sessionId;
    
    // Reset state
    act(() => {
      result.current.resetAppState();
    });
    
    expect(result.current.activeTab).toBe('extractor');
    expect(result.current.isLoading).toBe(false);
    // Session ID should be regenerated
    expect(result.current.sessionId).not.toBe(originalSessionId);
  });

  it('should generate unique session IDs', () => {
    const { result: result1 } = renderHook(() => useAppStore());
    const sessionId1 = result1.current.sessionId;
    
    act(() => {
      result1.current.resetAppState();
    });
    
    const sessionId2 = result1.current.sessionId;
    
    expect(sessionId1).not.toBe(sessionId2);
    expect(sessionId1).toMatch(/^otarbench_\d+_[a-z0-9]+$/);
    expect(sessionId2).toMatch(/^otarbench_\d+_[a-z0-9]+$/);
  });
});