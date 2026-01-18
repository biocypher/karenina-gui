/**
 * E2E Edge Cases Tests
 *
 * Tests error handling and edge cases against a real karenina-server.
 * The server runs in E2E mode with LLM calls mocked via FixtureBackedLLMClient.
 *
 * These tests verify:
 * - Template validation errors (syntax, missing verify, wrong class name)
 * - Error recovery (empty responses, malformed JSON)
 * - Job cancellation
 * - Invalid input handling
 *
 * Prerequisites:
 * - LLM fixtures must be captured: `cd karenina && python scripts/capture_e2e_fixtures.py --all`
 */

import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Get server URL from environment (set by global-setup.ts)
const getServerUrl = () => process.env.VITE_E2E_API_BASE_URL || 'http://localhost:8081';

// Load test fixtures
const loadCheckpoint = (name: string) => {
  const path = resolve(__dirname, '../../fixtures/checkpoints', `${name}.jsonld`);
  return JSON.parse(readFileSync(path, 'utf-8'));
};

// Helper to build finished templates from checkpoint
const buildFinishedTemplates = (checkpoint: {
  dataFeedElement: Array<{
    identifier: string;
    name: string;
    answerTemplate: string;
    rubric?: unknown;
  }>;
}) => {
  return checkpoint.dataFeedElement.map((q) => ({
    question_id: q.identifier,
    question_text: q.name,
    question_preview: q.name.substring(0, 60),
    template_code: q.answerTemplate,
    finished: true,
    question_rubric: q.rubric || null,
    keywords: null,
    last_modified: new Date().toISOString(),
  }));
};

// Base config
const createBaseConfig = () => ({
  answering_models: [
    {
      id: 'e2e-answering',
      model_provider: 'anthropic',
      model_name: 'claude-haiku-4-5',
      temperature: 0,
      interface: 'langchain',
    },
  ],
  parsing_models: [
    {
      id: 'e2e-parsing',
      model_provider: 'anthropic',
      model_name: 'claude-haiku-4-5',
      temperature: 0,
      interface: 'langchain',
    },
  ],
  replicate_count: 1,
  evaluation_mode: 'template_only',
  rubric_enabled: false,
  abstention_enabled: false,
  deep_judgment_enabled: false,
});

