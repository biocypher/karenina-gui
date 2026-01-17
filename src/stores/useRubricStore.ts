import { create } from 'zustand';
import { Rubric, RubricTrait, RegexTrait, MetricRubricTrait, TraitKind } from '../types';
import { logger } from '../utils/logger';
import { API_ENDPOINTS } from '../constants/api';

interface RubricState {
  // Current rubric being edited
  currentRubric: Rubric | null;

  // UI state
  isLoadingRubric: boolean;
  isSavingRubric: boolean;

  // Error handling
  lastError: string | null;

  // Actions
  setCurrentRubric: (rubric: Rubric | null) => void;
  addTrait: (trait: RubricTrait) => void;
  updateTrait: (index: number, trait: RubricTrait) => void;
  removeTrait: (index: number) => void;
  reorderTraits: (startIndex: number, endIndex: number) => void;

  // Literal kind class management actions
  updateLLMTraitClasses: (index: number, classes: Record<string, string>) => void;
  addClassToLLMTrait: (traitIndex: number, className?: string, classDescription?: string) => void;
  removeClassFromLLMTrait: (traitIndex: number, className: string) => void;
  changeLLMTraitKind: (index: number, newKind: TraitKind) => void;

  // Regex trait actions
  addRegexTrait: (trait: RegexTrait) => void;
  updateRegexTrait: (index: number, trait: RegexTrait) => void;
  removeRegexTrait: (index: number) => void;

  // Metric trait actions
  addMetricTrait: (trait: MetricRubricTrait) => void;
  updateMetricTrait: (index: number, trait: MetricRubricTrait) => void;
  removeMetricTrait: (index: number) => void;

  // API actions
  loadRubric: () => Promise<void>;
  saveRubric: () => Promise<void>;
  deleteRubric: () => Promise<void>;

  // Utility actions
  clearError: () => void;
  reset: () => void;
}

const defaultRubric: Rubric = {
  llm_traits: [],
  regex_traits: [],
  metric_traits: [],
};

/**
 * Validates that a trait name is unique across all trait types.
 * @param rubric - The rubric to check against
 * @param name - The new trait name to validate
 * @param excludeIndex - Optional index to exclude (for updates)
 * @param excludeType - Optional trait type to exclude from ('llm' | 'regex' | 'metric')
 * @returns true if the name is unique, false if it already exists
 */
function validateUniqueTraitName(
  rubric: Rubric,
  name: string,
  excludeIndex?: number,
  excludeType?: 'llm' | 'regex' | 'metric'
): boolean {
  const llmNames = rubric.llm_traits
    .map((t, i) => (excludeType === 'llm' && i === excludeIndex ? null : t.name.toLowerCase()))
    .filter(Boolean);
  const regexNames = (rubric.regex_traits || [])
    .map((t, i) => (excludeType === 'regex' && i === excludeIndex ? null : t.name.toLowerCase()))
    .filter(Boolean);
  const metricNames = (rubric.metric_traits || [])
    .map((t, i) => (excludeType === 'metric' && i === excludeIndex ? null : t.name.toLowerCase()))
    .filter(Boolean);
  const existingNames = [...llmNames, ...regexNames, ...metricNames];

  return !existingNames.includes(name.toLowerCase());
}

