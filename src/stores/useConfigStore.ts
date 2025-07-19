import { create } from 'zustand';

/**
 * Represents an environment variable key-value pair
 */
interface EnvVariable {
  key: string;
  value: string;
}

/**
 * Configuration store state interface
 *
 * This store manages application configuration using a "working vs saved" pattern:
 * - Working values (default*): Draft configuration being edited in the modal
 * - Saved values (saved*): Persisted configuration used by generation components
 * - Original values: Baseline for reset functionality
 *
 * This pattern prevents accidental application of unsaved changes while providing
 * a smooth editing experience with proper draft/commit workflow.
 */
interface ConfigState {
  // ===== WORKING/DRAFT CONFIGURATION =====
  // These values are modified during editing in the configuration modal
  // and only applied to saved values when explicitly saved

  /** Draft LLM interface selection being edited in modal */
  defaultInterface: 'langchain' | 'openrouter';
  /** Draft provider name being edited in modal (e.g., 'openai', 'google_genai') */
  defaultProvider: string;
  /** Draft model name being edited in modal (e.g., 'gpt-4', 'gemini-2.0-flash') */
  defaultModel: string;

  // ===== SAVED/PERSISTED CONFIGURATION =====
  // These values are used by generation components and only updated when saved

  /** Currently saved and active LLM interface used by generation components */
  savedInterface: 'langchain' | 'openrouter';
  /** Currently saved and active provider used by generation components */
  savedProvider: string;
  /** Currently saved and active model used by generation components */
  savedModel: string;

  // ===== BASELINE CONFIGURATION =====
  // Original values loaded from server, used for reset functionality

  /** Original defaults from server for reset functionality */
  originalDefaults: {
    defaultInterface: 'langchain' | 'openrouter';
    defaultProvider: string;
    defaultModel: string;
  };

  // ===== ENVIRONMENT VARIABLES =====

  /** Environment variables with sensitive values masked (e.g., API keys shown as "***") */
  envVariables: Record<string, string>;
  /** Environment variables with actual unmasked values for editing */
  unmaskedEnvVariables: Record<string, string>;

  // ===== LOADING STATES =====

  /** Loading state for initial configuration fetch */
  isLoading: boolean;
  /** Loading state for environment variable operations */
  isSaving: boolean;
  /** Loading state for saving default configuration */
  isSavingDefaults: boolean;
  /** Current error message, if any */
  error: string | null;

  // ===== COMPUTED PROPERTIES =====

  /** Returns true if working values differ from original defaults */
  hasUnsavedDefaults: () => boolean;

  // ===== ACTIONS =====

  /** Load configuration and environment variables from server */
  loadConfiguration: () => Promise<void>;
  /** Load unmasked environment variables for editing */
  loadUnmaskedEnvVariables: () => Promise<void>;

  // Working value updates (for modal editing)
  /** Update draft interface selection */
  updateDefaultInterface: (interface: 'langchain' | 'openrouter') => void;
  /** Update draft provider selection */
  updateDefaultProvider: (provider: string) => void;
  /** Update draft model selection */
  updateDefaultModel: (model: string) => void;

  // Persistence operations
  /** Save current working values as new defaults and update saved values */
  saveDefaults: () => Promise<void>;
  /** Reset working values to original defaults (discard unsaved changes) */
  resetDefaults: () => void;

  // Environment variable management
  /** Update a single environment variable */
  updateEnvVariable: (key: string, value: string) => Promise<void>;
  /** Update multiple environment variables in bulk */
  updateEnvVariables: (variables: EnvVariable[]) => Promise<void>;
  /** Update entire .env file contents */
  updateEnvFileContents: (content: string) => Promise<void>;
  /** Remove an environment variable */
  removeEnvVariable: (key: string) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  // Initial state - working values (being edited in modal)
  defaultInterface: 'langchain',
  defaultProvider: 'google_genai',
  defaultModel: 'gemini-2.5-flash',

  // Saved values (used by generation components)
  savedInterface: 'langchain',
  savedProvider: 'google_genai',
  savedModel: 'gemini-2.5-flash',

  originalDefaults: {
    defaultInterface: 'langchain',
    defaultProvider: 'google_genai',
    defaultModel: 'gemini-2.5-flash',
  },
  envVariables: {},
  unmaskedEnvVariables: {},
  isLoading: false,
  isSaving: false,
  isSavingDefaults: false,
  error: null,

  // Computed property to check if defaults have changed
  hasUnsavedDefaults: () => {
    const state = get();
    return (
      state.defaultInterface !== state.originalDefaults.defaultInterface ||
      state.defaultProvider !== state.originalDefaults.defaultProvider ||
      state.defaultModel !== state.originalDefaults.defaultModel
    );
  },

