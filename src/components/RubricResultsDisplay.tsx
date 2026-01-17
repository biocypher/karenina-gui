import React from 'react';
import { Rubric, LLMRubricTrait, RegexTrait, CallableTrait, MetricRubricTrait } from '../types';

interface RubricResultsDisplayProps {
  rubricResults: Record<string, number | boolean> | undefined;
  metricTraitMetrics?: Record<string, Record<string, number>>; // Metric trait results
  llmTraitLabels?: Record<string, string>; // For literal traits: mapping of trait name to class label
  currentRubric?: Rubric;
  evaluationRubric?: Rubric; // The merged rubric that was actually used for evaluation
  className?: string;
}

/**
 * All possible trait types that can be found in a rubric
 */
type Trait = LLMRubricTrait | RegexTrait | CallableTrait | MetricRubricTrait;

/**
 * Trait result info returned by getTraitInfo
 */
interface TraitInfo {
  description?: string;
  isQuestionSpecific?: boolean;
}

/**
 * Find a trait definition by name across all trait types in a rubric.
 * Searches in order: llm_traits, regex_traits, callable_traits, metric_traits.
 */
function findTraitByName(traitName: string, rubric?: Rubric): Trait | undefined {
  if (!rubric) return undefined;
  return (
    rubric.llm_traits?.find((t) => t.name === traitName) ||
    rubric.regex_traits?.find((t) => t.name === traitName) ||
    rubric.callable_traits?.find((t) => t.name === traitName) ||
    rubric.metric_traits?.find((t) => t.name === traitName)
  );
}

/**
 * Check if a trait exists in the given rubric (used to determine if question-specific).
 */
function hasTraitInRubric(traitName: string, rubric?: Rubric): boolean {
  if (!rubric) return false;
  return (
    rubric.llm_traits?.some((t) => t.name === traitName) ||
    rubric.regex_traits?.some((t) => t.name === traitName) ||
    rubric.callable_traits?.some((t) => t.name === traitName) ||
    rubric.metric_traits?.some((t) => t.name === traitName)
  );
}

/**
 * Get the higher_is_better setting for a trait.
 * Defaults to true for legacy/missing traits (MetricRubricTrait is always true).
 */
function getHigherIsBetter(trait?: Trait): boolean {
  if (!trait) return true;
  return 'higher_is_better' in trait ? trait.higher_is_better : true;
}

/**
 * Calculate the midpoint of a score or literal trait's range.
 * Returns 3 as default if trait has no min/max.
 */
function getScoreMidpoint(trait?: Trait): number {
  // Handle score and literal traits (both have min_score/max_score)
  if (!trait || !('kind' in trait) || (trait.kind !== 'score' && trait.kind !== 'literal')) {
    return 3;
  }
  if (!('min_score' in trait) || !('max_score' in trait)) {
    return 3;
  }
  // For literal traits, min=0 and max=len(classes)-1
  const min = trait.min_score ?? 0;
  const max = trait.max_score ?? 5;
  return (min + max) / 2;
}

/**
 * Determine if a trait value represents a "pass" based on directionality.
 * - Boolean traits: true passes if higher_is_better, false passes if lower_is_better
 * - Literal traits (error state=-1): always fails
 * - Literal traits: passes if value >= midpoint when higher_is_better, else <= midpoint
 * - Score traits: passes if value >= midpoint when higher_is_better, else <= midpoint
 * - Default: >= 3 passes when higher_is_better, else <= 3
 */
function isTraitPassed(traitName: string, value: number | boolean, rubric?: Rubric): boolean {
  const trait = findTraitByName(traitName, rubric);
  const higherIsBetter = getHigherIsBetter(trait);

  // Boolean traits: true = pass if higher_is_better
  if (typeof value === 'boolean') {
    return higherIsBetter ? value : !value;
  }

  // Literal trait error state: always fail
  const isLiteralTrait = trait && 'kind' in trait && trait.kind === 'literal';
  if (isLiteralTrait && value === -1) {
    return false;
  }

  // Score/Literal traits: compare against midpoint
  const midpoint = getScoreMidpoint(trait);
  return higherIsBetter ? value >= midpoint : value <= midpoint;
}

/**
 * Format trait value for display.
 * - Boolean: shows "Yes"/"No"
 * - Literal (with label): shows the class label, or error state for invalid
 * - Score: shows numeric value
 */
function formatTraitValue(
  value: number | boolean,
  traitName: string,
  llmTraitLabels?: Record<string, string>,
  trait?: Trait
): React.ReactNode {
  // Boolean traits
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Literal traits: check if we have a label
  const isLiteralTrait = trait && 'kind' in trait && trait.kind === 'literal';
  if (isLiteralTrait && llmTraitLabels && traitName in llmTraitLabels) {
    const label = llmTraitLabels[traitName];
    // Error state: score=-1 indicates invalid classification
    if (value === -1) {
      return (
        <span className="text-red-600 dark:text-red-400">
          Invalid: <span className="font-mono text-xs">{label}</span>
        </span>
      );
    }
    return label;
  }

  // Score traits or fallback
  return value ?? 'N/A';
}

export const RubricResultsDisplay: React.FC<RubricResultsDisplayProps> = ({
  rubricResults,
  metricTraitMetrics,
  llmTraitLabels,
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
  const getTraitInfo = (traitName: string): TraitInfo => {
    const rubricToUse = evaluationRubric || currentRubric;
    const trait = findTraitByName(traitName, rubricToUse);

    if (!trait) return {};

    // Determine if this trait is question-specific by checking if it exists in currentRubric
    // If evaluationRubric has it but currentRubric doesn't, it's question-specific
    const isQuestionSpecific = evaluationRubric && currentRubric ? !hasTraitInRubric(traitName, currentRubric) : false;

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
          const trait = findTraitByName(name, rubricForEvaluation);
          const isLiteral = trait && 'kind' in trait && trait.kind === 'literal';
          const isErrorState = isLiteral && typeof value === 'number' && value === -1;

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
                    {isLiteral && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-200">
                        Literal
                      </span>
                    )}
                  </div>
                  {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
                </div>
                <span
                  className={`font-semibold text-sm ml-3 ${
                    isErrorState
                      ? '' // Error state has its own styling in formatTraitValue
                      : isPassed
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatTraitValue(value, name, llmTraitLabels, trait)}
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
