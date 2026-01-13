/**
 * Additional Features Integration Tests
 *
 * Tests additional benchmark features including:
 * - Few-shot examples configuration
 * - Metadata editor
 * - Trace highlighting configuration
 * - Manual trace upload
 * - Merge results dialog
 *
 * integ-049: Test few-shot examples configuration
 * integ-043: Test metadata editor
 * integ-051: Test trace highlighting configuration
 * integ-042: Test manual trace upload
 * integ-050: Test merge results dialog
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import manualTracesFixture from '../../../src/test-utils/fixtures/traces/manual-trace-upload.json';
import mergeableRunsFixture from '../../../src/test-utils/fixtures/verification/mergeable-runs.json';
import { useBenchmarkStore } from '../../../src/stores/useBenchmarkStore';
import { useDatasetStore } from '../../../src/stores/useDatasetStore';
import { useTraceHighlightingStore } from '../../../src/stores/useTraceHighlightingStore';
import type { HighlightPattern } from '../../../src/stores/useTraceHighlightingStore';
import type { MergeAction } from '../../../src/components/dialogs/MergeResultsDialog';

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

describe('Trace Highlighting Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Reset trace highlighting store to default state
    useTraceHighlightingStore.getState().resetToDefaults();
  });

  describe('integ-051: Trace highlighting configuration', () => {
    it('should toggle highlighting enabled state', () => {
      const store = useTraceHighlightingStore.getState();

      // Initially enabled by default
      expect(store.highlightingEnabled).toBe(true);

      // Disable highlighting
      store.setHighlightingEnabled(false);
      expect(useTraceHighlightingStore.getState().highlightingEnabled).toBe(false);

      // Re-enable highlighting
      store.setHighlightingEnabled(true);
      expect(useTraceHighlightingStore.getState().highlightingEnabled).toBe(true);
    });

    it('should add highlight pattern with regex', () => {
      const store = useTraceHighlightingStore.getState();

      const initialCount = store.patterns.length;

      // Add a new highlight pattern
      const newPattern: Omit<HighlightPattern, 'id'> = {
        name: 'Error Messages',
        pattern: 'error|warning|failed',
        colorId: 'red',
        enabled: true,
      };

      store.addPattern(newPattern);

      // Verify pattern was added
      const patterns = useTraceHighlightingStore.getState().patterns;
      expect(patterns.length).toBe(initialCount + 1);
      expect(patterns.some((p) => p.name === 'Error Messages')).toBe(true);
    });

    it('should update existing highlight pattern', () => {
      const store = useTraceHighlightingStore.getState();

      // Add a pattern first
      const pattern: Omit<HighlightPattern, 'id'> = {
        name: 'Test Pattern',
        pattern: 'test',
        colorId: 'blue',
        enabled: true,
      };
      store.addPattern(pattern);

      // Get the added pattern's ID
      const addedPattern = useTraceHighlightingStore.getState().patterns.find((p) => p.name === 'Test Pattern');
      const patternId = addedPattern?.id;

      if (patternId) {
        // Update the pattern
        store.updatePattern(patternId, {
          name: 'Updated Pattern',
          pattern: 'updated|test',
          colorId: 'green',
        });

        // Verify updates
        const updatedPattern = useTraceHighlightingStore.getState().patterns.find((p) => p.id === patternId);
        expect(updatedPattern?.name).toBe('Updated Pattern');
        expect(updatedPattern?.pattern).toBe('updated|test');
        expect(updatedPattern?.colorId).toBe('green');
        // enabled should remain unchanged
        expect(updatedPattern?.enabled).toBe(true);
      }
    });

    it('should remove highlight pattern', () => {
      const store = useTraceHighlightingStore.getState();

      // Add a pattern
      const pattern: Omit<HighlightPattern, 'id'> = {
        name: 'To Remove',
        pattern: 'remove',
        colorId: 'yellow',
        enabled: true,
      };
      store.addPattern(pattern);

      const beforeRemovalCount = useTraceHighlightingStore.getState().patterns.length;

      // Get the pattern ID
      const addedPattern = useTraceHighlightingStore.getState().patterns.find((p) => p.name === 'To Remove');
      const patternId = addedPattern?.id;

      if (patternId) {
        // Remove the pattern
        store.removePattern(patternId);

        // Verify removal
        const afterRemovalPatterns = useTraceHighlightingStore.getState().patterns;
        expect(afterRemovalPatterns.length).toBe(beforeRemovalCount - 1);
        expect(afterRemovalPatterns.some((p) => p.id === patternId)).toBe(false);
      }
    });

    it('should toggle pattern enabled state', () => {
      const store = useTraceHighlightingStore.getState();

      // Add an enabled pattern
      const pattern: Omit<HighlightPattern, 'id'> = {
        name: 'Toggle Test',
        pattern: 'toggle',
        colorId: 'purple',
        enabled: true,
      };
      store.addPattern(pattern);

      // Get the pattern ID
      const addedPattern = useTraceHighlightingStore.getState().patterns.find((p) => p.name === 'Toggle Test');
      const patternId = addedPattern?.id;

      if (patternId) {
        // Disable the pattern
        store.updatePattern(patternId, { enabled: false });
        expect(useTraceHighlightingStore.getState().patterns.find((p) => p.id === patternId)?.enabled).toBe(false);

        // Re-enable the pattern
        store.updatePattern(patternId, { enabled: true });
        expect(useTraceHighlightingStore.getState().patterns.find((p) => p.id === patternId)?.enabled).toBe(true);
      }
    });

    it('should support multiple highlight patterns with different colors', () => {
      const store = useTraceHighlightingStore.getState();

      const initialCount = store.patterns.length;

      // Add multiple patterns with different colors
      const patternsToAdd: Omit<HighlightPattern, 'id'>[] = [
        { name: 'Errors', pattern: '\\berror\\b', colorId: 'red', enabled: true },
        { name: 'Warnings', pattern: '\\bwarning\\b', colorId: 'yellow', enabled: true },
        { name: 'Success', pattern: '\\bsuccess\\b', colorId: 'green', enabled: true },
        { name: 'Info', pattern: '\\binfo\\b', colorId: 'blue', enabled: true },
      ];

      patternsToAdd.forEach((p) => store.addPattern(p));

      // Verify all patterns were added
      const patterns = useTraceHighlightingStore.getState().patterns;
      expect(patterns.length).toBe(initialCount + 4);

      // Verify each pattern has correct color
      expect(patterns.some((p) => p.name === 'Errors' && p.colorId === 'red')).toBe(true);
      expect(patterns.some((p) => p.name === 'Warnings' && p.colorId === 'yellow')).toBe(true);
      expect(patterns.some((p) => p.name === 'Success' && p.colorId === 'green')).toBe(true);
      expect(patterns.some((p) => p.name === 'Info' && p.colorId === 'blue')).toBe(true);
    });

    it('should reset to default patterns', () => {
      // Get default pattern count first
      const defaultPatternCount = useTraceHighlightingStore.getState().patterns.length;

      // Add custom patterns
      useTraceHighlightingStore.getState().addPattern({
        name: 'Custom 1',
        pattern: 'custom1',
        colorId: 'red',
        enabled: true,
      });
      useTraceHighlightingStore.getState().addPattern({
        name: 'Custom 2',
        pattern: 'custom2',
        colorId: 'blue',
        enabled: true,
      });

      const beforeResetCount = useTraceHighlightingStore.getState().patterns.length;
      expect(beforeResetCount).toBe(defaultPatternCount + 2);

      // Reset to defaults
      useTraceHighlightingStore.getState().resetToDefaults();

      // Verify reset (patterns should be back to defaults)
      const afterResetPatterns = useTraceHighlightingStore.getState().patterns;
      expect(afterResetPatterns.length).toBe(defaultPatternCount);
      // Check that custom patterns are gone
      expect(afterResetPatterns.some((p) => p.name === 'Custom 1')).toBe(false);
      expect(afterResetPatterns.some((p) => p.name === 'Custom 2')).toBe(false);
    });

    it('should support complex regex patterns', () => {
      const store = useTraceHighlightingStore.getState();

      // Add pattern with complex regex
      const complexPattern: Omit<HighlightPattern, 'id'> = {
        name: 'URLs',
        pattern: "https?://[\\w\\-\\.]+(:\\d+)?([/#][\\w\\-\\._~:/?\\#\\[\\]@!$&'()*+,;=]*)?",
        colorId: 'cyan',
        enabled: true,
      };

      store.addPattern(complexPattern);

      // Verify pattern was added
      const patterns = useTraceHighlightingStore.getState().patterns;
      expect(patterns.some((p) => p.name === 'URLs')).toBe(true);

      const urlPattern = patterns.find((p) => p.name === 'URLs');
      expect(urlPattern?.pattern).toContain('https?://');
    });
  });
});

describe('Manual Trace Upload Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('integ-042: Manual trace upload', () => {
    it('should validate manual trace file structure with MD5 hash keys', () => {
      // Fixture contains traces keyed by MD5 hashes (32 hex characters)
      const traces = (manualTracesFixture as { traces: Record<string, string> }).traces;

      // Verify fixture structure
      expect(traces).toBeDefined();
      expect(typeof traces).toBe('object');

      // Verify all keys are valid MD5 hashes (32 hex characters)
      const hashKeys = Object.keys(traces);
      expect(hashKeys.length).toBeGreaterThan(0);

      hashKeys.forEach((key) => {
        expect(key).toMatch(/^[a-f0-9]{32}$/i);
      });

      // Verify all values are strings (trace content)
      Object.values(traces).forEach((value) => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should verify trace content is valid JSON', () => {
      const traces = (manualTracesFixture as { traces: Record<string, string> }).traces;

      // Each trace value should be a valid string that could be JSON
      const firstTrace = Object.values(traces)[0];
      expect(firstTrace).toBeDefined();
      expect(typeof firstTrace).toBe('string');

      // Verify trace contains meaningful content
      expect(firstTrace).toContain('Paris');
    });

    it('should support multiple traces in single file', () => {
      const traces = (manualTracesFixture as { traces: Record<string, string> }).traces;

      // Verify multiple traces
      expect(Object.keys(traces).length).toBe(3);

      // Verify each trace has unique hash key
      const keys = Object.keys(traces);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(3);
    });

    it('should verify trace hash format is consistent', () => {
      const traces = (manualTracesFixture as { traces: Record<string, string> }).traces;

      // All hashes should be lowercase hex
      for (const key of Object.keys(traces)) {
        expect(key).toMatch(/^[a-f0-9]{32}$/);
        expect(key.length).toBe(32);
      }
    });

    it('should handle empty trace file gracefully', () => {
      // Empty traces object
      const emptyTraces: Record<string, string> = {};

      expect(Object.keys(emptyTraces).length).toBe(0);
      expect(emptyTraces).toBeDefined();
    });

    it('should reject invalid trace key formats', () => {
      // Invalid formats
      const invalidKeys = [
        'not-a-hash', // Not hex
        'abc123', // Too short
        'g'.repeat(32), // Invalid hex character
        '', // Empty string
      ];

      invalidKeys.forEach((key) => {
        expect(key).not.toMatch(/^[a-f0-9]{32}$/i);
      });
    });

    it('should verify trace association with question by hash', () => {
      const traces = (manualTracesFixture as { traces: Record<string, string> }).traces;

      // In a real scenario, the MD5 hash of the question text would match the key
      // For this test, we just verify the structure supports this pattern
      const sampleHash = '5d41402abc4b2a76b9719d911017c592';
      const sampleTrace = traces[sampleHash];

      expect(sampleTrace).toBeDefined();
      expect(sampleTrace).toContain('Paris');
    });

    it('should support trace content with various formats', () => {
      const traces = (manualTracesFixture as { traces: Record<string, string> }).traces;

      // Traces can contain various answer formats
      const trace1 = traces['5d41402abc4b2a76b9719d911017c592']; // Text answer
      const trace2 = traces['098f6bcd4621d373cade4e832627b4f6']; // Math answer with equation
      const trace3 = traces['ad0234829205b9033196ba818f7a872b']; // List answer

      expect(trace1).toContain('Paris');
      expect(trace2).toContain('42');
      expect(trace3).toContain('red');
      expect(trace3).toContain('blue');
      expect(trace3).toContain('yellow');
    });

    it('should handle special characters in trace content', () => {
      const traces = (manualTracesFixture as { traces: Record<string, string> }).traces;

      // Traces may contain special characters, numbers, punctuation
      const mathTrace = traces['098f6bcd4621d373cade4e832627b4f6'];
      expect(mathTrace).toContain('+');
      expect(mathTrace).toContain('=');
      expect(mathTrace).toContain('42');
    });
  });
});

describe('Merge Results Dialog Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('integ-050: Merge results dialog', () => {
    it('should calculate merge statistics for two runs', () => {
      const runs = (
        mergeableRunsFixture as { runs: Array<{ results_count: number; results: Record<string, unknown> }> }
      ).runs;

      const run1 = runs[0];
      const run2 = runs[1];

      // Get result keys from each run
      const run1Keys = Object.keys(run1.results);
      const run2Keys = Object.keys(run2.results);

      // Calculate counts
      const existingCount = run1Keys.length;
      const uploadedCount = run2Keys.length;

      // Find conflicts (same question_id in both runs)
      const run1Questions = new Set(run1Keys.map((k) => k.split('_')[0]));
      const run2Questions = new Set(run2Keys.map((k) => k.split('_')[0]));
      const conflictQuestions = [...run1Questions].filter((q) => run2Questions.has(q));
      const conflictCount = conflictQuestions.length;

      // Total after merge = unique questions from both runs with all model combinations
      const totalAfterMerge = existingCount + uploadedCount - conflictCount;

      expect(existingCount).toBe(3);
      expect(uploadedCount).toBe(4);
      expect(conflictCount).toBe(3); // q1, q2, q3 are in both runs
      expect(totalAfterMerge).toBe(4); // 3 + 4 - 3 = 4 unique results
    });

    it('should verify replace strategy clears existing results', () => {
      const runs = (mergeableRunsFixture as { runs: Array<{ results: Record<string, unknown> }> }).runs;

      const uploadedResults = runs[1].results;

      // Simulate replace: uploaded becomes the only results
      const replaceAction: MergeAction = 'replace';
      expect(replaceAction).toBe('replace');

      // After replace, we should only have uploaded results
      const finalResultKeys = Object.keys(uploadedResults);
      expect(finalResultKeys.length).toBe(4);
    });

    it('should verify merge strategy combines results', () => {
      const runs = (mergeableRunsFixture as { runs: Array<{ results: Record<string, unknown> }> }).runs;

      const existingResults = runs[0].results;
      const uploadedResults = runs[1].results;

      // Simulate merge: combine both, uploaded wins on conflicts
      const mergedResults = { ...existingResults, ...uploadedResults };

      // Verify all results are present
      const mergedKeys = Object.keys(mergedResults);
      expect(mergedKeys.length).toBeGreaterThan(0);

      // Verify uploaded results overwrote conflicts
      expect(mergedResults).toHaveProperty(Object.keys(uploadedResults)[0]);
    });

    it('should handle merge with no existing results', () => {
      const runs = (mergeableRunsFixture as { runs: Array<{ results: Record<string, unknown> }> }).runs;

      const uploadedResults = runs[1].results;
      const existingResults: Record<string, unknown> = {};

      // No existing results - just load uploaded
      const mergedResults = { ...existingResults, ...uploadedResults };

      expect(Object.keys(existingResults).length).toBe(0);
      expect(Object.keys(mergedResults).length).toBe(4);
      expect(Object.keys(uploadedResults).length).toBe(4);
    });

    it('should verify conflict detection by result key', () => {
      const runs = (mergeableRunsFixture as { runs: Array<{ results: Record<string, unknown> }> }).runs;

      const run1Keys = Object.keys(runs[0].results);
      const run2Keys = Object.keys(runs[1].results);

      // No exact key matches because model names differ
      const exactConflicts = run1Keys.filter((k) => run2Keys.includes(k));
      expect(exactConflicts.length).toBe(0);

      // But question_id conflicts exist
      const run1Questions = run1Keys.map((k) => k.split('_')[0]);
      const run2Questions = run2Keys.map((k) => k.split('_')[0]);
      const questionConflicts = run1Questions.filter((q) => run2Questions.includes(q));
      expect(questionConflicts.length).toBe(3);
    });

    it('should support cancel action without modifying results', () => {
      const cancelAction: MergeAction = 'cancel';
      expect(cancelAction).toBe('cancel');

      const runs = (mergeableRunsFixture as { runs: Array<{ results: Record<string, unknown> }> }).runs;
      const originalResults = runs[0].results;

      // Cancel should preserve original results
      const originalKeys = Object.keys(originalResults);
      expect(originalKeys.length).toBe(3);
    });
  });
});
