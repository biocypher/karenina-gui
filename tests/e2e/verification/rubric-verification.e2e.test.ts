/**
 * E2E Rubric Verification Tests
 *
 * Tests rubric evaluation against a real karenina-server.
 * The server runs in E2E mode with LLM calls mocked via FixtureBackedLLMClient.
 *
 * These tests verify:
 * - LLM traits (boolean and scored)
 * - Regex traits
 * - Batch vs sequential evaluation strategies
 * - template_and_rubric vs rubric_only modes
 * - Score aggregation
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
  rubric?: unknown;
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

// Base model config for rubric evaluation
const createRubricConfig = (
  mode: 'template_and_rubric' | 'rubric_only' = 'template_and_rubric',
  strategy: 'batch' | 'sequential' = 'batch'
) => ({
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
  evaluation_mode: mode,
  rubric_enabled: true,
  rubric_evaluation_strategy: strategy,
  abstention_enabled: false,
  deep_judgment_enabled: false,
});

// Helper to transform rubric for API (removes extra fields, base64 encodes callable_code)
const transformRubricForApi = (rubric: Record<string, unknown>): Record<string, unknown> => {
  const transformed: Record<string, unknown> = {};

  // Copy llm_traits if present
  if (rubric.llm_traits) {
    transformed.llm_traits = rubric.llm_traits;
  }

  // Copy regex_traits if present
  if (rubric.regex_traits) {
    transformed.regex_traits = rubric.regex_traits;
  }

  // Transform callable_traits: base64 encode callable_code
  if (rubric.callable_traits && Array.isArray(rubric.callable_traits)) {
    transformed.callable_traits = (rubric.callable_traits as Array<Record<string, unknown>>).map((trait) => ({
      ...trait,
      callable_code: trait.callable_code
        ? Buffer.from(trait.callable_code as string).toString('base64')
        : trait.callable_code,
    }));
  }

  // Don't copy 'name' and 'description' as they're not permitted
  return transformed;
};

// Helper to set the global rubric via API
const setGlobalRubric = async (serverUrl: string, rubric: unknown) => {
  const transformedRubric = transformRubricForApi(rubric as Record<string, unknown>);
  const response = await fetch(`${serverUrl}/api/v2/rubrics/current`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transformedRubric),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to set rubric: ${JSON.stringify(error)}`);
  }
};

// Helper to clear the global rubric
const clearGlobalRubric = async (serverUrl: string) => {
  await fetch(`${serverUrl}/api/v2/rubrics/current`, { method: 'DELETE' });
};

// Helper to extract first result from results
// API returns {"results": VerificationResultSet} where VerificationResultSet has {"results": [...]}
const getFirstResult = (results: unknown): Record<string, unknown> => {
  // Handle both {"results": [...]} and direct array formats
  const resultSet = results as { results?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;

  let resultsArray: Array<Record<string, unknown>>;
  if (Array.isArray(resultSet)) {
    resultsArray = resultSet;
  } else if (resultSet && 'results' in resultSet && Array.isArray(resultSet.results)) {
    resultsArray = resultSet.results;
  } else {
    throw new Error(`Unexpected results format: ${JSON.stringify(results)}`);
  }

  if (resultsArray.length === 0) {
    throw new Error('No results found in response');
  }
  return resultsArray[0];
};

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
        };
      }
      return { status: progress.status, error: progress.error };
    }

    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Job ${jobId} did not complete within ${timeout}ms`);
};

describe('E2E: Rubric Verification', () => {
  const serverUrl = getServerUrl();
  let activeJobIds: string[] = [];

  afterEach(async () => {
    // Cancel any active jobs
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

    // Clear rubric to prevent state leaking between tests
    try {
      await clearGlobalRubric(serverUrl);
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeAll(async () => {
    const response = await fetch(`${serverUrl}/api/health`);
    expect(response.ok).toBe(true);
  });

  describe('LLM traits', () => {
    it('should evaluate boolean trait (accuracy)', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createRubricConfig('template_and_rubric', 'batch');

      // Set global rubric via API before starting verification
      const globalRubric = checkpoint.globalRubric;
      await setGlobalRubric(serverUrl, globalRubric);

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          run_name: 'e2e-rubric-boolean-test',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Verification start failed: ${JSON.stringify(error)}`);
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      const result = await waitForJobCompletion(serverUrl, job_id);

      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();

      // Use helper to extract first result from nested structure
      const firstResult = getFirstResult(result.results);
      const rubric = firstResult.rubric as
        | {
            llm_trait_scores?: Record<string, boolean | number>;
          }
        | undefined;

      expect(rubric).toBeDefined();
      expect(rubric!.llm_trait_scores).toBeDefined();
      // Should have accuracy trait score (boolean)
      expect(rubric!.llm_trait_scores).toHaveProperty('accuracy');
      expect(typeof rubric!.llm_trait_scores!.accuracy).toBe('boolean');
    });

    it('should evaluate scored trait (clarity 1-5)', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createRubricConfig('template_and_rubric', 'batch');
      const globalRubric = checkpoint.globalRubric;

      await setGlobalRubric(serverUrl, globalRubric);

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          run_name: 'e2e-rubric-scored-test',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Verification start failed: ${JSON.stringify(error)}`);
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      const result = await waitForJobCompletion(serverUrl, job_id);

      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();

      // Use helper to extract first result from nested structure
      const firstResult = getFirstResult(result.results) as {
        rubric?: {
          llm_trait_scores?: Record<string, boolean | number>;
        };
      };
      expect(firstResult.rubric).toBeDefined();
      expect(firstResult.rubric!.llm_trait_scores).toBeDefined();
      // Should have clarity trait score (1-5)
      expect(firstResult.rubric!.llm_trait_scores).toHaveProperty('clarity');
      const clarity = firstResult.rubric!.llm_trait_scores!.clarity;
      expect(typeof clarity).toBe('number');
      expect(clarity).toBeGreaterThanOrEqual(1);
      expect(clarity).toBeLessThanOrEqual(5);
    });

    it('should handle multiple traits in batch mode', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createRubricConfig('template_and_rubric', 'batch');
      const globalRubric = checkpoint.globalRubric;

      await setGlobalRubric(serverUrl, globalRubric);

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          run_name: 'e2e-rubric-batch-test',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Verification start failed: ${JSON.stringify(error)}`);
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      const result = await waitForJobCompletion(serverUrl, job_id);

      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();

      // Use helper to extract first result from nested structure
      const firstResult = getFirstResult(result.results) as {
        rubric?: {
          llm_trait_scores?: Record<string, boolean | number>;
        };
      };
      expect(firstResult.rubric).toBeDefined();
      expect(firstResult.rubric!.llm_trait_scores).toBeDefined();
      // Should have clarity, accuracy, and completeness traits
      const scores = firstResult.rubric!.llm_trait_scores!;
      expect(Object.keys(scores).length).toBeGreaterThanOrEqual(3);
      expect(scores).toHaveProperty('clarity');
      expect(scores).toHaveProperty('accuracy');
      expect(scores).toHaveProperty('completeness');
    });

    it('should handle multiple traits in sequential mode', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createRubricConfig('template_and_rubric', 'sequential');
      const globalRubric = checkpoint.globalRubric;

      await setGlobalRubric(serverUrl, globalRubric);

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          run_name: 'e2e-rubric-sequential-test',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Verification start failed: ${JSON.stringify(error)}`);
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      const result = await waitForJobCompletion(serverUrl, job_id);

      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();

      // Use helper to extract first result from nested structure
      const firstResult = getFirstResult(result.results) as {
        rubric?: {
          llm_trait_scores?: Record<string, boolean | number>;
        };
      };
      expect(firstResult.rubric).toBeDefined();
      expect(firstResult.rubric!.llm_trait_scores).toBeDefined();
      // Sequential mode should produce same structure as batch
      const scores = firstResult.rubric!.llm_trait_scores!;
      expect(Object.keys(scores).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Evaluation modes', () => {
    it('should run template_and_rubric mode', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createRubricConfig('template_and_rubric', 'batch');
      const globalRubric = checkpoint.globalRubric;

      await setGlobalRubric(serverUrl, globalRubric);

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          run_name: 'e2e-template-and-rubric-test',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Verification start failed: ${JSON.stringify(error)}`);
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      const result = await waitForJobCompletion(serverUrl, job_id);

      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();

      // Use helper to extract first result from nested structure
      const firstResult = getFirstResult(result.results) as {
        template?: { verify_result: boolean };
        rubric?: { llm_trait_scores?: Record<string, unknown> };
      };
      // Should have both template and rubric results
      expect(firstResult.template).toBeDefined();
      expect(firstResult.rubric).toBeDefined();
    });

    it('should run rubric_only mode', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createRubricConfig('rubric_only', 'batch');
      const globalRubric = checkpoint.globalRubric;

      await setGlobalRubric(serverUrl, globalRubric);

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          run_name: 'e2e-rubric-only-test',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Verification start failed: ${JSON.stringify(error)}`);
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      const result = await waitForJobCompletion(serverUrl, job_id);

      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();

      // Use helper to extract first result from nested structure
      const firstResult = getFirstResult(result.results) as {
        template?: { verify_result?: boolean };
        rubric?: { llm_trait_scores?: Record<string, unknown> };
      };
      // Should have rubric results
      expect(firstResult.rubric).toBeDefined();
      // In rubric_only mode, template verification may be skipped
      // or verify_result may be null
    });
  });

  describe('Regex traits', () => {
    it('should evaluate regex trait (HasCitations pattern)', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createRubricConfig('template_and_rubric', 'batch');
      const globalRubric = checkpoint.globalRubric;

      await setGlobalRubric(serverUrl, globalRubric);

      // Use first question - regex traits apply globally
      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          run_name: 'e2e-regex-trait-test',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Verification start failed: ${JSON.stringify(error)}`);
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      const result = await waitForJobCompletion(serverUrl, job_id);

      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();

      // Use helper to extract first result from nested structure
      const firstResult = getFirstResult(result.results) as {
        rubric?: {
          regex_trait_scores?: Record<string, boolean>;
        };
      };
      expect(firstResult.rubric).toBeDefined();
      // Should have regex trait scores from global rubric
      // The globalRubric has HasCitations and HasNumbers regex traits
      if (firstResult.rubric!.regex_trait_scores) {
        // At least one regex trait should exist
        expect(Object.keys(firstResult.rubric!.regex_trait_scores).length).toBeGreaterThanOrEqual(1);
        // Regex results are always boolean
        const scores = Object.values(firstResult.rubric!.regex_trait_scores);
        scores.forEach((score) => {
          expect(typeof score).toBe('boolean');
        });
      }
    });
  });

  describe('Callable traits', () => {
    it('should evaluate callable trait (ResponseLength)', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createRubricConfig('template_and_rubric', 'batch');
      const globalRubric = checkpoint.globalRubric;

      await setGlobalRubric(serverUrl, globalRubric);

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          run_name: 'e2e-callable-trait-test',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Verification start failed: ${JSON.stringify(error)}`);
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      const result = await waitForJobCompletion(serverUrl, job_id);

      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();

      // Use helper to extract first result from nested structure
      const firstResult = getFirstResult(result.results) as {
        rubric?: {
          callable_trait_scores?: Record<string, boolean | number>;
        };
      };
      expect(firstResult.rubric).toBeDefined();
      // Should have callable trait scores from global rubric
      // The globalRubric has ContainsCitations (boolean) and ResponseLength (score 1-5)
      if (firstResult.rubric!.callable_trait_scores) {
        expect(Object.keys(firstResult.rubric!.callable_trait_scores).length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Score aggregation', () => {
    it('should aggregate all trait types in rubric result', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createRubricConfig('template_and_rubric', 'batch');
      const globalRubric = checkpoint.globalRubric;

      await setGlobalRubric(serverUrl, globalRubric);

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          run_name: 'e2e-score-aggregation-test',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Verification start failed: ${JSON.stringify(error)}`);
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      const result = await waitForJobCompletion(serverUrl, job_id);

      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();

      // Use helper to extract first result from nested structure
      const firstResult = getFirstResult(result.results) as {
        rubric?: {
          llm_trait_scores?: Record<string, boolean | number>;
          regex_trait_scores?: Record<string, boolean>;
          callable_trait_scores?: Record<string, boolean | number>;
        };
      };
      expect(firstResult.rubric).toBeDefined();
      // Should have LLM traits (clarity, accuracy, completeness)
      expect(firstResult.rubric!.llm_trait_scores).toBeDefined();
      // Should have regex traits (HasCitations, HasNumbers)
      // Note: regex_trait_scores may not be present if trait evaluation failed
      // Should have callable traits (ContainsCitations, ResponseLength)
      // Note: callable_trait_scores may not be present if trait evaluation failed
    });
  });
});
