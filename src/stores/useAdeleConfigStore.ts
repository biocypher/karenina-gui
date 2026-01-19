/**
 * useAdeleConfigStore - Session-only store for ADeLe classification configuration.
 *
 * This store manages the current session's ADeLe classification settings.
 * It does NOT persist to localStorage - values reset on page refresh.
 * For persistent defaults, see useConfigStore's Adele default fields.
 *
 * Configuration includes:
 * - Model configuration (interface, provider, model, temperature, endpoint)
 * - Selected traits for classification
 * - Classification mode (batch vs sequential)
 */

import { create } from 'zustand';
import { useConfigStore } from './useConfigStore';

/**
 * LLM interface types supported by the ADeLe classifier.
 */
export type AdeleInterface = 'langchain' | 'openrouter' | 'openai_endpoint';

/**
 * Trait evaluation mode - how traits are evaluated for a single question.
 * - 'batch': All traits evaluated in one LLM call (faster, cheaper)
 * - 'sequential': Each trait evaluated separately (potentially more accurate)
 */
export type TraitEvalMode = 'batch' | 'sequential';

/**
 * Model configuration for ADeLe classification.
 */
export interface AdeleModelConfig {
  interface: AdeleInterface;
  provider: string;
  modelName: string;
  temperature: number;
  endpointBaseUrl?: string;
  endpointApiKey?: string;
}

/**
 * ADeLe configuration state interface.
 */
interface AdeleConfigState {
  // ===== MODEL CONFIGURATION =====
  /** Current model configuration for classification */
  modelConfig: AdeleModelConfig;

  // ===== TRAIT SELECTION =====
  /** Selected traits for classification. Empty array means all traits. */
  selectedTraits: string[];

  // ===== TRAIT EVALUATION MODE =====
  /** How traits are evaluated: batch (one call) or sequential (one call per trait) */
  traitEvalMode: TraitEvalMode;

  // ===== INITIALIZATION STATE =====
  /** Whether the store has been initialized from defaults */
  isInitialized: boolean;

  // ===== ACTIONS =====
  /** Update model configuration (partial updates supported) */
  setModelConfig: (config: Partial<AdeleModelConfig>) => void;

  /** Set selected traits for classification */
  setSelectedTraits: (traits: string[]) => void;

  /** Set classification mode */
  setTraitEvalMode: (mode: TraitEvalMode) => void;

  /** Initialize from global defaults (call on component mount) */
  initializeFromDefaults: () => void;

  /** Reset to defaults */
  resetToDefaults: () => void;
}

/**
 * Default model configuration.
 */
const DEFAULT_MODEL_CONFIG: AdeleModelConfig = {
  interface: 'langchain',
  provider: 'anthropic',
  modelName: 'claude-3-5-haiku-latest',
  temperature: 0.0,
  endpointBaseUrl: undefined,
  endpointApiKey: undefined,
};

export const useAdeleConfigStore = create<AdeleConfigState>((set, get) => ({
  // Initial state
  modelConfig: { ...DEFAULT_MODEL_CONFIG },
  selectedTraits: [], // Empty = all traits
  traitEvalMode: 'batch',
  isInitialized: false,

  // Update model configuration
  setModelConfig: (config) => {
    set((state) => ({
      modelConfig: { ...state.modelConfig, ...config },
    }));
  },

  // Set selected traits
  setSelectedTraits: (traits) => {
    set({ selectedTraits: traits });
  },

  // Set classification mode
  setTraitEvalMode: (mode) => {
    set({ traitEvalMode: mode });
  },

  // Initialize from global defaults
  initializeFromDefaults: () => {
    const state = get();
    if (state.isInitialized) return;

    // Get defaults from the config store
    const configStore = useConfigStore.getState();

    // Map config store values to Adele model config
    // Note: Adele defaults in config store may not exist yet, so use sensible defaults
    const adeleDefaults = configStore.adeleDefaults;

    if (adeleDefaults) {
      set({
        modelConfig: {
          interface: adeleDefaults.interface || DEFAULT_MODEL_CONFIG.interface,
          provider: adeleDefaults.provider || DEFAULT_MODEL_CONFIG.provider,
          modelName: adeleDefaults.modelName || DEFAULT_MODEL_CONFIG.modelName,
          temperature: adeleDefaults.temperature ?? DEFAULT_MODEL_CONFIG.temperature,
          endpointBaseUrl: adeleDefaults.endpointBaseUrl,
          endpointApiKey: adeleDefaults.endpointApiKey,
        },
        selectedTraits: adeleDefaults.selectedTraits || [],
        traitEvalMode: adeleDefaults.traitEvalMode || 'batch',
        isInitialized: true,
      });
    } else {
      // No Adele defaults in config store yet, use built-in defaults
      set({
        modelConfig: { ...DEFAULT_MODEL_CONFIG },
        selectedTraits: [],
        traitEvalMode: 'batch',
        isInitialized: true,
      });
    }
  },

  // Reset to defaults
  resetToDefaults: () => {
    const configStore = useConfigStore.getState();
    const adeleDefaults = configStore.adeleDefaults;

    if (adeleDefaults) {
      set({
        modelConfig: {
          interface: adeleDefaults.interface || DEFAULT_MODEL_CONFIG.interface,
          provider: adeleDefaults.provider || DEFAULT_MODEL_CONFIG.provider,
          modelName: adeleDefaults.modelName || DEFAULT_MODEL_CONFIG.modelName,
          temperature: adeleDefaults.temperature ?? DEFAULT_MODEL_CONFIG.temperature,
          endpointBaseUrl: adeleDefaults.endpointBaseUrl,
          endpointApiKey: adeleDefaults.endpointApiKey,
        },
        selectedTraits: adeleDefaults.selectedTraits || [],
        traitEvalMode: adeleDefaults.traitEvalMode || 'batch',
      });
    } else {
      set({
        modelConfig: { ...DEFAULT_MODEL_CONFIG },
        selectedTraits: [],
        traitEvalMode: 'batch',
      });
    }
  },
}));
