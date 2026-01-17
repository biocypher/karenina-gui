/**
 * Verification Result types
 * Data structures for verification results with nested composition
 */

import type { UsageMetadata } from './index';
import type { SearchResultItem } from './search';

/**
 * Metadata subclass - core identity and tracking fields
 */
export interface VerificationResultMetadata {
  question_id: string;
  template_id: string;
  result_id?: string; // Deterministic hash ID computed from verification parameters
  completed_without_errors: boolean;
  error?: string;
  question_text: string;
  raw_answer?: string; // Ground truth answer from checkpoint
  keywords?: string[];
  answering_model: string;
  parsing_model: string;
  answering_system_prompt?: string;
  parsing_system_prompt?: string;
  execution_time: number;
  timestamp: string;
  run_name?: string;
  job_id?: string;
  answering_model_id?: string;
  parsing_model_id?: string;
  replicate?: number;
}

/**
 * Template subclass - answer generation and verification fields
 */
export interface VerificationResultTemplate {
  raw_llm_response: string;
  parsed_gt_response?: Record<string, unknown>;
  parsed_llm_response?: Record<string, unknown>;
  template_verification_performed?: boolean;
  verify_result?: VerificationOutcome | null;
  verify_granular_result?: GranularVerificationResult;
  // Embeddings
  embedding_check_performed?: boolean;
  embedding_similarity_score?: number;
  embedding_override_applied?: boolean;
  embedding_model_used?: string;
  // Regex checks
  regex_validations_performed?: boolean;
  regex_validation_results?: Record<string, boolean>;
  regex_validation_details?: Record<string, Record<string, unknown>>;
  regex_overall_success?: boolean;
  regex_extraction_results?: Record<string, unknown>;
  // Recursion limit
  recursion_limit_reached?: boolean;
  // Abstention
  abstention_check_performed?: boolean;
  abstention_detected?: boolean | null;
  abstention_override_applied?: boolean;
  abstention_reasoning?: string | null;
  // Sufficiency
  sufficiency_check_performed?: boolean;
  sufficiency_detected?: boolean | null; // true = sufficient, false = insufficient
  sufficiency_override_applied?: boolean;
  sufficiency_reasoning?: string | null;
  // MCP
  answering_mcp_servers?: string[];
  // Usage
  usage_metadata?: Record<string, UsageMetadata>;
  agent_metrics?: {
    iterations?: number;
    tool_calls?: number;
    tools_used?: string[];
    tool_call_counts?: Record<string, number>; // Per-tool call counts
    suspect_failed_tool_calls?: number;
    suspect_failed_tools?: string[];
    // Middleware-related metrics (LangChain 1.1+)
    model_call_limit_reached?: boolean;
    tool_call_limit_reached?: boolean;
    summarization_triggered?: boolean;
    model_retries?: number;
    tool_retries?: number;
  };
}

/**
 * Rubric subclass - rubric evaluation with split trait types
 *
 * Note: evaluation_rubric is no longer stored per-result in v2.0 format.
 * It's now in shared_data.rubric_definition (stored once for entire export).
 */
export interface VerificationResultRubric {
  rubric_evaluation_performed?: boolean;
  rubric_evaluation_strategy?: string;
  // Legacy flat rubric scores (deprecated, use split trait scores below)
  verify_rubric?: Record<string, number | boolean>;
  // Split trait scores by type
  llm_trait_scores?: Record<string, number>; // 1-5 scale (or 0 to N-1 for literal kind)
  llm_trait_labels?: Record<string, string>; // For literal kind traits: mapping of trait name to class label
  regex_trait_scores?: Record<string, boolean>; // regex-based
  callable_trait_scores?: Record<string, boolean | number>; // boolean or score (1-5)
  metric_trait_scores?: Record<string, Record<string, number>>; // nested metrics dict
  // Note: evaluation_rubric removed in v2.0 - now stored in shared_data.rubric_definition
  // Metric trait confusion matrices
  metric_trait_confusion_lists?: Record<
    string,
    {
      tp: string[];
      tn: string[];
      fp: string[];
      fn: string[];
    }
  >;
  metric_trait_metrics?: Record<string, Record<string, number>>;
  // Unified rubric results interface (computed property)
  rubric_results?: {
    llm?: Record<string, number>;
    regex?: Record<string, boolean>;
    callable?: Record<string, boolean | number>;
    metric?: Record<
      string,
      {
        metrics: Record<string, number>;
        confusion: {
          tp: string[];
          tn: string[];
          fp: string[];
          fn: string[];
        };
      }
    >;
  };
}

/**
 * Deep-judgment subclass - multi-stage parsing with excerpts
 */
