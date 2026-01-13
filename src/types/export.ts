/**
 * Export Type Definitions
 * All types related to exporting verification results
 */

import type { UsageMetadata } from './index';

/**
 * Job summary metadata for exports
 */
export interface JobSummaryMetadata {
  total_questions: number;
  successful_count: number;
  failed_count: number;
  start_time?: number;
  end_time?: number;
  total_duration?: number;
}

/**
 * Model configuration for export metadata (simplified from full ModelConfiguration)
 */
export interface ExportModelConfig {
  provider: string;
  name: string;
  temperature: number;
  interface: string;
}

/**
 * Verification config for export metadata
 */
export interface ExportVerificationConfig {
  answering_model: ExportModelConfig;
  parsing_model: ExportModelConfig;
}

/**
 * Export metadata wrapper (matches backend format)
 */
export interface ExportMetadata {
  export_timestamp: string;
  karenina_version: string;
  job_id?: string;
  verification_config?: ExportVerificationConfig;
  job_summary?: JobSummaryMetadata;
}

/**
 * Shared data section for v2.0 format (stores once, not per-result)
 */
export interface SharedDataExport {
  rubric_definition?: Record<string, unknown>;
}

/**
 * Unified export format v2.0 (matches backend exporter.py)
 *
 * Optimizations in v2.0:
 * - format_version: "2.0" marker
 * - shared_data.rubric_definition: Stored once (not per-result, saves ~6KB per result)
 * - evaluation_input at result root level (shared by template/rubric, not duplicated)
 */
export interface UnifiedExportFormat {
  format_version: string;
  metadata: ExportMetadata;
  shared_data: SharedDataExport;
  results: ExportableResult[];
}

/**
 * Metadata subclass - core identity and tracking fields
 */
export interface ExportableResultMetadata {
  question_id: string;
  template_id: string;
  result_id?: string; // Deterministic hash ID computed from verification parameters
  completed_without_errors: boolean;
  error?: string;
  question_text: string;
  raw_answer?: string;
  keywords?: string[];
  answering_model: string;
  parsing_model: string;
  answering_system_prompt?: string;
  parsing_system_prompt?: string;
  execution_time: number;
  timestamp: string;
  run_name?: string;
  job_id?: string;
  replicate?: number;
}

/**
 * Template subclass - answer generation and verification fields
 */
export interface ExportableResultTemplate {
  raw_llm_response: string;
  parsed_gt_response?: Record<string, unknown>;
  parsed_llm_response?: Record<string, unknown>;
  template_verification_performed?: boolean;
  verify_result?: unknown;
  verify_granular_result?: unknown;
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
  // MCP
  answering_mcp_servers?: string[];
  // Usage
  usage_metadata?: Record<string, UsageMetadata>;
  agent_metrics?: {
    iterations?: number;
    tool_calls?: number;
    tools_used?: string[];
    suspect_failed_tool_calls?: number;
    suspect_failed_tools?: string[];
  };
}

/**
 * Rubric subclass - rubric evaluation with split trait types
 *
 * Note: evaluation_rubric is no longer stored per-result in v2.0 format.
 * It's now in shared_data.rubric_definition (stored once for entire export).
 */
export interface ExportableResultRubric {
  rubric_evaluation_performed?: boolean;
  rubric_evaluation_strategy?: string;
  // Split trait scores by type (replaces old verify_rubric)
  llm_trait_scores?: Record<string, number>; // 1-5 scale
  regex_trait_scores?: Record<string, boolean>; // regex-based
  callable_trait_scores?: Record<string, boolean | number>; // boolean or score (1-5)
  metric_trait_scores?: Record<string, Record<string, number>>; // nested metrics dict
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
}

/**
 * Deep-judgment subclass - multi-stage parsing with excerpts
 */
export interface ExportableResultDeepJudgment {
  deep_judgment_enabled?: boolean;
  deep_judgment_performed?: boolean;
  extracted_excerpts?: Record<
    string,
    Array<{
      text: string;
      confidence: string;
      similarity_score: number;
      explanation?: string;
      search_results?: string;
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
 * Deep-judgment rubric subclass - enhanced rubric trait evaluation with excerpts
 */
export interface ExportableResultDeepJudgmentRubric {
  deep_judgment_rubric_performed?: boolean;
  extracted_rubric_excerpts?: Record<
    string,
    Array<{
      text: string;
      confidence: string;
      similarity_score: number;
      search_results?: string;
      hallucination_risk?: string;
      hallucination_justification?: string;
    }>
  >;
  rubric_trait_reasoning?: Record<string, string>;
  deep_judgment_rubric_scores?: Record<string, number | boolean>;
  standard_rubric_scores?: Record<string, number | boolean>;
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
  traits_without_valid_excerpts?: string[];
  rubric_hallucination_risk_assessment?: Record<
    string,
    {
      overall_risk: string;
      per_excerpt_risks: string[];
    }
  >;
  total_deep_judgment_model_calls?: number;
  total_traits_evaluated?: number;
  total_excerpt_retries?: number;
}

/**
 * ExportableResult interface for GUI exports with nested structure.
 *
 * MUST mirror backend VerificationResult model exactly.
 *
 * BREAKING CHANGE: Now uses nested composition instead of flat structure.
 * When adding fields: Update the appropriate subinterface, allHeaders array, and allRowData object.
 * See docs: .agents/dev/recurring-issues.md#issue-1-gui-export-sync-when-adding-verificationresult-fields
 *
 * v2.0 changes:
 * - evaluation_input, used_full_trace, trace_extraction_error moved to root level
 *   (shared by template and rubric evaluation, not stored separately)
 * - evaluation_rubric removed from per-result (now in shared_data)
 */
export interface ExportableResult {
  metadata: ExportableResultMetadata;
  template?: ExportableResultTemplate;
  rubric?: ExportableResultRubric;
  deep_judgment?: ExportableResultDeepJudgment;
  deep_judgment_rubric?: ExportableResultDeepJudgmentRubric;
  // Root-level trace filtering fields (v2.0 - shared by template and rubric)
  evaluation_input?: string;
  used_full_trace?: boolean;
  trace_extraction_error?: string;
  // Question data (added during export from checkpoint)
  raw_answer?: string;
}
