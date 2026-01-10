/**
 * Additional Features Integration Tests
 *
 * Tests additional benchmark features including:
 * - Few-shot examples configuration
 *
 * integ-049: Test few-shot examples configuration
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBenchmarkStore } from '../../../stores/useBenchmarkStore';

// Mock the preset store
vi.mock('../../../stores/usePresetStore', () => ({
  usePresetStore: () => ({
    presets: [],
    isLoadingPresets: false,
    loadPresets: vi.fn(() => Promise.resolve()),
    savePreset: vi.fn(() => Promise.resolve()),
    deletePreset: vi.fn(() => Promise.resolve()),
    applyPreset: vi.fn(() => Promise.resolve()),
  }),
}));

// Mock CSRF
vi.mock('../../../utils/csrf', () => ({
  csrf: {
    fetchWithCsrf: vi.fn(),
    getCsrfToken: vi.fn(() => 'mock-csrf-token'),
  },
}));

// Mock fetch
vi.mocked(global.fetch).mockImplementation(
  async () =>
    ({
      ok: true,
      json: async () => ({}),
    }) as Response
);

describe('Additional Features Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Reset benchmark store to default state
    const store = useBenchmarkStore.getState();
    store.setFewShotEnabled(false);
    store.setFewShotMode('all');
    store.setFewShotK(3);
  });

  describe('integ-049: Few-shot examples configuration', () => {
    it('should enable few-shot mode', () => {
      const store = useBenchmarkStore.getState();

      // Initially disabled
      expect(store.fewShotEnabled).toBe(false);

      // Enable few-shot
      store.setFewShotEnabled(true);

      // Verify setting is saved
      expect(useBenchmarkStore.getState().fewShotEnabled).toBe(true);

      // Disable and verify
      store.setFewShotEnabled(false);
      expect(useBenchmarkStore.getState().fewShotEnabled).toBe(false);
    });

    it('should set few-shot mode to all', () => {
      const store = useBenchmarkStore.getState();

      store.setFewShotEnabled(true);
      store.setFewShotMode('all');

      // Verify mode is saved
      expect(useBenchmarkStore.getState().fewShotMode).toBe('all');
    });

    it('should set few-shot mode to k-shot', () => {
      const store = useBenchmarkStore.getState();

      store.setFewShotEnabled(true);
      store.setFewShotMode('k-shot');

      // Verify mode is saved
      expect(useBenchmarkStore.getState().fewShotMode).toBe('k-shot');
    });

    it('should set few-shot mode to custom', () => {
      const store = useBenchmarkStore.getState();

      store.setFewShotEnabled(true);
      store.setFewShotMode('custom');

      // Verify mode is saved
      expect(useBenchmarkStore.getState().fewShotMode).toBe('custom');
    });

    it('should configure k value for k-shot mode', () => {
      const store = useBenchmarkStore.getState();

      // Default k value is 3
      expect(store.fewShotK).toBe(3);

      // Set k to 5
      store.setFewShotK(5);
      expect(useBenchmarkStore.getState().fewShotK).toBe(5);

      // Set k to 1
      store.setFewShotK(1);
      expect(useBenchmarkStore.getState().fewShotK).toBe(1);

      // Set k to 10
      store.setFewShotK(10);
      expect(useBenchmarkStore.getState().fewShotK).toBe(10);
    });

    it('should support full few-shot configuration', () => {
      const store = useBenchmarkStore.getState();

      // Enable few-shot with k-shot mode and k=5
      store.setFewShotEnabled(true);
      store.setFewShotMode('k-shot');
      store.setFewShotK(5);

      // Verify all settings are saved
      const finalState = useBenchmarkStore.getState();
      expect(finalState.fewShotEnabled).toBe(true);
      expect(finalState.fewShotMode).toBe('k-shot');
      expect(finalState.fewShotK).toBe(5);
    });

    it('should switch between different few-shot modes', () => {
      const store = useBenchmarkStore.getState();

      store.setFewShotEnabled(true);

      // Start with 'all' mode
      store.setFewShotMode('all');
      expect(useBenchmarkStore.getState().fewShotMode).toBe('all');

      // Switch to 'k-shot' mode
      store.setFewShotMode('k-shot');
      expect(useBenchmarkStore.getState().fewShotMode).toBe('k-shot');

      // Switch to 'custom' mode
      store.setFewShotMode('custom');
      expect(useBenchmarkStore.getState().fewShotMode).toBe('custom');

      // Switch back to 'all'
      store.setFewShotMode('all');
      expect(useBenchmarkStore.getState().fewShotMode).toBe('all');
    });

    it('should persist k value when switching modes', () => {
      const store = useBenchmarkStore.getState();

      store.setFewShotEnabled(true);
      store.setFewShotK(7);

      // Switch from all to k-shot
      store.setFewShotMode('all');
      expect(useBenchmarkStore.getState().fewShotK).toBe(7);

      store.setFewShotMode('k-shot');
      expect(useBenchmarkStore.getState().fewShotK).toBe(7);

      // Update k while in k-shot mode
      store.setFewShotK(4);
      expect(useBenchmarkStore.getState().fewShotK).toBe(4);

      // Switch to custom - k should persist
      store.setFewShotMode('custom');
      expect(useBenchmarkStore.getState().fewShotK).toBe(4);
    });
  });
});
