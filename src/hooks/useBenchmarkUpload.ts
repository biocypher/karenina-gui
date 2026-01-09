import { useState, useCallback, useRef } from 'react';
import { Checkpoint, VerificationResult, Rubric } from '../types';
import {
  parseVerificationResultsJSON,
  mergeVerificationResults,
  calculateMergeStats,
  ParsedImportResult,
} from '../utils/import';
import { MergeAction } from '../dialogs/MergeResultsDialog';

export interface UseBenchmarkUploadOptions {
  checkpoint: Checkpoint;
  benchmarkResults: Record<string, VerificationResult>;
  onSetBenchmarkResults: (results: Record<string, VerificationResult>) => void;
  onSetCurrentRubric: (rubric: Rubric) => void;
  onSetError: (error: string | null) => void;
}

export interface UseBenchmarkUploadReturn {
  // State
  isUploadDialogOpen: boolean;
  parsedUpload: ParsedImportResult | null;
  fileInputRef: React.RefObject<HTMLInputElement>;

  // Setters
  setIsUploadDialogOpen: (open: boolean) => void;
  setParsedUpload: (upload: ParsedImportResult | null) => void;

  // Handlers
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleUploadConfirm: (action: MergeAction) => void;

  // Computed
  uploadedCount: number;
  existingCount: number;
  conflictCount: number;
  totalAfterMerge: number;
}

/**
 * Hook for managing benchmark result uploads/imports.
 * Handles file parsing, merge conflict resolution, and rubric updates from uploaded files.
 */
export function useBenchmarkUpload({
  checkpoint,
  benchmarkResults,
  onSetBenchmarkResults,
  onSetCurrentRubric,
  onSetError,
}: UseBenchmarkUploadOptions): UseBenchmarkUploadReturn {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [parsedUpload, setParsedUpload] = useState<ParsedImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to enrich results with raw_answer from checkpoint
  const enrichResultsWithRawAnswer = useCallback(
    (results: Record<string, VerificationResult>): Record<string, VerificationResult> => {
      const enriched: Record<string, VerificationResult> = {};
      for (const [key, result] of Object.entries(results)) {
        enriched[key] = {
          ...result,
          raw_answer: result.raw_answer || checkpoint[result.metadata.question_id]?.raw_answer,
        };
      }
      return enriched;
    },
    [checkpoint]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      onSetError(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = parseVerificationResultsJSON(content);

          setParsedUpload(parsed);
          setIsUploadDialogOpen(true);
        } catch (err) {
          console.error('Error parsing upload:', err);
          if (err instanceof Error && 'message' in err) {
            onSetError(`Failed to parse uploaded file: ${err.message}`);
          } else {
            onSetError('Failed to parse uploaded file. Please ensure it is a valid verification results JSON file.');
          }
        }
      };

      reader.onerror = () => {
        onSetError('Failed to read file. Please try again.');
      };

      reader.readAsText(file);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onSetError]
  );

  const handleUploadConfirm = useCallback(
    (action: MergeAction) => {
      if (action === 'cancel' || !parsedUpload) {
        setIsUploadDialogOpen(false);
        setParsedUpload(null);
        return;
      }

      try {
        // Enrich uploaded results with raw_answer from checkpoint
        const enrichedResults = enrichResultsWithRawAnswer(parsedUpload.results);

        if (action === 'replace') {
          // Replace existing results
          onSetBenchmarkResults(enrichedResults);
        } else if (action === 'merge') {
          // Merge with existing results
          const merged = mergeVerificationResults(benchmarkResults, enrichedResults, 'replace');
          onSetBenchmarkResults(merged);
        }

        // Update rubric from uploaded file if available (v2.0 format)
        if (parsedUpload.sharedRubricDefinition) {
          const rubricDef = parsedUpload.sharedRubricDefinition as Record<string, unknown>;
          // Construct a proper Rubric object
          const rubric: Rubric = {
            llm_traits: (rubricDef.llm_traits as Rubric['llm_traits']) || [],
            regex_traits: rubricDef.regex_traits as Rubric['regex_traits'],
            callable_traits: rubricDef.callable_traits as Rubric['callable_traits'],
            metric_traits: rubricDef.metric_traits as Rubric['metric_traits'],
          };
          console.log('📋 Applying shared rubric definition from uploaded file:', {
            llm_traits: rubric.llm_traits?.length,
            regex_traits: rubric.regex_traits?.length,
            callable_traits: rubric.callable_traits?.length,
            metric_traits: rubric.metric_traits?.length,
          });
          onSetCurrentRubric(rubric);
        }

        setIsUploadDialogOpen(false);
        setParsedUpload(null);
        onSetError(null);
      } catch (err) {
        console.error('Error applying upload:', err);
        onSetError(`Failed to load results: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsUploadDialogOpen(false);
        setParsedUpload(null);
      }
    },
    [parsedUpload, enrichResultsWithRawAnswer, benchmarkResults, onSetBenchmarkResults, onSetCurrentRubric, onSetError]
  );

  // Computed values for the merge dialog
  const uploadedCount = parsedUpload?.stats.totalResults || 0;
  const existingCount = Object.keys(benchmarkResults).length;
  const conflictCount = parsedUpload ? calculateMergeStats(benchmarkResults, parsedUpload.results).conflictCount : 0;
  const totalAfterMerge = parsedUpload
    ? calculateMergeStats(benchmarkResults, parsedUpload.results).totalAfterMerge
    : 0;

  return {
    // State
    isUploadDialogOpen,
    parsedUpload,
    fileInputRef,

    // Setters
    setIsUploadDialogOpen,
    setParsedUpload,

    // Handlers
    handleFileSelect,
    handleUploadConfirm,

    // Computed
    uploadedCount,
    existingCount,
    conflictCount,
    totalAfterMerge,
  };
}
