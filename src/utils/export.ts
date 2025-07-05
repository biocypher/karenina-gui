import { API_ENDPOINTS } from '../constants/api';

export interface ExportableResult {
  question_id: string;
  question_text: string;
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
export function exportToJSON(results: ExportableResult[]): string {
  const resultsWithIndex = results.map((result, index) => ({
    row_index: index + 1,
    ...result,
  }));
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
export function exportToCSV(results: ExportableResult[]): string {
  // Extract all unique rubric trait names from results to create dynamic columns
  const rubricTraitNames = new Set<string>();
  results.forEach((result) => {
    if (result.verify_rubric) {
      Object.keys(result.verify_rubric).forEach((traitName) => {
        rubricTraitNames.add(traitName);
      });
    }
  });

  const rubricHeaders = Array.from(rubricTraitNames)
    .sort()
    .map((trait) => `rubric_${trait}`);

  const headers = [
    'row_index',
    'question_id',
    'question_text',
    'raw_llm_response',
    'parsed_response',
    'verify_result',
    'verify_granular_result',
    ...rubricHeaders,
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

  const csvRows = [headers.join(',')];

  results.forEach((result, index) => {
    // Extract rubric trait values in the same order as headers
    const rubricValues = Array.from(rubricTraitNames)
      .sort()
      .map((traitName) => {
        const value = result.verify_rubric?.[traitName];
        return escapeCSVField(value !== undefined ? value : '');
      });

    // Create rubric summary
    let rubricSummary = '';
    if (result.verify_rubric) {
      const traits = Object.entries(result.verify_rubric);
      const passedTraits = traits.filter(([, value]) =>
        typeof value === 'boolean' ? value : value && value >= 3
      ).length;
      rubricSummary = `${passedTraits}/${traits.length}`;
    }

    const row = [
      index + 1, // row_index
      escapeCSVField(result.question_id),
      escapeCSVField(result.question_text),
      escapeCSVField(result.raw_llm_response),
      escapeCSVField(result.parsed_response ? JSON.stringify(result.parsed_response) : ''),
      escapeCSVField(result.verify_result !== undefined ? JSON.stringify(result.verify_result) : 'N/A'),
      escapeCSVField(
        result.verify_granular_result !== undefined ? JSON.stringify(result.verify_granular_result) : 'N/A'
      ),
      ...rubricValues,
      escapeCSVField(rubricSummary),
      escapeCSVField(result.answering_model),
      escapeCSVField(result.parsing_model),
      escapeCSVField(result.answering_replicate || ''),
      escapeCSVField(result.parsing_replicate || ''),
      escapeCSVField(result.answering_system_prompt || ''),
      escapeCSVField(result.parsing_system_prompt || ''),
      escapeCSVField(result.success),
      escapeCSVField(result.error || ''),
      escapeCSVField(result.execution_time),
      escapeCSVField(result.timestamp),
      escapeCSVField(result.run_name || ''),
      escapeCSVField(result.job_id || ''),
    ];
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
  onError?: (error: string) => void
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
      content = exportToJSON(results);
      mimeType = 'application/json';
      fileName = `filtered_results_${new Date().toISOString().split('T')[0]}.json`;
    } else {
      content = exportToCSV(results);
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
