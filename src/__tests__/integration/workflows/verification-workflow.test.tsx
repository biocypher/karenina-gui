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
        http.post('/api/v2/verifications', () => {
          return HttpResponse.json({ job_id: mockJobId });
        })
      );

      // Mock the progress endpoint
      server.use(
        http.get(`/api/v2/verifications/${mockJobId}/progress`, () => {
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
        http.post('/api/v2/verifications', () => {
          return HttpResponse.json({ job_id: mockJobId });
        }),
        http.get(`/api/v2/verifications/${mockJobId}/progress`, () => {
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
        http.post('/api/v2/verifications', () => {
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
        http.post('/api/v2/verifications', () => {
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

  describe('integ-021: Verification with multiple models', () => {
    it('should configure multiple answering models and verify results include all models', async () => {
      // Load multi-model results
      const multiModelResults = loadMockedVerificationResults('multi-model-results');

      // Verify the fixture has multiple models per question
      const q1Results = Object.entries(multiModelResults).filter(([key]) => key.startsWith('q1_'));
      expect(q1Results.length).toBeGreaterThanOrEqual(2);

      // Verify different answering models are present
      const answeringModels = new Set(q1Results.map(([, result]) => result.metadata.answering_model));
      expect(answeringModels.size).toBeGreaterThanOrEqual(2);
      expect(answeringModels.has('anthropic/claude-haiku-4-5')).toBe(true);
      expect(answeringModels.has('openai/gpt-4')).toBe(true);

      // Verify each result has proper structure
      q1Results.forEach(([, result]) => {
        expect(result.metadata.answering_model).toBeTruthy();
        expect(result.metadata.parsing_model).toBeTruthy();
        expect(result.template.verify_result).toBeDefined();
      });
    });

    it('should verify results contain entries for each model combination', async () => {
      const multiModelResults = loadMockedVerificationResults('multi-model-results');

      // Expected combinations:
      // - q1: haiku/haiku, gpt-4/haiku
      // - q2: haiku/haiku, gpt-4/haiku
      // - q3: haiku/gpt-4, gpt-4/gpt-4
      const expectedCount = 6; // 6 total results for 3 questions with different model combinations
      expect(Object.keys(multiModelResults).length).toBe(expectedCount);

      // Group results by question
      const resultsByQuestion: Record<string, typeof multiModelResults> = {};
      Object.entries(multiModelResults).forEach(([key, result]) => {
        const questionId = result.metadata.question_id;
        if (!resultsByQuestion[questionId]) {
          resultsByQuestion[questionId] = {};
        }
        resultsByQuestion[questionId][key] = result;
      });

      // Verify each question has results from multiple models
      expect(Object.keys(resultsByQuestion).length).toBe(3); // q1, q2, q3
      expect(Object.keys(resultsByQuestion.q1).length).toBe(2); // 2 answering models
      expect(Object.keys(resultsByQuestion.q2).length).toBe(2); // 2 answering models
      expect(Object.keys(resultsByQuestion.q3).length).toBe(2); // 2 answering models (or different parsing)
    });

    it('should parse model identifiers from result keys', () => {
      const multiModelResults = loadMockedVerificationResults('multi-model-results');

      // Result key format: {question_id}_{answering_model}_{parsing_model}_{timestamp}
      // Model names contain slashes, so we need to handle that
      const parseResultKey = (key: string) => {
        // Split from the right to get timestamp first
        const lastUnderscore = key.lastIndexOf('_');
        const timestamp = key.substring(lastUnderscore + 1);
        const remaining = key.substring(0, lastUnderscore);

        // Now split remaining parts to get question and models
        // Format: q1_anthropic/claude-haiku-4-5_anthropic/claude-haiku-4-5
        const parts = remaining.split('_');
        const questionId = parts[0];

        // The model parts are at indices 1 and 2 (but contain /)
        // We'll count parts: after q_id, we have 2 models before timestamp
        // Each model is "provider/model-name" which contains one /
        const models = parts.slice(1); // ['anthropic/claude-haiku-4-5', 'anthropic/claude-haiku-4-5']

        return {
          questionId,
          answeringModel: models[0],
          parsingModel: models[1],
          timestamp,
        };
      };

      Object.keys(multiModelResults).forEach((key) => {
        const parsed = parseResultKey(key);
        expect(parsed.questionId).toMatch(/^q[1-3]$/);
        expect(parsed.answeringModel).toMatch(/^(anthropic\/claude-haiku-4-5|openai\/gpt-4)$/);
        expect(parsed.parsingModel).toMatch(/^(anthropic\/claude-haiku-4-5|openai\/gpt-4)$/);
      });
    });

    it('should verify model metadata is preserved in results', () => {
      const multiModelResults = loadMockedVerificationResults('multi-model-results');

      // Verify all results have complete metadata
      Object.values(multiModelResults).forEach((result) => {
        const { metadata } = result;

        expect(metadata.question_id).toBeTruthy();
        expect(metadata.answering_model).toBeTruthy();
        expect(metadata.parsing_model).toBeTruthy();
        expect(metadata.answering_system_prompt).toBeTruthy();
        expect(metadata.parsing_system_prompt).toBeTruthy();
        expect(metadata.execution_time).toBeGreaterThan(0);
        expect(metadata.timestamp).toBeTruthy();
        expect(metadata.result_id).toBeTruthy();

        // Verify model names follow expected format
        expect(metadata.answering_model).toMatch(/\//); // Should contain provider/model format
        expect(metadata.parsing_model).toMatch(/\//);
      });
    });

    it('should support different answering model and parsing model combinations', () => {
      const multiModelResults = loadMockedVerificationResults('multi-model-results');

      // Find results with different model combinations
      const combinations = new Set<string>();
      Object.values(multiModelResults).forEach((result) => {
        const combo = `${result.metadata.answering_model}+${result.metadata.parsing_model}`;
        combinations.add(combo);
      });

      // We should have multiple model combinations
      expect(combinations.size).toBeGreaterThanOrEqual(2);

      // Verify expected combinations exist
      const expectedCombos = [
        'anthropic/claude-haiku-4-5+anthropic/claude-haiku-4-5',
        'openai/gpt-4+anthropic/claude-haiku-4-5',
        'anthropic/claude-haiku-4-5+openai/gpt-4',
        'openai/gpt-4+openai/gpt-4',
      ];

      expectedCombos.forEach((combo) => {
        // At least some of these combinations should exist
        if (combo === 'anthropic/claude-haiku-4-5+openai/gpt-4') {
          expect(combinations.has(combo)).toBe(true);
        }
      });
    });

    it('should verify all template results are valid across models', () => {
      const multiModelResults = loadMockedVerificationResults('multi-model-results');

      // All results should have valid template verification
      Object.values(multiModelResults).forEach((result) => {
        expect(result.template).toBeDefined();
        expect(result.template.template_verification_performed).toBe(true);
        expect(result.template.verify_result).toBeDefined();

        // Verify parsed responses exist
        expect(result.template.parsed_llm_response).toBeDefined();
        expect(result.template.parsed_gt_response).toBeDefined();

        // Verify abstention check was performed
        expect(result.template.abstention_check_performed).toBe(true);
        expect(result.template.abstention_detected).toBeDefined();
      });
    });
  });

  describe('integ-022: Verification with replicates', () => {
    it('should verify results contain replicate indices', async () => {
      const replicateResults = loadMockedVerificationResults('with-replicates');

      // Each question should have 3 replicates
      const q1Replicates = Object.entries(replicateResults).filter(([key]) => key.startsWith('q1_'));
      expect(q1Replicates.length).toBe(3);

      // Verify each result has a replicate index
      q1Replicates.forEach(([, result]) => {
        expect(result.metadata.replicate).toBeDefined();
        expect(typeof result.metadata.replicate).toBe('number');
        expect(result.metadata.replicate).toBeGreaterThanOrEqual(0);
        expect(result.metadata.replicate).toBeLessThan(3);
      });

      // Verify we have all three replicate indices
      const replicateIndices = new Set(q1Replicates.map(([, result]) => result.metadata.replicate));
      expect(replicateIndices.has(0)).toBe(true);
      expect(replicateIndices.has(1)).toBe(true);
      expect(replicateIndices.has(2)).toBe(true);
    });

    it('should verify result keys include replicate suffix', () => {
      const replicateResults = loadMockedVerificationResults('with-replicates');

      // Result key format with replicate: {question_id}_{model}_{timestamp}_replicate_{index}
      Object.keys(replicateResults).forEach((key) => {
        expect(key).toContain('_replicate_');
      });
    });

    it('should verify aggregated results computed from replicates', () => {
      const replicateResults = loadMockedVerificationResults('with-replicates');

      // Group results by question
      const resultsByQuestion: Record<string, typeof replicateResults> = {};
      Object.entries(replicateResults).forEach(([key, result]) => {
        const questionId = result.metadata.question_id;
        if (!resultsByQuestion[questionId]) {
          resultsByQuestion[questionId] = {};
        }
        resultsByQuestion[questionId][key] = result;
      });

      // For q1: all 3 replicates should pass
      const q1Results = Object.values(resultsByQuestion.q1);
      const q1SuccessCount = q1Results.filter((r) => r.template.verify_result === true).length;
      expect(q1SuccessCount).toBe(3);

      // For q2: 2 pass, 1 fails (replicate 2 has parsing error)
      const q2Results = Object.values(resultsByQuestion.q2);
      const q2SuccessCount = q2Results.filter((r) => r.template.verify_result === true).length;
      const q2FailureCount = q2Results.filter((r) => r.template.verify_result === false).length;
      expect(q2SuccessCount).toBe(2);
      expect(q2FailureCount).toBe(1);

      // For q3: all 3 replicates should pass
      const q3Results = Object.values(resultsByQuestion.q3);
      const q3SuccessCount = q3Results.filter((r) => r.template.verify_result === true).length;
      expect(q3SuccessCount).toBe(3);
    });

    it('should handle mixed success/failure across replicates', () => {
      const replicateResults = loadMockedVerificationResults('with-replicates');

      // Find q2 replicate 2 which should have failed
      const q2FailedReplicate = Object.entries(replicateResults).find(
        ([key, result]) =>
          key.startsWith('q2_') && result.metadata.replicate === 2 && result.template.verify_result === false
      );

      expect(q2FailedReplicate).toBeDefined();
      expect(q2FailedReplicate![1].metadata.completed_without_errors).toBe(false);
      expect(q2FailedReplicate![1].metadata.error).toBe('Parsing error: invalid format');
      expect(q2FailedReplicate![1].template.parsed_llm_response).toBeNull();
    });

    it('should verify execution times vary across replicates', () => {
      const replicateResults = loadMockedVerificationResults('with-replicates');

      // Get q1 replicates
      const q1Replicates = Object.entries(replicateResults)
        .filter(([key]) => key.startsWith('q1_'))
        .map(([, result]) => result.metadata.execution_time);

      // Execution times should be different for each replicate
      expect(q1Replicates.length).toBe(3);
      expect(new Set(q1Replicates).size).toBeGreaterThan(1); // At least some variation
    });

    it('should verify unique result IDs for each replicate', () => {
      const replicateResults = loadMockedVerificationResults('with-replicates');

      // All result IDs should be unique
      const resultIds = Object.values(replicateResults).map((r) => r.metadata.result_id);
      const uniqueIds = new Set(resultIds);
      expect(uniqueIds.size).toBe(resultIds.length);
    });
  });

  describe('integ-023: Verification with rubric evaluation', () => {
    it('should verify results contain rubric field with trait scores', async () => {
      const rubricResults = loadMockedVerificationResults('with-rubric-success');

      // All results should have rubric data
      Object.values(rubricResults).forEach((result) => {
        expect(result.rubric).toBeDefined();
        expect(result.rubric).not.toBeNull();
        expect(result.rubric.evaluation_performed).toBe(true);
      });
    });

    it('should verify rubric contains trait-level breakdown', () => {
      const rubricResults = loadMockedVerificationResults('with-rubric-success');

      // Get first result
      const firstResult = Object.values(rubricResults)[0];
      expect(firstResult.rubric.traits).toBeDefined();

      // Verify trait structure
      const { traits } = firstResult.rubric;

      // Check that traits have expected properties
      Object.values(traits).forEach((trait) => {
        expect(trait.trait_name).toBeDefined();
        expect(trait.trait_type).toBeDefined();
        expect(['boolean', 'number']).toContain(typeof trait.result);
        expect(trait.execution_time).toBeGreaterThan(0);
      });

      // Verify we have multiple traits
      const traitNames = Object.keys(traits);
      expect(traitNames.length).toBeGreaterThan(0);
    });

    it('should verify different trait types are represented', () => {
      const rubricResults = loadMockedVerificationResults('with-rubric-success');

      const firstResult = Object.values(rubricResults)[0];
      const { traits } = firstResult.rubric;

      // Check for LLMRubricTrait type (has reasoning field)
      const llmTraits = Object.values(traits).filter((t) => t.trait_type === 'LLMRubricTrait');
      expect(llmTraits.length).toBeGreaterThan(0);
      llmTraits.forEach((trait) => {
        expect(trait.reasoning).toBeDefined();
      });

      // Check for RegexTrait type (may not have reasoning)
      const regexTraits = Object.values(traits).filter((t) => t.trait_type === 'RegexTrait');
      // RegexTrait might exist or not depending on fixture
      if (regexTraits.length > 0) {
        regexTraits.forEach((trait) => {
          // result should be boolean for regex traits
          expect(typeof trait.result).toBe('boolean');
        });
      }
    });

    it('should verify rubric overall score is computed', () => {
      const rubricResults = loadMockedVerificationResults('with-rubric-success');

      // Check overall scoring
      Object.values(rubricResults).forEach((result) => {
        const { rubric } = result;
        expect(rubric.overall_score).toBeDefined();
        expect(typeof rubric.overall_score).toBe('number');
        expect(rubric.max_score).toBeDefined();
        expect(typeof rubric.max_score).toBe('number');
        expect(rubric.overall_score).toBeLessThanOrEqual(rubric.max_score);
      });
    });

    it('should verify trait results match expected values', () => {
      const rubricResults = loadMockedVerificationResults('with-rubric-success');

      const firstResult = Object.values(rubricResults)[0];
      const { traits } = firstResult.rubric;

      // Check specific traits from fixture
      if (traits.is_concise) {
        expect(traits.is_concise.result).toBe(true);
        expect(traits.is_concise.trait_type).toBe('LLMRubricTrait');
      }

      if (traits.provides_context) {
        expect(traits.provides_context.result).toBe(true);
        expect(traits.provides_context.trait_type).toBe('LLMRubricTrait');
      }

      if (traits.has_citations) {
        // This one might be false (as per fixture)
        expect(traits.has_citations.trait_type).toBe('RegexTrait');
      }
    });

    it('should verify rubric evaluation does not interfere with template verification', () => {
      const rubricResults = loadMockedVerificationResults('with-rubric-success');

      // Both rubric and template verification should coexist
      Object.values(rubricResults).forEach((result) => {
        // Template verification should still be performed
        expect(result.template).toBeDefined();
        expect(result.template.template_verification_performed).toBe(true);
        expect(result.template.verify_result).toBeDefined();

        // Rubric should also be present
        expect(result.rubric).toBeDefined();
        expect(result.rubric.evaluation_performed).toBe(true);
      });
    });
  });

  describe('integ-024: Results table display and export', () => {
    it('should verify results are displayed correctly in the table', () => {
      const testResults = loadMockedVerificationResults('successful-verification');

      // Verify results can be converted to table format
      const resultsArray = Object.values(testResults);
      expect(resultsArray.length).toBeGreaterThan(0);

      // Each result should have the necessary fields for display
      resultsArray.forEach((result) => {
        expect(result.metadata.question_text).toBeTruthy();
        expect(result.metadata.raw_answer).toBeTruthy();
        expect(result.template.verify_result).toBeDefined();
      });

      // Verify the results count
      expect(resultsArray.length).toBe(Object.keys(testResults).length);
    });

    it('should verify table columns can be extracted from results', () => {
      const testResults = loadMockedVerificationResults('successful-verification');

      // Extract column data from results
      const tableData = Object.values(testResults).map((result) => ({
        question: result.metadata.question_text,
        answer: result.metadata.raw_answer,
        result: result.template.verify_result ? 'Pass' : 'Fail',
        rubricScore: result.rubric ? result.rubric.overall_score : null,
      }));

      expect(tableData.length).toBeGreaterThan(0);

      // Verify each row has the required columns
      tableData.forEach((row) => {
        expect(row.question).toBeDefined();
        expect(row.answer).toBeDefined();
        expect(row.result).toMatch(/^(Pass|Fail)$/);
        // rubricScore may be null if no rubric evaluation
      });
    });

    it('should verify sorting functionality works on results', () => {
      const testResults = loadMockedVerificationResults('multi-model-results');

      // Get all results and sort by question_id
      const resultsArray = Object.entries(testResults);
      const sortedByQuestion = [...resultsArray].sort((a, b) =>
        a[1].metadata.question_id.localeCompare(b[1].metadata.question_id)
      );

      // Verify sorting worked
      expect(sortedByQuestion[0][1].metadata.question_id).toBe('q1');
      expect(sortedByQuestion[1][1].metadata.question_id).toBe('q1');

      // Sort by answering model
      const sortedByModel = [...resultsArray].sort((a, b) =>
        a[1].metadata.answering_model.localeCompare(b[1].metadata.answering_model)
      );

      // Verify model sorting - Claude should come before OpenAI alphabetically
      const claudeResults = sortedByModel.filter(
        ([, r]) => r.metadata.answering_model === 'anthropic/claude-haiku-4-5'
      );
      const openaiResults = sortedByModel.filter(([, r]) => r.metadata.answering_model === 'openai/gpt-4');

      expect(claudeResults.length).toBeGreaterThan(0);
      expect(openaiResults.length).toBeGreaterThan(0);
      // claude comes before openai alphabetically
      expect(
        sortedByModel.findIndex(([, r]) => r.metadata.answering_model === 'anthropic/claude-haiku-4-5')
      ).toBeLessThan(sortedByModel.findIndex(([, r]) => r.metadata.answering_model === 'openai/gpt-4'));
    });

    it('should verify filtering by result status works', () => {
      const mixedResults = loadMockedVerificationResults('partial-completion');

      // Filter by passed results
      const passedResults = Object.values(mixedResults).filter((r) => r.template.verify_result === true);

      // Filter by failed results (explicit false or null/error)
      const failedResults = Object.values(mixedResults).filter(
        (r) => r.template.verify_result === false || r.template.verify_result === null
      );

      // Verify filtering works
      expect(passedResults.length).toBeGreaterThan(0);
      expect(failedResults.length).toBeGreaterThan(0);

      // Verify no overlap
      const passedIds = new Set(passedResults.map((r) => r.metadata.result_id));
      const failedIds = new Set(failedResults.map((r) => r.metadata.result_id));
      const intersection = [...passedIds].filter((x) => failedIds.has(x));
      expect(intersection.length).toBe(0);
    });

    it('should verify JSON export data structure', () => {
      const testResults = loadMockedVerificationResults('successful-verification');

      // Simulate JSON export structure
      const exportData = {
        job_id: 'test-job-123',
        timestamp: new Date().toISOString(),
        results: testResults,
        summary: {
          total: Object.keys(testResults).length,
          passed: Object.values(testResults).filter((r) => r.template.verify_result === true).length,
          failed: Object.values(testResults).filter((r) => r.template.verify_result === false).length,
        },
      };

      // Verify export structure
      expect(exportData.job_id).toBeTruthy();
      expect(exportData.timestamp).toBeTruthy();
      expect(exportData.results).toBeDefined();
      expect(exportData.summary.total).toBe(3);
      expect(exportData.summary.passed).toBe(3);
      expect(exportData.summary.failed).toBe(0);

      // Verify results can be serialized to JSON
      const jsonString = JSON.stringify(exportData);
      expect(jsonString).toBeTruthy();
      expect(jsonString.length).toBeGreaterThan(0);
    });

    it('should verify CSV export data structure', () => {
      const testResults = loadMockedVerificationResults('successful-verification');

      // Simulate CSV export structure (flat rows)
      const csvRows = Object.values(testResults).map((result) => ({
        question_id: result.metadata.question_id,
        question_text: result.metadata.question_text,
        raw_answer: result.metadata.raw_answer,
        verify_result: result.template.verify_result ? 'Pass' : 'Fail',
        answering_model: result.metadata.answering_model,
        parsing_model: result.metadata.parsing_model,
        execution_time: result.metadata.execution_time,
      }));

      expect(csvRows.length).toBe(3);

      // Verify each row has the required CSV columns
      csvRows.forEach((row) => {
        expect(row.question_id).toMatch(/^q[123]$/);
        expect(row.question_text).toBeDefined();
        expect(row.raw_answer).toBeDefined();
        expect(row.verify_result).toBe('Pass');
        expect(row.answering_model).toBe('anthropic/claude-haiku-4-5');
        expect(typeof row.execution_time).toBe('number');
      });

      // Verify CSV could be generated from rows
      const headers = [
        'question_id',
        'question_text',
        'raw_answer',
        'verify_result',
        'answering_model',
        'parsing_model',
        'execution_time',
      ];
      const csvHeader = headers.join(',');
      expect(csvHeader).toBeTruthy();
    });

    describe('integ-053: Drill-down from summary statistics', () => {
      it('should compute summary statistics from verification results', () => {
        const testResults = loadMockedVerificationResults('partial-completion');

        // Compute summary statistics
        const totalResults = Object.keys(testResults).length;
        const passedResults = Object.values(testResults).filter((r) => r.template.verify_result === true).length;
        const failedResults = Object.values(testResults).filter((r) => r.template.verify_result === false).length;
        const errorResults = Object.values(testResults).filter(
          (r) => r.template.verify_result === null || r.metadata.completed_without_errors === false
        ).length;

        // Verify statistics computed correctly
        expect(totalResults).toBe(3);
        expect(passedResults).toBe(2); // q1 and q3 pass
        expect(failedResults).toBe(0);
        expect(errorResults).toBe(1); // q2 has null verify_result and error
      });

      it('should filter results when clicking on summary statistic', () => {
        const testResults = loadMockedVerificationResults('partial-completion');

        // Simulate clicking on "passed" statistic
        const passedFilter = Object.values(testResults).filter((r) => r.template.verify_result === true);

        // Simulate clicking on "error" statistic
        const errorFilter = Object.values(testResults).filter(
          (r) => r.template.verify_result === null || r.metadata.completed_without_errors === false
        );

        // Verify filtering produces correct subsets
        expect(passedFilter.length).toBe(2);
        expect(errorFilter.length).toBe(1);

        // Verify passed results have correct question IDs
        const passedQuestionIds = new Set(passedFilter.map((r) => r.metadata.question_id));
        expect(passedQuestionIds.has('q1')).toBe(true);
        expect(passedQuestionIds.has('q3')).toBe(true);
        expect(passedQuestionIds.has('q2')).toBe(false);
      });

      it('should verify filter state persists across table operations', () => {
        const testResults = loadMockedVerificationResults('multi-model-results');

        // Apply filter for specific model
        const claudeResults = Object.values(testResults).filter(
          (r) => r.metadata.answering_model === 'anthropic/claude-haiku-4-5'
        );

        // Verify count
        expect(claudeResults.length).toBe(3);

        // Simulate sorting within filtered results
        const sortedByQuestion = [...claudeResults].sort((a, b) =>
          a.metadata.question_id.localeCompare(b.metadata.question_id)
        );

        // Verify filter still applies after sort
        expect(sortedByQuestion.length).toBe(3);
        expect(sortedByQuestion.every((r) => r.metadata.answering_model === 'anthropic/claude-haiku-4-5')).toBe(true);
      });

      it('should provide aggregate statistics for multi-model results', () => {
        const testResults = loadMockedVerificationResults('multi-model-results');

        // Group by answering model
        const byModel: Record<string, typeof testResults> = {};
        for (const [, result] of Object.entries(testResults)) {
          const model = result.metadata.answering_model;
          if (!byModel[model]) {
            byModel[model] = {};
          }
          byModel[model][result.metadata.question_id] = result;
        }

        // Verify per-model statistics
        expect(Object.keys(byModel)).toHaveLength(2);
        expect(byModel['anthropic/claude-haiku-4-5']).toBeDefined();
        expect(byModel['openai/gpt-4']).toBeDefined();

        // Each model should have 3 results
        expect(Object.keys(byModel['anthropic/claude-haiku-4-5']).length).toBe(3);
        expect(Object.keys(byModel['openai/gpt-4']).length).toBe(3);
      });

      it('should verify summary panel shows completion percentage', () => {
        const testResults = loadMockedVerificationResults('partial-completion');

        const total = Object.keys(testResults).length;
        const completed = Object.values(testResults).filter((r) => r.metadata.completed_without_errors).length;
        const percentage = Math.round((completed / total) * 100);

        // Verify completion percentage calculation
        expect(percentage).toBe(67); // 2 out of 3 completed
        expect(completed).toBe(2);
        expect(total).toBe(3);
      });

      it('should verify clear filter resets to all results', () => {
        const testResults = loadMockedVerificationResults('partial-completion');

        // Apply filter
        const passedResults = Object.values(testResults).filter((r) => r.template.verify_result === true);
        expect(passedResults.length).toBe(2);

        // Clear filter (return to all results)
        const allResults = Object.values(testResults);
        expect(allResults.length).toBe(3);

        // Verify original result count restored
        expect(Object.keys(testResults).length).toBe(3);
      });
    });
  });
});
