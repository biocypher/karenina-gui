import { API_ENDPOINTS } from '../constants/api';
import type { Rubric, RubricTrait, UsageMetadata, VerificationConfig } from '../types';
import { logger } from './logger';
import { getAllExportFields, extractFieldValue, RUBRIC_TRAIT_FIELDS } from '../types/exportFields';

/**
 * Cache for the application version to avoid repeated imports
 */
let cachedVersion: string | null = null;

/**
 * Preload version when module loads (non-blocking)
 */
getAppVersion()
  .then((v) => {
    cachedVersion = v;
  })
  .catch(() => {
    // Fallback version already handled in getVersionSync
  });

/**
 * Get the application version from package.json
 * Uses dynamic import to access package.json at runtime
 */
async function getAppVersion(): Promise<string> {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    // Dynamic import of package.json - Vite supports this
    const pkg = await import('../../package.json?url');
    // Use fetch to get the JSON content
    const response = await fetch(pkg.default);
    const data = await response.json();
    cachedVersion = data.version || '0.0.0';
    return cachedVersion;
  } catch (error) {
    logger.warning('EXPORT', 'Failed to load version from package.json, using fallback', 'export', { error });
    return '0.0.0';
  }
}

/**
 * Get current version (sync, may use fallback during initial load)
 */
function getCurrentVersion(): string {
  return cachedVersion || '0.1.0';
}

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

/**
 * Downloads a file with the given content
 */
export function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Exports results from a server endpoint (for complete job results)
 */
