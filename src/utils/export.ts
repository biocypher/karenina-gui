import { API_ENDPOINTS } from '../constants/api';
import type { Rubric, RubricTrait } from '../types';

/**
 * ExportableResult interface for GUI exports.
 *
 * MUST mirror backend VerificationResult model exactly.
 *
 * When adding fields: Update this interface, allHeaders array, and allRowData object.
 * See docs: .agents/dev/recurring-issues.md#issue-1-gui-export-sync-when-adding-verificationresult-fields
 */
export interface ExportableResult {
  question_id: string;
  question_text: string;
  raw_answer?: string; // Ground truth answer from checkpoint
  raw_llm_response: string;
  parsed_gt_response?: Record<string, unknown>; // Ground truth from 'correct' field
  parsed_llm_response?: Record<string, unknown>; // LLM extracted fields (excluding 'id' and 'correct')
  verify_result?: unknown;
  verify_granular_result?: unknown;
  verify_rubric?: Record<string, number | boolean>;
  answering_model: string;
  parsing_model: string;
  answering_replicate?: number;
  parsing_replicate?: number;
  answering_system_prompt?: string;
  parsing_system_prompt?: string;
  completed_without_errors: boolean;
  error?: string;
  execution_time: number;
  timestamp: string;
  run_name?: string;
  job_id?: string;
  // MCP server metadata
  answering_mcp_servers?: string[];
  // Embedding check metadata
  embedding_check_performed?: boolean;
  embedding_similarity_score?: number;
  embedding_override_applied?: boolean;
  embedding_model_used?: string;
  // Abstention detection metadata
  abstention_check_performed?: boolean;
  abstention_detected?: boolean | null;
  abstention_override_applied?: boolean;
  abstention_reasoning?: string | null;
  // Deep-judgment metadata
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
  // Search-enhanced deep-judgment metadata
  deep_judgment_search_enabled?: boolean;
  hallucination_risk_assessment?: Record<string, string>;
  // Metric trait evaluation metadata (confusion-matrix analysis)
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
 * Converts results to JSON format
 */
export function exportToJSON(results: ExportableResult[], selectedFields?: string[]): string {
  const resultsWithIndex = results.map((result, index) => {
    // Replace completed_without_errors boolean with "abstained" string when abstention is detected
    const completedWithoutErrorsValue =
      result.abstention_detected && result.abstention_override_applied ? 'abstained' : result.completed_without_errors;

    const resultWithIndex = {
      row_index: index + 1,
      ...result,
      completed_without_errors: completedWithoutErrorsValue,
    };

    if (selectedFields) {
      const filteredResult: Record<string, unknown> = {};
      selectedFields.forEach((field) => {
        if (field in resultWithIndex) {
          filteredResult[field] = resultWithIndex[field as keyof typeof resultWithIndex];
        }
      });
      return filteredResult;
    }

    return resultWithIndex;
  });
  return JSON.stringify(resultsWithIndex, null, 2);
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
    if (result.verify_rubric) {
      Object.keys(result.verify_rubric).forEach((traitName) => {
        allRubricTraitNames.add(traitName);
      });
    }
  });

  // Determine global vs question-specific rubrics
  const globalTraitNames = new Set<string>();
  if (globalRubric && globalRubric.traits) {
    globalRubric.traits.forEach((trait: RubricTrait) => {
      globalTraitNames.add(trait.name);
    });
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
    'verify_result',
    'verify_granular_result',
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
    // Metric trait fields
    'metric_trait_confusion_lists',
    'metric_trait_metrics',
  ];

  // Filter headers based on selected fields if provided
  const headers = selectedFields ? allHeaders.filter((header) => selectedFields.includes(header)) : allHeaders;

  const csvRows = [headers.join(',')];

  results.forEach((result, index) => {
    // Create question-specific rubrics JSON
    const questionSpecificRubrics: Record<string, number | boolean> = {};
    if (result.verify_rubric) {
      questionSpecificTraits.forEach((trait) => {
        if (trait in result.verify_rubric!) {
          questionSpecificRubrics[trait] = result.verify_rubric![trait];
        }
      });
    }
    const questionSpecificRubricsValue =
      questionSpecificTraits.length > 0 ? escapeCSVField(JSON.stringify(questionSpecificRubrics)) : '';

    // Create rubric summary
    let rubricSummary = '';
    if (result.verify_rubric) {
      const traits = Object.entries(result.verify_rubric);
      const passedTraits = traits.filter(([, value]) =>
        typeof value === 'boolean' ? value : value && value >= 3
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
      question_id: escapeCSVField(result.question_id),
      question_text: escapeCSVField(result.question_text),
      raw_answer: escapeCSVField(result.raw_answer || ''),
      raw_llm_response: escapeCSVField(result.raw_llm_response),
      parsed_gt_answer: escapeCSVField(result.parsed_gt_response ? JSON.stringify(result.parsed_gt_response) : ''),
      parsed_llm_answer: escapeCSVField(result.parsed_llm_response ? JSON.stringify(result.parsed_llm_response) : ''),
      verify_result: escapeCSVField(result.verify_result !== undefined ? JSON.stringify(result.verify_result) : 'N/A'),
      verify_granular_result: escapeCSVField(
        result.verify_granular_result !== undefined ? JSON.stringify(result.verify_granular_result) : 'N/A'
      ),
      rubric_summary: escapeCSVField(rubricSummary),
      answering_model: escapeCSVField(result.answering_model),
      parsing_model: escapeCSVField(result.parsing_model),
      answering_replicate: escapeCSVField(result.answering_replicate || ''),
      parsing_replicate: escapeCSVField(result.parsing_replicate || ''),
      answering_system_prompt: escapeCSVField(result.answering_system_prompt || ''),
      parsing_system_prompt: escapeCSVField(result.parsing_system_prompt || ''),
      // MCP server fields
      answering_mcp_servers: escapeCSVField(
        result.answering_mcp_servers ? JSON.stringify(result.answering_mcp_servers) : ''
      ),
      completed_without_errors: escapeCSVField(
        result.abstention_detected && result.abstention_override_applied ? 'abstained' : result.completed_without_errors
      ),
      error: escapeCSVField(result.error || ''),
      execution_time: escapeCSVField(result.execution_time),
      timestamp: escapeCSVField(result.timestamp),
      run_name: escapeCSVField(result.run_name || ''),
      job_id: escapeCSVField(result.job_id || ''),
      // Embedding check fields
      embedding_check_performed: escapeCSVField(result.embedding_check_performed || false),
      embedding_similarity_score: escapeCSVField(result.embedding_similarity_score || ''),
      embedding_override_applied: escapeCSVField(result.embedding_override_applied || false),
      embedding_model_used: escapeCSVField(result.embedding_model_used || ''),
      // Abstention detection fields
      abstention_check_performed: escapeCSVField(result.abstention_check_performed || false),
      abstention_detected: escapeCSVField(
        result.abstention_detected !== null && result.abstention_detected !== undefined
          ? result.abstention_detected
          : ''
      ),
      abstention_override_applied: escapeCSVField(result.abstention_override_applied || false),
      abstention_reasoning: escapeCSVField(result.abstention_reasoning || ''),
      // Deep-judgment fields
      deep_judgment_enabled: escapeCSVField(result.deep_judgment_enabled || false),
      deep_judgment_performed: escapeCSVField(result.deep_judgment_performed || false),
      extracted_excerpts: escapeCSVField(result.extracted_excerpts ? JSON.stringify(result.extracted_excerpts) : ''),
      attribute_reasoning: escapeCSVField(result.attribute_reasoning ? JSON.stringify(result.attribute_reasoning) : ''),
      deep_judgment_stages_completed: escapeCSVField(
        result.deep_judgment_stages_completed ? JSON.stringify(result.deep_judgment_stages_completed) : ''
      ),
      deep_judgment_model_calls: escapeCSVField(result.deep_judgment_model_calls || 0),
      deep_judgment_excerpt_retry_count: escapeCSVField(result.deep_judgment_excerpt_retry_count || 0),
      attributes_without_excerpts: escapeCSVField(
        result.attributes_without_excerpts ? JSON.stringify(result.attributes_without_excerpts) : ''
      ),
      // Search-enhanced deep-judgment fields
      deep_judgment_search_enabled: escapeCSVField(result.deep_judgment_search_enabled || false),
      hallucination_risk_assessment: escapeCSVField(
        result.hallucination_risk_assessment ? JSON.stringify(result.hallucination_risk_assessment) : ''
      ),
      // Metric trait fields
      metric_trait_confusion_lists: escapeCSVField(
        result.metric_trait_confusion_lists ? JSON.stringify(result.metric_trait_confusion_lists) : ''
      ),
      metric_trait_metrics: escapeCSVField(
        result.metric_trait_metrics ? JSON.stringify(result.metric_trait_metrics) : ''
      ),
    };

    // Add global rubric values
    globalTraits.forEach((traitName) => {
      const value = result.verify_rubric?.[traitName];
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
  selectedFields?: string[]
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
      content = exportToJSON(results, selectedFields);
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
