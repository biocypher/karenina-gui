import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import type { MetricRubricTrait, MetricName } from '../../types';

type TraitType = 'boolean' | 'score' | 'manual' | 'metric';

interface RubricMetricTraitCardProps {
  trait: MetricRubricTrait;
  index: number;
  onTraitChange: (index: number, field: keyof MetricRubricTrait, value: unknown) => void;
  onRemove: (index: number) => void;
  onTypeChange: (index: number, newType: TraitType) => void;
  onMetricToggle: (index: number, metric: MetricName) => void;
  onInstructionChange: (index: number, bucket: 'tp' | 'tn', value: string) => void;
  onEvaluationModeChange: (index: number, mode: 'tp_only' | 'full_matrix') => void;
  getAvailableMetrics: (mode: 'tp_only' | 'full_matrix') => MetricName[];
  canComputeMetric: (trait: MetricRubricTrait, metric: MetricName) => boolean;
  getMetricRequirements: (metric: MetricName) => string[];
}

export const RubricMetricTraitCard: React.FC<RubricMetricTraitCardProps> = ({
  trait,
  index,
  onTraitChange,
  onRemove,
  onTypeChange,
  onMetricToggle,
  onInstructionChange,
  onEvaluationModeChange,
  getAvailableMetrics,
  canComputeMetric,
  getMetricRequirements,
}) => {
  return (
    <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Trait Name */}
        <div className="col-span-3">
          <label
            htmlFor={`r-metric-trait-name-${index}`}
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Trait Name
          </label>
          <input
            id={`r-metric-trait-name-${index}`}
            type="text"
            value={trait.name}
            onChange={(e) => onTraitChange(index, 'name', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                       bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="e.g., Diagnosis Accuracy"
          />
        </div>

        {/* Trait Type Selector */}
        <div className="col-span-2">
          <label
            htmlFor={`r-metric-trait-type-${index}`}
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Trait Type
          </label>
          <div className="relative">
            <select
              id={`r-metric-trait-type-${index}`}
              value="metric"
              onChange={() => onTypeChange(index, 'metric')}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8
                         hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
              aria-label="Trait type"
              disabled
            >
              <option value="boolean">Binary</option>
              <option value="score">Score</option>
              <option value="manual">Regex</option>
              <option value="metric">Metric (Confusion Matrix)</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="col-span-6">
          <label
            htmlFor={`r-metric-trait-description-${index}`}
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Trait Description
          </label>
          <input
            id={`r-metric-trait-description-${index}`}
            type="text"
            value={trait.description || ''}
            onChange={(e) => onTraitChange(index, 'description', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                       bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="What should be evaluated for this trait?"
          />
        </div>

        {/* Delete Button */}
        <div className="col-span-1 flex justify-end mt-6">
          <button
            onClick={() => onRemove(index)}
            className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300
                       hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            title="Delete metric trait"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Evaluation Mode Selector */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Evaluation Mode</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`r-eval-mode-${index}`}
              value="tp_only"
              checked={trait.evaluation_mode === 'tp_only'}
              onChange={() => onEvaluationModeChange(index, 'tp_only')}
              className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">TP-only (Precision, Recall, F1)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`r-eval-mode-${index}`}
              value="full_matrix"
              checked={trait.evaluation_mode === 'full_matrix'}
              onChange={() => onEvaluationModeChange(index, 'full_matrix')}
              className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Full Matrix (All metrics including Specificity, Accuracy)
            </span>
          </label>
        </div>
      </div>

      {/* Metric Selection */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Metrics to Compute</label>
        <div className="flex flex-wrap gap-3">
          {getAvailableMetrics(trait.evaluation_mode).map((metric) => {
            const isSelected = (trait.metrics || []).includes(metric);
            const canCompute = canComputeMetric(trait, metric);

            return (
              <label
                key={metric}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors cursor-pointer
                  ${
                    isSelected
                      ? canCompute
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-blue-300'
                  }`}
                title={
                  isSelected && !canCompute
                    ? `Missing required buckets: ${getMetricRequirements(metric).join(', ')}`
                    : ''
                }
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onMetricToggle(index, metric)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{metric}</span>
                {isSelected && !canCompute && <span className="text-xs text-red-600 dark:text-red-400">⚠️</span>}
              </label>
            );
          })}
        </div>
      </div>

      {/* Instruction Buckets */}
      <div className={`mt-4 grid ${trait.evaluation_mode === 'tp_only' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
        {/* True Positives (Correct Extractions) */}
        <div>
          <label
            htmlFor={`r-metric-tp-${index}`}
            className="block text-xs font-medium text-green-700 dark:text-green-400 mb-1"
          >
            Correct Extractions (TP) - What SHOULD be extracted
          </label>
          <textarea
            id={`r-metric-tp-${index}`}
            value={(trait.tp_instructions || []).join('\n')}
            onChange={(e) => onInstructionChange(index, 'tp', e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono border border-green-300 dark:border-green-700 rounded-md
                       bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                       focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            placeholder="One instruction per line&#10;e.g., mentions drug mechanism&#10;     includes dosage information"
            rows={4}
          />
        </div>

        {/* True Negatives (Incorrect Extractions = FP) - Only show in full_matrix mode */}
        {trait.evaluation_mode === 'full_matrix' && (
          <div>
            <label
              htmlFor={`r-metric-tn-${index}`}
              className="block text-xs font-medium text-red-700 dark:text-red-400 mb-1"
            >
              Incorrect Extractions (TN) - What SHOULD NOT be extracted
            </label>
            <textarea
              id={`r-metric-tn-${index}`}
              value={(trait.tn_instructions || []).join('\n')}
              onChange={(e) => onInstructionChange(index, 'tn', e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-red-300 dark:border-red-700 rounded-md
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                         focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              placeholder="One instruction per line&#10;e.g., mentions side effects&#10;     off-topic information"
              rows={4}
            />
          </div>
        )}
      </div>

      {/* Repeated Extraction Toggle */}
      <div className="mt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={trait.repeated_extraction ?? true}
            onChange={(e) => onTraitChange(index, 'repeated_extraction', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Deduplicate Excerpts (Remove duplicate text across buckets)
          </span>
        </label>
      </div>
    </div>
  );
};
