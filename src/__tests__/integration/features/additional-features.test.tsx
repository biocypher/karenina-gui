/**
 * Additional Features Integration Tests
 *
 * Tests additional benchmark features including:
 * - Few-shot examples configuration
 * - Metadata editor
 *
 * integ-049: Test few-shot examples configuration
 * integ-043: Test metadata editor
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBenchmarkStore } from '../../../stores/useBenchmarkStore';
import { useDatasetStore } from '../../../stores/useDatasetStore';

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

describe('Metadata Editor Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Reset dataset store to default state
    useDatasetStore.getState().resetMetadata();
  });

  describe('integ-043: Metadata editor', () => {
    it('should edit dataset name', () => {
      const store = useDatasetStore.getState();

      // Set name
      store.updateField('name', 'Test Dataset Name');

      // Verify name is saved
      expect(useDatasetStore.getState().metadata.name).toBe('Test Dataset Name');

      // Update name
      store.updateField('name', 'Updated Dataset Name');
      expect(useDatasetStore.getState().metadata.name).toBe('Updated Dataset Name');
    });

    it('should edit dataset description', () => {
      const store = useDatasetStore.getState();

      const description = 'This is a comprehensive test dataset for benchmark evaluation.';

      store.updateField('description', description);

      expect(useDatasetStore.getState().metadata.description).toBe(description);
    });

    it('should edit dataset version', () => {
      const store = useDatasetStore.getState();

      // Default version is '1.0.0'
      expect(useDatasetStore.getState().metadata.version).toBe('1.0.0');

      // Update version
      store.updateField('version', '2.1.0');
      expect(useDatasetStore.getState().metadata.version).toBe('2.1.0');
    });

    it('should edit dataset license', () => {
      const store = useDatasetStore.getState();

      store.updateField('license', 'MIT');
      expect(useDatasetStore.getState().metadata.license).toBe('MIT');

      store.updateField('license', 'Apache-2.0');
      expect(useDatasetStore.getState().metadata.license).toBe('Apache-2.0');
    });

    it('should add keywords to dataset', () => {
      const store = useDatasetStore.getState();

      // Add first keyword
      store.addKeyword('benchmark');
      expect(useDatasetStore.getState().metadata.keywords).toContain('benchmark');

      // Add more keywords
      store.addKeyword('evaluation');
      store.addKeyword('llm');

      const keywords = useDatasetStore.getState().metadata.keywords || [];
      expect(keywords).toHaveLength(3);
      expect(keywords).toContain('benchmark');
      expect(keywords).toContain('evaluation');
      expect(keywords).toContain('llm');
    });

    it('should remove keywords from dataset', () => {
      const store = useDatasetStore.getState();

      // Add keywords
      store.addKeyword('benchmark');
      store.addKeyword('test');
      store.addKeyword('evaluation');

      expect(useDatasetStore.getState().metadata.keywords).toHaveLength(3);

      // Remove a keyword
      store.removeKeyword('test');

      const keywords = useDatasetStore.getState().metadata.keywords || [];
      expect(keywords).toHaveLength(2);
      expect(keywords).toContain('benchmark');
      expect(keywords).toContain('evaluation');
      expect(keywords).not.toContain('test');
    });

    it('should support full metadata configuration', () => {
      const store = useDatasetStore.getState();

      // Set all basic metadata fields
      store.updateField('name', 'Comprehensive Benchmark Dataset');
      store.updateField('description', 'A dataset for testing LLM capabilities across multiple domains.');
      store.updateField('version', '1.5.0');
      store.updateField('license', 'CC-BY-4.0');

      // Add keywords
      store.addKeyword('llm');
      store.addKeyword('benchmark');
      store.addKeyword('nlp');

      // Verify all fields are saved
      const metadata = useDatasetStore.getState().metadata;
      expect(metadata.name).toBe('Comprehensive Benchmark Dataset');
      expect(metadata.description).toBe('A dataset for testing LLM capabilities across multiple domains.');
      expect(metadata.version).toBe('1.5.0');
      expect(metadata.license).toBe('CC-BY-4.0');
      expect(metadata.keywords).toHaveLength(3);
    });

    it('should replace entire metadata object', () => {
      const store = useDatasetStore.getState();

      const newMetadata = {
        name: 'Replacement Dataset',
        description: 'This replaces all metadata',
        version: '3.0.0',
        license: 'GPL-3.0',
        keywords: ['replacement', 'test'],
      };

      store.setMetadata(newMetadata);

      const metadata = useDatasetStore.getState().metadata;
      expect(metadata.name).toBe('Replacement Dataset');
      expect(metadata.description).toBe('This replaces all metadata');
      expect(metadata.version).toBe('3.0.0');
      expect(metadata.license).toBe('GPL-3.0');
      expect(metadata.keywords).toEqual(['replacement', 'test']);
    });
  });
});