  // Load configuration from server
  loadConfiguration: async () => {
    set({ isLoading: true, error: null });
    try {
      // Load environment variables (masked)
      const envResponse = await fetch('/api/config/env-vars');
      if (!envResponse.ok) {
        throw new Error('Failed to load environment variables');
      }
      const envVariables = await envResponse.json();

      // Load default configuration
      const defaultsResponse = await fetch('/api/config/defaults');
      if (!defaultsResponse.ok) {
        throw new Error('Failed to load default configuration');
      }
      const defaults = await defaultsResponse.json();

      set({
        envVariables,
        // Set both working and saved values from backend
        defaultInterface: defaults.default_interface,
        defaultProvider: defaults.default_provider,
        defaultModel: defaults.default_model,
        savedInterface: defaults.default_interface,
        savedProvider: defaults.default_provider,
        savedModel: defaults.default_model,
        originalDefaults: {
          defaultInterface: defaults.default_interface,
          defaultProvider: defaults.default_provider,
          defaultModel: defaults.default_model,
        },
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load configuration',
        isLoading: false,
      });
    }
  },

  // Load unmasked environment variables
  loadUnmaskedEnvVariables: async () => {
    try {
      const response = await fetch('/api/config/env-vars/unmasked');
      if (!response.ok) {
        throw new Error('Failed to load unmasked environment variables');
      }
      const unmaskedEnvVariables = await response.json();
      set({ unmaskedEnvVariables });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load unmasked environment variables',
      });
    }
  },

  // Update default interface
  updateDefaultInterface: (newInterface) => {
    set({ defaultInterface: newInterface });
  },

  // Update default provider
  updateDefaultProvider: (provider) => {
    set({ defaultProvider: provider });
  },

  // Update default model
  updateDefaultModel: (model) => {
    set({ defaultModel: model });
  },

  // Save defaults to backend
  saveDefaults: async () => {
    set({ isSavingDefaults: true, error: null });
    try {
      const state = get();
      const defaultsToSave = {
        default_interface: state.defaultInterface,
        default_provider: state.defaultProvider,
        default_model: state.defaultModel,
      };

      const response = await fetch('/api/config/defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultsToSave),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save defaults');
      }

      // Update saved values and original defaults to match current working values
      set({
        savedInterface: state.defaultInterface,
        savedProvider: state.defaultProvider,
        savedModel: state.defaultModel,
        originalDefaults: {
          defaultInterface: state.defaultInterface,
          defaultProvider: state.defaultProvider,
          defaultModel: state.defaultModel,
        },
        isSavingDefaults: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save defaults',
        isSavingDefaults: false,
      });
      throw error;
    }
  },

  // Reset defaults to original values (undo unsaved changes)
  resetDefaults: () => {
    const state = get();
    set({
      defaultInterface: state.originalDefaults.defaultInterface,
      defaultProvider: state.originalDefaults.defaultProvider,
      defaultModel: state.originalDefaults.defaultModel,
    });
  },

  // Update a single environment variable
  updateEnvVariable: async (key, value) => {
    set({ isSaving: true, error: null });
    try {
      const response = await fetch('/api/config/env-vars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update environment variable');
      }

      // Reload configuration to get updated masked values
      await get().loadConfiguration();
      set({ isSaving: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update environment variable',
        isSaving: false,
      });
      throw error;
    }
  },

  // Update multiple environment variables
  updateEnvVariables: async (variables) => {
    set({ isSaving: true, error: null });
    try {
      const response = await fetch('/api/config/env-vars/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update environment variables');
      }

      // Reload configuration
      await get().loadConfiguration();
      set({ isSaving: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update environment variables',
        isSaving: false,
      });
      throw error;
    }
  },

  // Update entire .env file contents
  updateEnvFileContents: async (content) => {
    set({ isSaving: true, error: null });
    try {
      const response = await fetch('/api/config/env-file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update .env file');
      }

      // Reload configuration
      await get().loadConfiguration();
      set({ isSaving: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update .env file',
        isSaving: false,
      });
      throw error;
    }
  },

  // Remove an environment variable
  removeEnvVariable: async (key) => {
    set({ isSaving: true, error: null });
    try {
      const response = await fetch(`/api/config/env-vars/${key}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to remove environment variable');
      }

      // Reload configuration
      await get().loadConfiguration();
      set({ isSaving: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove environment variable',
        isSaving: false,
      });
      throw error;
    }
  },
}));
