/**
 * Verification fixture capture scenarios
 */

import type { ModelConfiguration, VerificationConfig, QuestionData, VerificationProgress } from '../../../src/types';
import { KareninaApiClient, VerificationRequest } from '../api-client';
import { FixtureWriter } from '../fixture-writer';
import { defaultModelConfig, sampleQuestions, sampleRubric } from '../config';

export interface CaptureResult {
  success: boolean;
  fixturesPaths: string[];
  errors: string[];
}

/**
 * Build a complete model configuration from partial config
 */
function buildModelConfig(partial: Partial<ModelConfiguration>): ModelConfiguration {
  return {
    id: `${partial.model_provider}-${partial.model_name}`,
    model_provider: partial.model_provider || 'anthropic',
    model_name: partial.model_name || 'claude-haiku-4-5',
    temperature: partial.temperature ?? 0.1,
    interface: partial.interface || 'langchain',
    system_prompt: partial.system_prompt || 'You are a helpful assistant.',
  };
}

/**
 * Build finished templates from sample questions
 */
function buildFinishedTemplates(questions: typeof sampleQuestions, rubric?: typeof sampleRubric) {
  return questions.map((q) => ({
    question_id: q.id,
    question_text: q.question,
    question_preview: q.question.substring(0, 50),
    template_code: q.answer_template,
    last_modified: new Date().toISOString(),
    finished: true,
    question_rubric: rubric || null,
    keywords: null,
  }));
}

/**
 * Capture single question verification fixture
 */
async function captureSingleQuestion(
  client: KareninaApiClient,
  writer: FixtureWriter,
  modelConfig: Partial<ModelConfiguration>,
  verbose: boolean
): Promise<string[]> {
  const modelId = modelConfig.model_name?.replace(/[^a-zA-Z0-9-]/g, '-') || 'unknown';
  const fullModelConfig = buildModelConfig(modelConfig);

  if (verbose) {
    console.log(`  Capturing single-question scenario for ${modelId}...`);
  }

  const questions = [sampleQuestions[0]];
  const questionData: QuestionData = {};
  questions.forEach((q) => {
    questionData[q.id] = {
      question: q.question,
      raw_answer: q.raw_answer,
      answer_template: q.answer_template,
    };
  });

  const config: VerificationConfig = {
    answering_models: [fullModelConfig],
    parsing_models: [fullModelConfig],
    replicate_count: 1,
    rubric_enabled: false,
    abstention_enabled: false,
    few_shot_enabled: false,
    few_shot_mode: 'all',
    few_shot_k: 0,
  };

  const request: VerificationRequest = {
    config,
    question_ids: questions.map((q) => q.id),
    finished_templates: buildFinishedTemplates(questions),
    run_name: 'fixture-single-question',
  };

  const progressSnapshots: Array<{ stage: string; data: unknown }> = [];

  const { job_id } = await client.startVerification(request);

  if (verbose) {
    console.log(`    Job started: ${job_id}`);
  }

  const results = await client.waitForVerificationCompletion(job_id, 120000, 2000, (progress: VerificationProgress) => {
    if (verbose) {
      console.log(`    Progress: ${progress.percentage}% - ${progress.status}`);
    }
    // Capture progress snapshots at key stages
    if (progress.percentage === 0 && progressSnapshots.length === 0) {
      progressSnapshots.push({ stage: 'started', data: progress });
    } else if (progress.percentage > 0 && progress.percentage < 100 && progressSnapshots.length === 1) {
      progressSnapshots.push({ stage: 'in-progress', data: progress });
    }
  });

  // Save the final result
  const resultPath = await writer.saveVerificationResult(modelId, 'single-question', results, {
    backendUrl: client['baseUrl'],
  });

  // Save progress snapshots if we have them
  const progressPaths =
    progressSnapshots.length > 0 ? await writer.saveProgressSnapshots('verification', modelId, progressSnapshots) : [];

  if (verbose) {
    console.log(`    Saved: ${resultPath}`);
  }

  return [resultPath, ...progressPaths];
}

/**
 * Capture multi-question verification fixture
 */
