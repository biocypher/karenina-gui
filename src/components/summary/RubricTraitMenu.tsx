import React, { useState, useCallback } from 'react';
import { Eye } from 'lucide-react';
import type {
  Rubric,
  TraitLetterMap,
  BadgeVisibilityFilter,
  RegexTrait,
  LLMRubricTrait,
  CallableTrait,
} from '../../types';
import { Modal } from '../ui/Modal';
import { logger } from '../../utils/logger';

interface RubricTraitMenuProps {
  rubric: Rubric | null;
  letterAssignments: TraitLetterMap;
  visibilityFilter: BadgeVisibilityFilter;
  onAssignLetter: (
    traitName: string,
    traitType: 'llm' | 'regex' | 'callable',
    kind: 'boolean' | 'score',
    letters: string | null
  ) => void;
  onVisibilityChange: (filter: BadgeVisibilityFilter) => void;
}

interface TraitItem {
  name: string;
  type: 'llm' | 'regex' | 'callable';
  description?: string;
  kind: 'boolean' | 'score';
  // Original trait data for details popover
  originalTrait: LLMRubricTrait | RegexTrait | CallableTrait;
}

/**
 * Get color classes for trait type badges
 */
const getTypeColor = (type: 'llm' | 'regex' | 'callable') => {
  switch (type) {
    case 'llm':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
    case 'regex':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200';
    case 'callable':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200';
  }
};

/**
 * Render trait details content for the popover
 */
