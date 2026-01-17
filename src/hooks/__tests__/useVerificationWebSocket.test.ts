/**
 * Unit tests for useVerificationWebSocket hook
 *
 * Tests the result_set parsing logic that handles different formats:
 * 1. Primary format: VerificationResultSet with `results` array
 * 2. Fallback format: flat dict with backend-generated keys
 *
 * BUG FIX: Previously, the code checked for dict format first, which incorrectly
 * matched the VerificationResultSet format (`{ results: [...] }`) because both
 * are objects. Now we check for the `results` array format FIRST.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVerificationWebSocket } from '../useVerificationWebSocket';
import { loadMockedVerificationResults } from '../../test-utils/fixtures/loaders';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = 1; // OPEN

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => this.onopen?.(), 0);
  }

  close() {
    this.onclose?.();
  }

  // Helper to simulate receiving a message
  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

// Store reference to created WebSocket for tests
let lastCreatedWebSocket: MockWebSocket | null = null;

describe('useVerificationWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastCreatedWebSocket = null;

    // Mock WebSocket constructor
    vi.stubGlobal(
      'WebSocket',
      vi.fn((url: string) => {
        lastCreatedWebSocket = new MockWebSocket(url);
        return lastCreatedWebSocket;
      })
    );

    // Mock window.location
    vi.stubGlobal('location', {
      protocol: 'http:',
      host: 'localhost:5173',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Result Set Parsing', () => {
    /**
     * TEST: Primary format - VerificationResultSet with results array
     *
     * This is the format returned by the backend when verification completes.
     * The server returns a VerificationResultSet Pydantic model that serializes to:
     * { result_set: { results: [...] } }
     *
     * BUG FIX: Previously this format was incorrectly handled by the dict check
     * because `{ results: [...] }` is an object (not an array), so
     * `typeof data.result_set === 'object' && !Array.isArray(data.result_set)`
     * evaluated to true, causing it to iterate over `Object.entries({ results: [...] })`
     * which gave `[["results", array]]`, and the array doesn't have `metadata`.
     */
    it('should correctly parse VerificationResultSet format with results array', async () => {
      const mockResults = loadMockedVerificationResults('successful-verification');

      // Convert to VerificationResultSet format (what the backend actually returns)
      const verificationResultSetFormat = {
        result_set: {
          results: Object.values(mockResults),
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(verificationResultSetFormat),
      });

      const onProgressUpdate = vi.fn();
      const onJobCompleted = vi.fn();
      const onJobFailed = vi.fn();
      const onJobCancelled = vi.fn();

      const { result } = renderHook(() =>
        useVerificationWebSocket({
          onProgressUpdate,
          onJobCompleted,
          onJobFailed,
          onJobCancelled,
        })
      );

      // Connect to WebSocket
      act(() => {
        result.current.connectProgressWebSocket('test-job-123');
      });

      // Wait for WebSocket to connect
      await waitFor(() => {
        expect(lastCreatedWebSocket).not.toBeNull();
      });

      // Simulate job_completed event
      act(() => {
        lastCreatedWebSocket?.simulateMessage({
          type: 'job_completed',
          job_id: 'test-job-123',
          processed: 3,
          total: 3,
        });
      });

      // Wait for fetch and callback
      await waitFor(() => {
        expect(onJobCompleted).toHaveBeenCalled();
      });

      // Verify the results were parsed correctly
      const [jobId, parsedResults] = onJobCompleted.mock.calls[0];
      expect(jobId).toBe('test-job-123');

      // Should have parsed all 3 results
      expect(Object.keys(parsedResults).length).toBe(3);

      // Verify each result has the expected structure
      Object.values(parsedResults).forEach((result: unknown) => {
        const verificationResult = result as { metadata: { question_id: string } };
        expect(verificationResult.metadata).toBeDefined();
        expect(verificationResult.metadata.question_id).toMatch(/^q[1-3]$/);
      });
    });

    /**
     * TEST: Fallback format - flat dict with backend-generated keys
     *
     * This format might be used in future implementations where the backend
     * returns results as a flat dictionary keyed by unique identifiers.
     */
    it('should correctly parse flat dict format with backend-generated keys', async () => {
      const mockResults = loadMockedVerificationResults('successful-verification');

      // Use the flat dict format (what the frontend originally expected)
      const flatDictFormat = {
        result_set: mockResults,
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(flatDictFormat),
      });

      const onProgressUpdate = vi.fn();
      const onJobCompleted = vi.fn();
      const onJobFailed = vi.fn();
      const onJobCancelled = vi.fn();

      const { result } = renderHook(() =>
        useVerificationWebSocket({
          onProgressUpdate,
          onJobCompleted,
          onJobFailed,
          onJobCancelled,
        })
      );

      // Connect to WebSocket
      act(() => {
        result.current.connectProgressWebSocket('test-job-456');
      });

      // Wait for WebSocket to connect
      await waitFor(() => {
        expect(lastCreatedWebSocket).not.toBeNull();
      });

      // Simulate job_completed event
      act(() => {
        lastCreatedWebSocket?.simulateMessage({
          type: 'job_completed',
          job_id: 'test-job-456',
          processed: 3,
          total: 3,
        });
      });

      // Wait for fetch and callback
      await waitFor(() => {
        expect(onJobCompleted).toHaveBeenCalled();
      });

      // Verify the results were parsed correctly
      const [jobId, parsedResults] = onJobCompleted.mock.calls[0];
      expect(jobId).toBe('test-job-456');

      // Should have parsed all 3 results
      expect(Object.keys(parsedResults).length).toBe(3);
    });

    /**
     * TEST: Empty result_set should not crash
     */
    it('should handle empty result_set gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ result_set: {} }),
      });

      const onProgressUpdate = vi.fn();
      const onJobCompleted = vi.fn();
      const onJobFailed = vi.fn();
      const onJobCancelled = vi.fn();

      const { result } = renderHook(() =>
        useVerificationWebSocket({
          onProgressUpdate,
          onJobCompleted,
          onJobFailed,
          onJobCancelled,
        })
      );

      act(() => {
        result.current.connectProgressWebSocket('test-job-empty');
      });

      await waitFor(() => {
        expect(lastCreatedWebSocket).not.toBeNull();
      });

      act(() => {
        lastCreatedWebSocket?.simulateMessage({
          type: 'job_completed',
          job_id: 'test-job-empty',
          processed: 0,
          total: 0,
        });
      });

      await waitFor(() => {
        expect(onJobCompleted).toHaveBeenCalled();
      });

      const [, parsedResults] = onJobCompleted.mock.calls[0];
      expect(Object.keys(parsedResults).length).toBe(0);
    });

    /**
     * TEST: Empty results array should not crash
     */
    it('should handle empty results array gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ result_set: { results: [] } }),
      });

      const onProgressUpdate = vi.fn();
      const onJobCompleted = vi.fn();
      const onJobFailed = vi.fn();
      const onJobCancelled = vi.fn();

      const { result } = renderHook(() =>
        useVerificationWebSocket({
          onProgressUpdate,
          onJobCompleted,
          onJobFailed,
          onJobCancelled,
        })
      );

      act(() => {
        result.current.connectProgressWebSocket('test-job-empty-array');
      });

      await waitFor(() => {
        expect(lastCreatedWebSocket).not.toBeNull();
      });

      act(() => {
        lastCreatedWebSocket?.simulateMessage({
          type: 'job_completed',
          job_id: 'test-job-empty-array',
          processed: 0,
          total: 0,
        });
      });

      await waitFor(() => {
        expect(onJobCompleted).toHaveBeenCalled();
      });

      const [, parsedResults] = onJobCompleted.mock.calls[0];
      expect(Object.keys(parsedResults).length).toBe(0);
    });

    /**
     * TEST: Malformed results should be skipped with warning
     */
    it('should skip malformed results and log warning', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mixedResults = {
        result_set: {
          results: [
            // Valid result
            {
              metadata: { question_id: 'q1', answering_model: 'test', parsing_model: 'test' },
              template: { verify_result: true },
            },
            // Malformed - no metadata
            { template: { verify_result: false } },
            // Malformed - null
            null,
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mixedResults),
      });

      const onJobCompleted = vi.fn();

      const { result } = renderHook(() =>
        useVerificationWebSocket({
          onProgressUpdate: vi.fn(),
          onJobCompleted,
          onJobFailed: vi.fn(),
          onJobCancelled: vi.fn(),
        })
      );

      act(() => {
        result.current.connectProgressWebSocket('test-job-malformed');
      });

      await waitFor(() => {
        expect(lastCreatedWebSocket).not.toBeNull();
      });

      act(() => {
        lastCreatedWebSocket?.simulateMessage({
          type: 'job_completed',
          job_id: 'test-job-malformed',
        });
      });

      await waitFor(() => {
        expect(onJobCompleted).toHaveBeenCalled();
      });

      // Only the valid result should be included
      const [, parsedResults] = onJobCompleted.mock.calls[0];
      expect(Object.keys(parsedResults).length).toBe(1);

      // Should have logged warnings for malformed results
      expect(consoleWarn).toHaveBeenCalled();

      consoleWarn.mockRestore();
    });

    /**
     * TEST: Results with replicates should include replicate suffix in key
     */
    it('should generate correct keys for results with replicates', async () => {
      const resultsWithReplicates = {
        result_set: {
          results: [
            {
              metadata: {
                question_id: 'q1',
                answering_model: 'claude',
                parsing_model: 'claude',
                replicate: 0,
              },
              template: { verify_result: true },
            },
            {
              metadata: {
                question_id: 'q1',
                answering_model: 'claude',
                parsing_model: 'claude',
                replicate: 1,
              },
              template: { verify_result: true },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(resultsWithReplicates),
      });

      const onJobCompleted = vi.fn();

      const { result } = renderHook(() =>
        useVerificationWebSocket({
          onProgressUpdate: vi.fn(),
          onJobCompleted,
          onJobFailed: vi.fn(),
          onJobCancelled: vi.fn(),
        })
      );

      act(() => {
        result.current.connectProgressWebSocket('test-job-replicates');
      });

      await waitFor(() => {
        expect(lastCreatedWebSocket).not.toBeNull();
      });

      act(() => {
        lastCreatedWebSocket?.simulateMessage({
          type: 'job_completed',
          job_id: 'test-job-replicates',
        });
      });

      await waitFor(() => {
        expect(onJobCompleted).toHaveBeenCalled();
      });

      const [, parsedResults] = onJobCompleted.mock.calls[0];
      const keys = Object.keys(parsedResults);

      // Should have 2 results with different keys
      expect(keys.length).toBe(2);

      // Keys should include replicate suffix
      expect(keys.some((k) => k.includes('_rep0'))).toBe(true);
      expect(keys.some((k) => k.includes('_rep1'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should call onJobFailed when response contains error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: 'Verification failed: timeout' }),
      });

      const onJobFailed = vi.fn();

      const { result } = renderHook(() =>
        useVerificationWebSocket({
          onProgressUpdate: vi.fn(),
          onJobCompleted: vi.fn(),
          onJobFailed,
          onJobCancelled: vi.fn(),
        })
      );

      act(() => {
        result.current.connectProgressWebSocket('test-job-error');
      });

      await waitFor(() => {
        expect(lastCreatedWebSocket).not.toBeNull();
      });

      act(() => {
        lastCreatedWebSocket?.simulateMessage({
          type: 'job_completed',
          job_id: 'test-job-error',
        });
      });

      await waitFor(() => {
        expect(onJobFailed).toHaveBeenCalledWith('Verification failed: timeout');
      });
    });

    it('should call onJobFailed when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const onJobFailed = vi.fn();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useVerificationWebSocket({
          onProgressUpdate: vi.fn(),
          onJobCompleted: vi.fn(),
          onJobFailed,
          onJobCancelled: vi.fn(),
        })
      );

      act(() => {
        result.current.connectProgressWebSocket('test-job-network-error');
      });

      await waitFor(() => {
        expect(lastCreatedWebSocket).not.toBeNull();
      });

      act(() => {
        lastCreatedWebSocket?.simulateMessage({
          type: 'job_completed',
          job_id: 'test-job-network-error',
        });
      });

      await waitFor(() => {
        expect(onJobFailed).toHaveBeenCalledWith('Failed to fetch final results');
      });

      consoleError.mockRestore();
    });
  });

  describe('WebSocket Event Handling', () => {
    it('should call onJobFailed for job_failed event', async () => {
      const onJobFailed = vi.fn();

      const { result } = renderHook(() =>
        useVerificationWebSocket({
          onProgressUpdate: vi.fn(),
          onJobCompleted: vi.fn(),
          onJobFailed,
          onJobCancelled: vi.fn(),
        })
      );

      act(() => {
        result.current.connectProgressWebSocket('test-job-failed');
      });

      await waitFor(() => {
        expect(lastCreatedWebSocket).not.toBeNull();
      });

      act(() => {
        lastCreatedWebSocket?.simulateMessage({
          type: 'job_failed',
          error: 'LLM API error',
        });
      });

      await waitFor(() => {
        expect(onJobFailed).toHaveBeenCalledWith('LLM API error');
      });
    });

    it('should call onJobCancelled for job_cancelled event', async () => {
      const onJobCancelled = vi.fn();

      const { result } = renderHook(() =>
        useVerificationWebSocket({
          onProgressUpdate: vi.fn(),
          onJobCompleted: vi.fn(),
          onJobFailed: vi.fn(),
          onJobCancelled,
        })
      );

      act(() => {
        result.current.connectProgressWebSocket('test-job-cancelled');
      });

      await waitFor(() => {
        expect(lastCreatedWebSocket).not.toBeNull();
      });

      act(() => {
        lastCreatedWebSocket?.simulateMessage({
          type: 'job_cancelled',
        });
      });

      await waitFor(() => {
        expect(onJobCancelled).toHaveBeenCalled();
      });
    });

    it('should call onProgressUpdate for progress events', async () => {
      const onProgressUpdate = vi.fn();

      const { result } = renderHook(() =>
        useVerificationWebSocket({
          onProgressUpdate,
          onJobCompleted: vi.fn(),
          onJobFailed: vi.fn(),
          onJobCancelled: vi.fn(),
        })
      );

      act(() => {
        result.current.connectProgressWebSocket('test-job-progress');
      });

      await waitFor(() => {
        expect(lastCreatedWebSocket).not.toBeNull();
      });

      act(() => {
        lastCreatedWebSocket?.simulateMessage({
          type: 'task_completed',
          job_id: 'test-job-progress',
          status: 'running',
          percentage: 50,
          processed: 1,
          total: 2,
          current_question: 'q1',
        });
      });

      await waitFor(() => {
        expect(onProgressUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            job_id: 'test-job-progress',
            status: 'running',
            percentage: 50,
            processed_count: 1,
            total_count: 2,
          })
        );
      });
    });
  });
});
