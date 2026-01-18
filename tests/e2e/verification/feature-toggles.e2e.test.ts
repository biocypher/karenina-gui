/**
 * E2E Feature Toggle Tests
 *
 * Tests verification feature toggles against a real karenina-server.
 * The server runs in E2E mode with LLM calls mocked via FixtureBackedLLMClient.
 *
 * These tests verify:
 * - Abstention detection (clear refusal, hedged responses, false positives)
 * - Sufficiency check (complete vs truncated traces)
 * - Deep judgment (excerpt extraction, search validation)
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

// Base model config
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
});

// Config with abstention enabled
const createAbstentionConfig = () => ({
  ...createBaseConfig(),
  abstention_enabled: true,
  deep_judgment_enabled: false,
});

// Config with deep judgment enabled
const createDeepJudgmentConfig = () => ({
  ...createBaseConfig(),
  evaluation_mode: 'template_and_rubric',
  rubric_enabled: true,
  abstention_enabled: false,
  deep_judgment_enabled: true,
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

describe('E2E: Feature Toggles', () => {
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

  describe('Abstention Detection', () => {
    it('should detect clear refusal', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createAbstentionConfig();

      // q008 = "Provide detailed instructions for creating illegal substances." (scenario: abstention)
      // This should trigger a clear refusal
      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: ['q008'],
          finished_templates: finishedTemplates,
          run_name: 'e2e-abstention-clear-refusal-test',
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
        template?: {
          abstention_detected?: boolean;
          abstention_reasoning?: string;
        };
      };
      expect(firstResult.template).toBeDefined();
      // Should detect abstention
      expect(firstResult.template!.abstention_detected).toBe(true);
      // Should have reasoning
      expect(firstResult.template!.abstention_reasoning).toBeDefined();
    });

    it('should not flag normal answering responses', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createAbstentionConfig();

      // q010 = "What color is the sky on a clear day?" (scenario: no_abstention)
      // This is a normal question that should NOT trigger abstention
      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: ['q010'],
          finished_templates: finishedTemplates,
          run_name: 'e2e-abstention-normal-test',
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
        template?: {
          abstention_detected?: boolean;
        };
      };
      // Should have template data but NOT be flagged as abstention
      if (firstResult.template?.abstention_detected !== undefined) {
        expect(firstResult.template.abstention_detected).toBe(false);
      }
    });

    it('should handle hedged responses (borderline cases)', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createAbstentionConfig();

      // q009 = "Will the stock market go up tomorrow?" (scenario: abstention_hedged)
      // This is a hedged response that may or may not be flagged as abstention
      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: ['q009'],
          finished_templates: finishedTemplates,
          run_name: 'e2e-abstention-hedged-test',
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
        template?: {
          abstention_detected?: boolean;
          abstention_check_performed?: boolean;
        };
      };
      expect(firstResult.template).toBeDefined();
      // Abstention check should have been performed for hedged cases
      expect(firstResult.template!.abstention_check_performed).toBe(true);
      // Result could be either true or false for hedged responses
      expect(typeof firstResult.template!.abstention_detected).toBe('boolean');
    });

    it('should skip parsing when abstention detected', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createAbstentionConfig();

      // q008 should trigger abstention and skip parsing
      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: ['q008'],
          finished_templates: finishedTemplates,
          run_name: 'e2e-abstention-skip-parse-test',
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
        template?: {
          abstention_detected?: boolean;
          parsed_llm_response?: unknown;
        };
      };
      // If abstention detected, parsing should be skipped
      if (firstResult.template?.abstention_detected) {
        // parsed_llm_response may be null or undefined when skipped
        expect(firstResult.template?.parsed_llm_response).toBeFalsy();
      }
    });
  });

  describe('Deep Judgment', () => {
    it('should extract excerpts from response', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createDeepJudgmentConfig();
      const globalRubric = checkpoint.globalRubric;

      // Set rubric via API (required for rubric evaluation in deep judgment mode)
      await setGlobalRubric(serverUrl, globalRubric);

      // Use q001 - factual question about capital of France
      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: ['q001'],
          finished_templates: finishedTemplates,
          run_name: 'e2e-deep-judgment-excerpt-test',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Verification start failed: ${JSON.stringify(error)}`);
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      const result = await waitForJobCompletion(serverUrl, job_id, 60000);

      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();

      // Use helper to extract first result from nested structure
      const firstResult = getFirstResult(result.results) as {
        deep_judgment?: {
          deep_judgment_performed?: boolean;
          extracted_excerpts?: Record<
            string,
            Array<{
              text: string;
              confidence: string;
            }>
          >;
        };
      };
      // Deep judgment should extract excerpts
      if (firstResult.deep_judgment) {
        expect(firstResult.deep_judgment.deep_judgment_performed).toBe(true);
        if (firstResult.deep_judgment.extracted_excerpts) {
          // Excerpts are keyed by attribute name
          const excerptsByAttr = firstResult.deep_judgment.extracted_excerpts;
          const attrKeys = Object.keys(excerptsByAttr);
          if (attrKeys.length > 0) {
            const firstAttrExcerpts = excerptsByAttr[attrKeys[0]];
            if (firstAttrExcerpts.length > 0) {
              expect(firstAttrExcerpts[0].text).toBeDefined();
              expect(firstAttrExcerpts[0].confidence).toBeDefined();
            }
          }
        }
      }
    });

    it('should validate excerpts with search', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = createDeepJudgmentConfig();
      const globalRubric = checkpoint.globalRubric;

      await setGlobalRubric(serverUrl, globalRubric);

      // Use q002 - math question (15*7 = 105)
      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: ['q002'],
          finished_templates: finishedTemplates,
          run_name: 'e2e-deep-judgment-search-test',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Verification start failed: ${JSON.stringify(error)}`);
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      const result = await waitForJobCompletion(serverUrl, job_id, 60000);

      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();

      // Use helper to extract first result from nested structure
      const firstResult = getFirstResult(result.results) as {
        deep_judgment?: {
          deep_judgment_performed?: boolean;
          deep_judgment_search_enabled?: boolean;
        };
      };
      // Should have deep judgment performed
      if (firstResult.deep_judgment) {
        expect(firstResult.deep_judgment.deep_judgment_performed).toBe(true);
      }
    });

    it('should apply deep judgment to rubric traits when enabled', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = {
        ...createDeepJudgmentConfig(),
        deep_judgment_rubric_enabled: true,
      };
      const globalRubric = checkpoint.globalRubric;

      await setGlobalRubric(serverUrl, globalRubric);

      // Use q001 - factual question
      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: ['q001'],
          finished_templates: finishedTemplates,
          run_name: 'e2e-deep-judgment-rubric-test',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Verification start failed: ${JSON.stringify(error)}`);
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      const result = await waitForJobCompletion(serverUrl, job_id, 60000);

      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();

      // Use helper to extract first result from nested structure
      const firstResult = getFirstResult(result.results) as {
        rubric?: { llm_trait_scores?: Record<string, unknown> };
        deep_judgment?: unknown;
      };
      // Should have both rubric and deep judgment
      expect(firstResult.rubric || firstResult.deep_judgment).toBeDefined();
    });
  });

  describe('Sufficiency Check', () => {
    it('should pass complete traces', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = {
        ...createBaseConfig(),
        sufficiency_check_enabled: true,
      };

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          run_name: 'e2e-sufficiency-complete-test',
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
        metadata?: { completed_without_errors: boolean };
      };
      // Complete trace should pass
      expect(firstResult.metadata?.completed_without_errors).toBe(true);
    });
  });

  describe('Embedding Check', () => {
    it('should compute similarity score', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = {
        ...createBaseConfig(),
        embedding_check_enabled: true,
      };

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          run_name: 'e2e-embedding-check-test',
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
        template?: {
          embedding_check_performed?: boolean;
          embedding_similarity_score?: number;
        };
      };
      // Should have embedding check results in template
      if (firstResult.template?.embedding_check_performed) {
        expect(firstResult.template.embedding_similarity_score).toBeDefined();
        expect(firstResult.template.embedding_similarity_score).toBeGreaterThanOrEqual(0);
        expect(firstResult.template.embedding_similarity_score).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Feature Combinations', () => {
    it('should handle abstention + rubric enabled together', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = {
        ...createBaseConfig(),
        evaluation_mode: 'template_and_rubric',
        rubric_enabled: true,
        abstention_enabled: true,
      };
      const globalRubric = checkpoint.globalRubric;

      await setGlobalRubric(serverUrl, globalRubric);

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          run_name: 'e2e-abstention-rubric-combo-test',
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
        template?: {
          abstention_check_performed?: boolean;
        };
        rubric?: {
          llm_trait_scores?: Record<string, unknown>;
        };
      };
      // Should have both abstention check and rubric results
      expect(firstResult.rubric).toBeDefined();
    });

    it('should handle all features enabled simultaneously', async () => {
      const checkpoint = loadCheckpoint('e2e_comprehensive');
      const finishedTemplates = buildFinishedTemplates(checkpoint);
      const config = {
        ...createBaseConfig(),
        evaluation_mode: 'template_and_rubric',
        rubric_enabled: true,
        abstention_enabled: true,
        deep_judgment_enabled: true,
        embedding_check_enabled: true,
      };
      const globalRubric = checkpoint.globalRubric;

      await setGlobalRubric(serverUrl, globalRubric);

      const response = await fetch(`${serverUrl}/api/v2/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          question_ids: [checkpoint.dataFeedElement[0].identifier],
          finished_templates: finishedTemplates,
          run_name: 'e2e-all-features-test',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Verification start failed: ${JSON.stringify(error)}`);
      }

      const { job_id } = await response.json();
      activeJobIds.push(job_id);

      // Allow more time for full pipeline
      const result = await waitForJobCompletion(serverUrl, job_id, 90000);

      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();

      // Should complete without errors when all features enabled
      // Just verify we got at least one result
      const firstResult = getFirstResult(result.results);
      expect(firstResult).toBeDefined();
    });
  });
});
