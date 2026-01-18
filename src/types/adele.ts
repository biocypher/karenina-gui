/**
 * TypeScript types for ADeLe question classification.
 *
 * ADeLe (Assessment Dimensions for Language Evaluation) is a framework
 * for characterizing questions by their cognitive complexity across
 * 18 dimensions with 6 ordinal levels each.
 */

/**
 * Information about a single ADeLe trait.
 */
export interface AdeleTraitInfo {
  /** Snake_case trait name (e.g., 'attention_and_scan') */
  name: string;
  /** Original ADeLe code (e.g., 'AS') */
  code: string;
  /** Trait description/header from the rubric */
  description: string | null;
  /** Mapping from class name to class description */
  classes: Record<string, string>;
  /** Ordered list of class names (from level 0 to 5) */
  classNames: string[];
}

/**
 * Classification result for a single question.
 */
export interface ClassificationResult {
  /** Question identifier */
  questionId: string | null;
  /** The question text that was classified */
  questionText: string;
  /** Mapping from trait name to integer score (0-5). -1 indicates error. */
  scores: Record<string, number>;
  /** Mapping from trait name to class label */
  labels: Record<string, string>;
  /** Model used for classification */
  model: string;
  /** ISO timestamp of classification */
  classifiedAt: string;
}

/**
 * Response for listing available ADeLe traits.
 */
export interface ListAdeleTraitsResponse {
  success: boolean;
  traits: AdeleTraitInfo[];
  count: number;
  error?: string;
}

/**
 * Model configuration for ADeLe classification API requests.
 */
export interface AdeleModelConfigRequest {
  interface: 'langchain' | 'openrouter' | 'openai_endpoint';
  provider: string;
  model_name: string;
  temperature: number;
  endpoint_base_url?: string;
  endpoint_api_key?: string;
  /** How traits are evaluated: 'batch' (one call) or 'sequential' (one call per trait) */
  trait_eval_mode: 'batch' | 'sequential';
}

/**
 * Request to classify a single question.
 */
export interface ClassifySingleRequest {
  questionText: string;
  questionId?: string;
  traitNames?: string[];
  llmConfig?: AdeleModelConfigRequest;
}

/**
 * Response for single question classification.
 */
export interface ClassifySingleResponse {
  success: boolean;
  result: ClassificationResult | null;
  error?: string;
}

/**
 * Request to start batch classification.
 */
export interface ClassifyBatchRequest {
  questions: Array<{ question_id: string; question_text: string }>;
  trait_names?: string[];
  llm_config?: AdeleModelConfigRequest;
}

/**
 * Response when starting a batch classification job.
 */
export interface StartBatchResponse {
  success: boolean;
  jobId: string;
  status: string;
  message: string;
  totalQuestions: number;
  error?: string;
}

/**
 * Response for batch classification progress query.
 */
export interface BatchProgressResponse {
  success: boolean;
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  completed: number;
  total: number;
  message: string;
  error?: string;
}

/**
 * Response containing batch classification results.
 */
export interface BatchResultsResponse {
  success: boolean;
  jobId: string;
  status: string;
  results: ClassificationResult[];
  error?: string;
}

/**
 * WebSocket message for batch classification progress updates.
 */
export interface BatchProgressMessage {
  type: 'snapshot' | 'progress' | 'job_started' | 'job_completed' | 'job_failed';
  jobId: string;
  status: string;
  percentage: number;
  completed: number;
  total: number;
  currentQuestionId?: string;
  durationSeconds?: number;
  error?: string;
}

/**
 * ADeLe classification data stored in question custom_metadata.
 */
export interface AdeleClassificationMetadata {
  scores: Record<string, number>;
  labels: Record<string, string>;
  classifiedAt: string;
  model: string;
}

/**
 * Type guard to check if custom_metadata contains ADeLe classification.
 */
export function hasAdeleClassification(
  metadata: Record<string, unknown> | undefined
): metadata is Record<string, unknown> & { adele_classification: AdeleClassificationMetadata } {
  return (
    metadata !== undefined &&
    'adele_classification' in metadata &&
    metadata.adele_classification !== null &&
    typeof metadata.adele_classification === 'object'
  );
}

/**
 * Get ADeLe classification from custom_metadata if present.
 */
export function getAdeleClassification(
  metadata: Record<string, unknown> | undefined
): AdeleClassificationMetadata | null {
  if (hasAdeleClassification(metadata)) {
    return metadata.adele_classification as AdeleClassificationMetadata;
  }
  return null;
}

/**
 * Convert server response format to client format (snake_case to camelCase).
 */
export function parseTraitInfoResponse(data: {
  name: string;
  code: string;
  description: string | null;
  classes: Record<string, string>;
  class_names: string[];
}): AdeleTraitInfo {
  return {
    name: data.name,
    code: data.code,
    description: data.description,
    classes: data.classes,
    classNames: data.class_names,
  };
}

/**
 * Convert server classification result to client format.
 */
export function parseClassificationResult(data: {
  question_id: string | null;
  question_text: string;
  scores: Record<string, number>;
  labels: Record<string, string>;
  model: string;
  classified_at: string;
}): ClassificationResult {
  return {
    questionId: data.question_id,
    questionText: data.question_text,
    scores: data.scores,
    labels: data.labels,
    model: data.model,
    classifiedAt: data.classified_at,
  };
}

/**
 * The 6 standard ADeLe ordinal levels.
 */
export const ADELE_LEVELS = ['none', 'very_low', 'low', 'intermediate', 'high', 'very_high'] as const;
export type AdeleLevel = (typeof ADELE_LEVELS)[number];

/**
 * Map score index to level name.
 */
export function scoreToLevel(score: number): AdeleLevel | 'error' {
  if (score < 0 || score > 5) return 'error';
  return ADELE_LEVELS[score];
}

/**
 * Get color class for a given score.
 */
export function getScoreColorClass(score: number): string {
  switch (score) {
    case 0:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 1:
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 2:
      return 'bg-lime-100 text-lime-700 dark:bg-lime-900 dark:text-lime-300';
    case 3:
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 4:
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    case 5:
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  }
}
