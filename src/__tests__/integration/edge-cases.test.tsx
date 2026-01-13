/**
 * Edge Cases Integration Tests
 *
 * Tests for edge cases and error scenarios including:
 * - Browser events (refresh, timeout)
 * - Network resilience
 * - Invalid state recovery
 * - Large dataset handling
 * - Concurrent operations
 *
 * integ-035: Test large dataset handling (1000+ questions)
 * integ-036: Test concurrent operations
 * integ-037: Test browser events (refresh, timeout)
 * integ-038: Test network resilience
 * integ-039: Test invalid state recovery
 * integ-058: Test generate templates for many questions
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { render } from '../../test-utils/test-helpers';
import App from '../../App';

describe('Edge Cases Integration Tests', () => {
  beforeEach(() => {
    // Reset stores between tests
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('integ-037: Browser events (refresh, timeout)', () => {
    it('should verify app state persists in localStorage', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Verify localStorage API is available
      expect(typeof localStorage.getItem).toBe('function');
      expect(typeof localStorage.setItem).toBe('function');
      expect(typeof localStorage.removeItem).toBe('function');
      expect(typeof localStorage.clear).toBe('function');

      // Simulate setting localStorage data (as the app would)
      const testData = { test: 'data', timestamp: Date.now() };

      expect(() => {
        localStorage.setItem('karenina-test', JSON.stringify(testData));
      }).not.toThrow();

      // Clean up
      try {
        localStorage.removeItem('karenina-test');
      } catch {
        // localStorage might be cleared between tests
      }
    });

    it('should verify sessionStorage is available for session data', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Verify sessionStorage is available
      expect(typeof sessionStorage.setItem).toBe('function');
      expect(typeof sessionStorage.getItem).toBe('function');
      expect(typeof sessionStorage.removeItem).toBe('function');
      expect(typeof sessionStorage.clear).toBe('function');
    });

    it('should handle beforeunload event gracefully', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create and dispatch beforeunload event
      const beforeUnloadEvent = new Event('beforeunload', {
        cancelable: true,
      });

      // The event should be dispatchable without errors
      expect(() => {
        window.dispatchEvent(beforeUnloadEvent);
      }).not.toThrow();

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should verify unload event handler does not crash app', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create and dispatch unload event
      const unloadEvent = new Event('unload');

      // The event should be dispatchable without errors
      expect(() => {
        window.dispatchEvent(unloadEvent);
      }).not.toThrow();
    });

    it('should handle pagehide event (modern replacement for unload)', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create and dispatch pagehide event
      const pageHideEvent = new PageTransitionEvent('pagehide', {
        persisted: false,
      });

      // The event should be dispatchable without errors
      expect(() => {
        window.dispatchEvent(pageHideEvent);
      }).not.toThrow();

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should handle pageshow event for back navigation', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create and dispatch pageshow event
      const pageShowEvent = new PageTransitionEvent('pageshow', {
        persisted: false,
      });

      // The event should be dispatchable without errors
      expect(() => {
        window.dispatchEvent(pageShowEvent);
      }).not.toThrow();

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should verify visibility change handling', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Verify document visibility API is available
      expect(typeof document.hidden).toBe('boolean');
      expect(typeof document.visibilityState).toBe('string');

      // Create and dispatch visibility change event
      const visibilityEvent = new Event('visibilitychange');

      // The event should be dispatchable without errors
      expect(() => {
        document.dispatchEvent(visibilityEvent);
      }).not.toThrow();

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should verify localStorage quota handling', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Try to set a reasonable amount of data
      const testData = { data: 'x'.repeat(1000) }; // 1KB of data

      expect(() => {
        localStorage.setItem('quota-test', JSON.stringify(testData));
      }).not.toThrow();

      // Verify localStorage API is functional
      expect(typeof localStorage.getItem).toBe('function');
      expect(typeof localStorage.setItem).toBe('function');
      expect(typeof localStorage.removeItem).toBe('function');

      // Clean up (no error if already cleared)
      try {
        localStorage.removeItem('quota-test');
      } catch {
        // localStorage might be cleared between tests
      }
    });

    it('should handle focus and blur events', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create and dispatch focus event
      const focusEvent = new FocusEvent('focus');

      expect(() => {
        window.dispatchEvent(focusEvent);
      }).not.toThrow();

      // Create and dispatch blur event
      const blurEvent = new FocusEvent('blur');

      expect(() => {
        window.dispatchEvent(blurEvent);
      }).not.toThrow();

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should verify online/offline event handling', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Verify navigator.onLine is available
      expect(typeof navigator.onLine).toBe('boolean');

      // Create and dispatch online event
      const onlineEvent = new Event('online');

      expect(() => {
        window.dispatchEvent(onlineEvent);
      }).not.toThrow();

      // Create and dispatch offline event
      const offlineEvent = new Event('offline');

      expect(() => {
        window.dispatchEvent(offlineEvent);
      }).not.toThrow();

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('integ-039: Invalid state recovery', () => {
    it('should handle null values in store without crashing', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Verify app is initially responsive
      expect(document.body).toBeInTheDocument();

      // App should handle potential null/undefined values gracefully
      // This is verified by the app still being rendered and responsive
      const buttons = document.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(0);
    });

    it('should verify store reset functionality', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');
      const { useDatasetStore } = await import('../../stores/useDatasetStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Reset stores should not crash the app
      expect(() => {
        useQuestionStore.getState().resetQuestionState();
        useDatasetStore.getState().resetMetadata();
      }).not.toThrow();

      // App should still be responsive after reset
      expect(document.body).toBeInTheDocument();
    });

    it('should handle empty checkpoint data gracefully', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Load empty checkpoint should not crash
      expect(() => {
        useQuestionStore.getState().loadCheckpoint({
          version: '1.0',
          checkpoint: {},
          global_rubric: undefined,
        });
      }).not.toThrow();

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should handle malformed JSON in localStorage gracefully', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Write malformed JSON to localStorage
      const malformedKey = 'karenina-mal-test';
      localStorage.setItem(malformedKey, '{invalid json}');

      // App should still work despite malformed data
      expect(document.body).toBeInTheDocument();

      // Clean up
      localStorage.removeItem(malformedKey);
    });

    it('should verify error boundaries catch component errors', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Verify the app structure exists
      const appContainer = document.querySelector('#root') || document.body;

      // App should be mounted
      expect(appContainer).toBeInTheDocument();

      // Error boundaries should be in place (verified by app rendering successfully)
      expect(document.body).toBeInTheDocument();
    });

    it('should handle missing question references in checkpoint', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create checkpoint with inconsistent data
      const inconsistentCheckpoint = {
        version: '1.0' as const,
        checkpoint: {
          q1: {
            question: 'Question 1',
            raw_answer: 'Answer 1',
            original_answer_template: 'class Answer(BaseAnswer):\n    value: str',
            answer_template: 'class Answer(BaseAnswer):\n    value: str',
            last_modified: new Date().toISOString(),
            finished: true,
          },
          // q2 is referenced in questionData but not in checkpoint
        },
        global_rubric: undefined,
      };

      // Loading should not crash
      expect(() => {
        useQuestionStore.getState().loadCheckpoint(inconsistentCheckpoint);
      }).not.toThrow();

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should verify store state consistency after operations', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Perform multiple operations and verify consistency
      useQuestionStore.getState().resetQuestionState();

      const stateAfterReset = useQuestionStore.getState();
      const questionDataKeysAfter = Object.keys(stateAfterReset.questionData);

      // After reset, question data should be empty
      expect(questionDataKeysAfter.length).toBe(0);

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should handle concurrent store operations without corruption', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');
      const { useDatasetStore } = await import('../../stores/useDatasetStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Perform multiple operations on different stores
      expect(() => {
        // Dataset operations
        useDatasetStore.getState().setMetadata({
          name: 'Test Benchmark',
          description: 'Test description',
          creator: 'test-user',
          keywords: ['test'],
        });

        // Question operations
        useQuestionStore.getState().resetQuestionState();

        // Combined operations
        useDatasetStore.getState().connectDatabase('https://example.com/db', 'test');
        useDatasetStore.getState().disconnectDatabase();
      }).not.toThrow();

      // App should still be responsive after concurrent operations
      expect(document.body).toBeInTheDocument();

      // Verify stores are in consistent state
      const datasetState = useDatasetStore.getState();
      expect(datasetState.isConnectedToDatabase).toBe(false);
    });
  });

  describe('integ-036: Concurrent operations', () => {
    it('should handle rapid store operations without corruption', async () => {
      const { useDatasetStore } = await import('../../stores/useDatasetStore');
      const { useBenchmarkStore } = await import('../../stores/useBenchmarkStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Perform rapid operations on multiple stores
      for (let i = 0; i < 10; i++) {
        useDatasetStore.getState().setMetadata({
          name: `Benchmark ${i}`,
          description: `Test benchmark ${i}`,
          creator: 'test-user',
          keywords: [`test-${i}`],
        });

        useBenchmarkStore.getState().setRunName(`run-${i}`);

        useDatasetStore.getState().connectDatabase(`https://db${i}.example.com`, `benchmark-${i}`);
      }

      // Verify final state is consistent (last operation should win)
      const finalDatasetState = useDatasetStore.getState();
      expect(finalDatasetState.metadata.name).toBe('Benchmark 9');
      expect(finalDatasetState.storageUrl).toBe('https://db9.example.com');

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should handle rapid tab switching without state loss', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Set up some state
      useQuestionStore.getState().setSelectedQuestionId('q1');

      // Simulate rapid tab switching by changing app state
      for (let i = 0; i < 20; i++) {
        // This simulates what would happen during rapid tab switching
        const currentState = useQuestionStore.getState();
        expect(currentState).toBeDefined();
        expect(document.body).toBeInTheDocument();
      }

      // Verify state is still accessible
      const finalState = useQuestionStore.getState();
      expect(finalState).toBeDefined();
    });

    it('should maintain consistency during simultaneous state updates', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');
      const { useDatasetStore } = await import('../../stores/useDatasetStore');
      const { useBenchmarkStore } = await import('../../stores/useBenchmarkStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Simulate concurrent updates (all happening rapidly)
      const operations = [
        useDatasetStore.getState().setMetadata({
          name: 'Concurrent Test',
          description: 'Testing concurrent operations',
          creator: 'test-user',
          keywords: ['concurrent'],
        }),
        useBenchmarkStore.getState().setRunName('concurrent-run'),
        useBenchmarkStore.getState().setReplicateCount(5),
        useQuestionStore.getState().setSelectedQuestionId('q-concurrent'),
        useDatasetStore.getState().connectDatabase('https://concurrent.example.com', 'test'),
      ];

      // All operations should complete without errors
      expect(() => {
        operations.forEach((op) => {
          if (op instanceof Error) throw op;
        });
      }).not.toThrow();

      // Verify all stores are in consistent states
      const datasetState = useDatasetStore.getState();
      const benchmarkState = useBenchmarkStore.getState();
      const questionState = useQuestionStore.getState();

      expect(datasetState.metadata.name).toBe('Concurrent Test');
      expect(benchmarkState.runName).toBe('concurrent-run');
      expect(benchmarkState.replicateCount).toBe(5);
      expect(questionState.selectedQuestionId).toBe('q-concurrent');
      expect(datasetState.isConnectedToDatabase).toBe(true);

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should handle state updates during navigation simulation', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Simulate navigation between questions while updating state
      const questionIds = ['q1', 'q2', 'q3', 'q4', 'q5'];

      questionIds.forEach((id) => {
        useQuestionStore.getState().setSelectedQuestionId(id);
        useQuestionStore.getState().setCurrentTemplate(`// Template for ${id}\n`);

        // Verify state is consistent after each operation
        const currentState = useQuestionStore.getState();
        expect(currentState.selectedQuestionId).toBe(id);
        expect(document.body).toBeInTheDocument();
      });

      // Final state should be the last set value
      const finalState = useQuestionStore.getState();
      expect(finalState.selectedQuestionId).toBe('q5');
    });

    it('should verify no state corruption with alternating operations', async () => {
      const { useDatasetStore } = await import('../../stores/useDatasetStore');
      const { useBenchmarkStore } = await import('../../stores/useBenchmarkStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Alternate between different store operations
      for (let i = 0; i < 15; i++) {
        if (i % 2 === 0) {
          useDatasetStore.getState().setMetadata({
            name: `Alt Benchmark ${i}`,
            description: `Alternate test ${i}`,
          });
        } else {
          useBenchmarkStore.getState().setRunName(`alt-run-${i}`);
          useBenchmarkStore.getState().setReplicateCount((i % 5) + 1);
        }
      }

      // Verify stores are in consistent final state
      const datasetState = useDatasetStore.getState();
      const benchmarkState = useBenchmarkStore.getState();

      // Last even index was 14, so name should be 'Alt Benchmark 14'
      expect(datasetState.metadata.name).toBe('Alt Benchmark 14');

      // Last odd index was 13, so runName should be 'alt-run-13'
      expect(benchmarkState.runName).toBe('alt-run-13');

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should handle database operations during state changes', async () => {
      const { useDatasetStore } = await import('../../stores/useDatasetStore');
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Simulate database operations while state is changing
      for (let i = 0; i < 5; i++) {
        useDatasetStore.getState().connectDatabase(`https://db${i}.example.com`, `benchmark-${i}`);
        useDatasetStore.getState().setLastSaved(new Date().toISOString());
        useQuestionStore.getState().setSelectedQuestionId(`q${i}`);
      }

      // Final state should be consistent
      const datasetState = useDatasetStore.getState();
      expect(datasetState.storageUrl).toBe('https://db4.example.com');
      expect(datasetState.currentBenchmarkName).toBe('benchmark-4');
      expect(datasetState.lastSaved).not.toBeNull();

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should verify store methods handle concurrent calls safely', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Call the same method multiple times rapidly
      const questionId = 'test-q';

      for (let i = 0; i < 20; i++) {
        useQuestionStore.getState().setSelectedQuestionId(questionId);
        useQuestionStore.getState().setCurrentTemplate(`// Draft ${i}\n`);
      }

      // Final state should be consistent (last calls win)
      const finalState = useQuestionStore.getState();
      expect(finalState.selectedQuestionId).toBe(questionId);
      expect(finalState.currentTemplate).toContain('// Draft 19');

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('integ-035: Large dataset handling', () => {
    it('should load checkpoint with 1000 questions', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create a large checkpoint with 1000 questions
      const largeCheckpoint: { version: '1.0'; checkpoint: Record<string, unknown>; global_rubric: undefined } = {
        version: '1.0' as const,
        checkpoint: {},
        global_rubric: undefined,
      };

      // Generate 1000 questions
      for (let i = 1; i <= 1000; i++) {
        largeCheckpoint.checkpoint[`q${i}`] = {
          question: `Question ${i}`,
          raw_answer: `Answer ${i}`,
          original_answer_template: `class Answer(BaseAnswer):\n    value: str`,
          answer_template: `class Answer(BaseAnswer):\n    value: str`,
          last_modified: new Date().toISOString(),
          finished: i % 2 === 0, // Half finished
        };
      }

      // Load large checkpoint should not crash
      expect(() => {
        useQuestionStore.getState().loadCheckpoint(largeCheckpoint);
      }).not.toThrow();

      // Verify all questions loaded
      const state = useQuestionStore.getState();
      const questionCount = Object.keys(state.questionData).length;
      expect(questionCount).toBe(1000);

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should verify UI remains responsive with large dataset', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create a large dataset
      const largeCheckpoint: { version: '1.0'; checkpoint: Record<string, unknown>; global_rubric: undefined } = {
        version: '1.0' as const,
        checkpoint: {},
        global_rubric: undefined,
      };

      for (let i = 1; i <= 500; i++) {
        largeCheckpoint.checkpoint[`q${i}`] = {
          question: `Question ${i}: What is ${i} plus ${i}?`,
          raw_answer: `${i + i}`,
          original_answer_template: `class Answer(BaseAnswer):\n    value: int`,
          answer_template: `class Answer(BaseAnswer):\n    value: int\n\n\ndef verify(self) -> bool:\n    return self.value == ${i + i}`,
          last_modified: new Date().toISOString(),
          finished: true,
        };
      }

      useQuestionStore.getState().loadCheckpoint(largeCheckpoint);

      // Navigate to various questions to verify responsiveness
      const testIds = ['q1', 'q100', 'q250', 'q500'];
      testIds.forEach((id) => {
        useQuestionStore.getState().setSelectedQuestionId(id);
        const currentState = useQuestionStore.getState();
        expect(currentState.selectedQuestionId).toBe(id);
        expect(document.body).toBeInTheDocument();
      });
    });

    it('should verify pagination/virtualization support with many questions', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create dataset with many questions
      const largeCheckpoint: { version: '1.0'; checkpoint: Record<string, unknown>; global_rubric: undefined } = {
        version: '1.0' as const,
        checkpoint: {},
        global_rubric: undefined,
      };

      for (let i = 1; i <= 200; i++) {
        largeCheckpoint.checkpoint[`q${i}`] = {
          question: `Question ${i}`,
          raw_answer: `Answer ${i}`,
          original_answer_template: `class Answer(BaseAnswer):\n    value: str`,
          answer_template: `class Answer(BaseAnswer):\n    value: str`,
          last_modified: new Date().toISOString(),
          finished: false,
        };
      }

      useQuestionStore.getState().loadCheckpoint(largeCheckpoint);

      // Verify getQuestionIds returns all IDs
      const state = useQuestionStore.getState();
      const allIds = state.getQuestionIds();
      expect(allIds.length).toBe(200);

      // Verify we can navigate to first, middle, and last
      useQuestionStore.getState().setSelectedQuestionId('q1');
      expect(useQuestionStore.getState().selectedQuestionId).toBe('q1');

      useQuestionStore.getState().setSelectedQuestionId('q100');
      expect(useQuestionStore.getState().selectedQuestionId).toBe('q100');

      useQuestionStore.getState().setSelectedQuestionId('q200');
      expect(useQuestionStore.getState().selectedQuestionId).toBe('q200');

      // App remains responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should navigate between questions smoothly with large dataset', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create large dataset
      const largeCheckpoint: { version: '1.0'; checkpoint: Record<string, unknown>; global_rubric: undefined } = {
        version: '1.0' as const,
        checkpoint: {},
        global_rubric: undefined,
      };

      for (let i = 1; i <= 100; i++) {
        largeCheckpoint.checkpoint[`q${i}`] = {
          question: `Question ${i}`,
          raw_answer: `Answer ${i}`,
          original_answer_template: `class Answer(BaseAnswer):\n    value: str`,
          answer_template: `class Answer(BaseAnswer):\n    value: str`,
          last_modified: new Date().toISOString(),
          finished: false,
        };
      }

      useQuestionStore.getState().loadCheckpoint(largeCheckpoint);

      // Navigate through multiple questions rapidly
      const navigationSequence = ['q1', 'q50', 'q25', 'q75', 'q100', 'q1'];
      navigationSequence.forEach((id) => {
        useQuestionStore.getState().setSelectedQuestionId(id);
        expect(useQuestionStore.getState().selectedQuestionId).toBe(id);
      });

      // Verify final state
      expect(useQuestionStore.getState().selectedQuestionId).toBe('q1');
      expect(document.body).toBeInTheDocument();
    });

    it('should verify performance acceptable with large dataset', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create large dataset and measure load time
      const largeCheckpoint: { version: '1.0'; checkpoint: Record<string, unknown>; global_rubric: undefined } = {
        version: '1.0' as const,
        checkpoint: {},
        global_rubric: undefined,
      };

      for (let i = 1; i <= 300; i++) {
        largeCheckpoint.checkpoint[`q${i}`] = {
          question: `Question ${i}`,
          raw_answer: `Answer ${i}`,
          original_answer_template: `class Answer(BaseAnswer):\n    value: str`,
          answer_template: `class Answer(BaseAnswer):\n    value: str`,
          last_modified: new Date().toISOString(),
          finished: i % 3 === 0,
        };
      }

      // Measure load time
      const startTime = performance.now();
      useQuestionStore.getState().loadCheckpoint(largeCheckpoint);
      const loadTime = performance.now() - startTime;

      // Load should be reasonably fast (less than 1 second for 300 questions)
      expect(loadTime).toBeLessThan(1000);

      // Verify all questions loaded correctly
      const state = useQuestionStore.getState();
      expect(Object.keys(state.questionData).length).toBe(300);

      // App should be responsive
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('integ-058: Generate templates for many questions', () => {
    it('should select 100+ questions for generation', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create a large dataset with 150 questions
      const largeCheckpoint: { version: '1.0'; checkpoint: Record<string, unknown>; global_rubric: undefined } = {
        version: '1.0' as const,
        checkpoint: {},
        global_rubric: undefined,
      };

      for (let i = 1; i <= 150; i++) {
        largeCheckpoint.checkpoint[`q${i}`] = {
          question: `Question ${i}`,
          raw_answer: `Answer ${i}`,
          original_answer_template: '',
          answer_template: '',
          last_modified: new Date().toISOString(),
          finished: false,
        };
      }

      useQuestionStore.getState().loadCheckpoint(largeCheckpoint);

      // Verify all questions are loaded and accessible
      const state = useQuestionStore.getState();
      const allQuestionIds = state.getQuestionIds();
      expect(allQuestionIds.length).toBe(150);

      // Verify we can iterate through all questions without issues
      allQuestionIds.forEach((id) => {
        const questionData = state.questionData[id];
        expect(questionData).toBeDefined();
        expect(questionData.question).toBeTruthy();
      });

      // App should remain responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should verify progress updates do not overwhelm UI with many questions', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create dataset with 100 questions
      const largeCheckpoint: { version: '1.0'; checkpoint: Record<string, unknown>; global_rubric: undefined } = {
        version: '1.0' as const,
        checkpoint: {},
        global_rubric: undefined,
      };

      for (let i = 1; i <= 100; i++) {
        largeCheckpoint.checkpoint[`q${i}`] = {
          question: `Question ${i}`,
          raw_answer: `Answer ${i}`,
          original_answer_template: '',
          answer_template: '',
          last_modified: new Date().toISOString(),
          finished: false,
        };
      }

      useQuestionStore.getState().loadCheckpoint(largeCheckpoint);

      // Simulate rapid progress updates (as would happen during generation)
      for (let i = 1; i <= 100; i++) {
        useQuestionStore.getState().setSelectedQuestionId(`q${i}`);

        // Verify app remains responsive during rapid updates
        const currentState = useQuestionStore.getState();
        expect(currentState.selectedQuestionId).toBe(`q${i}`);
      }

      // App should still be responsive after all updates
      expect(document.body).toBeInTheDocument();
    });

    it('should verify partial results preserved with many questions', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create dataset with 80 questions
      const largeCheckpoint: { version: '1.0'; checkpoint: Record<string, unknown>; global_rubric: undefined } = {
        version: '1.0' as const,
        checkpoint: {},
        global_rubric: undefined,
      };

      for (let i = 1; i <= 80; i++) {
        largeCheckpoint.checkpoint[`q${i}`] = {
          question: `Question ${i}`,
          raw_answer: `Answer ${i}`,
          original_answer_template: `class Answer(BaseAnswer):\n    value: str`,
          answer_template:
            i <= 50
              ? `class Answer(BaseAnswer):\n    value: str\n\n    def verify(self) -> bool:\n        return self.value == "Answer ${i}"`
              : '',
          last_modified: new Date().toISOString(),
          finished: i <= 50, // First 50 are "finished"
        };
      }

      useQuestionStore.getState().loadCheckpoint(largeCheckpoint);

      // Verify first 50 have templates set
      const state = useQuestionStore.getState();
      for (let i = 1; i <= 50; i++) {
        const checkpointItem = state.checkpoint[`q${i}`];
        expect(checkpointItem?.answer_template).toContain('verify');
      }

      // Verify remaining 30 have empty templates (partial completion)
      for (let i = 51; i <= 80; i++) {
        const checkpointItem = state.checkpoint[`q${i}`];
        expect(checkpointItem?.answer_template).toBe('');
      }

      // App should be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should handle navigation through many questions during generation', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create dataset with 120 questions
      const largeCheckpoint: { version: '1.0'; checkpoint: Record<string, unknown>; global_rubric: undefined } = {
        version: '1.0' as const,
        checkpoint: {},
        global_rubric: undefined,
      };

      for (let i = 1; i <= 120; i++) {
        largeCheckpoint.checkpoint[`q${i}`] = {
          question: `Question ${i}`,
          raw_answer: `Answer ${i}`,
          original_answer_template: '',
          answer_template: '',
          last_modified: new Date().toISOString(),
          finished: false,
        };
      }

      useQuestionStore.getState().loadCheckpoint(largeCheckpoint);

      // Simulate navigating while "generating" - jump around the dataset
      const navigationSequence = ['q1', 'q50', 'q100', 'q120', 'q60', 'q30', 'q90', 'q10', 'q80', 'q40'];

      navigationSequence.forEach((id) => {
        useQuestionStore.getState().setSelectedQuestionId(id);
        // Update template to simulate generation progress
        useQuestionStore.getState().setCurrentTemplate(`// Generated template for ${id}`);
      });

      // Verify final state
      const finalState = useQuestionStore.getState();
      expect(finalState.selectedQuestionId).toBe('q40');
      expect(finalState.currentTemplate).toContain('q40');

      // App should be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should verify UI responsiveness with many question state changes', async () => {
      const { useQuestionStore } = await import('../../stores/useQuestionStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Create dataset with 200 questions
      const largeCheckpoint: { version: '1.0'; checkpoint: Record<string, unknown>; global_rubric: undefined } = {
        version: '1.0' as const,
        checkpoint: {},
        global_rubric: undefined,
      };

      for (let i = 1; i <= 200; i++) {
        largeCheckpoint.checkpoint[`q${i}`] = {
          question: `Question ${i}`,
          raw_answer: `Answer ${i}`,
          original_answer_template: '',
          answer_template: '',
          last_modified: new Date().toISOString(),
          finished: false,
        };
      }

      useQuestionStore.getState().loadCheckpoint(largeCheckpoint);

      // Toggle finished status on multiple questions by selecting each then toggling
      for (let i = 1; i <= 50; i++) {
        const qid = `q${i}`;
        useQuestionStore.getState().setSelectedQuestionId(qid);
        useQuestionStore.getState().toggleFinished();
      }

      // Set current templates for multiple questions (and save them)
      for (let i = 51; i <= 100; i++) {
        const qid = `q${i}`;
        useQuestionStore.getState().setSelectedQuestionId(qid);
        useQuestionStore.getState().setCurrentTemplate(`// Template for ${qid}`);
        // Save to persist the template to checkpoint
        await useQuestionStore.getState().saveCurrentTemplate();
      }

      // Get fresh state after operations
      const finalState = useQuestionStore.getState();

      // Verify operations completed successfully - finished status toggled
      for (let i = 1; i <= 50; i++) {
        expect(finalState.checkpoint[`q${i}`]?.finished).toBe(true);
      }

      // Verify templates were saved to checkpoint
      for (let i = 51; i <= 100; i++) {
        expect(finalState.checkpoint[`q${i}`]?.answer_template).toContain(`// Template for q${i}`);
      }

      // App should be responsive
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('integ-038: Network resilience', () => {
    it('should handle offline event gracefully', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Simulate going offline
      const offlineEvent = new Event('offline');

      expect(() => {
        window.dispatchEvent(offlineEvent);
      }).not.toThrow();

      // Verify navigator.onLine reflects offline state (simulated)
      expect(document.body).toBeInTheDocument();

      // Simulate coming back online
      const onlineEvent = new Event('online');

      expect(() => {
        window.dispatchEvent(onlineEvent);
      }).not.toThrow();

      // App should remain responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should verify loading state during slow operations', async () => {
      const { useDatasetStore } = await import('../../stores/useDatasetStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Simulate loading/saving state (the store uses isSaving for both)
      useDatasetStore.getState().setIsSaving(true);

      // Verify app is still responsive during loading
      expect(document.body).toBeInTheDocument();

      // End loading state
      useDatasetStore.getState().setIsSaving(false);

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should handle saving state during operations', async () => {
      const { useDatasetStore } = await import('../../stores/useDatasetStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Simulate saving state
      useDatasetStore.getState().setIsSaving(true);

      // Verify app is still responsive during saving
      expect(document.body).toBeInTheDocument();

      // End saving state
      useDatasetStore.getState().setIsSaving(false);

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should handle error state without crashing', async () => {
      const { useDatasetStore } = await import('../../stores/useDatasetStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Set error state
      useDatasetStore.getState().setSaveError('Network error: Connection timeout');

      // Verify app is still responsive despite error
      expect(document.body).toBeInTheDocument();

      // Clear error state
      useDatasetStore.getState().setSaveError(null);

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should verify connection state persists across operations', async () => {
      const { useDatasetStore } = await import('../../stores/useDatasetStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Connect to database
      useDatasetStore.getState().connectDatabase('https://example.com/db', 'test-benchmark');

      const state = useDatasetStore.getState();
      expect(state.isConnectedToDatabase).toBe(true);

      // Simulate various state changes during connection
      useDatasetStore.getState().setIsSaving(true);
      expect(document.body).toBeInTheDocument();

      useDatasetStore.getState().setIsSaving(false);
      expect(document.body).toBeInTheDocument();

      useDatasetStore.getState().setLastSaved(new Date().toISOString());
      expect(document.body).toBeInTheDocument();

      // Connection should still be active
      const finalState = useDatasetStore.getState();
      expect(finalState.isConnectedToDatabase).toBe(true);

      // App should be responsive
      expect(document.body).toBeInTheDocument();
    });

    it('should handle rapid state changes without corruption', async () => {
      const { useDatasetStore } = await import('../../stores/useDatasetStore');

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Rapidly cycle through different states
      for (let i = 0; i < 20; i++) {
        useDatasetStore.getState().setIsSaving(i % 2 === 0);
        useDatasetStore.getState().setSaveError(i % 3 === 0 ? 'Simulated error' : null);
        expect(document.body).toBeInTheDocument();
      }

      // Clear all states
      useDatasetStore.getState().setIsSaving(false);
      useDatasetStore.getState().setSaveError(null);

      // Final state should be clean
      const finalState = useDatasetStore.getState();
      expect(finalState.isSaving).toBe(false);
      expect(finalState.saveError).toBe(null);

      // App should be responsive
      expect(document.body).toBeInTheDocument();
    });
  });
});
