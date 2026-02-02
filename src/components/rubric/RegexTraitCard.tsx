import React, { useState } from 'react';
import { TrashIcon, QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { RegexTrait } from '../../types';

type TraitType = 'boolean' | 'score' | 'regex' | 'metric';

interface RegexTraitCardProps {
  trait: RegexTrait;
  index: number;
  onTraitChange: (index: number, field: keyof RegexTrait, value: string | boolean) => void;
  onRemove: (index: number) => void;
  onTypeChange: (index: number, newType: TraitType, isRegex: boolean) => void;
}

export const RegexTraitCard: React.FC<RegexTraitCardProps> = ({
  trait,
  index,
  onTraitChange,
  onRemove,
  onTypeChange,
}) => {
  const [showRegexExamples, setShowRegexExamples] = useState<number | null>(null);
  const [showInvertTooltip, setShowInvertTooltip] = useState<number | null>(null);

  return (
    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Trait Name */}
        <div className="col-span-3">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Trait Name</label>
          <input
            type="text"
            value={trait.name}
            onChange={(e) => onTraitChange(index, 'name', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                       bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="e.g., Contains Error"
          />
        </div>

        {/* Trait Type Selector */}
        <div className="col-span-2">
          <label
            htmlFor={`q-regex-trait-type-${index}`}
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Trait Type
          </label>
          <div className="relative">
            <select
              id={`q-regex-trait-type-${index}`}
              value="regex"
              onChange={(e) => onTypeChange(index, e.target.value as TraitType, true)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                         focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none pr-8
                         hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
            >
              <option value="boolean">Binary</option>
              <option value="score">Score</option>
              <option value="regex">Regex</option>
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
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Trait Description</label>
          <input
            type="text"
            value={trait.description || ''}
            onChange={(e) => onTraitChange(index, 'description', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                       bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="What does this regex check for?"
          />
        </div>

        {/* Delete Button */}
        <div className="col-span-1 flex justify-end mt-6">
          <button
            onClick={() => onRemove(index)}
            className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300
                       hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            title="Delete regex trait"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Regex Pattern */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-1">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Regex Pattern</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRegexExamples(showRegexExamples === index ? null : index)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              title="Show regex examples"
            >
              <QuestionMarkCircleIcon className="h-4 w-4" />
            </button>
            {showRegexExamples === index && (
              <div className="absolute left-0 top-6 z-50 w-96 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Regex Examples</h4>
                  <button
                    onClick={() => setShowRegexExamples(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 mb-1">\berror\b</div>
                    <div className="text-slate-600 dark:text-slate-400">Matches the word "error"</div>
                  </div>
                  <div>
                    <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 mb-1">^Answer:</div>
                    <div className="text-slate-600 dark:text-slate-400">Text must start with "Answer:"</div>
                  </div>
                  <div>
                    <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 mb-1">correct\.$</div>
                    <div className="text-slate-600 dark:text-slate-400">Text must end with "correct."</div>
                  </div>
                  <div>
                    <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                      (?&lt;=Explanation:).*
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      Checks if text contains "Explanation:" followed by content
                    </div>
                  </div>
                  <div>
                    <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                      &lt;answer&gt;(.*?)&lt;/answer&gt;
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      Checks if content is wrapped in &lt;answer&gt; tags
                    </div>
                  </div>
                  <div>
                    <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                      Explanation:.*\bcorrect\b
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      Checks if "correct" appears after "Explanation:"
                    </div>
                  </div>
                  <div>
                    <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                      &lt;answer&gt;.*\byes\b.*&lt;/answer&gt;
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      Checks if "yes" appears between &lt;answer&gt; tags
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <input
          type="text"
          value={trait.pattern || ''}
          onChange={(e) => onTraitChange(index, 'pattern', e.target.value)}
          className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-600 rounded-md
                     bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                     focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          placeholder="e.g., \berror\b"
        />
      </div>

      {/* Options */}
      <div className="mt-4 flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={trait.case_sensitive ?? true}
            onChange={(e) => onTraitChange(index, 'case_sensitive', e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Case Sensitive</span>
        </label>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={trait.invert_result ?? false}
              onChange={(e) => onTraitChange(index, 'invert_result', e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Invert Result</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowInvertTooltip(showInvertTooltip === index ? null : index)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              title="What does invert result mean?"
            >
              <QuestionMarkCircleIcon className="h-4 w-4" />
            </button>
            {showInvertTooltip === index && (
              <div className="absolute left-0 top-6 z-50 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Invert Result</h4>
                  <button
                    onClick={() => setShowInvertTooltip(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                  <p>When enabled, the boolean result of the regex match is inverted:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      <span className="font-semibold">Match found</span> → Returns{' '}
                      <span className="font-mono text-red-600 dark:text-red-400">false</span>
                    </li>
                    <li>
                      <span className="font-semibold">No match</span> → Returns{' '}
                      <span className="font-mono text-green-600 dark:text-green-400">true</span>
                    </li>
                  </ul>
                  <p className="mt-2 text-slate-500 dark:text-slate-500 italic">
                    Useful for checking that a pattern does NOT appear in the text.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
