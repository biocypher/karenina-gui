import { create } from 'zustand';
import { Rubric, RubricTrait, RegexTrait, MetricRubricTrait } from '../types';
import { logger } from '../utils/logger';

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

    // Check for duplicate names across all trait types
    const llmNames = rubric.llm_traits.map((t) => t.name.toLowerCase());
    const regexNames = (rubric.regex_traits || []).map((t) => t.name.toLowerCase());
    const metricNames = (rubric.metric_traits || []).map((t) => t.name.toLowerCase());
    const existingNames = [...llmNames, ...regexNames, ...metricNames];

    if (existingNames.includes(trait.name.toLowerCase())) {
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

    // Check for duplicate names (excluding current trait, checking all trait types)
    const llmNames = currentRubric.llm_traits
      .map((t, i) => (i !== index ? t.name.toLowerCase() : null))
      .filter(Boolean);
    const regexNames = (currentRubric.regex_traits || []).map((t) => t.name.toLowerCase());
    const metricNames = (currentRubric.metric_traits || []).map((t) => t.name.toLowerCase());
    const existingNames = [...llmNames, ...regexNames, ...metricNames];

    if (existingNames.includes(trait.name.toLowerCase())) {
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

  // Regex trait actions
  addRegexTrait: (trait) => {
    const { currentRubric } = get();
    const rubric = currentRubric || defaultRubric;

    // Check for duplicate names across all trait types
    const llmNames = rubric.llm_traits.map((t) => t.name.toLowerCase());
    const regexNames = (rubric.regex_traits || []).map((t) => t.name.toLowerCase());
    const metricNames = (rubric.metric_traits || []).map((t) => t.name.toLowerCase());
    const existingNames = [...llmNames, ...regexNames, ...metricNames];

    if (existingNames.includes(trait.name.toLowerCase())) {
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

    // Check for duplicate names (excluding current regex trait, checking all trait types)
    const llmNames = currentRubric.llm_traits.map((t) => t.name.toLowerCase());
    const regexNames = currentRubric.regex_traits
      .map((t, i) => (i !== index ? t.name.toLowerCase() : null))
      .filter(Boolean);
    const metricNames = (currentRubric.metric_traits || []).map((t) => t.name.toLowerCase());
    const existingNames = [...llmNames, ...regexNames, ...metricNames];

    if (existingNames.includes(trait.name.toLowerCase())) {
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

    // Check for duplicate names across all trait types
    const llmNames = rubric.llm_traits.map((t) => t.name.toLowerCase());
    const regexNames = (rubric.regex_traits || []).map((t) => t.name.toLowerCase());
    const metricNames = (rubric.metric_traits || []).map((t) => t.name.toLowerCase());
    const existingNames = [...llmNames, ...regexNames, ...metricNames];

    if (existingNames.includes(trait.name.toLowerCase())) {
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

    // Check for duplicate names (excluding current metric trait, checking all trait types)
    const llmNames = currentRubric.llm_traits.map((t) => t.name.toLowerCase());
    const regexNames = (currentRubric.regex_traits || []).map((t) => t.name.toLowerCase());
    const metricNames = currentRubric.metric_traits
      .map((t, i) => (i !== index ? t.name.toLowerCase() : null))
      .filter(Boolean);
    const existingNames = [...llmNames, ...regexNames, ...metricNames];

    if (existingNames.includes(trait.name.toLowerCase())) {
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
      const response = await fetch('/api/rubric');

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
      const response = await fetch('/api/rubric', {
        method: 'POST',
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
      const response = await fetch('/api/rubric', {
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
