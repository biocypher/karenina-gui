import { create } from 'zustand';
import {
  Rubric,
  RubricTrait,
  ManualRubricTrait,
  RubricTraitGenerationRequest,
  RubricTraitGenerationResponse,
  RubricTraitGenerationConfig,
} from '../types';

interface RubricState {
  // Current rubric being edited
  currentRubric: Rubric | null;

  // Generated trait suggestions from LLM
  generatedSuggestions: RubricTrait[];

  // Model configuration
  config: RubricTraitGenerationConfig;

  // UI state
  isGeneratingTraits: boolean;
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

  // Manual trait actions
  addManualTrait: (trait: ManualRubricTrait) => void;
  updateManualTrait: (index: number, trait: ManualRubricTrait) => void;
  removeManualTrait: (index: number) => void;

  // Configuration actions
  setConfig: (config: RubricTraitGenerationConfig) => void;

  // API actions
  generateTraits: (request: RubricTraitGenerationRequest) => Promise<void>;
  loadRubric: () => Promise<void>;
  saveRubric: () => Promise<void>;
  deleteRubric: () => Promise<void>;

  // Utility actions
  clearError: () => void;
  reset: () => void;
  applyGeneratedTraits: (traits: RubricTrait[]) => void;
}

const defaultRubric: Rubric = {
  traits: [],
  manual_traits: [],
};

