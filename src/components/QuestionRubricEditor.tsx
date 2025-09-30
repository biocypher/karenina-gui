import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useRubricStore } from '../stores/useRubricStore';
import { useQuestionStore } from '../stores/useQuestionStore';
import { RubricTrait, TraitKind, Rubric, ManualRubricTrait } from '../types';

type TraitType = 'boolean' | 'score' | 'manual';

interface QuestionRubricEditorProps {
  questionId: string;
}

export default function QuestionRubricEditor({ questionId }: QuestionRubricEditorProps) {
  const { currentRubric: globalRubric, lastError: globalError, clearError: clearGlobalError } = useRubricStore();

  const { getQuestionRubric, setQuestionRubric, clearQuestionRubric } = useQuestionStore();

  const [questionRubric, setQuestionRubricState] = useState<Rubric | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showRegexExamples, setShowRegexExamples] = useState<number | null>(null);
  const [showInvertTooltip, setShowInvertTooltip] = useState<number | null>(null);

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
        traits: [],
        manual_traits: [],
      });
    }
  }, [isInitialized, questionRubric]);

  const handleAddTrait = () => {
    if (!questionRubric) return;

    const totalTraits = questionRubric.traits.length + (questionRubric.manual_traits?.length || 0);

    // Always add Binary trait by default - user can change type via dropdown
    const newTrait: RubricTrait = {
      name: `Question Trait ${totalTraits + 1}`,
      description: '',
      kind: 'boolean',
    };

    const updatedRubric = {
      ...questionRubric,
      traits: [...questionRubric.traits, newTrait],
    };

    setQuestionRubricState(updatedRubric);
    setQuestionRubric(questionId, updatedRubric);
    setLastError(null);
  };

  const handleTraitTypeChange = (index: number, newType: TraitType, isManual: boolean) => {
    if (!questionRubric) return;

    if (isManual) {
      // Converting from manual trait
      const manualTrait = questionRubric.manual_traits?.[index];
      if (!manualTrait) return;

      if (newType === 'manual') return; // Already manual

      // Create converted trait
      const convertedTrait: RubricTrait = {
        name: manualTrait.name,
        description: manualTrait.description || '',
        kind: newType as TraitKind,
        ...(newType === 'score' && { min_score: 1, max_score: 5 }),
      };

      // Update both arrays atomically
      const updatedManualTraits = questionRubric.manual_traits.filter((_, i) => i !== index);
      const updatedTraits = [...questionRubric.traits, convertedTrait];

      const updatedRubric = {
        ...questionRubric,
        traits: updatedTraits,
        manual_traits: updatedManualTraits,
      };

      setQuestionRubricState(updatedRubric);
      setQuestionRubric(questionId, updatedRubric);
    } else {
      // Converting from LLM trait
      const llmTrait = questionRubric.traits[index];
      if (!llmTrait) return;

      if (newType === 'manual') {
        // Convert to manual trait
        const convertedTrait: ManualRubricTrait = {
          name: llmTrait.name,
          description: llmTrait.description || '',
          pattern: '',
          case_sensitive: true,
          invert_result: false,
        };

        // Insert at beginning of manual_traits to maintain visual proximity
        const insertPosition = 0;

        // Update both arrays atomically
        const updatedTraits = questionRubric.traits.filter((_, i) => i !== index);
        const updatedManualTraits = [
          ...questionRubric.manual_traits.slice(0, insertPosition),
          convertedTrait,
          ...questionRubric.manual_traits.slice(insertPosition),
        ];

        const updatedRubric = {
          ...questionRubric,
          traits: updatedTraits,
          manual_traits: updatedManualTraits,
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
    if (!questionRubric || index < 0 || index >= questionRubric.traits.length) return;

    const currentTrait = questionRubric.traits[index];
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
      const globalLLMNames = (globalRubric?.traits || []).map((t) => t.name.toLowerCase());
      const globalManualNames = (globalRubric?.manual_traits || []).map((t) => t.name.toLowerCase());
      const questionLLMNames = questionRubric.traits
        .map((t, i) => (i !== index ? t.name.toLowerCase() : null))
        .filter(Boolean);
      const questionManualNames = (questionRubric.manual_traits || []).map((t) => t.name.toLowerCase());
      const allExistingNames = [...globalLLMNames, ...globalManualNames, ...questionLLMNames, ...questionManualNames];

      if (allExistingNames.includes(value.toLowerCase())) {
        setLastError(`Trait with name "${value}" already exists`);
        return;
      }
    }

    const updatedTraits = [...questionRubric.traits];
    updatedTraits[index] = updatedTrait;

    const updatedRubric = { ...questionRubric, traits: updatedTraits };
    setQuestionRubricState(updatedRubric);
    setQuestionRubric(questionId, updatedRubric);
    setLastError(null);
  };

  const handleRemoveTrait = (index: number) => {
    if (!questionRubric || index < 0 || index >= questionRubric.traits.length) return;

    const updatedTraits = questionRubric.traits.filter((_, i) => i !== index);
    const updatedRubric = { ...questionRubric, traits: updatedTraits };

    setQuestionRubricState(updatedRubric);
    setQuestionRubric(questionId, updatedRubric);
    setLastError(null);
  };

  const handleManualTraitChange = (index: number, field: keyof ManualRubricTrait, value: string | boolean) => {
    if (!questionRubric?.manual_traits || index < 0 || index >= questionRubric.manual_traits.length) return;

    const currentTrait = questionRubric.manual_traits[index];
    const updatedTrait: ManualRubricTrait = { ...currentTrait, [field]: value };

    // Check for name conflicts if changing name
    if (field === 'name') {
      const globalLLMNames = (globalRubric?.traits || []).map((t) => t.name.toLowerCase());
      const globalManualNames = (globalRubric?.manual_traits || []).map((t) => t.name.toLowerCase());
      const questionLLMNames = questionRubric.traits.map((t) => t.name.toLowerCase());
      const questionManualNames = questionRubric.manual_traits
        .map((t, i) => (i !== index ? t.name.toLowerCase() : null))
        .filter(Boolean);
      const allExistingNames = [...globalLLMNames, ...globalManualNames, ...questionLLMNames, ...questionManualNames];

      if (allExistingNames.includes(String(value).toLowerCase())) {
        setLastError(`Trait with name "${value}" already exists`);
        return;
      }
    }

    const updatedManualTraits = [...questionRubric.manual_traits];
    updatedManualTraits[index] = updatedTrait;

    const updatedRubric = { ...questionRubric, manual_traits: updatedManualTraits };
    setQuestionRubricState(updatedRubric);
    setQuestionRubric(questionId, updatedRubric);
    setLastError(null);
  };

  const handleRemoveManualTrait = (index: number) => {
    if (!questionRubric?.manual_traits || index < 0 || index >= questionRubric.manual_traits.length) return;

    const updatedManualTraits = questionRubric.manual_traits.filter((_, i) => i !== index);
    const updatedRubric = { ...questionRubric, manual_traits: updatedManualTraits };

    setQuestionRubricState(updatedRubric);
    setQuestionRubric(questionId, updatedRubric);
    setLastError(null);
  };

  const handleClearRubric = () => {
    clearQuestionRubric(questionId);
    setQuestionRubricState({ traits: [], manual_traits: [] });
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
        {questionRubric.traits.length > 0 && (
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
        (globalRubric.traits.length > 0 || (globalRubric.manual_traits && globalRubric.manual_traits.length > 0)) && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Global Rubric Traits (will be included in evaluation)
            </h4>
            <div className="flex flex-wrap gap-2">
              {globalRubric.traits.map((trait, index) => (
                <span
                  key={`llm-${index}`}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-md text-xs font-medium"
                >
                  {trait.name} ({trait.kind})
                </span>
              ))}
              {(globalRubric.manual_traits || []).map((trait, index) => (
                <span
                  key={`manual-${index}`}
                  className="px-2 py-1 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-100 rounded-md text-xs font-medium"
                >
                  {trait.name} (manual)
                </span>
              ))}
            </div>
          </div>
        )}

      {/* Question-Specific Traits */}
      <div className="space-y-3 mb-4">
        {questionRubric.traits.map((trait, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-600 p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="grid grid-cols-12 gap-4 items-start">
              {/* Trait Name */}
              <div className="col-span-3">
                <label
                  htmlFor={`q-trait-name-${index}`}
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Trait Name
                </label>
                <input
                  id={`q-trait-name-${index}`}
                  type="text"
                  value={trait.name}
                  onChange={(e) => handleTraitChange(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md 
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors
                             hover:border-slate-400 dark:hover:border-slate-500"
                  placeholder="e.g., Question Clarity"
                />
              </div>

              {/* Trait Type Selector */}
              <div className="col-span-2">
                <label
                  htmlFor={`q-trait-type-${index}`}
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Trait Type
                </label>
                <div className="relative">
                  <select
                    id={`q-trait-type-${index}`}
                    value={trait.kind}
                    onChange={(e) => handleTraitTypeChange(index, e.target.value as TraitType, false)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                               bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                               focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none pr-8
                               hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                  >
                    <option value="boolean">Binary</option>
                    <option value="score">Score</option>
                    <option value="manual">Manual (Regex)</option>
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
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Score Range
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={trait.min_score || 1}
                        onChange={(e) => handleTraitChange(index, 'min_score', parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md 
                                   bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                                   focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                                   hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                        min="1"
                        max="10"
                      />
                      <span className="text-sm text-slate-500 font-medium">to</span>
                      <input
                        type="number"
                        value={trait.max_score || 5}
                        onChange={(e) => handleTraitChange(index, 'max_score', parseInt(e.target.value) || 5)}
                        className="w-16 px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md 
                                   bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                                   focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                                   hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                        min="1"
                        max="10"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="col-span-6">
                <label
                  htmlFor={`q-trait-description-${index}`}
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Trait Description
                </label>
                <input
                  id={`q-trait-description-${index}`}
                  type="text"
                  value={trait.description || ''}
                  onChange={(e) => handleTraitChange(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md 
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors
                             hover:border-slate-400 dark:hover:border-slate-500"
                  placeholder="What should be evaluated for this specific question?"
                />
              </div>

              {/* Delete Button */}
              <div className="col-span-1 flex justify-end mt-6">
                <button
                  onClick={() => handleRemoveTrait(index)}
                  className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300
                             hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Delete trait"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Manual (Regex) Traits */}
        {(questionRubric.manual_traits || []).map((trait, index) => (
          <div
            key={`manual-${index}`}
            className="bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800 p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="grid grid-cols-12 gap-4 items-start">
              {/* Trait Name */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Trait Name</label>
                <input
                  type="text"
                  value={trait.name}
                  onChange={(e) => handleManualTraitChange(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="e.g., Contains Error"
                />
              </div>

              {/* Trait Type Selector */}
              <div className="col-span-2">
                <label
                  htmlFor={`q-manual-trait-type-${index}`}
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Trait Type
                </label>
                <div className="relative">
                  <select
                    id={`q-manual-trait-type-${index}`}
                    value="manual"
                    onChange={(e) => handleTraitTypeChange(index, e.target.value as TraitType, true)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                               bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                               focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none pr-8
                               hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                  >
                    <option value="boolean">Binary</option>
                    <option value="score">Score</option>
                    <option value="manual">Manual (Regex)</option>
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
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Trait Description
                </label>
                <input
                  type="text"
                  value={trait.description || ''}
                  onChange={(e) => handleManualTraitChange(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="What does this regex check for?"
                />
              </div>

              {/* Delete Button */}
              <div className="col-span-1 flex justify-end mt-6">
                <button
                  onClick={() => handleRemoveManualTrait(index)}
                  className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300
                             hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Delete manual trait"
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
                          <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                            \berror\b
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">Matches the word "error"</div>
                        </div>
                        <div>
                          <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                            ^Answer:
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">Text must start with "Answer:"</div>
                        </div>
                        <div>
                          <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                            correct\.$
                          </div>
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
                onChange={(e) => handleManualTraitChange(index, 'pattern', e.target.value)}
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
                  onChange={(e) => handleManualTraitChange(index, 'case_sensitive', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Case Sensitive</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trait.invert_result ?? false}
                    onChange={(e) => handleManualTraitChange(index, 'invert_result', e.target.checked)}
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
                {(globalRubric?.traits.length || 0) + (globalRubric?.manual_traits?.length || 0)}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Question Traits:</span>
              <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">
                {questionRubric.traits.length + (questionRubric.manual_traits?.length || 0)}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Total Traits:</span>
              <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">
                {(globalRubric?.traits.length || 0) +
                  (globalRubric?.manual_traits?.length || 0) +
                  questionRubric.traits.length +
                  (questionRubric.manual_traits?.length || 0)}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Question Types:</span>
              <div className="ml-2 flex space-x-3">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {questionRubric.traits.filter((t) => t.kind === 'boolean').length}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">binary</span>
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {questionRubric.traits.filter((t) => t.kind === 'score').length}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">score</span>
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {questionRubric.manual_traits?.length || 0}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">manual</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