const TraitDetailsContent = ({ trait }: { trait: TraitItem }) => {
  if (trait.type === 'llm') {
    const llmTrait = trait.originalTrait as LLMRubricTrait;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getTypeColor('llm')}`}>LLM</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {llmTrait.kind === 'score' ? `Score (${llmTrait.min_score ?? 1}-${llmTrait.max_score ?? 5})` : 'Boolean'}
          </span>
        </div>
        {llmTrait.description ? (
          <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{llmTrait.description}</div>
        ) : (
          <div className="text-sm text-slate-400 dark:text-slate-500 italic">No description provided</div>
        )}
        {llmTrait.deep_judgment_enabled && (
          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">✓ Deep Judgment enabled</div>
        )}
      </div>
    );
  }

  if (trait.type === 'regex') {
    const regexTrait = trait.originalTrait as RegexTrait;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getTypeColor('regex')}`}>Regex</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Boolean</span>
        </div>
        {regexTrait.description && (
          <div className="text-sm text-slate-700 dark:text-slate-300 mb-2">{regexTrait.description}</div>
        )}
        <div className="bg-slate-100 dark:bg-slate-800 rounded p-2 font-mono text-xs overflow-x-auto">
          <span className="text-purple-600 dark:text-purple-400">{regexTrait.pattern}</span>
        </div>
        <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Case sensitive: {regexTrait.case_sensitive !== false ? 'Yes' : 'No'}</span>
          {regexTrait.invert_result && <span className="text-amber-600 dark:text-amber-400">Result inverted</span>}
        </div>
      </div>
    );
  }

  if (trait.type === 'callable') {
    const callableTrait = trait.originalTrait as CallableTrait;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getTypeColor('callable')}`}>Callable</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {callableTrait.kind === 'score'
              ? `Score (${callableTrait.min_score ?? 1}-${callableTrait.max_score ?? 5})`
              : 'Boolean'}
          </span>
        </div>
        {callableTrait.description ? (
          <div className="text-sm text-slate-700 dark:text-slate-300">{callableTrait.description}</div>
        ) : (
          <div className="text-sm text-slate-400 dark:text-slate-500 italic">No description provided</div>
        )}
        <div className="text-xs text-slate-500 dark:text-slate-400">Custom Python function (code not shown)</div>
        {callableTrait.invert_result && (
          <div className="text-xs text-amber-600 dark:text-amber-400">Result inverted</div>
        )}
      </div>
    );
  }

  return null;
};

/**
 * Menu component for selecting rubric traits and assigning letters for badge overlays.
 *
 * Features:
 * - Displays all non-metric traits (LLM, regex, callable)
 * - Scrollable if more than 5 traits
 * - Click to assign 1-2 letters
 * - Visibility toggle buttons (All/Passed/Failed/Hidden)
 */
export function RubricTraitMenu({
  rubric,
  letterAssignments,
  visibilityFilter,
  onAssignLetter,
  onVisibilityChange,
}: RubricTraitMenuProps) {
  const [editingTrait, setEditingTrait] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [inspectedTrait, setInspectedTrait] = useState<TraitItem | null>(null);

  // Collect all non-metric traits
  const traits: TraitItem[] = [];

  if (rubric) {
    // LLM traits
    rubric.llm_traits?.forEach((trait) => {
      traits.push({
        name: trait.name,
        type: 'llm',
        description: trait.description,
        kind: trait.kind,
        originalTrait: trait,
      });
    });

    // Regex traits (always boolean)
    rubric.regex_traits?.forEach((trait) => {
      traits.push({
        name: trait.name,
        type: 'regex',
        description: trait.description,
        kind: 'boolean',
        originalTrait: trait,
      });
    });

    // Callable traits
    rubric.callable_traits?.forEach((trait) => {
      traits.push({
        name: trait.name,
        type: 'callable',
        description: trait.description,
        kind: trait.kind,
        originalTrait: trait,
      });
    });
  }

  // Debug logging after trait collection
  logger.debugLog('RUBRIC', 'RubricTraitMenu', 'RubricTraitMenu', {
    hasRubric: !!rubric,
    rubricKeys: rubric ? Object.keys(rubric) : null,
    llm_traits_count: rubric?.llm_traits?.length,
    regex_traits_count: rubric?.regex_traits?.length,
    callable_traits_count: rubric?.callable_traits?.length,
    metric_traits_count: rubric?.metric_traits?.length,
    traitsCollected: traits.length,
    traitNames: traits.map((t) => t.name),
  });

  const handleTraitClick = useCallback(
    (trait: TraitItem) => {
      if (letterAssignments[trait.name]) {
        // Clear assignment
        onAssignLetter(trait.name, trait.type, trait.kind, null);
      } else {
        // Open input
        setEditingTrait(trait.name);
        setInputValue('');
      }
    },
    [letterAssignments, onAssignLetter]
  );

  const handleInputSubmit = useCallback(
    (trait: TraitItem) => {
      const letters = inputValue.toUpperCase().slice(0, 2); // Max 2 letters
      if (letters.length >= 1 && /^[A-Z]{1,2}$/.test(letters)) {
        onAssignLetter(trait.name, trait.type, trait.kind, letters);
      }
      setEditingTrait(null);
      setInputValue('');
    },
    [inputValue, onAssignLetter]
  );

  const handleInputBlur = useCallback(() => {
    setEditingTrait(null);
    setInputValue('');
  }, []);

  // Don't render if no rubric
  if (!rubric) {
    return null;
  }

  // Show message if rubric exists but only has metric traits
  if (traits.length === 0) {
    const hasMetricTraits = rubric.metric_traits && rubric.metric_traits.length > 0;
    if (hasMetricTraits) {
      return (
        <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rubric Trait Badges</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This rubric only contains metric traits. Badge overlays are available for LLM, regex, and callable traits.
          </p>
        </div>
      );
    }
    return null;
  }

  const visibilityOptions: { value: BadgeVisibilityFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'passed', label: 'Passed' },
    { value: 'failed', label: 'Failed' },
    { value: 'hidden', label: 'Hidden' },
  ];

  const hasAssignments = Object.keys(letterAssignments).length > 0;

  return (
    <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
      {/* Header with title and visibility controls */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Rubric Trait Badges</h4>

        {/* Visibility toggle buttons */}
        {hasAssignments && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Show:</span>
            {visibilityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onVisibilityChange(option.value)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  visibilityFilter === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
        Click a trait to assign 1-2 letters, click again to remove
      </p>

      {/* Trait list */}
      <div className={`flex flex-wrap gap-2 ${traits.length > 5 ? 'max-h-24 overflow-y-auto pr-1' : ''}`}>
        {traits.map((trait) => {
          const assignment = letterAssignments[trait.name];
          const isEditing = editingTrait === trait.name;

          return (
            <div key={trait.name}>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    maxLength={2}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleInputSubmit(trait);
                      if (e.key === 'Escape') handleInputBlur();
                    }}
                    onBlur={handleInputBlur}
                    autoFocus
                    placeholder="AB"
                    className="w-10 h-6 text-center text-xs font-bold border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400 max-w-[100px] truncate">
                    {trait.name}
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => handleTraitClick(trait)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                    assignment
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 ring-1 ring-green-300 dark:ring-green-700'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                  title={trait.description || trait.name}
                >
                  {assignment && (
                    <span className="min-w-[16px] h-4 flex items-center justify-center bg-green-500 text-white text-[10px] font-bold rounded px-1">
                      {assignment.letters}
                    </span>
                  )}
                  <span className="max-w-[120px] truncate">{trait.name}</span>
                  <span className={`px-1 py-0.5 rounded text-[10px] ${getTypeColor(trait.type)}`}>{trait.type}</span>
                  <Eye
                    size={12}
                    className={`ml-0.5 cursor-pointer transition-colors ${
                      assignment
                        ? 'text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-100'
                        : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectedTrait(trait);
                    }}
                  />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Trait details modal */}
      <Modal
        isOpen={inspectedTrait !== null}
        onClose={() => setInspectedTrait(null)}
        title={inspectedTrait?.name || 'Trait Details'}
        size="lg"
      >
        {inspectedTrait && <TraitDetailsContent trait={inspectedTrait} />}
      </Modal>
    </div>
  );
}

export default RubricTraitMenu;