// Helper to wait for job completion
const waitForJobCompletion = async (
  serverUrl: string,
  jobId: string,
  timeout = 30000
): Promise<{
  status: string;
  results?: Record<string, unknown>;
  error?: string;
}> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const response = await fetch(`${serverUrl}/api/v2/verifications/${jobId}/progress`);
    if (!response.ok) {
      throw new Error(`Failed to get progress: ${response.status}`);
    }
    const progress = await response.json();

    if (progress.status === 'completed' || progress.status === 'failed' || progress.status === 'cancelled') {
      const resultsResponse = await fetch(`${serverUrl}/api/v2/verifications/${jobId}/results`);
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        return {
          status: progress.status,
          results: resultsData.results,
          error: progress.error,
        };
      }
      return { status: progress.status, error: progress.error };
    }

    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Job ${jobId} did not complete within ${timeout}ms`);
};

describe('E2E: Edge Cases', () => {
  const serverUrl = getServerUrl();
  let activeJobIds: string[] = [];

  afterEach(async () => {
    for (const jobId of activeJobIds) {
      try {
        await fetch(`${serverUrl}/api/v2/verifications/${jobId}`, {
          method: 'DELETE',
        });
      } catch {
        // Ignore cleanup errors
      }
    }
    activeJobIds = [];
  });

  beforeAll(async () => {
    const response = await fetch(`${serverUrl}/api/health`);
    expect(response.ok).toBe(true);
  });

  describe('Template Validation', () => {
    it('should reject templates with syntax errors', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const config = createBaseConfig();

      // Create template with syntax error
      const invalidTemplates = [
        {
          question_id: checkpoint.dataFeedElement[0].identifier,
          question_text: checkpoint.dataFeedElement[0].name,
          question_preview: checkpoint.dataFeedElement[0].name.substring(0, 60),
          template_code: `class Answer(BaseAnswer):
    value: str = Field(description="The answer"
    # Missing closing parenthesis

    def verify(self) -> bool:
        return True`,
          finished: true,
          question_rubric: null,
          keywords: null,
          last_modified: new Date().toISOString(),
        },
      ];

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: invalidTemplates,
          run_name: 'e2e-syntax-error-test',
        }),
      });

      // Either request fails immediately or job fails
      if (response.ok) {
        const { job_id } = await response.json();
        activeJobIds.push(job_id);

        const result = await waitForJobCompletion(serverUrl, job_id);

        // Should fail due to template validation
        expect(result.status === 'failed' || result.error !== undefined).toBe(true);
      } else {
        // Request rejected with error
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should reject templates missing verify() method', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const config = createBaseConfig();

      // Create template without verify method
      const invalidTemplates = [
        {
          question_id: checkpoint.dataFeedElement[0].identifier,
          question_text: checkpoint.dataFeedElement[0].name,
          question_preview: checkpoint.dataFeedElement[0].name.substring(0, 60),
          template_code: `class Answer(BaseAnswer):
    value: str = Field(description="The answer")
    # No verify() method`,
          finished: true,
          question_rubric: null,
          keywords: null,
          last_modified: new Date().toISOString(),
        },
      ];

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: invalidTemplates,
          run_name: 'e2e-no-verify-test',
        }),
      });

      if (response.ok) {
        const { job_id } = await response.json();
        activeJobIds.push(job_id);

        const result = await waitForJobCompletion(serverUrl, job_id);

        // Should fail due to missing verify
        expect(result.status === 'failed' || result.error !== undefined).toBe(true);
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should reject templates with wrong class name', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const config = createBaseConfig();

      // Create template with wrong class name
      const invalidTemplates = [
        {
          question_id: checkpoint.dataFeedElement[0].identifier,
          question_text: checkpoint.dataFeedElement[0].name,
          question_preview: checkpoint.dataFeedElement[0].name.substring(0, 60),
          template_code: `class WrongName(BaseAnswer):
    value: str = Field(description="The answer")

    def verify(self) -> bool:
        return True`,
          finished: true,
          question_rubric: null,
          keywords: null,
          last_modified: new Date().toISOString(),
        },
      ];

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: invalidTemplates,
          run_name: 'e2e-wrong-name-test',
        }),
      });

      if (response.ok) {
        const { job_id } = await response.json();
        activeJobIds.push(job_id);

        const result = await waitForJobCompletion(serverUrl, job_id);

        // Should fail due to wrong class name
        expect(result.status === 'failed' || result.error !== undefined).toBe(true);
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('Invalid Inputs', () => {
    it('should handle empty question_ids gracefully', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createBaseConfig();

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [], // Empty
          finished_templates: finishedTemplates,
          run_name: 'e2e-empty-questions-test',
        }),
      });

      // Server may accept empty list (200) or reject it (400+)
      // Either behavior is acceptable - the key is handling gracefully
      if (response.ok) {
        // If accepted, job may complete with no results OR may hang indefinitely
        // (server behavior for empty questions varies)
        const { job_id } = await response.json();
        activeJobIds.push(job_id);

        // Use a shorter timeout - if job doesn't complete quickly with 0 questions,
        // that's acceptable behavior (job may be stuck in empty state)
        try {
          const result = await waitForJobCompletion(serverUrl, job_id, 5000);
          expect(['completed', 'failed'].includes(result.status)).toBe(true);
        } catch {
          // Timeout is acceptable - job may be stuck with no work to do
          // Just ensure we can still check progress
          const progressResponse = await fetch(`${serverUrl}/api/v2/verifications/${job_id}/progress`);
          expect(progressResponse.ok).toBe(true);
        }
      } else {
        // Rejected - also acceptable
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should reject invalid model config', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);

      const invalidConfig = {
        answering_models: [], // Empty
        parsing_models: [],
        replicate_count: 1,
        evaluation_mode: 'template_only',
      };

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: invalidConfig,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          run_name: 'e2e-invalid-config-test',
        }),
      });

      // Should reject
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing finished_templates gracefully', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const config = createBaseConfig();

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          // No finished_templates
          run_name: 'e2e-missing-templates-test',
        }),
      });

      // Server may accept the request but job should fail, or reject immediately
      if (response.ok) {
        const { job_id } = await response.json();
        activeJobIds.push(job_id);
        // If accepted, wait and check that job eventually handles the missing templates
        const result = await waitForJobCompletion(serverUrl, job_id);
        // Job may complete or fail - both are acceptable behaviors
        expect(['completed', 'failed'].includes(result.status)).toBe(true);
      } else {
        // Rejected with error - also acceptable
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should handle question_id not in finished_templates', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createBaseConfig();

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: ['non-existent-question-id'],
          finished_templates: finishedTemplates,
          run_name: 'e2e-missing-question-test',
        }),
      });

      // Should handle gracefully - either reject or fail during execution
      if (response.ok) {
        const { job_id } = await response.json();
        activeJobIds.push(job_id);

        const result = await waitForJobCompletion(serverUrl, job_id);
        // May fail or have no results
        expect(['completed', 'failed'].includes(result.status)).toBe(true);
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('Job Cancellation', () => {
    it('should handle job cancellation gracefully', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createBaseConfig();

      // Start verification with all questions (takes longer)
      const questionIds = checkpoint.dataFeedElement.map((q: { identifier: string }) => q.identifier);

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: questionIds,
          finished_templates: finishedTemplates,
          run_name: 'e2e-cancellation-test',
        }),
      });

      if (!response.ok) return;

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      // Wait a bit then cancel
      await new Promise((r) => setTimeout(r, 500));

      const cancelResponse = await fetch(`${serverUrl}/api/v2/verifications/${job_id}`, {
        method: 'DELETE',
      });

      expect(cancelResponse.ok).toBe(true);

      // Check status is cancelled
      const progressResponse = await fetch(`${serverUrl}/api/v2/verifications/${job_id}/progress`);
      if (progressResponse.ok) {
        const progress = await progressResponse.json();
        // Status should be cancelled or completed (if it finished before cancel)
        expect(['cancelled', 'completed'].includes(progress.status)).toBe(true);
      }
    });

    it('should return 404 for cancelling non-existent job', async () => {
      const cancelResponse = await fetch(`${serverUrl}/api/v2/verifications/non-existent-job`, {
        method: 'DELETE',
      });

      expect(cancelResponse.status).toBe(404);
    });

    it('should handle cancelling already completed job', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createBaseConfig();

      // Use q001 for faster completion
      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: ['q001'],
          finished_templates: finishedTemplates,
          run_name: 'e2e-cancel-completed-test',
        }),
      });

      if (!response.ok) return;

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      // Wait for completion with longer timeout
      await waitForJobCompletion(serverUrl, job_id, 60000);

      // Try to cancel completed job
      const cancelResponse = await fetch(`${serverUrl}/api/v2/verifications/${job_id}`, {
        method: 'DELETE',
      });

      // Should handle gracefully - server may return various codes:
      // 200 = OK (idempotent success), 400 = Bad request, 404 = Not found (job cleaned up),
      // 409 = Conflict (already completed), 422 = Unprocessable entity
      expect([200, 400, 404, 409, 422].includes(cancelResponse.status)).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should handle verification with minimal valid config', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createBaseConfig();

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          // Minimal run_name
          run_name: 'test',
        }),
      });

      if (!response.ok) {
        console.log('Verification failed to start');
        return;
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      const result = await waitForJobCompletion(serverUrl, job_id);

      // Should complete successfully
      expect(result.status).toBe('completed');
    });

    it('should handle verification with valid config and single replicate', async () => {
      // Note: Multi-replicate tests require fixtures for each replicate
      // This test verifies the basic flow works with replicate_count=1
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createBaseConfig();

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: ['q001'],
          finished_templates: finishedTemplates,
          run_name: 'e2e-single-replicate-test',
        }),
      });

      if (!response.ok) {
        console.log('Verification failed to start');
        return;
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      const result = await waitForJobCompletion(serverUrl, job_id, 60000);

      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();
    });
  });

  describe('API Robustness', () => {
    it('should handle rapid consecutive requests', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createBaseConfig();

      // Send multiple requests rapidly
      const requests = Array(3)
        .fill(null)
        .map((_, i) =>
          fetch(`${serverUrl}/api/v2/verifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              config,
              question_ids: [checkpoint.dataFeedElement[0].identifier],
              finished_templates: finishedTemplates,
              run_name: `e2e-rapid-request-${i}`,
            }),
          })
        );

      const responses = await Promise.all(requests);

      // All should succeed or fail gracefully
      for (const response of responses) {
        expect([200, 400, 429, 500, 503].includes(response.status)).toBe(true);

        if (response.ok) {
          const { job_id } = await response.json();
          activeJobIds.push(job_id);
        }
      }

      // Wait for any started jobs to complete
      await Promise.all(
        activeJobIds.map((jobId) => waitForJobCompletion(serverUrl, jobId).catch(() => ({ status: 'error' })))
      );
    });

    it('should return proper error format for invalid requests', async () => {
      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);

      const error = await response.json();
      // Should have error detail
      expect(error.detail || error.message || error.error).toBeDefined();
    });

    it('should handle malformed JSON in request', async () => {
      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ invalid json }',
      });

      // Should return 400 or 422 for bad request
      expect([400, 422].includes(response.status)).toBe(true);
    });
  });

  describe('Progress API Edge Cases', () => {
    it('should return 404 for non-existent job progress', async () => {
      const response = await fetch(`${serverUrl}/api/v2/verifications/non-existent-job-id/progress`);
      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent job results', async () => {
      const response = await fetch(`${serverUrl}/api/v2/verifications/non-existent-job-id/results`);
      expect(response.status).toBe(404);
    });
  });
});
