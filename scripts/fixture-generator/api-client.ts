/**
 * API client for interacting with the Karenina backend
 */

import type {
  VerificationConfig,
  VerificationResult,
  VerificationProgress,
  TemplateGenerationProgress,
  QuestionData,
} from '../../src/types';

export interface VerificationRequest {
  config: VerificationConfig;
  question_ids: string[];
  finished_templates: Array<{
    question_id: string;
    question_text: string;
    question_preview: string;
    template_code: string;
    last_modified: string;
    finished: boolean;
    question_rubric: unknown | null;
    keywords: string[] | null;
  }>;
  run_name?: string;
}

export interface TemplateGenerationRequest {
  questions: QuestionData;
  config: {
    model_provider: string;
    model_name: string;
    temperature: number;
    interface: string;
    _cache_bust: number;
  };
  force_regenerate: boolean;
}

export interface StartJobResponse {
  job_id: string;
  run_name?: string;
  status?: string;
  message?: string;
}

export class KareninaApiClient {
  constructor(private baseUrl: string) {}

  /**
   * Start a verification job
   */
  async startVerification(request: VerificationRequest): Promise<StartJobResponse> {
    const response = await fetch(`${this.baseUrl}/api/start-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start verification: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Poll for verification job progress
   */
  async getVerificationProgress(
    jobId: string
  ): Promise<VerificationProgress & { result_set?: Record<string, VerificationResult> }> {
    const response = await fetch(`${this.baseUrl}/api/verification-progress/${jobId}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get verification progress: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Start a template generation job
   */
  async startTemplateGeneration(request: TemplateGenerationRequest): Promise<StartJobResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate-answer-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start template generation: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Poll for template generation progress
   */
  async getGenerationProgress(jobId: string): Promise<TemplateGenerationProgress> {
    const response = await fetch(`${this.baseUrl}/api/generation-progress/${jobId}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get generation progress: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Poll for job completion with timeout
   */
  async waitForVerificationCompletion(
    jobId: string,
    timeoutMs: number = 120000,
    pollIntervalMs: number = 2000,
    onProgress?: (progress: VerificationProgress) => void
  ): Promise<Record<string, VerificationResult>> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const progress = await this.getVerificationProgress(jobId);

      if (onProgress) {
        onProgress(progress);
      }

      if (progress.status === 'completed' && progress.result_set) {
        return progress.result_set;
      }

      if (progress.status === 'failed') {
        throw new Error(`Verification job failed: ${JSON.stringify(progress)}`);
      }

      if (progress.status === 'cancelled') {
        throw new Error('Verification job was cancelled');
      }

      await this.sleep(pollIntervalMs);
    }

    throw new Error(`Verification job timed out after ${timeoutMs}ms`);
  }

  /**
   * Poll for template generation completion with timeout
   */
  async waitForGenerationCompletion(
    jobId: string,
    timeoutMs: number = 120000,
    pollIntervalMs: number = 2000,
    onProgress?: (progress: TemplateGenerationProgress) => void
  ): Promise<TemplateGenerationProgress> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const progress = await this.getGenerationProgress(jobId);

      if (onProgress) {
        onProgress(progress);
      }

      if (progress.status === 'completed') {
        return progress;
      }

      if (progress.status === 'failed') {
        throw new Error(`Template generation failed: ${JSON.stringify(progress)}`);
      }

      if (progress.status === 'cancelled') {
        throw new Error('Template generation was cancelled');
      }

      await this.sleep(pollIntervalMs);
    }

    throw new Error(`Template generation timed out after ${timeoutMs}ms`);
  }

  /**
   * Check if the backend is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