export const useRubricStore = create<RubricState>((set, get) => ({
  // Initial state
  currentRubric: null,
  isLoadingRubric: false,
  isSavingRubric: false,
  lastError: null,

  // Basic rubric manipulation
  setCurrentRubric: (rubric) => {
    set({ currentRubric: rubric, lastError: null });
  },

  addTrait: (trait) => {
    const { currentRubric } = get();
    const rubric = currentRubric || defaultRubric;

    if (!validateUniqueTraitName(rubric, trait.name)) {
      set({ lastError: `Trait with name "${trait.name}" already exists` });
      return;
    }

    set({
      currentRubric: {
        ...rubric,
        llm_traits: [...rubric.llm_traits, trait],
      },
      lastError: null,
    });
  },

  updateTrait: (index, trait) => {
    const { currentRubric } = get();
    if (!currentRubric || index < 0 || index >= currentRubric.llm_traits.length) {
      set({ lastError: 'Invalid trait index' });
      return;
    }

    if (!validateUniqueTraitName(currentRubric, trait.name, index, 'llm')) {
      set({ lastError: `Trait with name "${trait.name}" already exists` });
      return;
    }

    const updatedTraits = [...currentRubric.llm_traits];
    updatedTraits[index] = trait;

    set({
      currentRubric: { ...currentRubric, llm_traits: updatedTraits },
      lastError: null,
    });
  },

  removeTrait: (index) => {
    const { currentRubric } = get();
    if (!currentRubric || index < 0 || index >= currentRubric.llm_traits.length) {
      set({ lastError: 'Invalid trait index' });
      return;
    }

    const updatedTraits = currentRubric.llm_traits.filter((_, i) => i !== index);
    set({
      currentRubric: { ...currentRubric, llm_traits: updatedTraits },
      lastError: null,
    });
  },

  reorderTraits: (startIndex, endIndex) => {
    const { currentRubric } = get();
    if (!currentRubric) return;

    const traits = [...currentRubric.llm_traits];
    const [reorderedItem] = traits.splice(startIndex, 1);
    traits.splice(endIndex, 0, reorderedItem);

    set({
      currentRubric: { ...currentRubric, llm_traits: traits },
      lastError: null,
    });
  },

  // Literal kind class management actions
  updateLLMTraitClasses: (index, classes) => {
    const { currentRubric } = get();
    if (!currentRubric || index < 0 || index >= currentRubric.llm_traits.length) {
      set({ lastError: 'Invalid trait index' });
      return;
    }

    const trait = currentRubric.llm_traits[index];
    if (trait.kind !== 'literal') {
      set({ lastError: 'Can only update classes for literal kind traits' });
      return;
    }

    // Validate classes: 2-20 classes, non-empty names and descriptions
    const classCount = Object.keys(classes).length;
    if (classCount < 2) {
      set({ lastError: 'Literal trait must have at least 2 classes' });
      return;
    }
    if (classCount > 20) {
      set({ lastError: 'Literal trait cannot have more than 20 classes' });
      return;
    }

    // Check for empty names or descriptions, and case-insensitive duplicates
    const seenNames = new Set<string>();
    for (const [className, classDesc] of Object.entries(classes)) {
      if (!className.trim()) {
        set({ lastError: 'Class names cannot be empty' });
        return;
      }
      if (!classDesc.trim()) {
        set({ lastError: `Description for class "${className}" cannot be empty` });
        return;
      }
      const lowerName = className.toLowerCase();
      if (seenNames.has(lowerName)) {
        set({ lastError: `Duplicate class name (case-insensitive): "${className}"` });
        return;
      }
      seenNames.add(lowerName);
    }

    const updatedTraits = [...currentRubric.llm_traits];
    updatedTraits[index] = {
      ...trait,
      classes,
      // Auto-derive min_score and max_score from classes count
      min_score: 0,
      max_score: classCount - 1,
    };

    set({
      currentRubric: { ...currentRubric, llm_traits: updatedTraits },
      lastError: null,
    });
  },

  addClassToLLMTrait: (traitIndex, className = '', classDescription = '') => {
    const { currentRubric } = get();
    if (!currentRubric || traitIndex < 0 || traitIndex >= currentRubric.llm_traits.length) {
      set({ lastError: 'Invalid trait index' });
      return;
    }

    const trait = currentRubric.llm_traits[traitIndex];
    if (trait.kind !== 'literal') {
      set({ lastError: 'Can only add classes to literal kind traits' });
      return;
    }

    const currentClasses = trait.classes || {};
    const classCount = Object.keys(currentClasses).length;

    if (classCount >= 20) {
      set({ lastError: 'Cannot add more than 20 classes' });
      return;
    }

    // Generate a unique default class name if not provided
    let newClassName = className;
    if (!newClassName) {
      let counter = classCount + 1;
      newClassName = `Class ${counter}`;
      while (currentClasses[newClassName] !== undefined) {
        counter++;
        newClassName = `Class ${counter}`;
      }
    }

    // Check for case-insensitive duplicates
    const lowerNewName = newClassName.toLowerCase();
    for (const existingName of Object.keys(currentClasses)) {
      if (existingName.toLowerCase() === lowerNewName) {
        set({ lastError: `Class name "${newClassName}" already exists (case-insensitive)` });
        return;
      }
    }

    const updatedClasses = {
      ...currentClasses,
      [newClassName]: classDescription || 'Description for this class',
    };

    const updatedTraits = [...currentRubric.llm_traits];
    updatedTraits[traitIndex] = {
      ...trait,
      classes: updatedClasses,
      min_score: 0,
      max_score: Object.keys(updatedClasses).length - 1,
    };

    set({
      currentRubric: { ...currentRubric, llm_traits: updatedTraits },
      lastError: null,
    });
  },

  removeClassFromLLMTrait: (traitIndex, className) => {
    const { currentRubric } = get();
    if (!currentRubric || traitIndex < 0 || traitIndex >= currentRubric.llm_traits.length) {
      set({ lastError: 'Invalid trait index' });
      return;
    }

    const trait = currentRubric.llm_traits[traitIndex];
    if (trait.kind !== 'literal') {
      set({ lastError: 'Can only remove classes from literal kind traits' });
      return;
    }

    const currentClasses = trait.classes || {};
    const classCount = Object.keys(currentClasses).length;

    if (classCount <= 2) {
      set({ lastError: 'Cannot remove class: literal trait must have at least 2 classes' });
      return;
    }

    if (!(className in currentClasses)) {
      set({ lastError: `Class "${className}" not found` });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [className]: _, ...remainingClasses } = currentClasses;

    const updatedTraits = [...currentRubric.llm_traits];
    updatedTraits[traitIndex] = {
      ...trait,
      classes: remainingClasses,
      min_score: 0,
      max_score: Object.keys(remainingClasses).length - 1,
    };

    set({
      currentRubric: { ...currentRubric, llm_traits: updatedTraits },
      lastError: null,
    });
  },

  changeLLMTraitKind: (index, newKind) => {
    const { currentRubric } = get();
    if (!currentRubric || index < 0 || index >= currentRubric.llm_traits.length) {
      set({ lastError: 'Invalid trait index' });
      return;
    }

    const trait = currentRubric.llm_traits[index];
    const oldKind = trait.kind;

    if (oldKind === newKind) {
      return; // No change needed
    }

    const updatedTraits = [...currentRubric.llm_traits];
    let updatedTrait = { ...trait, kind: newKind };

    // Handle transitions between kinds
    if (newKind === 'literal') {
      // Transitioning TO literal: initialize default classes
      const defaultClasses: Record<string, string> = {
        'Class A': 'Description for class A',
        'Class B': 'Description for class B',
      };
      updatedTrait = {
        ...updatedTrait,
        classes: defaultClasses,
        min_score: 0,
        max_score: 1,
      };
    } else if (oldKind === 'literal') {
      // Transitioning FROM literal: clear classes and reset score range
      updatedTrait = {
        ...updatedTrait,
        classes: undefined,
        min_score: newKind === 'score' ? 1 : undefined,
        max_score: newKind === 'score' ? 5 : undefined,
      };
    } else if (newKind === 'score' && oldKind === 'boolean') {
      // Boolean -> Score: set default score range
      updatedTrait = {
        ...updatedTrait,
        min_score: 1,
        max_score: 5,
      };
    } else if (newKind === 'boolean' && oldKind === 'score') {
      // Score -> Boolean: clear score range
      updatedTrait = {
        ...updatedTrait,
        min_score: undefined,
        max_score: undefined,
      };
    }

    updatedTraits[index] = updatedTrait;

    set({
      currentRubric: { ...currentRubric, llm_traits: updatedTraits },
      lastError: null,
    });
  },

  // Regex trait actions
  addRegexTrait: (trait) => {
    const { currentRubric } = get();
    const rubric = currentRubric || defaultRubric;

    if (!validateUniqueTraitName(rubric, trait.name)) {
      set({ lastError: `Trait with name "${trait.name}" already exists` });
      return;
    }

    set({
      currentRubric: {
        ...rubric,
        regex_traits: [...(rubric.regex_traits || []), trait],
      },
      lastError: null,
    });
  },

  updateRegexTrait: (index, trait) => {
    const { currentRubric } = get();
    if (!currentRubric || !currentRubric.regex_traits || index < 0 || index >= currentRubric.regex_traits.length) {
      set({ lastError: 'Invalid regex trait index' });
      return;
    }

    if (!validateUniqueTraitName(currentRubric, trait.name, index, 'regex')) {
      set({ lastError: `Trait with name "${trait.name}" already exists` });
      return;
    }

    const updatedRegexTraits = [...currentRubric.regex_traits];
    updatedRegexTraits[index] = trait;

    set({
      currentRubric: { ...currentRubric, regex_traits: updatedRegexTraits },
      lastError: null,
    });
  },

  removeRegexTrait: (index) => {
    const { currentRubric } = get();
    if (!currentRubric || !currentRubric.regex_traits || index < 0 || index >= currentRubric.regex_traits.length) {
      set({ lastError: 'Invalid regex trait index' });
      return;
    }

    const updatedRegexTraits = currentRubric.regex_traits.filter((_, i) => i !== index);
    set({
      currentRubric: { ...currentRubric, regex_traits: updatedRegexTraits },
      lastError: null,
    });
  },

  // Metric trait actions
  addMetricTrait: (trait) => {
    const { currentRubric } = get();
    const rubric = currentRubric || defaultRubric;

    if (!validateUniqueTraitName(rubric, trait.name)) {
      set({ lastError: `Trait with name "${trait.name}" already exists` });
      return;
    }

    set({
      currentRubric: {
        ...rubric,
        metric_traits: [...(rubric.metric_traits || []), trait],
      },
      lastError: null,
    });
  },

  updateMetricTrait: (index, trait) => {
    const { currentRubric } = get();
    if (!currentRubric || !currentRubric.metric_traits || index < 0 || index >= currentRubric.metric_traits.length) {
      set({ lastError: 'Invalid metric trait index' });
      return;
    }

    if (!validateUniqueTraitName(currentRubric, trait.name, index, 'metric')) {
      set({ lastError: `Trait with name "${trait.name}" already exists` });
      return;
    }

    const updatedMetricTraits = [...currentRubric.metric_traits];
    updatedMetricTraits[index] = trait;

    set({
      currentRubric: { ...currentRubric, metric_traits: updatedMetricTraits },
      lastError: null,
    });
  },

  removeMetricTrait: (index) => {
    const { currentRubric } = get();
    if (!currentRubric || !currentRubric.metric_traits || index < 0 || index >= currentRubric.metric_traits.length) {
      set({ lastError: 'Invalid metric trait index' });
      return;
    }

    const updatedMetricTraits = currentRubric.metric_traits.filter((_, i) => i !== index);
    set({
      currentRubric: { ...currentRubric, metric_traits: updatedMetricTraits },
      lastError: null,
    });
  },

  // API actions
  loadRubric: async () => {
    set({ isLoadingRubric: true, lastError: null });

    try {
      const response = await fetch(API_ENDPOINTS.RUBRIC_CURRENT);

      if (!response.ok) {
        if (response.status === 404) {
          // No rubric exists yet
          set({
            currentRubric: null,
            isLoadingRubric: false,
            lastError: null,
          });
          return;
        }

        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const rubric: Rubric = await response.json();
      set({
        currentRubric: rubric,
        isLoadingRubric: false,
        lastError: null,
      });
    } catch (error) {
      logger.error('RUBRIC', 'Error loading rubric', 'useRubricStore', { error });
      set({
        isLoadingRubric: false,
        lastError: error instanceof Error ? error.message : 'Failed to load rubric',
      });
    }
  },

  saveRubric: async () => {
    const { currentRubric } = get();
    if (!currentRubric) {
      set({ lastError: 'No rubric to save' });
      return;
    }

    // Validate that we have at least one trait (LLM, regex, or metric)
    const hasTraits = currentRubric.llm_traits.length > 0;
    const hasRegexTraits = currentRubric.regex_traits && currentRubric.regex_traits.length > 0;
    const hasMetricTraits = currentRubric.metric_traits && currentRubric.metric_traits.length > 0;

    if (!hasTraits && !hasRegexTraits && !hasMetricTraits) {
      set({ lastError: 'Rubric must have at least one trait (LLM, regex, or metric)' });
      return;
    }

    set({ isSavingRubric: true, lastError: null });

    try {
      const response = await fetch(API_ENDPOINTS.RUBRIC_CURRENT, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentRubric),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      set({
        isSavingRubric: false,
        lastError: null,
      });
    } catch (error) {
      logger.error('RUBRIC', 'Error saving rubric', 'useRubricStore', { error });
      set({
        isSavingRubric: false,
        lastError: error instanceof Error ? error.message : 'Failed to save rubric',
      });
    }
  },

  deleteRubric: async () => {
    set({ isSavingRubric: true, lastError: null });

    try {
      const response = await fetch(API_ENDPOINTS.RUBRIC_CURRENT, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      set({
        currentRubric: null,
        isSavingRubric: false,
        lastError: null,
      });
    } catch (error) {
      logger.error('RUBRIC', 'Error deleting rubric', 'useRubricStore', { error });
      set({
        isSavingRubric: false,
        lastError: error instanceof Error ? error.message : 'Failed to delete rubric',
      });
    }
  },

  // Utility actions
  clearError: () => {
    set({ lastError: null });
  },

  reset: () => {
    set({
      currentRubric: null,
      isLoadingRubric: false,
      isSavingRubric: false,
      lastError: null,
    });
  },
}));