export const useRubricStore = create<RubricState>((set, get) => ({
  // Initial state
  currentRubric: null,
  generatedSuggestions: [],
  config: {
    model_provider: 'google_genai',
    model_name: 'gemini-2.0-flash',
    temperature: 0.1,
    interface: 'langchain',
  },
  isGeneratingTraits: false,
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

    // Check for duplicate names across both LLM and manual traits
    const llmNames = rubric.traits.map((t) => t.name.toLowerCase());
    const manualNames = (rubric.manual_traits || []).map((t) => t.name.toLowerCase());
    const existingNames = [...llmNames, ...manualNames];

    if (existingNames.includes(trait.name.toLowerCase())) {
      set({ lastError: `Trait with name "${trait.name}" already exists` });
      return;
    }

    set({
      currentRubric: {
        ...rubric,
        traits: [...rubric.traits, trait],
      },
      lastError: null,
    });
  },

  updateTrait: (index, trait) => {
    const { currentRubric } = get();
    if (!currentRubric || index < 0 || index >= currentRubric.traits.length) {
      set({ lastError: 'Invalid trait index' });
      return;
    }

    // Check for duplicate names (excluding current trait, checking both LLM and manual traits)
    const llmNames = currentRubric.traits.map((t, i) => (i !== index ? t.name.toLowerCase() : null)).filter(Boolean);
    const manualNames = (currentRubric.manual_traits || []).map((t) => t.name.toLowerCase());
    const existingNames = [...llmNames, ...manualNames];

    if (existingNames.includes(trait.name.toLowerCase())) {
      set({ lastError: `Trait with name "${trait.name}" already exists` });
      return;
    }

    const updatedTraits = [...currentRubric.traits];
    updatedTraits[index] = trait;

    set({
      currentRubric: { ...currentRubric, traits: updatedTraits },
      lastError: null,
    });
  },

  removeTrait: (index) => {
    const { currentRubric } = get();
    if (!currentRubric || index < 0 || index >= currentRubric.traits.length) {
      set({ lastError: 'Invalid trait index' });
      return;
    }

    const updatedTraits = currentRubric.traits.filter((_, i) => i !== index);
    set({
      currentRubric: { ...currentRubric, traits: updatedTraits },
      lastError: null,
    });
  },

  reorderTraits: (startIndex, endIndex) => {
    const { currentRubric } = get();
    if (!currentRubric) return;

    const traits = [...currentRubric.traits];
    const [reorderedItem] = traits.splice(startIndex, 1);
    traits.splice(endIndex, 0, reorderedItem);

    set({
      currentRubric: { ...currentRubric, traits },
      lastError: null,
    });
  },

  // Manual trait actions
  addManualTrait: (trait) => {
    const { currentRubric } = get();
    const rubric = currentRubric || defaultRubric;

    // Check for duplicate names across both LLM and manual traits
    const llmNames = rubric.traits.map((t) => t.name.toLowerCase());
    const manualNames = (rubric.manual_traits || []).map((t) => t.name.toLowerCase());
    const existingNames = [...llmNames, ...manualNames];

    if (existingNames.includes(trait.name.toLowerCase())) {
      set({ lastError: `Trait with name "${trait.name}" already exists` });
      return;
    }

    set({
      currentRubric: {
        ...rubric,
        manual_traits: [...(rubric.manual_traits || []), trait],
      },
      lastError: null,
    });
  },

  updateManualTrait: (index, trait) => {
    const { currentRubric } = get();
    if (!currentRubric || !currentRubric.manual_traits || index < 0 || index >= currentRubric.manual_traits.length) {
      set({ lastError: 'Invalid manual trait index' });
      return;
    }

    // Check for duplicate names (excluding current manual trait, checking both LLM and manual traits)
    const llmNames = currentRubric.traits.map((t) => t.name.toLowerCase());
    const manualNames = currentRubric.manual_traits
      .map((t, i) => (i !== index ? t.name.toLowerCase() : null))
      .filter(Boolean);
    const existingNames = [...llmNames, ...manualNames];

    if (existingNames.includes(trait.name.toLowerCase())) {
      set({ lastError: `Trait with name "${trait.name}" already exists` });
      return;
    }

    const updatedManualTraits = [...currentRubric.manual_traits];
    updatedManualTraits[index] = trait;

    set({
      currentRubric: { ...currentRubric, manual_traits: updatedManualTraits },
      lastError: null,
    });
  },

  removeManualTrait: (index) => {
    const { currentRubric } = get();
    if (!currentRubric || !currentRubric.manual_traits || index < 0 || index >= currentRubric.manual_traits.length) {
      set({ lastError: 'Invalid manual trait index' });
      return;
    }

    const updatedManualTraits = currentRubric.manual_traits.filter((_, i) => i !== index);
    set({
      currentRubric: { ...currentRubric, manual_traits: updatedManualTraits },
      lastError: null,
    });
  },

  // Configuration actions
  setConfig: (config: RubricTraitGenerationConfig) => {
    set({ config });
  },

  // API actions
  generateTraits: async (request) => {
    set({ isGeneratingTraits: true, lastError: null });

    try {
      const response = await fetch('/api/generate-rubric-traits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const data: RubricTraitGenerationResponse = await response.json();
      set({
        generatedSuggestions: data.traits,
        isGeneratingTraits: false,
        lastError: null,
      });
    } catch (error) {
      console.error('Error generating traits:', error);
      set({
        isGeneratingTraits: false,
        lastError: error instanceof Error ? error.message : 'Failed to generate traits',
      });
    }
  },

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
      console.error('Error loading rubric:', error);
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

    // Validate that we have at least one trait (LLM or manual)
    if (!currentRubric.traits.length && !(currentRubric.manual_traits && currentRubric.manual_traits.length)) {
      set({ lastError: 'Rubric must have at least one trait' });
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
      console.error('Error saving rubric:', error);
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
      console.error('Error deleting rubric:', error);
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
      generatedSuggestions: [],
      config: {
        model_provider: 'google_genai',
        model_name: 'gemini-2.0-flash',
        temperature: 0.1,
        interface: 'langchain',
      },
      isGeneratingTraits: false,
      isLoadingRubric: false,
      isSavingRubric: false,
      lastError: null,
    });
  },

  applyGeneratedTraits: (traits) => {
    const { currentRubric } = get();
    const rubric = currentRubric || defaultRubric;

    set({
      currentRubric: {
        ...rubric,
        traits: [...rubric.traits, ...traits],
      },
      generatedSuggestions: [],
      lastError: null,
    });
  },
}));
