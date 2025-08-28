import { API_ENDPOINTS } from '../constants/api';
import type { Rubric, RubricTrait } from '../types';

export interface ExportableResult {
  question_id: string;
  question_text: string;
  raw_answer?: string; // Ground truth answer from checkpoint
  raw_llm_response: string;
  parsed_response?: unknown;
  verify_result?: unknown;
  verify_granular_result?: unknown;
  verify_rubric?: Record<string, number | boolean>;
  answering_model: string;
  parsing_model: string;
  answering_replicate?: number;
  parsing_replicate?: number;
  answering_system_prompt?: string;
  parsing_system_prompt?: string;
  success: boolean;
  error?: string;
  execution_time: number;
  timestamp: string;
  run_name?: string;
  job_id?: string;
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
    const resultWithIndex = {
      row_index: index + 1,
      ...result,
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

  const allHeaders = [
    'row_index',
    'question_id',
    'question_text',
    'raw_answer',
    'raw_llm_response',
    'parsed_response',
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
    'success',
    'error',
    'execution_time',
    'timestamp',
    'run_name',
    'job_id',
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

    const allRowData: Record<string, string> = {
      row_index: String(index + 1),
      question_id: escapeCSVField(result.question_id),
      question_text: escapeCSVField(result.question_text),
      raw_answer: escapeCSVField(result.raw_answer || ''),
      raw_llm_response: escapeCSVField(result.raw_llm_response),
      parsed_response: escapeCSVField(result.parsed_response ? JSON.stringify(result.parsed_response) : ''),
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
      success: escapeCSVField(result.success),
      error: escapeCSVField(result.error || ''),
      execution_time: escapeCSVField(result.execution_time),
      timestamp: escapeCSVField(result.timestamp),
      run_name: escapeCSVField(result.run_name || ''),
      job_id: escapeCSVField(result.job_id || ''),
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
