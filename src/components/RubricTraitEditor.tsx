import React, { useEffect } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRubricStore } from '../stores/useRubricStore';
import { LLMRubricTrait, TraitKind, RegexTrait, MetricRubricTrait } from '../types';
import { RubricLLMTraitCard } from './rubric/RubricLLMTraitCard';
import { RubricRegexTraitCard } from './rubric/RubricRegexTraitCard';
import { RubricMetricTraitCard } from './rubric/RubricMetricTraitCard';
import { RubricCallableTraitCard } from './rubric/RubricCallableTraitCard';

type TraitType = 'boolean' | 'score' | 'manual' | 'metric';

// Valid metrics for each evaluation mode
const VALID_METRICS_TP_ONLY = ['precision', 'recall', 'f1'] as const;
const VALID_METRICS_FULL_MATRIX = ['precision', 'recall', 'specificity', 'accuracy', 'f1'] as const;
type MetricName = 'precision' | 'recall' | 'specificity' | 'accuracy' | 'f1';

// Metric requirements (which confusion matrix values are needed)
const METRIC_REQUIREMENTS: Record<MetricName, string[]> = {
  precision: ['tp', 'fp'],
  recall: ['tp', 'fn'],
  specificity: ['tn', 'fp'],
  accuracy: ['tp', 'tn', 'fp', 'fn'],
  f1: ['tp', 'fp', 'fn'],
};

// Get available metrics for a given evaluation mode
const getAvailableMetrics = (evaluationMode: 'tp_only' | 'full_matrix'): readonly MetricName[] => {
  return evaluationMode === 'tp_only' ? VALID_METRICS_TP_ONLY : VALID_METRICS_FULL_MATRIX;
};

