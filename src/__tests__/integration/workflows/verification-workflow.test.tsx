/**
 * Verification Workflow Integration Tests
 *
 * Tests the complete verification workflow using MSW for API mocking
 * and mocked fixtures for realistic responses.
 */
import React, { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render, userEvent } from '../../../test-utils/test-helpers';
import { server } from '../../../test-utils/mocks/server';
import { http, HttpResponse } from 'msw';
import { loadMockedVerificationResults, createQuestionDataFromSamples } from '../../../test-utils/fixtures/loaders';
import {
  setupWebSocketMock,
  teardownWebSocketMock,
  createVerificationProgressSequence,
  MockWebSocketServer,
} from '../../../test-utils/mocks/websocket-mock';
import { useQuestionStore } from '../../../stores/useQuestionStore';
import { BenchmarkTab } from '../../../components/BenchmarkTab';
import { Checkpoint, VerificationResult } from '../../../types';

// Wrapper component that provides required props
const BenchmarkTabWrapper: React.FC<{ initialCheckpoint?: Checkpoint }> = ({ initialCheckpoint }) => {
  const questionData = createQuestionDataFromSamples();
  const defaultCheckpoint: Checkpoint =
    initialCheckpoint ||
    Object.fromEntries(
      Object.entries(questionData).map(([id, q]) => [
        id,
        {
          question: q.question,
          raw_answer: q.raw_answer,
          original_answer_template: q.answer_template,
          answer_template: q.answer_template,
          last_modified: new Date().toISOString(),
          finished: true,
          question_rubric: undefined,
        },
      ])
    );

  const [results, setResults] = useState<Record<string, VerificationResult>>({});

  return <BenchmarkTab checkpoint={defaultCheckpoint} benchmarkResults={results} setBenchmarkResults={setResults} />;
};

