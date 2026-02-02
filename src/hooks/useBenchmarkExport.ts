import { useCallback } from 'react';
import { VerificationResult, VerificationProgress, Rubric } from '../types';
import { VerificationConfig } from '../types';
import { exportFromServer, exportFilteredResults, ExportableResult } from '../utils/export';
import { JobSummaryMetadata } from '../utils/export';

export interface UseBenchmarkExportOptions {
  benchmarkResults: Record<string, VerificationResult>;
  progress: VerificationProgress | null;
  currentRubric: Rubric | null;
  jobId: string | null;
  getVerificationConfig: () => VerificationConfig;
  onSetError: (error: string | null) => void;
}

export interface UseBenchmarkExportReturn {
  handleExportResults: (format: 'json' | 'csv') => Promise<void>;
  handleExportFilteredResults: (format: 'json' | 'csv') => Promise<void>;
  handleCustomExport: (selectedFields: string[], format: 'json' | 'csv') => Promise<void>;
}

/**
 * Hook for managing benchmark result exports.
 * Handles server-side export (for current job) and client-side export (for filtered/custom results).
 */
export function useBenchmarkExport({
  benchmarkResults,
  progress,
  currentRubric,
  jobId,
  getVerificationConfig,
  onSetError,
}: UseBenchmarkExportOptions): UseBenchmarkExportReturn {
  // Build job summary metadata for exports
  const buildJobSummary = useCallback((): JobSummaryMetadata => {
    const filteredResults = Object.values(benchmarkResults) as ExportableResult[];
    return {
      total_questions: new Set(filteredResults.map((r) => r.metadata.question_id)).size,
      successful_count: filteredResults.filter((r) => r.metadata.completed_without_errors).length,
      failed_count: filteredResults.filter((r) => !r.metadata.completed_without_errors).length,
      start_time: progress?.start_time,
      end_time: progress?.end_time,
      total_duration: progress?.duration_seconds,
    };
  }, [benchmarkResults, progress]);

  // Export results from server (for current job)
  const handleExportResults = useCallback(
    async (format: 'json' | 'csv') => {
      if (!jobId) return;

      try {
        await exportFromServer(jobId, format);
      } catch (err) {
        console.error('Error exporting results:', err);
        onSetError('Failed to export results. Please try again.');
      }
    },
    [jobId, onSetError]
  );

  // Export filtered results from client
  const handleExportFilteredResults = useCallback(
    async (format: 'json' | 'csv') => {
      const filteredResults = Object.values(benchmarkResults) as ExportableResult[];
      const jobSummary = buildJobSummary();

      exportFilteredResults(
        filteredResults,
        format,
        (error) => {
          onSetError(error);
        },
        currentRubric,
        undefined, // selectedFields
        jobId || undefined,
        getVerificationConfig(),
        jobSummary
      );
    },
    [benchmarkResults, buildJobSummary, currentRubric, jobId, getVerificationConfig, onSetError]
  );

  // Export with custom field selection
  const handleCustomExport = useCallback(
    async (selectedFields: string[], format: 'json' | 'csv') => {
      const filteredResults = Object.values(benchmarkResults) as ExportableResult[];
      const jobSummary = buildJobSummary();

      exportFilteredResults(
        filteredResults,
        format,
        (error) => {
          onSetError(error);
        },
        currentRubric,
        selectedFields,
        jobId || undefined,
        getVerificationConfig(),
        jobSummary
      );
    },
    [benchmarkResults, buildJobSummary, currentRubric, jobId, getVerificationConfig, onSetError]
  );

  return {
    handleExportResults,
    handleExportFilteredResults,
    handleCustomExport,
  };
}
