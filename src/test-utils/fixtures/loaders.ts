/**
 * Fixture loader utilities for loading captured LLM response fixtures
 *
 * These utilities provide type-safe access to fixtures captured from real API calls.
 */
import type { VerificationResult, TemplateGenerationResult, Rubric, QuestionData } from '../../types';

// Import fixtures statically for bundling
import sampleQuestionsFixture from './llm-responses/shared/sample-questions.json';
import sampleRubricFixture from './llm-responses/shared/sample-rubric.json';
import singleQuestionFixture from './llm-responses/verification/claude-haiku-4-5/single-question.json';
import multiQuestionFixture from './llm-responses/verification/claude-haiku-4-5/multi-question.json';
import withRubricFixture from './llm-responses/verification/claude-haiku-4-5/with-rubric.json';

// Import mocked fixtures for integration testing
import successfulVerificationFixture from './llm-responses/verification/mocked/successful-verification.json';
import failedVerificationFixture from './llm-responses/verification/mocked/failed-verification.json';
import abstentionDetectedFixture from './llm-responses/verification/mocked/abstention-detected.json';
import partialCompletionFixture from './llm-responses/verification/mocked/partial-completion.json';
import withRubricSuccessFixture from './llm-responses/verification/mocked/with-rubric-success.json';
import multiModelResultsFixture from './llm-responses/verification/mocked/multi-model-results.json';

/**
 * Fixture metadata included in captured fixtures
 */
export interface FixtureMetadata {
  capturedAt: string;
  model: string;
  scenario: string;
  backendUrl: string;
}

/**
 * Verification fixture structure
 */
export interface VerificationFixture {
  _metadata: FixtureMetadata;
  data: Record<string, VerificationResult>;
}

/**
 * Template generation fixture structure
 */
export interface TemplateGenerationFixture {
  _metadata: FixtureMetadata;
  data: TemplateGenerationResult;
}

/**
 * Available verification fixture scenarios (captured from real API)
 */
export type VerificationScenario = 'single-question' | 'multi-question' | 'with-rubric';

/**
 * Available mocked verification scenarios (for integration testing)
 */
export type MockedVerificationScenario =
  | 'successful-verification'
  | 'failed-verification'
  | 'abstention-detected'
  | 'partial-completion'
  | 'with-rubric-success'
  | 'multi-model-results';

/**
 * Available models with captured fixtures
 */
export type FixtureModel = 'claude-haiku-4-5' | 'mocked';

// Fixture registry for captured fixtures
const verificationFixtures: Record<'claude-haiku-4-5', Record<VerificationScenario, VerificationFixture>> = {
  'claude-haiku-4-5': {
    'single-question': singleQuestionFixture as VerificationFixture,
    'multi-question': multiQuestionFixture as VerificationFixture,
    'with-rubric': withRubricFixture as VerificationFixture,
  },
};

// Fixture registry for mocked fixtures (integration testing)
const mockedVerificationFixtures: Record<MockedVerificationScenario, VerificationFixture> = {
  'successful-verification': successfulVerificationFixture as VerificationFixture,
  'failed-verification': failedVerificationFixture as VerificationFixture,
  'abstention-detected': abstentionDetectedFixture as VerificationFixture,
  'partial-completion': partialCompletionFixture as VerificationFixture,
  'with-rubric-success': withRubricSuccessFixture as VerificationFixture,
  'multi-model-results': multiModelResultsFixture as VerificationFixture,
};

/**
 * Load a verification fixture by model and scenario (captured fixtures only)
 */
export function loadVerificationFixture(
  model: 'claude-haiku-4-5',
  scenario: VerificationScenario
): VerificationFixture {
  const modelFixtures = verificationFixtures[model];
  if (!modelFixtures) {
    throw new Error(`No fixtures available for model: ${model}`);
  }
  const fixture = modelFixtures[scenario];
  if (!fixture) {
    throw new Error(`No fixture available for scenario: ${scenario}`);
  }
  return fixture;
}

/**
 * Load a mocked verification fixture by scenario (for integration testing)
 */
export function loadMockedVerificationFixture(scenario: MockedVerificationScenario): VerificationFixture {
  const fixture = mockedVerificationFixtures[scenario];
  if (!fixture) {
    throw new Error(`No mocked fixture available for scenario: ${scenario}`);
  }
  return fixture;
}

/**
 * Load mocked verification results (just the data, not metadata)
 */
export function loadMockedVerificationResults(
  scenario: MockedVerificationScenario
): Record<string, VerificationResult> {
  const fixture = loadMockedVerificationFixture(scenario);
  return fixture.data;
}