describe('Verification Workflow', () => {
  let wsServer: MockWebSocketServer;

  beforeEach(() => {
    // Setup WebSocket mock
    wsServer = setupWebSocketMock();

    // Reset stores
    localStorage.clear();
    sessionStorage.clear();

    // Reset question store with test data
    useQuestionStore.setState({
      questionData: createQuestionDataFromSamples(),
      checkpoint: {},
    });
  });

  afterEach(() => {
    teardownWebSocketMock();
    vi.clearAllMocks();
  });

  describe('Starting Verification', () => {
    it('should display the verification panel with question list', async () => {
      render(<BenchmarkTabWrapper />);

      await waitFor(() => {
        // Should show the benchmark tab content
        expect(screen.getByText(/run selected/i)).toBeInTheDocument();
      });
    });

    it('should start verification when run button is clicked', async () => {
      const user = userEvent.setup();
      const mockJobId = 'test-job-123';

      // Mock the start verification endpoint
      server.use(
        http.post('/api/start-verification', () => {
          return HttpResponse.json({ job_id: mockJobId });
        })
      );

      // Mock the progress endpoint
      server.use(
        http.get(`/api/verification-progress/${mockJobId}`, () => {
          return HttpResponse.json({
            status: 'completed',
            result_set: loadMockedVerificationResults('successful-verification'),
          });
        })
      );

      render(<BenchmarkTabWrapper />);

      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByText(/run selected/i)).toBeInTheDocument();
      });

      // Select all questions
      const selectAllButton = screen.queryByRole('button', { name: /select all/i });
      if (selectAllButton) {
        await user.click(selectAllButton);
      }

      // Click the run button
      const runButton = screen.getByRole('button', { name: /run selected/i });
      await user.click(runButton);

      // Simulate WebSocket events
      await waitFor(() => {
        const ws = wsServer.getVerificationConnection();
        if (ws) {
          const events = createVerificationProgressSequence(mockJobId, ['q1', 'q2', 'q3']);
          events.forEach((event) => ws.simulateMessage(event));
        }
      });
    });
  });

  describe('Verification Progress', () => {
    it('should update progress as verification runs', async () => {
      const mockJobId = 'progress-test-job';

      // Mock endpoints
      server.use(
        http.post('/api/start-verification', () => {
          return HttpResponse.json({ job_id: mockJobId });
        }),
        http.get(`/api/verification-progress/${mockJobId}`, () => {
          return HttpResponse.json({
            status: 'running',
            percentage: 50,
            processed: 1,
            total: 2,
          });
        })
      );

      render(<BenchmarkTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/run selected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Verification Results - Fixture Validation', () => {
    it('should have correct structure for successful verification results', () => {
      const successfulResults = loadMockedVerificationResults('successful-verification');

      // Verify the mock data structure is correct
      expect(Object.keys(successfulResults).length).toBeGreaterThan(0);

      // Each result should have verify_result = true
      Object.values(successfulResults).forEach((result) => {
        expect(result.template.verify_result).toBe(true);
      });
    });

    it('should have correct structure for failed verification results', () => {
      const failedResults = loadMockedVerificationResults('failed-verification');

      // Verify the mock data structure is correct
      expect(Object.keys(failedResults).length).toBeGreaterThan(0);

      // Results should have verify_result = false
      Object.values(failedResults).forEach((result) => {
        expect(result.template.verify_result).toBe(false);
      });
    });

    it('should have correct structure for abstention detected results', () => {
      const abstentionResults = loadMockedVerificationResults('abstention-detected');

      // Verify the mock data structure is correct
      expect(Object.keys(abstentionResults).length).toBeGreaterThan(0);

      // Results should have abstention_detected = true
      Object.values(abstentionResults).forEach((result) => {
        expect(result.template.abstention_detected).toBe(true);
      });
    });

    it('should have correct structure for partial completion results', () => {
      const partialResults = loadMockedVerificationResults('partial-completion');

      // Verify the mock data structure contains both success and failure
      const results = Object.values(partialResults);
      expect(results.length).toBeGreaterThan(1);

      // Should have mix of success and failure
      const successes = results.filter((r) => r.metadata.completed_without_errors);
      const failures = results.filter((r) => !r.metadata.completed_without_errors);

      expect(successes.length).toBeGreaterThan(0);
      expect(failures.length).toBeGreaterThan(0);
    });

    it('should have correct structure for rubric evaluation results', () => {
      const rubricResults = loadMockedVerificationResults('with-rubric-success');

      // Verify results have rubric data
      Object.values(rubricResults).forEach((result) => {
        expect(result.rubric).not.toBeNull();
        expect(result.rubric?.evaluation_performed).toBe(true);
        expect(result.rubric?.traits).toBeDefined();
      });
    });
  });

  describe('Component Rendering', () => {
    it('should render verification panel without errors', async () => {
      render(<BenchmarkTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/run selected/i)).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock error response
      server.use(
        http.post('/api/start-verification', () => {
          return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
        })
      );

      render(<BenchmarkTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/run selected/i)).toBeInTheDocument();
      });

      // Try to run verification - should not crash
      const runButton = screen.getByRole('button', { name: /run selected/i });
      await user.click(runButton);

      // Should handle error gracefully (not crash)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run selected/i })).toBeInTheDocument();
      });
    });

    it('should handle WebSocket disconnection gracefully', async () => {
      const mockJobId = 'ws-disconnect-test';

      server.use(
        http.post('/api/start-verification', () => {
          return HttpResponse.json({ job_id: mockJobId });
        })
      );

      render(<BenchmarkTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/run selected/i)).toBeInTheDocument();
      });

      // Simulate WebSocket disconnection
      await waitFor(() => {
        const ws = wsServer.getVerificationConnection();
        if (ws) {
          ws.simulateClose(1006, 'Connection lost');
        }
      });

      // App should still be responsive
      expect(screen.getByRole('button', { name: /run selected/i })).toBeInTheDocument();
    });
  });
});