export default function RubricTraitEditor() {
  const {
    currentRubric,
    isSavingRubric,
    lastError,
    addTrait,
    updateTrait,
    removeTrait,
    updateRegexTrait,
    removeRegexTrait,
    updateMetricTrait,
    removeMetricTrait,
    saveRubric,
    clearError,
    setCurrentRubric,
  } = useRubricStore();

  // Initialize with default rubric if none exists
  useEffect(() => {
    if (!currentRubric) {
      setCurrentRubric({
        llm_traits: [],
        regex_traits: [],
        metric_traits: [],
      });
    }
  }, [currentRubric, setCurrentRubric]);

  const handleAddTrait = () => {
    const totalTraits =
      (currentRubric?.llm_traits?.length || 0) +
      (currentRubric?.regex_traits?.length || 0) +
      (currentRubric?.metric_traits?.length || 0);

    // Always add Binary trait by default - user can change type via dropdown
    const newTrait: LLMRubricTrait = {
      name: `Trait ${totalTraits + 1}`,
      description: '',
      kind: 'boolean',
      higher_is_better: true, // Default to higher is better
    };
    addTrait(newTrait);
  };

  const handleTraitTypeChange = (index: number, newType: TraitType, source: 'llm' | 'regex' | 'metric' | 'trait') => {
    if (!currentRubric) return;

    // Handle 'trait' source as an alias for 'llm' (for backward compatibility with new components)
    const effectiveSource = source === 'trait' ? 'llm' : source;

    if (effectiveSource === 'regex' || effectiveSource === 'manual') {
      // Converting from manual trait
      const regexTrait = currentRubric.regex_traits?.[index];
      if (!regexTrait) return;

      if (newType === 'manual') return; // Already manual

      // Remove from regex_traits
      const updatedRegexTraits = currentRubric.regex_traits.filter((_, i) => i !== index);

      if (newType === 'metric') {
        // Convert to metric trait
        const convertedTrait: MetricRubricTrait = {
          name: regexTrait.name,
          description: regexTrait.description || '',
          evaluation_mode: 'tp_only',
          metrics: ['precision'],
          tp_instructions: [],
          tn_instructions: [],
          repeated_extraction: true,
        };

        setCurrentRubric({
          ...currentRubric,
          regex_traits: updatedRegexTraits,
          metric_traits: [...(currentRubric.metric_traits || []), convertedTrait],
        });
      } else {
        // Convert to LLM trait, preserving higher_is_better if it exists
        const convertedTrait: LLMRubricTrait = {
          name: regexTrait.name,
          description: regexTrait.description || '',
          kind: newType as TraitKind,
          higher_is_better: regexTrait.higher_is_better ?? true,
          ...(newType === 'score' && { min_score: 1, max_score: 5 }),
        };

        setCurrentRubric({
          ...currentRubric,
          llm_traits: [...currentRubric.llm_traits, convertedTrait],
          regex_traits: updatedRegexTraits,
        });
      }
    } else if (effectiveSource === 'metric') {
      // Converting from metric trait
      const metricTrait = currentRubric.metric_traits?.[index];
      if (!metricTrait) return;

      if (newType === 'metric') return; // Already metric

      // Remove from metric_traits
      const updatedMetricTraits = currentRubric.metric_traits.filter((_, i) => i !== index);

      if (newType === 'manual') {
        // Convert to manual trait
        const convertedTrait: RegexTrait = {
          name: metricTrait.name,
          description: metricTrait.description || '',
          pattern: '',
          case_sensitive: true,
          invert_result: false,
          higher_is_better: true, // Default to higher is better
        };

        setCurrentRubric({
          ...currentRubric,
          metric_traits: updatedMetricTraits,
          regex_traits: [...(currentRubric.regex_traits || []), convertedTrait],
        });
      } else {
        // Convert to LLM trait (metric traits don't have higher_is_better, default to true)
        const convertedTrait: LLMRubricTrait = {
          name: metricTrait.name,
          description: metricTrait.description || '',
          kind: newType as TraitKind,
          higher_is_better: true,
          ...(newType === 'score' && { min_score: 1, max_score: 5 }),
        };

        setCurrentRubric({
          ...currentRubric,
          llm_traits: [...currentRubric.llm_traits, convertedTrait],
          metric_traits: updatedMetricTraits,
        });
      }
    } else {
      // Converting from LLM trait
      const llmTrait = currentRubric.llm_traits[index];
      if (!llmTrait) return;

      if (newType === 'manual') {
        // Convert to manual trait, preserving higher_is_better if it exists
        const convertedTrait: RegexTrait = {
          name: llmTrait.name,
          description: llmTrait.description || '',
          pattern: '',
          case_sensitive: true,
          invert_result: false,
          higher_is_better: llmTrait.higher_is_better ?? true,
        };

        const updatedTraits = currentRubric.llm_traits.filter((_, i) => i !== index);

        setCurrentRubric({
          ...currentRubric,
          llm_traits: updatedTraits,
          regex_traits: [...(currentRubric.regex_traits || []), convertedTrait],
        });
      } else if (newType === 'metric') {
        // Convert to metric trait
        const convertedTrait: MetricRubricTrait = {
          name: llmTrait.name,
          description: llmTrait.description || '',
          evaluation_mode: 'tp_only',
          metrics: ['precision'],
          tp_instructions: [],
          tn_instructions: [],
          repeated_extraction: true,
        };

        const updatedTraits = currentRubric.llm_traits.filter((_, i) => i !== index);

        setCurrentRubric({
          ...currentRubric,
          llm_traits: updatedTraits,
          metric_traits: [...(currentRubric.metric_traits || []), convertedTrait],
        });
      } else {
        // Change LLM trait type (boolean <-> score)
        const updatedTrait: LLMRubricTrait = {
          ...llmTrait,
          kind: newType as TraitKind,
          ...(newType === 'score' && { min_score: 1, max_score: 5 }),
          ...(newType === 'boolean' && { min_score: undefined, max_score: undefined }),
        };
        updateTrait(index, updatedTrait);
      }
    }
  };

  const handleTraitChange = (index: number, field: keyof LLMRubricTrait, value: string | number | boolean) => {
    if (!currentRubric || !currentRubric.llm_traits || index < 0 || index >= currentRubric.llm_traits.length) return;

    const currentTrait = currentRubric.llm_traits[index];
    const updatedTrait: LLMRubricTrait = { ...currentTrait, [field]: value };

    updateTrait(index, updatedTrait);
  };

  const handleRegexTraitChange = (index: number, field: keyof RegexTrait, value: string | boolean) => {
    if (!currentRubric?.regex_traits || index < 0 || index >= currentRubric.regex_traits.length) return;

    const currentTrait = currentRubric.regex_traits[index];
    const updatedTrait: RegexTrait = { ...currentTrait, [field]: value };

    updateRegexTrait(index, updatedTrait);
  };

  const handleMetricTraitChange = (
    index: number,
    field: keyof MetricRubricTrait,
    value: string | string[] | boolean
  ) => {
    if (!currentRubric?.metric_traits || index < 0 || index >= currentRubric.metric_traits.length) return;

    const currentTrait = currentRubric.metric_traits[index];
    const updatedTrait: MetricRubricTrait = { ...currentTrait, [field]: value };

    updateMetricTrait(index, updatedTrait);
  };

  const handleMetricToggle = (index: number, metric: MetricName) => {
    if (!currentRubric?.metric_traits || index < 0 || index >= currentRubric.metric_traits.length) return;

    const currentTrait = currentRubric.metric_traits[index];
    const currentMetrics = currentTrait.metrics || [];

    const updatedMetrics = currentMetrics.includes(metric)
      ? currentMetrics.filter((m) => m !== metric)
      : [...currentMetrics, metric];

    handleMetricTraitChange(index, 'metrics', updatedMetrics);
  };

  const handleInstructionChange = (index: number, bucket: 'tp' | 'tn', value: string) => {
    if (!currentRubric?.metric_traits || index < 0 || index >= currentRubric.metric_traits.length) return;

    // Split by newlines but keep empty lines to allow multi-line editing
    // Empty lines will be preserved in the textarea for better UX
    const instructions = value.split('\n');

    const fieldName = `${bucket}_instructions` as keyof MetricRubricTrait;
    handleMetricTraitChange(index, fieldName, instructions);
  };

  // Check if a metric can be computed based on available instruction buckets
  const canComputeMetric = (trait: MetricRubricTrait, metric: MetricName): boolean => {
    // First check if metric is available for the current evaluation mode
    const availableMetrics = getAvailableMetrics(trait.evaluation_mode);
    if (!availableMetrics.includes(metric)) {
      return false;
    }

    // Then check if we have the required instructions
    const required = METRIC_REQUIREMENTS[metric];
    const hasTP = (trait.tp_instructions?.length || 0) > 0;
    const hasTN = (trait.tn_instructions?.length || 0) > 0;

    const available: Record<string, boolean> = {
      tp: hasTP,
      tn: hasTN,
      fp: true, // FP is always computable (TP-only: extra content, full_matrix: TN present)
      fn: hasTP, // FN requires TP instructions (missing TPs)
    };

    return required.every((bucket) => available[bucket]);
  };

  const handleEvaluationModeChange = (index: number, mode: 'tp_only' | 'full_matrix') => {
    if (!currentRubric?.metric_traits || index < 0 || index >= currentRubric.metric_traits.length) return;

    const currentTrait = currentRubric.metric_traits[index];

    // Filter metrics to only keep those valid for the new mode
    const availableMetrics = getAvailableMetrics(mode);
    const validMetrics = currentTrait.metrics.filter((m) => availableMetrics.includes(m as MetricName));

    // If no metrics remain valid, default to precision
    const newMetrics = validMetrics.length > 0 ? validMetrics : ['precision'];

    const updatedTrait: MetricRubricTrait = {
      ...currentTrait,
      evaluation_mode: mode,
      metrics: newMetrics,
    };

    updateMetricTrait(index, updatedTrait);
  };

  const handleSaveRubric = async () => {
    if (!currentRubric) return;

    // Validate rubric before saving (must have at least one trait of any type)
    const hasTraits = currentRubric.llm_traits && currentRubric.llm_traits.length > 0;
    const hasRegexTraits = currentRubric.regex_traits && currentRubric.regex_traits.length > 0;
    const hasMetricTraits = currentRubric.metric_traits && currentRubric.metric_traits.length > 0;

    if (!hasTraits && !hasRegexTraits && !hasMetricTraits) {
      return;
    }

    await saveRubric();
  };

  if (!currentRubric) {
    return (
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg">
        <div className="text-center text-slate-500 dark:text-slate-400">Loading rubric editor...</div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Rubric Trait Editor</h3>
      </div>

      {/* Traits List */}
      <div className="space-y-3 mb-4">
        {/* LLM-based Traits */}
        {(currentRubric.llm_traits || []).map((trait, index) => (
          <RubricLLMTraitCard
            key={`llm-${trait.name}-${index}`}
            trait={trait}
            index={index}
            onTraitChange={handleTraitChange}
            onRemove={removeTrait}
            onTypeChange={(index, newType) => handleTraitTypeChange(index, newType, 'llm')}
          />
        ))}

        {/* Regex Traits */}
        {(currentRubric.regex_traits || []).map((trait, index) => (
          <RubricRegexTraitCard
            key={`regex-${trait.name}-${index}`}
            trait={trait}
            index={index}
            onTraitChange={handleRegexTraitChange}
            onRemove={removeRegexTrait}
            onTypeChange={(index, newType) => handleTraitTypeChange(index, newType, 'regex')}
          />
        ))}

        {/* Metric (Confusion Matrix) Traits */}
        {(currentRubric.metric_traits || []).map((trait, index) => (
          <RubricMetricTraitCard
            key={`metric-${trait.name}-${index}`}
            trait={trait}
            index={index}
            onTraitChange={handleMetricTraitChange}
            onRemove={removeMetricTrait}
            onTypeChange={(index, newType) => handleTraitTypeChange(index, newType, 'metric')}
            onMetricToggle={handleMetricToggle}
            onInstructionChange={handleInstructionChange}
            onEvaluationModeChange={handleEvaluationModeChange}
            getAvailableMetrics={getAvailableMetrics}
            canComputeMetric={canComputeMetric}
            getMetricRequirements={(metric) => METRIC_REQUIREMENTS[metric]}
          />
        ))}

        {/* Callable Traits (Read-Only) */}
        {(currentRubric.callable_traits || []).map((trait, index) => (
          <RubricCallableTraitCard key={`callable-${trait.name}-${index}`} trait={trait} />
        ))}

        {/* Add Trait Button */}
        <button
          onClick={handleAddTrait}
          className="flex items-center justify-center w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-600
                     rounded-lg text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500
                     hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add trait
        </button>
      </div>

      {/* Error Display */}
      {lastError && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <XMarkIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">{lastError}</p>
              <button onClick={clearError} className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={handleSaveRubric}
          disabled={
            isSavingRubric ||
            ((!currentRubric.llm_traits || currentRubric.llm_traits.length === 0) &&
              (!currentRubric.regex_traits || currentRubric.regex_traits.length === 0) &&
              (!currentRubric.metric_traits || currentRubric.metric_traits.length === 0))
          }
          className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-md hover:bg-slate-900 dark:hover:bg-slate-600
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSavingRubric ? 'Saving...' : 'Set Traits'}
        </button>
      </div>

      {/* Rubric Summary */}
      {((currentRubric.llm_traits && currentRubric.llm_traits.length > 0) ||
        (currentRubric.regex_traits && currentRubric.regex_traits.length > 0) ||
        (currentRubric.callable_traits && currentRubric.callable_traits.length > 0) ||
        (currentRubric.metric_traits && currentRubric.metric_traits.length > 0)) && (
        <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
            <svg
              className="w-4 h-4 mr-2 text-slate-600 dark:text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Rubric Summary
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Total Traits:</span>
              <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">
                {(currentRubric.llm_traits?.length || 0) +
                  (currentRubric.regex_traits?.length || 0) +
                  (currentRubric.callable_traits?.length || 0) +
                  (currentRubric.metric_traits?.length || 0)}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Types:</span>
              <div className="ml-2 flex space-x-3">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {currentRubric.llm_traits.filter((t) => t.kind === 'boolean').length}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">binary</span>
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {currentRubric.llm_traits.filter((t) => t.kind === 'score').length}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">score</span>
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {currentRubric.regex_traits?.length || 0}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">manual</span>
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-teal-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {currentRubric.callable_traits?.length || 0}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">callable</span>
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {currentRubric.metric_traits?.length || 0}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">metric</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
