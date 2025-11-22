/**
 * API client for verification results summary statistics
 */

import type { SummaryRequest, SummaryStats, ModelComparisonRequest, ModelComparisonResponse } from '../types';

/**
 * Error response from Summary API
 */
export class SummaryApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public detail?: unknown
  ) {
    super(message);
    this.name = 'SummaryApiError';
  }
}

/**
 * Compute summary statistics for verification results.
 *
 * Sends results to backend which uses VerificationResultSet.get_summary()
 * to compute comprehensive statistics.
 *
 * @param request - Results dict and optional run_name filter
 * @returns Summary statistics matching Python get_summary() output
 */
export async function fetchSummary(request: SummaryRequest): Promise<SummaryStats> {
  try {
    const response = await fetch('/api/verification/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SummaryApiError(errorData.detail || 'Failed to compute summary', response.status, errorData);
    }

    const data = await response.json();
    return data as SummaryStats;
  } catch (error) {
    if (error instanceof SummaryApiError) {
      throw error;
    }
    throw new SummaryApiError(error instanceof Error ? error.message : 'Failed to compute summary', 500);
  }
}

/**
 * Compare multiple models with per-model summaries and heatmap data.
 *
 * Backend groups results by model, computes summaries for each, and
 * generates question×model matrix for heatmap visualization.
 *
 * @param request - Results, models to compare, and parsing model filter
 * @returns Per-model summaries and heatmap data
 */
export async function fetchModelComparison(request: ModelComparisonRequest): Promise<ModelComparisonResponse> {
  try {
    const response = await fetch('/api/verification/compare-models', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SummaryApiError(errorData.detail || 'Failed to compare models', response.status, errorData);
    }

    const data = await response.json();
    return data as ModelComparisonResponse;
  } catch (error) {
    if (error instanceof SummaryApiError) {
      throw error;
    }
    throw new SummaryApiError(error instanceof Error ? error.message : 'Failed to compare models', 500);
  }
}