/**
 * Load verification results from a captured fixture (just the data, not metadata)
 */
export function loadVerificationResults(
  model: 'claude-haiku-4-5',
  scenario: VerificationScenario
): Record<string, VerificationResult> {
  const fixture = loadVerificationFixture(model, scenario);
  return fixture.data;
}

/**
 * Load a single verification result from a captured fixture
 * Returns the first result if multiple exist
 */
export function loadSingleVerificationResult(
  model: 'claude-haiku-4-5',
  scenario: VerificationScenario
): VerificationResult {
  const results = loadVerificationResults(model, scenario);
  const firstKey = Object.keys(results)[0];
  if (!firstKey) {
    throw new Error(`No results in fixture: ${model}/${scenario}`);
  }
  return results[firstKey];
}

/**
 * Load a single verification result from a mocked fixture
 * Returns the first result if multiple exist
 */
export function loadSingleMockedVerificationResult(scenario: MockedVerificationScenario): VerificationResult {
  const results = loadMockedVerificationResults(scenario);
  const firstKey = Object.keys(results)[0];
  if (!firstKey) {
    throw new Error(`No results in mocked fixture: ${scenario}`);
  }
  return results[firstKey];
}

/**
 * Load sample questions fixture
 */
export function loadSampleQuestions(): Array<{
  id: string;
  question: string;
  raw_answer: string;
  answer_template: string;
}> {
  return sampleQuestionsFixture as Array<{
    id: string;
    question: string;
    raw_answer: string;
    answer_template: string;
  }>;
}

/**
 * Load sample rubric fixture
 */
export function loadSampleRubric(): Rubric {
  return sampleRubricFixture as unknown as Rubric;
}

/**
 * Create QuestionData from sample questions
 */
export function createQuestionDataFromSamples(): QuestionData {
  const samples = loadSampleQuestions();
  const questionData: QuestionData = {};
  samples.forEach((q) => {
    questionData[q.id] = {
      question: q.question,
      raw_answer: q.raw_answer,
      answer_template: q.answer_template,
    };
  });
  return questionData;
}

/**
 * Get fixture metadata for a captured fixture
 */
export function getFixtureMetadata(model: 'claude-haiku-4-5', scenario: VerificationScenario): FixtureMetadata {
  const fixture = loadVerificationFixture(model, scenario);
  return fixture._metadata;
}

/**
 * Get fixture metadata for a mocked fixture
 */
export function getMockedFixtureMetadata(scenario: MockedVerificationScenario): FixtureMetadata {
  const fixture = loadMockedVerificationFixture(scenario);
  return fixture._metadata;
}

/**
 * List all available captured fixture scenarios for a model
 */
export function listAvailableScenarios(model: 'claude-haiku-4-5'): VerificationScenario[] {
  const modelFixtures = verificationFixtures[model];
  if (!modelFixtures) {
    return [];
  }
  return Object.keys(modelFixtures) as VerificationScenario[];
}

/**
 * List all available mocked fixture scenarios
 */
export function listAvailableMockedScenarios(): MockedVerificationScenario[] {
  return Object.keys(mockedVerificationFixtures) as MockedVerificationScenario[];
}

/**
 * List all available models with captured fixtures
 */
export function listAvailableModels(): Array<'claude-haiku-4-5'> {
  return Object.keys(verificationFixtures) as Array<'claude-haiku-4-5'>;
}

/**
 * Clone a fixture with overrides (useful for test customization)
 */
export function cloneFixtureWithOverrides<T extends object>(fixture: T, overrides: Partial<T>): T {
  return {
    ...structuredClone(fixture),
    ...overrides,
  };
}

/**
 * Clone verification results with modifications to specific results
 */
export function cloneResultsWithModifications(
  results: Record<string, VerificationResult>,
  modifications: Record<string, Partial<VerificationResult>>
): Record<string, VerificationResult> {
  const cloned = structuredClone(results);
  for (const [key, mods] of Object.entries(modifications)) {
    if (cloned[key]) {
      cloned[key] = {
        ...cloned[key],
        ...mods,
        metadata: {
          ...cloned[key].metadata,
          ...(mods.metadata || {}),
        },
        template: mods.template ? { ...cloned[key].template, ...mods.template } : cloned[key].template,
        rubric: mods.rubric ? { ...cloned[key].rubric, ...mods.rubric } : cloned[key].rubric,
      };
    }
  }
  return cloned;
}
