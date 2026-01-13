import { useMemo } from 'react';
import { VerificationResult } from '../types';

export interface BenchmarkResultStats {
  totalResults: number;
  successfulCount: number;
  failedCount: number;
  uniqueQuestions: number;
  uniqueModels: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  passedVerificationCount: number;
  failedVerificationCount: number;
  hasResults: boolean;
}

export interface UseBenchmarkResultsOptions {
  benchmarkResults: Record<string, VerificationResult>;
}

export interface UseBenchmarkResultsReturn {
  getAllUnfilteredResults: () => VerificationResult[];
  stats: BenchmarkResultStats;
}

/**
 * Hook for managing and computing benchmark result statistics.
 * Provides computed statistics for results display and analysis.
 */
export function useBenchmarkResults({ benchmarkResults }: UseBenchmarkResultsOptions): UseBenchmarkResultsReturn {
  // Get all unfiltered results
  const getAllUnfilteredResults = (): VerificationResult[] => {
    try {
      if (!benchmarkResults) {
        return [];
      }
      return Object.values(benchmarkResults);
    } catch (e) {
      console.error('Error in getAllUnfilteredResults:', e);
      return [];
    }
  };

  // Computed statistics
  const stats = useMemo((): BenchmarkResultStats => {
    const results = getAllUnfilteredResults();

    // Count unique questions and models
    const uniqueQuestions = new Set(results.map((r) => r.metadata.question_id)).size;
    const uniqueModels = new Set(results.map((r) => r.metadata.answering_model)).size;

    // Count successful/failed based on completion status
    const successfulCount = results.filter((r) => r.metadata.completed_without_errors).length;
    const failedCount = results.filter((r) => !r.metadata.completed_without_errors).length;

    // Count confusion matrix values
    const truePositives = results.filter((r) =>
      r.evaluations?.some((e) => e.evaluation_type === 'global_regex' && e.raw_score === 1)
    ).length;
    const falsePositives = results.filter((r) =>
      r.evaluations?.some((e) => e.evaluation_type === 'global_regex' && e.raw_score === 0)
    ).length;
    const trueNegatives = results.filter((r) =>
      r.evaluations?.some((e) => e.evaluation_type === 'global_regex' && e.raw_score === 1)
    ).length;
    const falseNegatives = results.filter((r) =>
      r.evaluations?.some((e) => e.evaluation_type === 'global_regex' && e.raw_score === 0)
    ).length;

    // Count verification results from template
    const passedVerificationCount = results.filter((r) => r.template?.verify_result === true).length;
    const failedVerificationCount = results.filter((r) => r.template?.verify_result === false).length;

    return {
      totalResults: results.length,
      successfulCount,
      failedCount,
      uniqueQuestions,
      uniqueModels,
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      passedVerificationCount,
      failedVerificationCount,
      hasResults: results.length > 0,
    };
  }, [benchmarkResults]);

  return {
    getAllUnfilteredResults,
    stats,
  };
}
