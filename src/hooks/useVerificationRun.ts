import { useCallback } from 'react';
import { VerificationConfig, CheckpointItem } from '../types';
import { API_ENDPOINTS, HTTP_METHODS, HEADERS } from '../constants/api';

export interface FinishedTemplate {
  questionId: string;
  item: CheckpointItem;
  questionPreview: string;
}

export interface UseVerificationRunOptions {
  selectedTests: Set<string>;
  finishedTemplates: Array<[string, CheckpointItem]>;
  runName: string;
  storageUrl: string | null;
  benchmarkName: string | undefined;
  getVerificationConfig: () => VerificationConfig;
  onSetIsRunning: (running: boolean) => void;
  onSetProgress: (progress: unknown) => void;
  onSetError: (error: string | null) => void;
  onSetJobId: (jobId: string | null) => void;
  connectProgressWebSocket: (jobId: string) => void;
}

export interface UseVerificationRunReturn {
  handleStartVerification: (questionIds?: string[]) => Promise<void>;
  handleCancelVerification: (jobId: string | null) => Promise<void>;
}

/**
 * Hook for managing benchmark verification runs.
 * Handles starting, canceling, and coordinating with WebSocket for progress updates.
 */
export function useVerificationRun({
  selectedTests,
  finishedTemplates,
  runName,
  storageUrl,
  benchmarkName,
  getVerificationConfig,
  onSetIsRunning,
  onSetProgress,
  onSetError,
  onSetJobId,
  connectProgressWebSocket,
}: UseVerificationRunOptions): UseVerificationRunReturn {
  const getQuestionPreview = useCallback((text: string) => {
    return text.length > 60 ? text.substring(0, 60) + '...' : text;
  }, []);

  const handleStartVerification = useCallback(
    async (questionIds?: string[]) => {
      const idsToRun = questionIds || Array.from(selectedTests);

      if (idsToRun.length === 0) {
        onSetError('No tests selected for verification.');
        return;
      }

      onSetIsRunning(true);
      onSetProgress(null);
      onSetError(null);

      try {
        // Prepare verification config
        const config: VerificationConfig = getVerificationConfig();

        // Prepare finished templates data
        const templatesData = finishedTemplates.map(([questionId, item]) => ({
          question_id: questionId,
          question_text: item.question,
          question_preview: getQuestionPreview(item.question),
          template_code: item.answer_template,
          last_modified: item.last_modified,
          finished: true,
          question_rubric: item.question_rubric || null,
          keywords: item.keywords || null,
        }));

        const requestPayload = {
          config,
          question_ids: idsToRun,
          finished_templates: templatesData,
          run_name: runName.trim() || undefined,
          storage_url: storageUrl || undefined,
          benchmark_name: benchmarkName || undefined,
        };

        // DEBUG: Log verification request details
        console.log('🔍 Verification Request Debug:');
        console.log('  Config:', JSON.stringify(config, null, 2));
        console.log('  Rubric Enabled?', config.rubric_enabled);

        if (templatesData.length > 0 && templatesData[0].question_rubric) {
          console.log('  Sample Question Rubric:', JSON.stringify(templatesData[0].question_rubric, null, 2));
          console.log('  Has Metric Traits?', templatesData[0].question_rubric.metric_traits?.length > 0);
        } else {
          console.log('  No question rubrics found in templates');
        }

        console.log('  Complete Request Payload:', JSON.stringify(requestPayload, null, 2));

        if (storageUrl && benchmarkName) {
          console.log('🔗 Database auto-save enabled:', { storageUrl, benchmarkName });
        } else {
          console.warn('⚠️ Database auto-save disabled - missing:', {
            storageUrl: storageUrl ? 'set' : 'NOT SET',
            benchmarkName: benchmarkName || 'NOT SET',
          });
        }

        const response = await fetch(API_ENDPOINTS.START_VERIFICATION, {
          method: HTTP_METHODS.POST,
          headers: HEADERS.CONTENT_TYPE_JSON,
          body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.detail) {
              errorMessage = errorData.detail;
            }
          } catch {
            // If parsing fails, use the default error message
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        onSetJobId(data.job_id);

        // Connect to WebSocket for real-time progress updates
        connectProgressWebSocket(data.job_id);
      } catch (err) {
        onSetIsRunning(false);
        onSetError(err instanceof Error ? err.message : 'Failed to start verification');
      }
    },
    [
      selectedTests,
      finishedTemplates,
      runName,
      storageUrl,
      benchmarkName,
      getVerificationConfig,
      getQuestionPreview,
      onSetIsRunning,
      onSetProgress,
      onSetError,
      onSetJobId,
      connectProgressWebSocket,
    ]
  );

  const handleCancelVerification = useCallback(
    async (jobId: string | null) => {
      if (!jobId) return;

      try {
        await fetch(API_ENDPOINTS.CANCEL_VERIFICATION(jobId), {
          method: HTTP_METHODS.POST,
        });

        // Note: WebSocket disconnect is handled by the caller
        onSetIsRunning(false);
        onSetProgress(null);
        onSetJobId(null);
      } catch (err) {
        console.error('Error cancelling verification:', err);
      }
    },
    [onSetIsRunning, onSetProgress, onSetJobId]
  );

  return {
    handleStartVerification,
    handleCancelVerification,
  };
}
