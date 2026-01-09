import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRubricStore } from '../stores/useRubricStore';
import { useQuestionStore } from '../stores/useQuestionStore';
import { useTraitValidation } from '../hooks/useTraitValidation';
import { useMetricTraits } from '../hooks/useMetricTraits';
import { RubricTrait, TraitKind, Rubric, RegexTrait, MetricRubricTrait } from '../types';
import { LLMTraitCard } from './rubric/LLMTraitCard';
import { RegexTraitCard } from './rubric/RegexTraitCard';
import { MetricTraitCard } from './rubric/MetricTraitCard';
import { CallableTraitCard } from './rubric/CallableTraitCard';

type TraitType = 'boolean' | 'score' | 'regex' | 'metric';

type MetricName = 'precision' | 'recall' | 'specificity' | 'accuracy' | 'f1';

interface QuestionRubricEditorProps {
  questionId: string;
}

export default function QuestionRubricEditor({ questionId }: QuestionRubricEditorProps) {
  const { currentRubric: globalRubric, lastError: globalError, clearError: clearGlobalError } = useRubricStore();

  const { getQuestionRubric, setQuestionRubric, clearQuestionRubric } = useQuestionStore();

  // Trait validation via custom hook
  const { validateTraitName } = useTraitValidation({
    globalRubric,
    questionRubric,
  });

  // Metric traits management via custom hook
  const { handleRemoveMetricTrait, handleMetricTraitChange, getAvailableMetrics, getMetricRequirements } =
    useMetricTraits({
      questionId,
      questionRubric,
      setQuestionRubric,
      setQuestionRubricState,
      setLastError,
    });

  const [questionRubric, setQuestionRubricState] = useState<Rubric | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load question rubric when questionId changes
  useEffect(() => {
    if (questionId) {
      const rubric = getQuestionRubric(questionId);
      setQuestionRubricState(rubric);
      setIsInitialized(true);
    }
  }, [questionId, getQuestionRubric]);

  // Initialize with empty rubric if none exists
  useEffect(() => {
    if (isInitialized && !questionRubric) {
      setQuestionRubricState({
        llm_traits: [],
        regex_traits: [],
        metric_traits: [],
      });
    }
  }, [isInitialized, questionRubric]);

  const handleAddTrait = () => {
    if (!questionRubric) return;

    const totalTraits =
      (questionRubric.llm_traits?.length || 0) +
      (questionRubric.regex_traits?.length || 0) +
      (questionRubric.callable_traits?.length || 0) +
      (questionRubric.metric_traits?.length || 0);

    // Always add Binary trait by default - user can change type via dropdown
    const newTrait: RubricTrait = {
      name: `Question Trait ${totalTraits + 1}`,
      description: '',
      kind: 'boolean',
    };

    const updatedRubric = {
      ...questionRubric,
      llm_traits: [...(questionRubric.llm_traits || []), newTrait],
    };

    setQuestionRubricState(updatedRubric);
    setQuestionRubric(questionId, updatedRubric);
    setLastError(null);
  };

  const handleTraitTypeChange = (index: number, newType: TraitType, isRegex: boolean) => {
    if (!questionRubric) return;

    if (isRegex) {
      // Converting from regex trait
      const regexTrait = questionRubric.regex_traits?.[index];
      if (!regexTrait) return;

      if (newType === 'regex') return; // Already regex

      // Remove from regex_traits
      const updatedRegexTraits = (questionRubric.regex_traits || []).filter((_, i) => i !== index);

      if (newType === 'metric') {
        // Convert to metric trait
        const convertedTrait: MetricRubricTrait = {
          name: regexTrait.name,
          description: regexTrait.description || '',
          evaluation_mode: 'tp_only', // Default to tp_only mode
          metrics: ['precision'], // Default to precision
          tp_instructions: [],
          tn_instructions: [],
          repeated_extraction: true,
        };

        const updatedRubric = {
          ...questionRubric,
          regex_traits: updatedRegexTraits,
          metric_traits: [...(questionRubric.metric_traits || []), convertedTrait],
        };

        setQuestionRubricState(updatedRubric);
        setQuestionRubric(questionId, updatedRubric);
      } else {
        // Convert to LLM trait
        const convertedTrait: RubricTrait = {
          name: regexTrait.name,
          description: regexTrait.description || '',
          kind: newType as TraitKind,
          ...(newType === 'score' && { min_score: 1, max_score: 5 }),
        };

        const updatedRubric = {
          ...questionRubric,
          llm_traits: [...(questionRubric.llm_traits || []), convertedTrait],
          regex_traits: updatedRegexTraits,
        };

        setQuestionRubricState(updatedRubric);
        setQuestionRubric(questionId, updatedRubric);
      }
    } else {
      // Converting from LLM trait
      const llmTrait = questionRubric.llm_traits[index];
      if (!llmTrait) return;

      if (newType === 'regex') {
        // Convert to regex trait
        const convertedTrait: RegexTrait = {
          name: llmTrait.name,
          description: llmTrait.description || '',
          pattern: '',
          case_sensitive: true,
          invert_result: false,
        };

        // Insert at beginning of regex_traits to maintain visual proximity
        const insertPosition = 0;

        // Update both arrays atomically
        const updatedTraits = (questionRubric.llm_traits || []).filter((_, i) => i !== index);
        const updatedRegexTraits = [
          ...(questionRubric.regex_traits || []).slice(0, insertPosition),
          convertedTrait,
          ...(questionRubric.regex_traits || []).slice(insertPosition),
        ];

        const updatedRubric = {
          ...questionRubric,
          llm_traits: updatedTraits,
          regex_traits: updatedRegexTraits,
        };

        setQuestionRubricState(updatedRubric);
        setQuestionRubric(questionId, updatedRubric);
      } else if (newType === 'metric') {
        // Convert to metric trait
        const convertedTrait: MetricRubricTrait = {
          name: llmTrait.name,
          description: llmTrait.description || '',
          evaluation_mode: 'tp_only', // Default to tp_only mode
          metrics: ['precision'], // Default to precision
          tp_instructions: [],
          tn_instructions: [],
          repeated_extraction: true,
        };

        const updatedTraits = (questionRubric.llm_traits || []).filter((_, i) => i !== index);

        const updatedRubric = {
          ...questionRubric,
          llm_traits: updatedTraits,
          metric_traits: [...(questionRubric.metric_traits || []), convertedTrait],
        };

        setQuestionRubricState(updatedRubric);
        setQuestionRubric(questionId, updatedRubric);
      } else {
        // Change LLM trait type (boolean <-> score)
        handleTraitChange(index, 'kind', newType as TraitKind);
      }
    }
  };

  const handleTraitChange = (index: number, field: keyof RubricTrait, value: string | number | TraitKind) => {
    if (!questionRubric || !questionRubric.llm_traits || index < 0 || index >= questionRubric.llm_traits.length) return;

    const currentTrait = questionRubric.llm_traits[index];
    const updatedTrait: RubricTrait = { ...currentTrait, [field]: value };

    // Set default min/max for score traits
    if (field === 'kind') {
      if (value === 'score') {
        updatedTrait.min_score = 1;
        updatedTrait.max_score = 5;
      } else {
        updatedTrait.min_score = undefined;
        updatedTrait.max_score = undefined;
      }
    }

    // Check for trait name conflicts across all traits
    if (field === 'name') {
      const validation = validateTraitName(String(value), index, false);
      if (!validation.isValid) {
        setLastError(validation.error || 'Trait name validation failed');
        return;
      }
    }

    const updatedTraits = [...questionRubric.llm_traits];
    updatedTraits[index] = updatedTrait;

    const updatedRubric = { ...questionRubric, llm_traits: updatedTraits };
    setQuestionRubricState(updatedRubric);
    setQuestionRubric(questionId, updatedRubric);
    setLastError(null);
  };

  const handleRemoveTrait = (index: number) => {
    if (!questionRubric || !questionRubric.llm_traits || index < 0 || index >= questionRubric.llm_traits.length) return;

    const updatedTraits = (questionRubric.llm_traits || []).filter((_, i) => i !== index);
    const updatedRubric = { ...questionRubric, llm_traits: updatedTraits };

    setQuestionRubricState(updatedRubric);
    setQuestionRubric(questionId, updatedRubric);
    setLastError(null);
  };

  const handleRegexTraitChange = (index: number, field: keyof RegexTrait, value: string | boolean) => {
    if (!questionRubric?.regex_traits || index < 0 || index >= questionRubric.regex_traits.length) return;

    const currentTrait = questionRubric.regex_traits[index];
    const updatedTrait: RegexTrait = { ...currentTrait, [field]: value };

    // Check for name conflicts if changing name
    if (field === 'name') {
      const validation = validateTraitName(String(value), index, true);
      if (!validation.isValid) {
        setLastError(validation.error || 'Trait name validation failed');
        return;
      }
    }

    const updatedRegexTraits = [...questionRubric.regex_traits];
    updatedRegexTraits[index] = updatedTrait;

    const updatedRubric = { ...questionRubric, regex_traits: updatedRegexTraits };
    setQuestionRubricState(updatedRubric);
    setQuestionRubric(questionId, updatedRubric);
    setLastError(null);
  };

  const handleRemoveRegexTrait = (index: number) => {
    if (!questionRubric?.regex_traits || index < 0 || index >= questionRubric.regex_traits.length) return;

    const updatedRegexTraits = (questionRubric.regex_traits || []).filter((_, i) => i !== index);
    const updatedRubric = { ...questionRubric, regex_traits: updatedRegexTraits };

    setQuestionRubricState(updatedRubric);
    setQuestionRubric(questionId, updatedRubric);
    setLastError(null);
  };

  const handleMetricToggle = (index: number, metric: MetricName) => {
    if (!questionRubric?.metric_traits || index < 0 || index >= questionRubric.metric_traits.length) return;

    const currentTrait = questionRubric.metric_traits[index];
    const currentMetrics = currentTrait.metrics || [];

    const updatedMetrics = currentMetrics.includes(metric)
      ? currentMetrics.filter((m) => m !== metric)
      : [...currentMetrics, metric];

    handleMetricTraitChange(index, 'metrics', updatedMetrics);
  };

  const handleInstructionChange = (index: number, bucket: 'tp' | 'tn', value: string) => {
    if (!questionRubric?.metric_traits || index < 0 || index >= questionRubric.metric_traits.length) return;

    // Split by newlines but keep empty lines to allow multi-line editing
    // Empty lines will be preserved in the textarea for better UX
    const instructions = value.split('\n');
    const fieldName = `${bucket}_instructions` as keyof MetricRubricTrait;
    handleMetricTraitChange(index, fieldName, instructions);
  };

  const canComputeMetric = (trait: MetricRubricTrait, metric: MetricName): boolean => {
    // First check if metric is available for the current evaluation mode
    const availableMetrics = getAvailableMetrics(trait.evaluation_mode);
    if (!availableMetrics.includes(metric)) {
      return false;
    }

    // Then check if we have the required instructions
    const required = getMetricRequirements(metric);
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
    if (!questionRubric?.metric_traits || index < 0 || index >= questionRubric.metric_traits.length) return;

    const currentTrait = questionRubric.metric_traits[index];

    // Filter metrics to only keep those valid for the new mode
    const availableMetrics = getAvailableMetrics(mode);
    const validMetrics = currentTrait.metrics.filter((m) => availableMetrics.includes(m as MetricName));

    // If no metrics remain valid, default to precision
    const newMetrics = validMetrics.length > 0 ? validMetrics : ['precision'];

    handleMetricTraitChange(index, 'evaluation_mode', mode);
    handleMetricTraitChange(index, 'metrics', newMetrics);
  };

  const handleClearRubric = () => {
    clearQuestionRubric(questionId);
    setQuestionRubricState({ llm_traits: [], regex_traits: [], metric_traits: [] });
    setLastError(null);
  };

  const clearError = () => {
    setLastError(null);
  };

  if (!isInitialized || !questionRubric) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
        <div className="text-center text-slate-500 dark:text-slate-400">Loading question rubric editor...</div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Question-Specific Rubric</h3>
        {(questionRubric.llm_traits?.length || 0) > 0 && (
          <button
            onClick={handleClearRubric}
            className="px-3 py-1.5 text-sm bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Global Rubric Summary */}
      {globalRubric &&
        ((globalRubric.llm_traits && globalRubric.llm_traits.length > 0) ||
          (globalRubric.regex_traits && globalRubric.regex_traits.length > 0)) && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Global Rubric Traits (will be included in evaluation)
            </h4>
            <div className="flex flex-wrap gap-2">
              {(globalRubric.llm_traits || []).map((trait, index) => (
                <span
                  key={`llm-${index}`}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-md text-xs font-medium"
                >
                  {trait.name} ({trait.kind})
                </span>
              ))}
              {(globalRubric.regex_traits || []).map((trait, index) => (
                <span
                  key={`regex-${index}`}
                  className="px-2 py-1 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-100 rounded-md text-xs font-medium"
                >
                  {trait.name} (regex)
                </span>
              ))}
            </div>
          </div>
        )}

      {/* Question-Specific Traits */}
      <div className="space-y-3 mb-4">
        {(questionRubric.llm_traits || []).map((trait, index) => (
          <LLMTraitCard
            key={`q-llm-${trait.name}-${index}`}
            trait={trait}
            index={index}
            onTraitChange={handleTraitChange}
            onRemove={handleRemoveTrait}
            onTypeChange={handleTraitTypeChange}
          />
        ))}

        {/* Callable Traits (Read-Only) */}
        {(questionRubric.callable_traits || []).map((trait, index) => (
          <CallableTraitCard key={`q-callable-${trait.name}-${index}`} trait={trait} />
        ))}

        {/* Regex Traits */}
        {(questionRubric.regex_traits || []).map((trait, index) => (
          <RegexTraitCard
            key={`q-regex-${trait.name}-${index}`}
            trait={trait}
            index={index}
            onTraitChange={handleRegexTraitChange}
            onRemove={handleRemoveRegexTrait}
            onTypeChange={handleTraitTypeChange}
          />
        ))}

        {/* Metric (Confusion Matrix) Traits */}
        {(questionRubric.metric_traits || []).map((trait, index) => (
          <MetricTraitCard
            key={`q-metric-${trait.name}-${index}`}
            trait={trait}
            index={index}
            onTraitChange={handleMetricTraitChange}
            onRemove={handleRemoveMetricTrait}
            onMetricToggle={handleMetricToggle}
            onInstructionChange={handleInstructionChange}
            onEvaluationModeChange={handleEvaluationModeChange}
            getAvailableMetrics={getAvailableMetrics}
            canComputeMetric={canComputeMetric}
            getMetricRequirements={getMetricRequirements}
          />
        ))}

        {/* Add Trait Button */}
        <button
          onClick={handleAddTrait}
          className="flex items-center justify-center w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-600
                     rounded-lg text-slate-600 dark:text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-500
                     hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all duration-200"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add question-specific trait
        </button>
      </div>

      {/* Error Display */}
      {(lastError || globalError) && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <XMarkIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">{lastError || globalError}</p>
              <button
                onClick={lastError ? clearError : clearGlobalError}
                className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rubric Summary */}
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
          Combined Rubric Summary
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Global Traits:</span>
              <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">
                {(globalRubric?.llm_traits?.length || 0) +
                  (globalRubric?.regex_traits?.length || 0) +
                  (globalRubric?.callable_traits?.length || 0) +
                  (globalRubric?.metric_traits?.length || 0)}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Question Traits:</span>
              <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">
                {(questionRubric.llm_traits?.length || 0) +
                  (questionRubric.regex_traits?.length || 0) +
                  (questionRubric.callable_traits?.length || 0) +
                  (questionRubric.metric_traits?.length || 0)}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Total Traits:</span>
              <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">
                {(globalRubric?.llm_traits?.length || 0) +
                  (globalRubric?.regex_traits?.length || 0) +
                  (globalRubric?.callable_traits?.length || 0) +
                  (globalRubric?.metric_traits?.length || 0) +
                  (questionRubric.llm_traits?.length || 0) +
                  (questionRubric.regex_traits?.length || 0) +
                  (questionRubric.callable_traits?.length || 0) +
                  (questionRubric.metric_traits?.length || 0)}
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-slate-600 dark:text-slate-400 font-medium pt-0.5">Question Types:</span>
              <div className="ml-2 flex flex-wrap gap-2">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {(questionRubric.llm_traits || []).filter((t) => t.kind === 'boolean').length}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">binary</span>
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {(questionRubric.llm_traits || []).filter((t) => t.kind === 'score').length}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">score</span>
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {questionRubric.regex_traits?.length || 0}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">regex</span>
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-teal-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {questionRubric.callable_traits?.length || 0}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">callable</span>
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {questionRubric.metric_traits?.length || 0}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">metric</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
