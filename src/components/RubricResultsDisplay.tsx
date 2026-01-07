import React from 'react';
import { Rubric, LLMRubricTrait, RegexTrait, CallableTrait, MetricRubricTrait } from '../types';

interface RubricResultsDisplayProps {
  rubricResults: Record<string, number | boolean> | undefined;
  metricTraitMetrics?: Record<string, Record<string, number>>; // Metric trait results
  currentRubric?: Rubric;
  evaluationRubric?: Rubric; // The merged rubric that was actually used for evaluation
  className?: string;
}

// Helper to find a trait definition by name across all trait types
function findTraitByName(
  traitName: string,
  rubric?: Rubric
): LLMRubricTrait | RegexTrait | CallableTrait | MetricRubricTrait | undefined {
  if (!rubric) return undefined;
  return (
    rubric.llm_traits?.find((t) => t.name === traitName) ||
    rubric.regex_traits?.find((t) => t.name === traitName) ||
    rubric.callable_traits?.find((t) => t.name === traitName) ||
    rubric.metric_traits?.find((t) => t.name === traitName)
  );
}

// Helper to determine if a trait value represents a "pass" based on directionality
function isTraitPassed(traitName: string, value: number | boolean, rubric?: Rubric): boolean {
  const trait = findTraitByName(traitName, rubric);

  // Get higher_is_better from trait, default to true for legacy/missing traits
  // MetricRubricTrait doesn't have higher_is_better (always true implicitly)
  const higherIsBetter = trait && 'higher_is_better' in trait ? trait.higher_is_better : true;

  if (typeof value === 'boolean') {
    // For boolean traits: true = pass if higher_is_better, false = pass if !higher_is_better
    return higherIsBetter ? value : !value;
  }

  // For score traits, find the score range
  const llmTrait = trait && 'kind' in trait && trait.kind === 'score' ? trait : undefined;
  if (llmTrait && 'min_score' in llmTrait && 'max_score' in llmTrait) {
    const min = llmTrait.min_score ?? 1;
    const max = llmTrait.max_score ?? 5;
    const midpoint = (min + max) / 2;
    return higherIsBetter ? value >= midpoint : value <= midpoint;
  }

  // Default fallback for score traits without trait definition
  return higherIsBetter ? value >= 3 : value <= 3;
}

export const RubricResultsDisplay: React.FC<RubricResultsDisplayProps> = ({
  rubricResults,
  metricTraitMetrics,
  currentRubric,
  evaluationRubric,
  className = '',
}) => {
  const hasLLMTraits = rubricResults && Object.keys(rubricResults).length > 0;
  const hasMetricTraits = metricTraitMetrics && Object.keys(metricTraitMetrics).length > 0;

  // Use the merged rubric for evaluation or fall back to current
  const rubricForEvaluation = evaluationRubric || currentRubric;

  if (!hasLLMTraits && !hasMetricTraits) {
    return (
      <div className={`bg-slate-50 dark:bg-slate-700 rounded-lg p-3 ${className}`}>
        <p className="text-slate-500 dark:text-slate-400 text-sm">No rubric evaluation performed</p>
      </div>
    );
  }

  const traits = hasLLMTraits ? Object.entries(rubricResults!) : [];
  const metricTraits = hasMetricTraits ? Object.entries(metricTraitMetrics!) : [];

  const passedTraits = traits.filter(([name, value]) => isTraitPassed(name, value, rubricForEvaluation)).length;
  const totalTraits = traits.length + metricTraits.length;
  const successRate = totalTraits > 0 ? passedTraits / totalTraits : 0;

  // Get trait descriptions and source info from the rubric that was actually used for evaluation
  const getTraitInfo = (traitName: string): { description?: string; isQuestionSpecific?: boolean } => {
    // Prioritize evaluationRubric (the merged rubric that was actually used)
    const rubricToUse = evaluationRubric || currentRubric;
    if (!rubricToUse) return {};

    // Search across all trait types (use llm_traits, not traits)
    let trait = rubricToUse.llm_traits?.find((t) => t.name === traitName);
    if (!trait) trait = rubricToUse.regex_traits?.find((t) => t.name === traitName);
    if (!trait) trait = rubricToUse.callable_traits?.find((t) => t.name === traitName);
    if (!trait) trait = rubricToUse.metric_traits?.find((t) => t.name === traitName);

    if (!trait) return {};

    // Determine if this trait is question-specific by checking if it exists in currentRubric
    // If evaluationRubric has it but currentRubric doesn't, it's question-specific
    let isQuestionSpecific = false;
    if (evaluationRubric && currentRubric) {
      const existsInGlobal =
        currentRubric.llm_traits?.some((t) => t.name === traitName) ||
        currentRubric.regex_traits?.some((t) => t.name === traitName) ||
        currentRubric.callable_traits?.some((t) => t.name === traitName) ||
        currentRubric.metric_traits?.some((t) => t.name === traitName);
      isQuestionSpecific = !existsInGlobal;
    }

    return {
      description: trait.description,
      isQuestionSpecific,
    };
  };

  return (
    <div className={`bg-slate-50 dark:bg-slate-700 rounded-lg p-4 ${className}`}>
      {/* Summary Header */}
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Rubric Evaluation Results</h5>
        <span
          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            successRate >= 0.5
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
          }`}
        >
          {passedTraits}/{totalTraits} passed
        </span>
      </div>

      {/* Individual Trait Results */}
      <div className="space-y-2">
        {/* LLM/Manual Trait Results */}
        {traits.map(([name, value]) => {
          const isPassed = isTraitPassed(name, value, rubricForEvaluation);
          const { description, isQuestionSpecific } = getTraitInfo(name);

          return (
            <div key={name} className="flex flex-col space-y-1">
              <div className="flex justify-between items-center bg-white dark:bg-slate-800 px-3 py-2 rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">{name}</span>
                    {isQuestionSpecific && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                        Q-specific
                      </span>
                    )}
                  </div>
                  {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
                </div>
                <span
                  className={`font-semibold text-sm ml-3 ${
                    isPassed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value || 'N/A'}
                </span>
              </div>
            </div>
          );
        })}

        {/* Metric Trait Results */}
        {metricTraits.map(([name, metrics]) => {
          const { description, isQuestionSpecific } = getTraitInfo(name);

          return (
            <div key={`metric-${name}`} className="flex flex-col space-y-1">
              <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">{name}</span>
                  {isQuestionSpecific && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                      Q-specific
                    </span>
                  )}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200">
                    Metric
                  </span>
                </div>
                {description && <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{description}</p>}
                {/* Metric Badges */}
                <div className="flex flex-wrap gap-2">
                  {metrics && typeof metrics === 'object'
                    ? Object.entries(metrics).map(([metricName, value]) => (
                        <span
                          key={metricName}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/10 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                          title={`${metricName}: ${(value * 100).toFixed(1)}%`}
                        >
                          <span className="capitalize">{metricName}:</span>
                          <span className="ml-1 font-semibold">{(value * 100).toFixed(1)}%</span>
                        </span>
                      ))
                    : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
