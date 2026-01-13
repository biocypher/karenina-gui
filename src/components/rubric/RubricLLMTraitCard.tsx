import React, { useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import type { LLMRubricTrait } from '../../types';

type TraitType = 'boolean' | 'score' | 'manual' | 'metric';

interface RubricLLMTraitCardProps {
  trait: LLMRubricTrait;
  index: number;
  onTraitChange: (index: number, field: keyof LLMRubricTrait, value: string | number | boolean) => void;
  onRemove: (index: number) => void;
  onTypeChange: (index: number, newType: TraitType) => void;
}

export const RubricLLMTraitCard: React.FC<RubricLLMTraitCardProps> = ({
  trait,
  index,
  onTraitChange,
  onRemove,
  onTypeChange,
}) => {
  const [showDeepJudgmentDetails, setShowDeepJudgmentDetails] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-600 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Trait Name */}
        <div className="col-span-3">
          <label
            htmlFor={`r-trait-name-${index}`}
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Trait Name
          </label>
          <input
            id={`r-trait-name-${index}`}
            type="text"
            value={trait.name}
            onChange={(e) => onTraitChange(index, 'name', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                       bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors
                       hover:border-slate-400 dark:hover:border-slate-500"
            placeholder="e.g., Clarity"
            aria-label="Trait name"
          />
        </div>

        {/* Trait Type Selector */}
        <div className="col-span-2">
          <label
            htmlFor={`r-trait-type-${index}`}
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Trait Type
          </label>
          <div className="relative">
            <select
              id={`r-trait-type-${index}`}
              value={trait.kind}
              onChange={(e) => onTypeChange(index, e.target.value as TraitType)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8
                         hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
              aria-label="Trait type"
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

          {/* Score range inputs for score traits */}
          {trait.kind === 'score' && (
            <div className="mt-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Score Range</label>
              <div className="flex items-center space-x-2">
                <input
                  id={`r-min-score-${index}`}
                  type="number"
                  value={trait.min_score || 1}
                  onChange={(e) => onTraitChange(index, 'min_score', parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                             hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                  min="1"
                  max="10"
                  aria-label="Minimum score"
                  title="Minimum score"
                />
                <span className="text-sm text-slate-500 font-medium">to</span>
                <input
                  id={`r-max-score-${index}`}
                  type="number"
                  value={trait.max_score || 5}
                  onChange={(e) => onTraitChange(index, 'max_score', parseInt(e.target.value) || 5)}
                  className="w-16 px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                             hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                  min="1"
                  max="10"
                  aria-label="Maximum score"
                  title="Maximum score"
                />
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="col-span-6">
          <label
            htmlFor={`r-trait-description-${index}`}
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Trait Description <span className="text-slate-400 font-normal">(supports Markdown)</span>
          </label>
          <textarea
            id={`r-trait-description-${index}`}
            value={trait.description || ''}
            onChange={(e) => onTraitChange(index, 'description', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                       bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors
                       hover:border-slate-400 dark:hover:border-slate-500 resize-y font-mono"
            placeholder="What should be evaluated for this trait?&#10;&#10;Supports Markdown:&#10;## Headers&#10;**bold** and *italic*&#10;- bullet lists&#10;1. numbered lists&#10;| tables |"
            aria-label="Trait description"
            rows={6}
          />
        </div>

        {/* Score Direction (Higher is Better) */}
        <div className="col-span-5">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Score Direction</label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`r-higher-is-better-${index}`}
                checked={trait.higher_is_better !== false}
                onChange={() => onTraitChange(index, 'higher_is_better', true)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-slate-300"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Higher = Better</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`r-higher-is-better-${index}`}
                checked={trait.higher_is_better === false}
                onChange={() => onTraitChange(index, 'higher_is_better', false)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-300"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Lower = Better</span>
            </label>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Affects how scores are interpreted for optimization and visualization
          </p>
        </div>

        {/* Deep Judgment Configuration */}
        <div className="col-span-11">
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="checkbox"
                id={`r-deep-judgment-enabled-${index}`}
                checked={trait.deep_judgment_enabled || false}
                onChange={(e) => onTraitChange(index, 'deep_judgment_enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label
                htmlFor={`r-deep-judgment-enabled-${index}`}
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Deep Judgment (Multi-stage evaluation with evidence)
              </label>
            </div>

            {trait.deep_judgment_enabled && (
              <div className="ml-6 space-y-3 mt-2">
                {/* Extract Excerpts */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`r-deep-judgment-excerpt-${index}`}
                    checked={trait.deep_judgment_excerpt_enabled !== false}
                    onChange={(e) => onTraitChange(index, 'deep_judgment_excerpt_enabled', e.target.checked)}
                    className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <label
                    htmlFor={`r-deep-judgment-excerpt-${index}`}
                    className="text-xs text-slate-700 dark:text-slate-300"
                  >
                    Extract Excerpts
                  </label>
                </div>

                {/* Advanced Settings */}
                <details className="group" open={showDeepJudgmentDetails}>
                  <summary
                    className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowDeepJudgmentDetails(!showDeepJudgmentDetails);
                    }}
                  >
                    Advanced Settings
                  </summary>
                  <div className="ml-4 mt-2 space-y-2">
                    {/* Max Excerpts */}
                    <div>
                      <label
                        htmlFor={`r-max-excerpts-${index}`}
                        className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                      >
                        Max Excerpts (override global default)
                      </label>
                      <input
                        type="number"
                        id={`r-max-excerpts-${index}`}
                        value={trait.deep_judgment_max_excerpts ?? ''}
                        onChange={(e) =>
                          onTraitChange(
                            index,
                            'deep_judgment_max_excerpts',
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        className="w-24 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        placeholder="7"
                        min="1"
                        max="20"
                      />
                    </div>

                    {/* Fuzzy Match Threshold */}
                    <div>
                      <label
                        htmlFor={`r-fuzzy-threshold-${index}`}
                        className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                      >
                        Fuzzy Match Threshold (0.0-1.0)
                      </label>
                      <input
                        type="number"
                        id={`r-fuzzy-threshold-${index}`}
                        value={trait.deep_judgment_fuzzy_match_threshold ?? ''}
                        onChange={(e) =>
                          onTraitChange(
                            index,
                            'deep_judgment_fuzzy_match_threshold',
                            e.target.value ? parseFloat(e.target.value) : undefined
                          )
                        }
                        className="w-24 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        placeholder="0.80"
                        min="0"
                        max="1"
                        step="0.01"
                      />
                    </div>

                    {/* Retry Attempts */}
                    <div>
                      <label
                        htmlFor={`r-retry-attempts-${index}`}
                        className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                      >
                        Retry Attempts
                      </label>
                      <input
                        type="number"
                        id={`r-retry-attempts-${index}`}
                        value={trait.deep_judgment_excerpt_retry_attempts ?? ''}
                        onChange={(e) =>
                          onTraitChange(
                            index,
                            'deep_judgment_excerpt_retry_attempts',
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        className="w-24 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        placeholder="2"
                        min="0"
                        max="5"
                      />
                    </div>

                    {/* Search Enhancement */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`r-deep-judgment-search-${index}`}
                        checked={trait.deep_judgment_search_enabled || false}
                        onChange={(e) => onTraitChange(index, 'deep_judgment_search_enabled', e.target.checked)}
                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                      />
                      <label
                        htmlFor={`r-deep-judgment-search-${index}`}
                        className="text-xs text-slate-700 dark:text-slate-300"
                      >
                        Search Enhancement (hallucination detection)
                      </label>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>

        {/* Delete Button */}
        <div className="col-span-1 flex justify-end mt-6">
          <button
            onClick={() => onRemove(index)}
            className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300
                       hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            title="Delete trait"
            aria-label={`Delete ${trait.name} trait`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
