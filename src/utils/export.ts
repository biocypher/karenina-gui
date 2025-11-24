import { API_ENDPOINTS } from '../constants/api';
import type { Rubric, RubricTrait, UsageMetadata, VerificationConfig } from '../types';

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
 * Unified export format (matches backend exporter.py)
 */
export interface UnifiedExportFormat {
  metadata: ExportMetadata;
  results: ExportableResult[];
}

/**
 * Metadata subclass - core identity and tracking fields
 */
export interface ExportableResultMetadata {
  question_id: string;
  template_id: string;
  completed_without_errors: boolean;
  error?: string;
  question_text: string;
  keywords?: string[];
  answering_model: string;
  parsing_model: string;
  answering_system_prompt?: string;
  parsing_system_prompt?: string;
  execution_time: number;
  timestamp: string;
  run_name?: string;
  job_id?: string;
  answering_replicate?: number;
  parsing_replicate?: number;
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
 */
export interface ExportableResultRubric {
  rubric_evaluation_performed?: boolean;
  // Split trait scores by type (replaces old verify_rubric)
  llm_trait_scores?: Record<string, number>; // 1-5 scale
  regex_trait_scores?: Record<string, boolean>; // regex-based
  callable_trait_scores?: Record<string, boolean | number>; // boolean or score (1-5)
  metric_trait_scores?: Record<string, Record<string, number>>; // nested metrics dict
  evaluation_rubric?: Record<string, unknown>;
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
 */
export interface ExportableResult {
  metadata: ExportableResultMetadata;
  template?: ExportableResultTemplate;
  rubric?: ExportableResultRubric;
  deep_judgment?: ExportableResultDeepJudgment;
  deep_judgment_rubric?: ExportableResultDeepJudgmentRubric;
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
    console.error('Error exporting results from server:', err);
    throw new Error('Failed to export results. Please try again.');
  }
}

/**
 * Converts results to JSON format with unified export structure (matches backend format)
 */
export function exportToJSON(
  results: ExportableResult[],
  selectedFields?: string[],
  jobId?: string,
  verificationConfig?: VerificationConfig,
  jobSummary?: JobSummaryMetadata
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

  // Build unified export structure
  const unifiedExport: UnifiedExportFormat = {
    metadata: {
      export_timestamp: new Date()
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, ' UTC'),
      karenina_version: '1.0.0', // TODO: Get actual version from package.json or env
      job_id: jobId,
      verification_config: exportVerificationConfig,
      job_summary: jobSummary,
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
 */
export function exportToCSV(results: ExportableResult[], globalRubric?: Rubric, selectedFields?: string[]): string {
  // Extract all unique rubric trait names from results to create dynamic columns
  const allRubricTraitNames = new Set<string>();
  results.forEach((result) => {
    if (result.rubric) {
      // Collect from all trait score dicts (llm, regex, callable, metric)
      [
        result.rubric.llm_trait_scores,
        result.rubric.regex_trait_scores,
        result.rubric.callable_trait_scores,
        result.rubric.metric_trait_scores,
      ].forEach((traitDict) => {
        if (traitDict) {
          Object.keys(traitDict).forEach((traitName) => {
            allRubricTraitNames.add(traitName);
          });
        }
      });
    }
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

  // Create headers for global rubrics only
  const globalRubricHeaders = globalTraits.map((trait) => `rubric_${trait}`);

  /**
   * CRITICAL DEVELOPER WARNING:
   *
   * When adding new fields to VerificationResult model, you MUST add them here.
   *
   * This is the CSV headers array. Every field in ExportableResult interface
   * that should be exported must have a corresponding header here.
   *
   * See: .agents/dev/adding-verification-fields.md for complete checklist
   */
  const allHeaders = [
    'row_index',
    'question_id',
    'question_text',
    'raw_answer',
    'raw_llm_response',
    'parsed_gt_answer',
    'parsed_llm_answer',
    'template_verification_performed',
    'verify_result',
    'verify_granular_result',
    'rubric_evaluation_performed',
    ...globalRubricHeaders,
    ...(questionSpecificTraits.length > 0 ? ['question_specific_rubrics'] : []),
    'rubric_summary',
    'answering_model',
    'parsing_model',
    'answering_replicate',
    'parsing_replicate',
    'answering_system_prompt',
    'parsing_system_prompt',
    // MCP server fields
    'answering_mcp_servers',
    'completed_without_errors',
    'error',
    'execution_time',
    'timestamp',
    'run_name',
    'job_id',
    // Embedding check fields
    'embedding_check_performed',
    'embedding_similarity_score',
    'embedding_override_applied',
    'embedding_model_used',
    // Abstention detection fields
    'abstention_check_performed',
    'abstention_detected',
    'abstention_override_applied',
    'abstention_reasoning',
    // Deep-judgment fields
    'deep_judgment_enabled',
    'deep_judgment_performed',
    'extracted_excerpts',
    'attribute_reasoning',
    'deep_judgment_stages_completed',
    'deep_judgment_model_calls',
    'deep_judgment_excerpt_retry_count',
    'attributes_without_excerpts',
    // Search-enhanced deep-judgment fields
    'deep_judgment_search_enabled',
    'hallucination_risk_assessment',
    // Deep-judgment rubric fields
    'deep_judgment_rubric_performed',
    'deep_judgment_rubric_scores',
    'rubric_trait_reasoning',
    'extracted_rubric_excerpts',
    'trait_metadata',
    'traits_without_valid_excerpts',
    'rubric_hallucination_risk_assessment',
    'total_deep_judgment_model_calls',
    'total_traits_evaluated',
    'total_excerpt_retries',
    // Metric trait fields
    'metric_trait_confusion_lists',
    'metric_trait_metrics',
    // LLM usage tracking fields
    'usage_metadata',
    'agent_metrics',
  ];

  // Filter headers based on selected fields if provided
  const headers = selectedFields ? allHeaders.filter((header) => selectedFields.includes(header)) : allHeaders;

  const csvRows = [headers.join(',')];

  results.forEach((result, index) => {
    // Merge all trait scores for CSV export (from all trait score dicts)
    const mergedTraits: Record<string, number | boolean | Record<string, number>> = {};
    if (result.rubric) {
      if (result.rubric.llm_trait_scores) Object.assign(mergedTraits, result.rubric.llm_trait_scores);
      if (result.rubric.regex_trait_scores) Object.assign(mergedTraits, result.rubric.regex_trait_scores);
      if (result.rubric.callable_trait_scores) Object.assign(mergedTraits, result.rubric.callable_trait_scores);
      if (result.rubric.metric_trait_scores) Object.assign(mergedTraits, result.rubric.metric_trait_scores);
    }

    // Create question-specific rubrics JSON
    const questionSpecificRubrics: Record<string, number | boolean | Record<string, number>> = {};
    if (Object.keys(mergedTraits).length > 0) {
      questionSpecificTraits.forEach((trait) => {
        if (trait in mergedTraits) {
          questionSpecificRubrics[trait] = mergedTraits[trait];
        }
      });
    }
    const questionSpecificRubricsValue =
      questionSpecificTraits.length > 0 ? escapeCSVField(JSON.stringify(questionSpecificRubrics)) : '';

    // Create rubric summary
    let rubricSummary = '';
    if (Object.keys(mergedTraits).length > 0) {
      const traits = Object.entries(mergedTraits);
      const passedTraits = traits.filter(([, value]) =>
        typeof value === 'boolean' ? value : typeof value === 'number' ? value && value >= 3 : false
      ).length;
      rubricSummary = `${passedTraits}/${traits.length}`;
    }

    /**
     * CRITICAL DEVELOPER WARNING:
     *
     * When adding new fields to VerificationResult model, you MUST add them here.
     *
     * This is the CSV row data object. For each field in ExportableResult interface
     * that should be exported, add a corresponding key-value pair here.
     *
     * IMPORTANT:
     * - Use escapeCSVField() for all values to handle special characters
     * - Use JSON.stringify() for complex types (objects, arrays, etc.)
     * - Provide sensible defaults for optional fields (e.g., || false, || '', || 0)
     *
     * See: .agents/dev/adding-verification-fields.md for complete checklist
     */
    const allRowData: Record<string, string> = {
      row_index: String(index + 1),
      // Metadata fields
      question_id: escapeCSVField(result.metadata.question_id),
      question_text: escapeCSVField(result.metadata.question_text),
      raw_answer: escapeCSVField(result.raw_answer || ''), // Added from checkpoint during export
      answering_model: escapeCSVField(result.metadata.answering_model),
      parsing_model: escapeCSVField(result.metadata.parsing_model),
      answering_replicate: escapeCSVField(result.metadata.answering_replicate || ''),
      parsing_replicate: escapeCSVField(result.metadata.parsing_replicate || ''),
      completed_without_errors: escapeCSVField(
        result.template?.abstention_detected && result.template?.abstention_override_applied
          ? 'abstained'
          : result.metadata.completed_without_errors
      ),
      error: escapeCSVField(result.metadata.error || ''),
      execution_time: escapeCSVField(result.metadata.execution_time),
      timestamp: escapeCSVField(result.metadata.timestamp),
      run_name: escapeCSVField(result.metadata.run_name || ''),
      job_id: escapeCSVField(result.metadata.job_id || ''),
      // Template fields
      raw_llm_response: escapeCSVField(result.template?.raw_llm_response || ''),
      parsed_gt_answer: escapeCSVField(
        result.template?.parsed_gt_response ? JSON.stringify(result.template.parsed_gt_response) : ''
      ),
      parsed_llm_answer: escapeCSVField(
        result.template?.parsed_llm_response ? JSON.stringify(result.template.parsed_llm_response) : ''
      ),
      template_verification_performed: escapeCSVField(
        result.template?.template_verification_performed !== undefined
          ? result.template.template_verification_performed
          : ''
      ),
      verify_result: escapeCSVField(
        result.template?.verify_result !== undefined ? JSON.stringify(result.template.verify_result) : 'N/A'
      ),
      verify_granular_result: escapeCSVField(
        result.template?.verify_granular_result !== undefined
          ? JSON.stringify(result.template.verify_granular_result)
          : 'N/A'
      ),
      answering_system_prompt: escapeCSVField(result.template?.answering_system_prompt || ''),
      parsing_system_prompt: escapeCSVField(result.template?.parsing_system_prompt || ''),
      // Embedding check fields
      embedding_check_performed: escapeCSVField(result.template?.embedding_check_performed || false),
      embedding_similarity_score: escapeCSVField(result.template?.embedding_similarity_score || ''),
      embedding_override_applied: escapeCSVField(result.template?.embedding_override_applied || false),
      embedding_model_used: escapeCSVField(result.template?.embedding_model_used || ''),
      // Abstention detection fields
      abstention_check_performed: escapeCSVField(result.template?.abstention_check_performed || false),
      abstention_detected: escapeCSVField(
        result.template?.abstention_detected !== null && result.template?.abstention_detected !== undefined
          ? result.template.abstention_detected
          : ''
      ),
      abstention_override_applied: escapeCSVField(result.template?.abstention_override_applied || false),
      abstention_reasoning: escapeCSVField(result.template?.abstention_reasoning || ''),
      // MCP server fields
      answering_mcp_servers: escapeCSVField(
        result.template?.answering_mcp_servers ? JSON.stringify(result.template.answering_mcp_servers) : ''
      ),
      // LLM usage tracking fields
      usage_metadata: escapeCSVField(
        result.template?.usage_metadata ? JSON.stringify(result.template.usage_metadata) : ''
      ),
      agent_metrics: escapeCSVField(
        result.template?.agent_metrics ? JSON.stringify(result.template.agent_metrics) : ''
      ),
      // Rubric fields
      rubric_evaluation_performed: escapeCSVField(
        result.rubric?.rubric_evaluation_performed !== undefined ? result.rubric.rubric_evaluation_performed : ''
      ),
      rubric_summary: escapeCSVField(rubricSummary),
      metric_trait_confusion_lists: escapeCSVField(
        result.rubric?.metric_trait_confusion_lists ? JSON.stringify(result.rubric.metric_trait_confusion_lists) : ''
      ),
      metric_trait_metrics: escapeCSVField(
        result.rubric?.metric_trait_scores ? JSON.stringify(result.rubric.metric_trait_scores) : ''
      ),
      // Deep-judgment fields
      deep_judgment_enabled: escapeCSVField(result.deep_judgment?.deep_judgment_enabled || false),
      deep_judgment_performed: escapeCSVField(result.deep_judgment?.deep_judgment_performed || false),
      extracted_excerpts: escapeCSVField(
        result.deep_judgment?.extracted_excerpts ? JSON.stringify(result.deep_judgment.extracted_excerpts) : ''
      ),
      attribute_reasoning: escapeCSVField(
        result.deep_judgment?.attribute_reasoning ? JSON.stringify(result.deep_judgment.attribute_reasoning) : ''
      ),
      deep_judgment_stages_completed: escapeCSVField(
        result.deep_judgment?.deep_judgment_stages_completed
          ? JSON.stringify(result.deep_judgment.deep_judgment_stages_completed)
          : ''
      ),
      deep_judgment_model_calls: escapeCSVField(result.deep_judgment?.deep_judgment_model_calls || 0),
      deep_judgment_excerpt_retry_count: escapeCSVField(result.deep_judgment?.deep_judgment_excerpt_retry_count || 0),
      attributes_without_excerpts: escapeCSVField(
        result.deep_judgment?.attributes_without_excerpts
          ? JSON.stringify(result.deep_judgment.attributes_without_excerpts)
          : ''
      ),
      // Search-enhanced deep-judgment fields
      deep_judgment_search_enabled: escapeCSVField(result.deep_judgment?.deep_judgment_search_enabled || false),
      hallucination_risk_assessment: escapeCSVField(
        result.deep_judgment?.hallucination_risk_assessment
          ? JSON.stringify(result.deep_judgment.hallucination_risk_assessment)
          : ''
      ),
      // Deep-judgment rubric fields
      deep_judgment_rubric_performed: escapeCSVField(
        result.deep_judgment_rubric?.deep_judgment_rubric_performed || false
      ),
      deep_judgment_rubric_scores: escapeCSVField(
        result.deep_judgment_rubric?.deep_judgment_rubric_scores
          ? JSON.stringify(result.deep_judgment_rubric.deep_judgment_rubric_scores)
          : ''
      ),
      rubric_trait_reasoning: escapeCSVField(
        result.deep_judgment_rubric?.rubric_trait_reasoning
          ? JSON.stringify(result.deep_judgment_rubric.rubric_trait_reasoning)
          : ''
      ),
      extracted_rubric_excerpts: escapeCSVField(
        result.deep_judgment_rubric?.extracted_rubric_excerpts
          ? JSON.stringify(result.deep_judgment_rubric.extracted_rubric_excerpts)
          : ''
      ),
      trait_metadata: escapeCSVField(
        result.deep_judgment_rubric?.trait_metadata ? JSON.stringify(result.deep_judgment_rubric.trait_metadata) : ''
      ),
      traits_without_valid_excerpts: escapeCSVField(
        result.deep_judgment_rubric?.traits_without_valid_excerpts
          ? JSON.stringify(result.deep_judgment_rubric.traits_without_valid_excerpts)
          : ''
      ),
      rubric_hallucination_risk_assessment: escapeCSVField(
        result.deep_judgment_rubric?.rubric_hallucination_risk_assessment
          ? JSON.stringify(result.deep_judgment_rubric.rubric_hallucination_risk_assessment)
          : ''
      ),
      total_deep_judgment_model_calls: escapeCSVField(
        result.deep_judgment_rubric?.total_deep_judgment_model_calls || 0
      ),
      total_traits_evaluated: escapeCSVField(result.deep_judgment_rubric?.total_traits_evaluated || 0),
      total_excerpt_retries: escapeCSVField(result.deep_judgment_rubric?.total_excerpt_retries || 0),
    };

    // Add global rubric values from merged traits
    globalTraits.forEach((traitName) => {
      const value = mergedTraits[traitName];
      allRowData[`rubric_${traitName}`] = escapeCSVField(value !== undefined ? value : '');
    });

    // Add question-specific rubrics if they exist
    if (questionSpecificTraits.length > 0) {
      allRowData['question_specific_rubrics'] = questionSpecificRubricsValue;
    }

    // Build row based on selected headers
    const row = headers.map((header) => allRowData[header] || '');
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
      content = exportToJSON(results, selectedFields, jobId, verificationConfig, jobSummary);
      mimeType = 'application/json';
      fileName = `filtered_results_${new Date().toISOString().split('T')[0]}.json`;
    } else {
      content = exportToCSV(results, globalRubric, selectedFields);
      mimeType = 'text/csv';
      fileName = `filtered_results_${new Date().toISOString().split('T')[0]}.csv`;
    }

    downloadFile(content, fileName, mimeType);
  } catch (err) {
    console.error('Error exporting filtered results:', err);
    const errorMsg = 'Failed to export filtered results. Please try again.';
    if (onError) {
      onError(errorMsg);
    } else {
      alert(errorMsg);
    }
  }
}
