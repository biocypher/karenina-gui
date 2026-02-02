/**
 * Export Utilities
 * Main export orchestrator that re-exports from modular sub-components
 *
 * Module structure:
 * - types/export.ts - Export type definitions
 * - utils/export/version.ts - Version management
 * - utils/export/jsonBuilder.ts - JSON export logic
 * - utils/export/csvBuilder.ts - CSV export logic
 * - utils/fileDownload.ts - File download utilities
 * - types/exportFields.ts - Field mapping and extraction
 */

import { API_ENDPOINTS } from '../constants/api';
import type { Rubric, VerificationConfig } from '../types';
import type { JobSummaryMetadata, ExportableResult } from '../types/export';
import { logger } from './logger';
import { downloadFile } from './fileDownload';
import { exportToCSV } from './export/csvBuilder';
import { exportToJSON } from './export/jsonBuilder';

// Re-export types for convenience
export type {
  ExportableResult,
  ExportableResultMetadata,
  ExportableResultTemplate,
  ExportableResultRubric,
  ExportableResultDeepJudgment,
  ExportableResultDeepJudgmentRubric,
  UnifiedExportFormat,
  ExportMetadata,
  ExportModelConfig,
  ExportVerificationConfig,
  SharedDataExport,
  JobSummaryMetadata,
} from '../types/export';

// Re-export version utilities
export { getCurrentVersion, reloadVersion } from './export/version';

// Re-export builder functions
export { exportToJSON } from './export/jsonBuilder';
export { exportToCSV } from './export/csvBuilder';

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