export async function exportFromServer(jobId: string, format: 'json' | 'csv'): Promise<void> {
  try {
    const response = await fetch(API_ENDPOINTS.EXPORT_VERIFICATION(jobId, format));
    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `results_${jobId}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    logger.error('EXPORT', 'Error exporting results from server', 'export', { error: err });
    throw new Error('Failed to export results. Please try again.');
  }
}

/**
 * Converts results to JSON format with v2.0 unified export structure (matches backend format)
 *
 * v2.0 format optimizations:
 * - format_version: "2.0" marker for version detection
 * - shared_data.rubric_definition: Rubric stored once (not per-result)
 * - evaluation_input at result root level (shared by template/rubric)
 */
export function exportToJSON(
  results: ExportableResult[],
  selectedFields?: string[],
  jobId?: string,
  verificationConfig?: VerificationConfig,
  jobSummary?: JobSummaryMetadata,
  globalRubric?: Rubric
): string {
  // Process results (handle abstention display)
  const processedResults = results.map((result) => {
    // Replace completed_without_errors boolean with "abstained" string when abstention is detected
    const completedWithoutErrorsValue =
      result.template?.abstention_detected && result.template?.abstention_override_applied
        ? 'abstained'
        : result.metadata.completed_without_errors;

    const processedResult = {
      ...result,
      metadata: {
        ...result.metadata,
        completed_without_errors: completedWithoutErrorsValue,
      },
    };

    if (selectedFields) {
      const filteredResult: Record<string, unknown> = {};
      selectedFields.forEach((field) => {
        if (field in processedResult) {
          filteredResult[field] = processedResult[field as keyof typeof processedResult];
        }
      });
      return filteredResult as ExportableResult;
    }

    return processedResult;
  });

  // Build verification config metadata
  let exportVerificationConfig: ExportVerificationConfig | undefined;
  if (
    verificationConfig &&
    verificationConfig.answering_models.length > 0 &&
    verificationConfig.parsing_models.length > 0
  ) {
    exportVerificationConfig = {
      answering_model: {
        provider: verificationConfig.answering_models[0].model_provider,
        name: verificationConfig.answering_models[0].model_name,
        temperature: verificationConfig.answering_models[0].temperature,
        interface: verificationConfig.answering_models[0].interface,
      },
      parsing_model: {
        provider: verificationConfig.parsing_models[0].model_provider,
        name: verificationConfig.parsing_models[0].model_name,
        temperature: verificationConfig.parsing_models[0].temperature,
        interface: verificationConfig.parsing_models[0].interface,
      },
    };
  }

  // Build rubric definition for shared_data (v2.0 optimization)
  // Store rubric once instead of per-result
  let rubricDefinition: Record<string, unknown> | undefined;
  if (globalRubric) {
    rubricDefinition = {
      llm_traits: globalRubric.llm_traits || globalRubric.traits,
      regex_traits: globalRubric.regex_traits,
      callable_traits: globalRubric.callable_traits,
      metric_traits: globalRubric.metric_traits,
    };
  }

  // Build unified export structure (v2.0 format)
  const unifiedExport: UnifiedExportFormat = {
    format_version: '2.0',
    metadata: {
      export_timestamp: new Date()
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, ' UTC'),
      karenina_version: getCurrentVersion(),
      job_id: jobId,
      verification_config: exportVerificationConfig,
      job_summary: jobSummary,
    },
    shared_data: {
      rubric_definition: rubricDefinition,
    },
    results: processedResults,
  };

  return JSON.stringify(unifiedExport, null, 2);
}

/**
 * Escapes CSV field content
 */
function escapeCSVField(field: unknown): string {
  if (field == null) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts results to CSV format
 *
 * Uses field definitions from types/exportFields.ts as single source of truth.
 * When adding new fields to VerificationResult, add them to exportFields.ts only.
 */
export function exportToCSV(results: ExportableResult[], globalRubric?: Rubric, selectedFields?: string[]): string {
  // Get all static field definitions (single source of truth)
  const allFields = getAllExportFields();
  const staticHeaders = allFields.map((field) => field.key);

  // Extract dynamic rubric trait names from results
  const allRubricTraitNames = new Set<string>();
  results.forEach((result) => {
    const dynamicTraits = RUBRIC_TRAIT_FIELDS.extractor(result);
    Object.keys(dynamicTraits).forEach((traitName) => {
      allRubricTraitNames.add(traitName);
    });
  });

  // Determine global vs question-specific rubrics
  const globalTraitNames = new Set<string>();
  if (globalRubric) {
    if (globalRubric.traits) {
      globalRubric.traits.forEach((trait: RubricTrait) => {
        globalTraitNames.add(trait.name);
      });
    }
    if (globalRubric.regex_traits) {
      globalRubric.regex_traits.forEach((trait) => {
        globalTraitNames.add(trait.name);
      });
    }
    if (globalRubric.callable_traits) {
      globalRubric.callable_traits.forEach((trait) => {
        globalTraitNames.add(trait.name);
      });
    }
    if (globalRubric.metric_traits) {
      globalRubric.metric_traits.forEach((trait) => {
        globalTraitNames.add(trait.name);
      });
    }
  }

  // Separate traits into global and question-specific
  const globalTraits = Array.from(allRubricTraitNames)
    .filter((trait) => globalTraitNames.has(trait))
    .sort();
  const questionSpecificTraits = Array.from(allRubricTraitNames)
    .filter((trait) => !globalTraitNames.has(trait))
    .sort();

  // Create dynamic rubric headers
  const globalRubricHeaders = globalTraits.map((trait) => `rubric_${trait}`);
  const hasQuestionSpecificTraits = questionSpecificTraits.length > 0;

  // Combine static and dynamic headers
  const allHeaders = [
    ...staticHeaders,
    ...globalRubricHeaders,
    ...(hasQuestionSpecificTraits ? ['question_specific_rubrics'] : []),
  ];

  // Filter headers based on selected fields if provided
  const headers = selectedFields ? allHeaders.filter((header) => selectedFields.includes(header)) : allHeaders;

  const csvRows = [headers.join(',')];

  // Build rows using field definitions
  results.forEach((result, index) => {
    const rowData: Record<string, string> = {};

    // Extract values using field definitions (single source of truth)
    for (const field of allFields) {
      const value = extractFieldValue(result, field, index);
      if (field.isJson && value !== '' && value !== undefined) {
        rowData[field.key] = escapeCSVField(JSON.stringify(value));
      } else {
        rowData[field.key] = escapeCSVField(value ?? field.defaultValue ?? '');
      }
    }

    // Add global rubric values (dynamic fields)
    const dynamicTraits = RUBRIC_TRAIT_FIELDS.extractor(result);
    globalTraits.forEach((traitName) => {
      const value = dynamicTraits[traitName];
      rowData[`rubric_${traitName}`] = escapeCSVField(value !== undefined ? value : '');
    });

    // Add question-specific rubrics as combined JSON if they exist
    if (hasQuestionSpecificTraits) {
      const questionSpecificRubrics: Record<string, unknown> = {};
      questionSpecificTraits.forEach((trait) => {
        if (trait in dynamicTraits) {
          questionSpecificRubrics[trait] = dynamicTraits[trait];
        }
      });
      rowData['question_specific_rubrics'] = escapeCSVField(JSON.stringify(questionSpecificRubrics));
    }

    // Build row based on selected headers
    const row = headers.map((header) => rowData[header] ?? '');
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

/**
 * Exports filtered results to the specified format
 */
export function exportFilteredResults(
  results: ExportableResult[],
  format: 'json' | 'csv',
  onError?: (error: string) => void,
  globalRubric?: Rubric,
  selectedFields?: string[],
  jobId?: string,
  verificationConfig?: VerificationConfig,
  jobSummary?: JobSummaryMetadata
): void {
  if (results.length === 0) {
    const errorMsg = 'No results match the current filters.';
    if (onError) {
      onError(errorMsg);
    } else {
      alert(errorMsg);
    }
    return;
  }

  try {
    let content: string;
    let mimeType: string;
    let fileName: string;

    if (format === 'json') {
      content = exportToJSON(results, selectedFields, jobId, verificationConfig, jobSummary, globalRubric);
      mimeType = 'application/json';
      fileName = `filtered_results_${new Date().toISOString().split('T')[0]}.json`;
    } else {
      content = exportToCSV(results, globalRubric, selectedFields);
      mimeType = 'text/csv';
      fileName = `filtered_results_${new Date().toISOString().split('T')[0]}.csv`;
    }

    downloadFile(content, fileName, mimeType);
  } catch (err) {
    logger.error('EXPORT', 'Error exporting filtered results', 'export', { error: err });
    const errorMsg = 'Failed to export filtered results. Please try again.';
    if (onError) {
      onError(errorMsg);
    } else {
      alert(errorMsg);
    }
  }
}
