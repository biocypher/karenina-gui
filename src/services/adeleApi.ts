/**
 * ADeLe Classification API Service
 *
 * Provides methods for classifying questions using the ADeLe framework.
 * Supports single question classification and batch operations with
 * progress tracking via polling or WebSocket.
 */

import { API_ENDPOINTS } from '../constants/api';
import { logger } from '../utils/logger';
import type {
  AdeleTraitInfo,
  ClassificationResult,
  BatchProgressResponse,
  AdeleModelConfigRequest,
} from '../types/adele';

/**
 * Custom error class for ADeLe API errors.
 */
export class AdeleApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'AdeleApiError';
  }
}

/**
 * Parse error response from API.
 */
async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const errorData = await response.json();
    return errorData.detail || errorData.error || response.statusText || 'Request failed';
  } catch {
    return response.statusText || 'Request failed';
  }
}

/**
 * ADeLe API Service
 */
export const adeleApi = {
  /**
   * Get list of available ADeLe traits.
   */
  async getTraits(): Promise<AdeleTraitInfo[]> {
    const url = API_ENDPOINTS.ADELE_TRAITS;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new AdeleApiError(message, response.status, 'getTraits');
      }

      const data: {
        success: boolean;
        traits: Array<{
          name: string;
          code: string;
          description: string | null;
          classes: Record<string, string>;
          class_names: string[];
        }>;
        count: number;
        error?: string;
      } = await response.json();

      if (!data.success) {
        throw new AdeleApiError(data.error || 'Failed to get traits', undefined, 'getTraits');
      }

      // Convert snake_case to camelCase
      return data.traits.map((trait) => ({
        name: trait.name,
        code: trait.code,
        description: trait.description,
        classes: trait.classes,
        classNames: trait.class_names,
      }));
    } catch (err) {
      if (err instanceof AdeleApiError) {
        throw err;
      }
      throw new AdeleApiError(err instanceof Error ? err.message : 'Failed to get traits', undefined, 'getTraits');
    }
  },

  /**
   * Classify a single question.
   */
  async classifySingle(
    questionText: string,
    traitNames?: string[],
    questionId?: string,
    llmConfig?: AdeleModelConfigRequest
  ): Promise<ClassificationResult> {
    const url = API_ENDPOINTS.ADELE_CLASSIFY;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_text: questionText,
          question_id: questionId,
          trait_names: traitNames,
          llm_config: llmConfig,
        }),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new AdeleApiError(message, response.status, 'classifySingle');
      }

      const data: {
        success: boolean;
        result: {
          question_id: string | null;
          question_text: string;
          scores: Record<string, number>;
          labels: Record<string, string>;
          model: string;
          classified_at: string;
        } | null;
        error?: string;
      } = await response.json();

      if (!data.success || !data.result) {
        throw new AdeleApiError(data.error || 'Classification failed', undefined, 'classifySingle');
      }

      // Convert snake_case to camelCase
      return {
        questionId: data.result.question_id,
        questionText: data.result.question_text,
        scores: data.result.scores,
        labels: data.result.labels,
        model: data.result.model,
        classifiedAt: data.result.classified_at,
      };
    } catch (err) {
      if (err instanceof AdeleApiError) {
        throw err;
      }
      throw new AdeleApiError(
        err instanceof Error ? err.message : 'Failed to classify question',
        undefined,
        'classifySingle'
      );
    }
  },

  /**
   * Start a batch classification job.
   */
  async startBatchClassification(
    questions: Array<{ questionId: string; questionText: string }>,
    traitNames?: string[],
    llmConfig?: AdeleModelConfigRequest
  ): Promise<{ jobId: string; totalQuestions: number }> {
    const url = API_ENDPOINTS.ADELE_CLASSIFY_BATCH;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: questions.map((q) => ({
            question_id: q.questionId,
            question_text: q.questionText,
          })),
          trait_names: traitNames,
          llm_config: llmConfig,
        }),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new AdeleApiError(message, response.status, 'startBatchClassification');
      }

      const data: {
        success: boolean;
        job_id: string;
        status: string;
        message: string;
        total_questions: number;
        error?: string;
      } = await response.json();

      if (!data.success) {
        throw new AdeleApiError(data.error || 'Failed to start batch', undefined, 'startBatchClassification');
      }

      return {
        jobId: data.job_id,
        totalQuestions: data.total_questions,
      };
    } catch (err) {
      if (err instanceof AdeleApiError) {
        throw err;
      }
      throw new AdeleApiError(
        err instanceof Error ? err.message : 'Failed to start batch classification',
        undefined,
        'startBatchClassification'
      );
    }
  },

  /**
   * Get progress of a batch classification job.
   */
  async getBatchProgress(jobId: string): Promise<BatchProgressResponse> {
    const url = API_ENDPOINTS.ADELE_BATCH_PROGRESS(jobId);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new AdeleApiError(message, response.status, 'getBatchProgress');
      }

      const data: {
        success: boolean;
        job_id: string;
        status: string;
        progress: number;
        completed: number;
        total: number;
        message: string;
        error?: string;
      } = await response.json();

      return {
        success: data.success,
        jobId: data.job_id,
        status: data.status as BatchProgressResponse['status'],
        progress: data.progress,
        completed: data.completed,
        total: data.total,
        message: data.message,
        error: data.error,
      };
    } catch (err) {
      if (err instanceof AdeleApiError) {
        throw err;
      }
      throw new AdeleApiError(
        err instanceof Error ? err.message : 'Failed to get batch progress',
        undefined,
        'getBatchProgress'
      );
    }
  },

  /**
   * Get results of a completed batch classification job.
   */
  async getBatchResults(jobId: string): Promise<ClassificationResult[]> {
    const url = API_ENDPOINTS.ADELE_BATCH_RESULTS(jobId);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new AdeleApiError(message, response.status, 'getBatchResults');
      }

      const data: {
        success: boolean;
        job_id: string;
        status: string;
        results: Array<{
          question_id: string | null;
          question_text: string;
          scores: Record<string, number>;
          labels: Record<string, string>;
          model: string;
          classified_at: string;
        }>;
        error?: string;
      } = await response.json();

      if (!data.success) {
        throw new AdeleApiError(data.error || 'Failed to get results', undefined, 'getBatchResults');
      }

      // Convert snake_case to camelCase
      return data.results.map((r) => ({
        questionId: r.question_id,
        questionText: r.question_text,
        scores: r.scores,
        labels: r.labels,
        model: r.model,
        classifiedAt: r.classified_at,
      }));
    } catch (err) {
      if (err instanceof AdeleApiError) {
        throw err;
      }
      throw new AdeleApiError(
        err instanceof Error ? err.message : 'Failed to get batch results',
        undefined,
        'getBatchResults'
      );
    }
  },

  /**
   * Cancel a batch classification job.
   */
  async cancelBatchJob(jobId: string): Promise<void> {
    const url = API_ENDPOINTS.ADELE_CANCEL_BATCH(jobId);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new AdeleApiError(message, response.status, 'cancelBatchJob');
      }
    } catch (err) {
      if (err instanceof AdeleApiError) {
        throw err;
      }
      throw new AdeleApiError(
        err instanceof Error ? err.message : 'Failed to cancel batch job',
        undefined,
        'cancelBatchJob'
      );
    }
  },

  /**
   * Create a WebSocket connection for real-time batch progress updates.
   */
  createProgressWebSocket(
    jobId: string,
    onMessage: (message: {
      type: string;
      jobId: string;
      status: string;
      percentage: number;
      completed: number;
      total: number;
      currentQuestionId?: string;
      durationSeconds?: number;
      error?: string;
    }) => void,
    onError?: (error: Event) => void,
    onClose?: () => void
  ): WebSocket {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/adele/classify-progress/${jobId}`;

    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage({
          type: data.type,
          jobId: data.job_id,
          status: data.status,
          percentage: data.percentage,
          completed: data.completed,
          total: data.total,
          currentQuestionId: data.current_question_id,
          durationSeconds: data.duration_seconds,
          error: data.error,
        });
      } catch (err) {
        logger.error('ADELE_API', 'Failed to parse WebSocket message', 'createProgressWebSocket', { error: err });
      }
    };

    ws.onerror = (event) => {
      logger.error('ADELE_API', 'WebSocket error', 'createProgressWebSocket', { event });
      onError?.(event);
    };

    ws.onclose = () => {
      logger.debugLog('ADELE_API', 'WebSocket closed', 'createProgressWebSocket');
      onClose?.();
    };

    return ws;
  },
};

export default adeleApi;