export interface VerificationResultDeepJudgment {
  deep_judgment_enabled?: boolean;
  deep_judgment_performed?: boolean;
  extracted_excerpts?: Record<
    string,
    Array<{
      text: string;
      confidence: string;
      similarity_score: number;
      explanation?: string;
      search_results?: SearchResultItem[];
      hallucination_risk?: string;
      hallucination_justification?: string;
    }>
  >;
  attribute_reasoning?: Record<string, string>;
  deep_judgment_stages_completed?: string[];
  deep_judgment_model_calls?: number;
  deep_judgment_excerpt_retry_count?: number;
  attributes_without_excerpts?: string[];
  // Search-enhanced deep-judgment
  deep_judgment_search_enabled?: boolean;
  hallucination_risk_assessment?: Record<string, string>;
}

/**
 * Deep-judgment metadata for rubric trait evaluation.
 *
 * This component stores enhanced evaluation data when deep-judgment is applied to rubric traits,
 * including extracted excerpts, reasoning, and hallucination risk assessments.
 */
export interface VerificationResultDeepJudgmentRubric {
  deep_judgment_rubric_performed: boolean;

  // Per-trait excerpts (only for traits with deep_judgment_excerpt_enabled=True)
  extracted_rubric_excerpts?: Record<
    string,
    Array<{
      text: string;
      confidence: string;
      similarity_score: number;
      search_results?: SearchResultItem[];
      hallucination_risk?: string;
      hallucination_justification?: string;
    }>
  >;

  // Per-trait reasoning (ALL deep-judgment-enabled traits)
  rubric_trait_reasoning?: Record<string, string>;

  // Per-trait scores from deep-judgment evaluation
  deep_judgment_rubric_scores?: Record<string, number | boolean>;

  // Standard evaluation scores (non-deep-judgment traits)
  standard_rubric_scores?: Record<string, number | boolean>;

  // Per-trait metadata
  trait_metadata?: Record<
    string,
    {
      stages_completed: string[];
      model_calls: number;
      had_excerpts: boolean;
      excerpt_retry_count: number;
      excerpt_validation_failed?: boolean;
    }
  >;

  // Auto-fail tracking
  traits_without_valid_excerpts?: string[];

  // Search-enhanced metadata
  rubric_hallucination_risk_assessment?: Record<
    string,
    {
      overall_risk: string;
      per_excerpt_risks: string[];
    }
  >;

  // Aggregated statistics
  total_deep_judgment_model_calls: number;
  total_traits_evaluated: number;
  total_excerpt_retries: number;
}

/**
 * VerificationResult interface with nested structure.
 *
 * MUST mirror backend VerificationResult model exactly.
 *
 * BREAKING CHANGE: Now uses nested composition instead of flat structure.
 * When adding fields: Update the appropriate subinterface.
 * See docs: .agents/dev/recurring-issues.md#issue-1-gui-export-sync-when-adding-verificationresult-fields
 *
 * v2.0 changes:
 * - evaluation_input, used_full_trace, trace_extraction_error moved to root level
 *   (shared by template and rubric evaluation, not stored separately)
 * - evaluation_rubric removed from per-result rubric (now in shared_data)
 */
export interface VerificationResult {
  metadata: VerificationResultMetadata;
  template?: VerificationResultTemplate;
  rubric?: VerificationResultRubric;
  deep_judgment?: VerificationResultDeepJudgment;
  deep_judgment_rubric?: VerificationResultDeepJudgmentRubric;
  // Root-level trace filtering fields (v2.0 - shared by template and rubric)
  evaluation_input?: string;
  used_full_trace?: boolean;
  trace_extraction_error?: string;
  // Question data (may be added from checkpoint for display purposes)
  raw_answer?: string;
}

/**
 * Helper interface for LLM usage metadata
 */
export interface UsageMetadata {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  model?: string;
  input_token_details?: {
    audio?: number;
    cache_read?: number;
  };
  output_token_details?: {
    audio?: number;
    reasoning?: number;
  };
}

export interface VerificationProgress {
  job_id: string;
  status: string;
  percentage: number;
  current_question: string;
  processed_count: number;
  total_count: number;
  successful_count: number;
  failed_count: number;
  start_time?: number; // Unix timestamp for client-side live clock calculation
  duration_seconds?: number;
  last_task_duration?: number;
  error?: string;
  results?: Record<string, VerificationResult>;
  in_progress_questions?: string[];
}

/**
 * Enhanced type definitions for verification results
 */
export interface ParsedAnswerResponse {
  [key: string]: string | number | boolean | null;
}

export interface VerificationOutcome {
  completed_without_errors: boolean;
  score?: number;
  details?: string;
}

export interface GranularVerificationResult {
  score: number;
  breakdown?: Record<string, number>;
  details?: string;
}
