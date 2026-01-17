/**
 * Database API Service
 *
 * Centralized API client for database operations with retry logic,
 * consistent error handling, and proper type safety.
 */

import { API_ENDPOINTS } from '../constants/api';
import { logger } from '../utils/logger';

export interface DatabaseApiConfig {
  storageUrl: string;
  benchmarkName?: string;
}

export interface BenchmarkInfo {
  name: string;
  question_count: number;
  created_at: string;
  updated_at: string;
}

export interface DuplicateQuestion {
  question_id: string;
  existing_question: string;
  new_question: string;
}

export interface DuplicateResolutions {
  [questionId: string]: 'keep_existing' | 'replace_with_new' | 'keep_both';
}

export interface CheckpointData {
  dataset_metadata: Record<string, unknown>;
  questions: Record<string, unknown>;
  global_rubric: Record<string, unknown> | null;
}

export interface LoadBenchmarkResponse {
  checkpoint_data: {
    dataset_metadata: Record<string, unknown>;
    questions: Record<string, unknown>;
    global_rubric: Record<string, unknown> | null;
  };
}

export interface SaveBenchmarkResponse {
  message?: string;
  duplicates?: DuplicateQuestion[];
}

export interface ResolveDuplicatesResponse {
  message: string;
}

/**
 * Custom error class for API errors
 */
export class DatabaseApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'DatabaseApiError';
  }
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
};

/**
 * Calculate exponential backoff delay
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(2, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Don't retry on client errors (4xx) except 408 (Request Timeout) and 429 (Too Many Requests)
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
          return response; // Let caller handle 4xx errors
        }

        // Retry on 5xx errors, 408, and 429
        if (attempt < retryConfig.maxRetries) {
          const delay = calculateDelay(attempt, retryConfig);
          logger.warning(
            'DATABASE_API',
            `Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`,
            'fetchWithRetry',
            {
              url,
              status: response.status,
              attempt: attempt + 1,
            }
          );
          await sleep(delay);
          continue;
        }
      }

      return response;
    } catch (err) {
      lastError = err as Error;

      // Don't retry on abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }

      // Retry on network errors
      if (attempt < retryConfig.maxRetries) {
        const delay = calculateDelay(attempt, retryConfig);
        logger.warning(
          'DATABASE_API',
          `Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`,
          'fetchWithRetry',
          {
            url,
            error: err,
            attempt: attempt + 1,
          }
        );
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError || new DatabaseApiError('Request failed after retries');
}

/**
 * Parse error response from API
 */
async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const errorData = await response.json();
    return errorData.detail || response.statusText || 'Request failed';
  } catch {
    return response.statusText || 'Request failed';
  }
}

/**
 * Database API Service class
 */
export class DatabaseApiService {
  private storageUrl: string;

  constructor(config: DatabaseApiConfig) {
    this.storageUrl = config.storageUrl;
  }

  /**
   * Get list of benchmarks
   */
  async getBenchmarks(): Promise<BenchmarkInfo[]> {
    const url = API_ENDPOINTS.DATABASE_BENCHMARKS(this.storageUrl);

    try {
      const response = await fetchWithRetry(url);

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new DatabaseApiError(message, response.status, 'getBenchmarks');
      }

      const data = await response.json();
      return data.benchmarks || [];
    } catch (err) {
      if (err instanceof DatabaseApiError) {
        throw err;
      }
      throw new DatabaseApiError(
        err instanceof Error ? err.message : 'Failed to load benchmarks',
        undefined,
        'getBenchmarks'
      );
    }
  }

  /**
   * Load a specific benchmark
   */
  async loadBenchmark(benchmarkName: string): Promise<LoadBenchmarkResponse> {
    const url = API_ENDPOINTS.DATABASE_LOAD(benchmarkName, this.storageUrl);

    try {
      const response = await fetchWithRetry(url, {
        method: 'GET',
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new DatabaseApiError(message, response.status, 'loadBenchmark');
      }

      return await response.json();
    } catch (err) {
      if (err instanceof DatabaseApiError) {
        throw err;
      }
      throw new DatabaseApiError(
        err instanceof Error ? err.message : 'Failed to load benchmark',
        undefined,
        'loadBenchmark'
      );
    }
  }

  /**
   * Save benchmark (with optional duplicate detection)
   */
  async saveBenchmark(
    checkpointData: CheckpointData,
    detectDuplicates: boolean = false
  ): Promise<SaveBenchmarkResponse> {
    if (!this.benchmarkName) {
      throw new DatabaseApiError('Benchmark name is required for save operation', undefined, 'saveBenchmark');
    }
    const url = API_ENDPOINTS.DATABASE_SAVE(this.benchmarkName);
    const body = {
      storage_url: this.storageUrl,
      checkpoint_data: checkpointData,
      detect_duplicates: detectDuplicates,
    };

    try {
      const response = await fetchWithRetry(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new DatabaseApiError(message, response.status, 'saveBenchmark');
      }

      return await response.json();
    } catch (err) {
      if (err instanceof DatabaseApiError) {
        throw err;
      }
      throw new DatabaseApiError(
        err instanceof Error ? err.message : 'Failed to save benchmark',
        undefined,
        'saveBenchmark'
      );
    }
  }

  /**
   * Resolve duplicate questions
   */
  async resolveDuplicates(
    checkpointData: CheckpointData,
    resolutions: DuplicateResolutions
  ): Promise<ResolveDuplicatesResponse> {
    if (!this.benchmarkName) {
      throw new DatabaseApiError(
        'Benchmark name is required for resolve duplicates operation',
        undefined,
        'resolveDuplicates'
      );
    }
    const url = API_ENDPOINTS.DATABASE_RESOLVE_DUPLICATES(this.benchmarkName);
    const body = {
      storage_url: this.storageUrl,
      checkpoint_data: checkpointData,
      resolutions: resolutions,
    };

    try {
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new DatabaseApiError(message, response.status, 'resolveDuplicates');
      }

      return await response.json();
    } catch (err) {
      if (err instanceof DatabaseApiError) {
        throw err;
      }
      throw new DatabaseApiError(
        err instanceof Error ? err.message : 'Failed to resolve duplicates',
        undefined,
        'resolveDuplicates'
      );
    }
  }

  /**
   * Delete a benchmark
   */
  async deleteBenchmark(benchmarkName: string): Promise<void> {
    const url = API_ENDPOINTS.DATABASE_DELETE(benchmarkName, this.storageUrl);

    try {
      const response = await fetchWithRetry(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new DatabaseApiError(message, response.status, 'deleteBenchmark');
      }
    } catch (err) {
      if (err instanceof DatabaseApiError) {
        throw err;
      }
      throw new DatabaseApiError(
        err instanceof Error ? err.message : 'Failed to delete benchmark',
        undefined,
        'deleteBenchmark'
      );
    }
  }

  /**
   * Update storage URL
   */
  setStorageUrl(storageUrl: string): void {
    this.storageUrl = storageUrl;
  }

  /**
   * Set the benchmark name for save operations
   */
  setBenchmarkName(benchmarkName: string): void {
    this.benchmarkName = benchmarkName;
  }

  private benchmarkName?: string;
}

/**
 * Factory function to create a DatabaseApiService instance
 */
export function createDatabaseApiService(config: DatabaseApiConfig): DatabaseApiService {
  return new DatabaseApiService(config);
}