async function captureMultiQuestion(
  client: KareninaApiClient,
  writer: FixtureWriter,
  modelConfig: Partial<ModelConfiguration>,
  verbose: boolean
): Promise<string[]> {
  const modelId = modelConfig.model_name?.replace(/[^a-zA-Z0-9-]/g, '-') || 'unknown';
  const fullModelConfig = buildModelConfig(modelConfig);

  if (verbose) {
    console.log(`  Capturing multi-question scenario for ${modelId}...`);
  }

  const questions = sampleQuestions; // All 3 questions
  const questionData: QuestionData = {};
  questions.forEach((q) => {
    questionData[q.id] = {
      question: q.question,
      raw_answer: q.raw_answer,
      answer_template: q.answer_template,
    };
  });

  const config: VerificationConfig = {
    answering_models: [fullModelConfig],
    parsing_models: [fullModelConfig],
    replicate_count: 1,
    rubric_enabled: false,
    abstention_enabled: false,
    few_shot_enabled: false,
    few_shot_mode: 'all',
    few_shot_k: 0,
  };

  const request: VerificationRequest = {
    config,
    question_ids: questions.map((q) => q.id),
    finished_templates: buildFinishedTemplates(questions),
    run_name: 'fixture-multi-question',
  };

  const { job_id } = await client.startVerification(request);

  if (verbose) {
    console.log(`    Job started: ${job_id}`);
  }

  const results = await client.waitForVerificationCompletion(job_id, 180000, 2000, (progress: VerificationProgress) => {
    if (verbose) {
      console.log(`    Progress: ${progress.percentage}% - ${progress.status}`);
    }
  });

  const resultPath = await writer.saveVerificationResult(modelId, 'multi-question', results, {
    backendUrl: client['baseUrl'],
  });

  if (verbose) {
    console.log(`    Saved: ${resultPath}`);
  }

  return [resultPath];
}

/**
 * Capture verification with rubric fixture
 */
async function captureWithRubric(
  client: KareninaApiClient,
  writer: FixtureWriter,
  modelConfig: Partial<ModelConfiguration>,
  verbose: boolean
): Promise<string[]> {
  const modelId = modelConfig.model_name?.replace(/[^a-zA-Z0-9-]/g, '-') || 'unknown';
  const fullModelConfig = buildModelConfig(modelConfig);

  if (verbose) {
    console.log(`  Capturing with-rubric scenario for ${modelId}...`);
  }

  const questions = [sampleQuestions[0], sampleQuestions[1]]; // 2 questions
  const questionData: QuestionData = {};
  questions.forEach((q) => {
    questionData[q.id] = {
      question: q.question,
      raw_answer: q.raw_answer,
      answer_template: q.answer_template,
    };
  });

  const config: VerificationConfig = {
    answering_models: [fullModelConfig],
    parsing_models: [fullModelConfig],
    replicate_count: 1,
    rubric_enabled: true,
    rubric_evaluation_strategy: 'batch',
    evaluation_mode: 'template_and_rubric',
    abstention_enabled: false,
    few_shot_enabled: false,
    few_shot_mode: 'all',
    few_shot_k: 0,
  };

  const request: VerificationRequest = {
    config,
    question_ids: questions.map((q) => q.id),
    finished_templates: buildFinishedTemplates(questions, sampleRubric),
    run_name: 'fixture-with-rubric',
  };

  const { job_id } = await client.startVerification(request);

  if (verbose) {
    console.log(`    Job started: ${job_id}`);
  }

  const results = await client.waitForVerificationCompletion(job_id, 180000, 2000, (progress: VerificationProgress) => {
    if (verbose) {
      console.log(`    Progress: ${progress.percentage}% - ${progress.status}`);
    }
  });

  const resultPath = await writer.saveVerificationResult(modelId, 'with-rubric', results, {
    backendUrl: client['baseUrl'],
  });

  if (verbose) {
    console.log(`    Saved: ${resultPath}`);
  }

  return [resultPath];
}

/**
 * Main function to capture all verification fixtures
 */
export async function captureVerificationFixtures(
  client: KareninaApiClient,
  writer: FixtureWriter,
  modelConfig: Partial<ModelConfiguration> = defaultModelConfig,
  verbose: boolean = true
): Promise<CaptureResult> {
  const fixturesPaths: string[] = [];
  const errors: string[] = [];

  console.log('Capturing verification fixtures...');

  // Save shared data first
  try {
    const questionsPath = await writer.saveSharedData('sample-questions', sampleQuestions);
    const rubricPath = await writer.saveSharedData('sample-rubric', sampleRubric);
    fixturesPaths.push(questionsPath, rubricPath);
    if (verbose) {
      console.log(`  Saved shared data: ${questionsPath}, ${rubricPath}`);
    }
  } catch (error) {
    errors.push(`Failed to save shared data: ${error}`);
  }

  // Capture each scenario
  const scenarios = [
    { name: 'single-question', fn: captureSingleQuestion },
    { name: 'multi-question', fn: captureMultiQuestion },
    { name: 'with-rubric', fn: captureWithRubric },
  ];

  for (const scenario of scenarios) {
    try {
      const paths = await scenario.fn(client, writer, modelConfig, verbose);
      fixturesPaths.push(...paths);
    } catch (error) {
      const errorMsg = `Failed to capture ${scenario.name}: ${error}`;
      errors.push(errorMsg);
      console.error(`  ERROR: ${errorMsg}`);
    }
  }

  return {
    success: errors.length === 0,
    fixturesPaths,
    errors,
  };
}
