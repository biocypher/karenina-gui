import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_ENDPOINTS } from '../constants/api';
import { apiKeyStorage } from '../utils/secureStorage';

/**
 * Represents an environment variable key-value pair
 */
interface EnvVariable {
  key: string;
  value: string;
}

/**
 * ADeLe classification default settings (persisted to localStorage)
 */
export interface AdeleDefaults {
  interface: 'langchain' | 'openrouter' | 'openai_endpoint' | 'claude_tool' | 'claude_agent_sdk';
  provider: string;
  modelName: string;
  temperature: number;
  endpointBaseUrl?: string;
  endpointApiKey?: string;
  selectedTraits: string[]; // Empty = all traits
  /** How traits are evaluated: 'batch' (one call) or 'sequential' (one call per trait) */
  traitEvalMode: 'batch' | 'sequential';
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
  defaultInterface: 'langchain' | 'openrouter' | 'openai_endpoint' | 'claude_tool' | 'claude_agent_sdk';
  /** Draft provider name being edited in modal (e.g., 'openai', 'google_genai') */
  defaultProvider: string;
  /** Draft model name being edited in modal (e.g., 'gpt-4', 'gemini-2.0-flash') */
  defaultModel: string;
  /** Draft endpoint base URL for openai_endpoint interface */
  defaultEndpointBaseUrl: string;
  /** Draft endpoint API key for openai_endpoint interface */
  defaultEndpointApiKey: string;
  /** Draft Anthropic base URL for claude_tool/claude_agent_sdk interfaces */
  defaultAnthropicBaseUrl: string;
  /** Draft Anthropic API key for claude_tool/claude_agent_sdk interfaces (stored in sessionStorage only) */
  defaultAnthropicApiKey: string;
  /** Draft Anthropic Opus model tier alias */
  defaultAnthropicOpusModel: string;
  /** Draft Anthropic Sonnet model tier alias */
  defaultAnthropicSonnetModel: string;
  /** Draft Anthropic Haiku model tier alias */
  defaultAnthropicHaikuModel: string;
  /** Draft async enabled setting being edited in modal */
  defaultAsyncEnabled: boolean;
  /** Draft async max workers being edited in modal */
  defaultAsyncMaxWorkers: number | null;

  // ===== SAVED/PERSISTED CONFIGURATION =====
  // These values are used by generation components and only updated when saved

  /** Currently saved and active LLM interface used by generation components */
  savedInterface: 'langchain' | 'openrouter' | 'openai_endpoint' | 'claude_tool' | 'claude_agent_sdk';
  /** Currently saved and active provider used by generation components */
  savedProvider: string;
  /** Currently saved and active model used by generation components */
  savedModel: string;
  /** Currently saved and active endpoint base URL */
  savedEndpointBaseUrl: string;
  /** Currently saved and active endpoint API key */
  savedEndpointApiKey: string;
  /** Currently saved and active Anthropic base URL */
  savedAnthropicBaseUrl: string;
  /** Currently saved and active Anthropic API key */
  savedAnthropicApiKey: string;
  /** Currently saved and active Anthropic Opus model tier alias */
  savedAnthropicOpusModel: string;
  /** Currently saved and active Anthropic Sonnet model tier alias */
  savedAnthropicSonnetModel: string;
  /** Currently saved and active Anthropic Haiku model tier alias */
  savedAnthropicHaikuModel: string;
  /** Currently saved and active async enabled setting used by generation components */
  savedAsyncEnabled: boolean;
  /** Currently saved and active async max workers used by generation components */
  savedAsyncMaxWorkers: number | null;

  // ===== BASELINE CONFIGURATION =====
  // Original values loaded from server, used for reset functionality

  /** Original defaults from server for reset functionality */
  originalDefaults: {
    defaultInterface: 'langchain' | 'openrouter' | 'openai_endpoint' | 'claude_tool' | 'claude_agent_sdk';
    defaultProvider: string;
    defaultModel: string;
    defaultEndpointBaseUrl: string;
    defaultAnthropicBaseUrl: string;
    defaultAnthropicOpusModel: string;
    defaultAnthropicSonnetModel: string;
    defaultAnthropicHaikuModel: string;
    defaultAsyncEnabled: boolean;
    defaultAsyncMaxWorkers: number | null;
  };

  // ===== ENVIRONMENT VARIABLES =====

  /** Environment variables with sensitive values masked (e.g., API keys shown as "***") */
  envVariables: Record<string, string>;
  /** Environment variables with actual unmasked values for editing */
  unmaskedEnvVariables: Record<string, string>;

  // ===== ADELE DEFAULTS =====

  /** ADeLe classification default settings (persisted to localStorage) */
  adeleDefaults: AdeleDefaults | null;

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
  updateDefaultInterface: (
    interface: 'langchain' | 'openrouter' | 'openai_endpoint' | 'claude_tool' | 'claude_agent_sdk'
  ) => void;
  /** Update draft provider selection */
  updateDefaultProvider: (provider: string) => void;
  /** Update draft model selection */
  updateDefaultModel: (model: string) => void;
  /** Update draft endpoint base URL */
  updateDefaultEndpointBaseUrl: (url: string) => void;
  /** Update draft endpoint API key */
  updateDefaultEndpointApiKey: (key: string) => void;
  /** Update draft Anthropic base URL */
  updateDefaultAnthropicBaseUrl: (url: string) => void;
  /** Update draft Anthropic API key */
  updateDefaultAnthropicApiKey: (key: string) => void;
  /** Update draft Anthropic Opus model tier alias */
  updateDefaultAnthropicOpusModel: (model: string) => void;
  /** Update draft Anthropic Sonnet model tier alias */
  updateDefaultAnthropicSonnetModel: (model: string) => void;
  /** Update draft Anthropic Haiku model tier alias */
  updateDefaultAnthropicHaikuModel: (model: string) => void;
  /** Update draft async enabled setting */
  updateDefaultAsyncEnabled: (enabled: boolean) => void;
  /** Update draft async max workers */
  updateDefaultAsyncMaxWorkers: (maxWorkers: number | null) => void;

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

  // ADeLe defaults management
  /** Update ADeLe classification defaults (persists to localStorage) */
  updateAdeleDefaults: (defaults: Partial<AdeleDefaults>) => void;
  /** Reset ADeLe defaults to built-in values */
  resetAdeleDefaults: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      // Initial state - working values (being edited in modal)
      defaultInterface: 'langchain',
      defaultProvider: 'anthropic',
      defaultModel: 'claude-haiku-4-5',
      defaultEndpointBaseUrl: '',
      defaultEndpointApiKey: '',
      defaultAnthropicBaseUrl: '',
      defaultAnthropicApiKey: '',
      defaultAnthropicOpusModel: '',
      defaultAnthropicSonnetModel: '',
      defaultAnthropicHaikuModel: '',
      defaultAsyncEnabled: true,
      defaultAsyncMaxWorkers: null,

      // Saved values (used by generation components)
      savedInterface: 'langchain',
      savedProvider: 'anthropic',
      savedModel: 'claude-haiku-4-5',
      savedEndpointBaseUrl: '',
      savedEndpointApiKey: '',
      savedAnthropicBaseUrl: '',
      savedAnthropicApiKey: '',
      savedAnthropicOpusModel: '',
      savedAnthropicSonnetModel: '',
      savedAnthropicHaikuModel: '',
      savedAsyncEnabled: true,
      savedAsyncMaxWorkers: null,

      originalDefaults: {
        defaultInterface: 'langchain',
        defaultProvider: 'anthropic',
        defaultModel: 'claude-haiku-4-5',
        defaultEndpointBaseUrl: '',
        defaultAnthropicBaseUrl: '',
        defaultAnthropicOpusModel: '',
        defaultAnthropicSonnetModel: '',
        defaultAnthropicHaikuModel: '',
        defaultAsyncEnabled: true,
        defaultAsyncMaxWorkers: null,
      },
      envVariables: {},
      unmaskedEnvVariables: {},

      // ADeLe defaults (persisted to localStorage via middleware)
      adeleDefaults: {
        interface: 'langchain',
        provider: 'anthropic',
        modelName: 'claude-3-5-haiku-latest',
        temperature: 0.0,
        endpointBaseUrl: undefined,
        endpointApiKey: undefined,
        selectedTraits: [],
        traitEvalMode: 'batch',
      },

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
          state.defaultModel !== state.originalDefaults.defaultModel ||
          state.defaultEndpointBaseUrl !== state.originalDefaults.defaultEndpointBaseUrl ||
          state.defaultEndpointApiKey !== state.savedEndpointApiKey ||
          state.defaultAnthropicBaseUrl !== state.originalDefaults.defaultAnthropicBaseUrl ||
          state.defaultAnthropicApiKey !== state.savedAnthropicApiKey ||
          state.defaultAnthropicOpusModel !== state.originalDefaults.defaultAnthropicOpusModel ||
          state.defaultAnthropicSonnetModel !== state.originalDefaults.defaultAnthropicSonnetModel ||
          state.defaultAnthropicHaikuModel !== state.originalDefaults.defaultAnthropicHaikuModel ||
          state.defaultAsyncEnabled !== state.originalDefaults.defaultAsyncEnabled ||
          state.defaultAsyncMaxWorkers !== state.originalDefaults.defaultAsyncMaxWorkers
        );
      },

      // Load configuration from server
      loadConfiguration: async () => {
        set({ isLoading: true, error: null });
        try {
          // Load environment variables (masked)
          const envResponse = await fetch(API_ENDPOINTS.CONFIG_ENV_VARS);
          if (!envResponse.ok) {
            throw new Error('Failed to load environment variables');
          }
          const envVariables = await envResponse.json();

          // Load default configuration
          const defaultsResponse = await fetch(API_ENDPOINTS.CONFIG_DEFAULTS);
          if (!defaultsResponse.ok) {
            throw new Error('Failed to load default configuration');
          }
          const defaults = await defaultsResponse.json();

          // Load endpoint API key from session storage if available
          const storedApiKey = apiKeyStorage.getEndpointApiKey();
          // Load Anthropic API key from session storage if available
          const storedAnthropicApiKey = apiKeyStorage.getAnthropicApiKey();

          set({
            envVariables,
            // Set both working and saved values from backend
            defaultInterface: defaults.default_interface,
            defaultProvider: defaults.default_provider,
            defaultModel: defaults.default_model,
            defaultEndpointBaseUrl: defaults.default_endpoint_base_url || '',
            defaultEndpointApiKey: storedApiKey,
            defaultAnthropicBaseUrl: defaults.default_anthropic_base_url || '',
            defaultAnthropicApiKey: storedAnthropicApiKey,
            defaultAnthropicOpusModel: defaults.default_anthropic_opus_model || '',
            defaultAnthropicSonnetModel: defaults.default_anthropic_sonnet_model || '',
            defaultAnthropicHaikuModel: defaults.default_anthropic_haiku_model || '',
            defaultAsyncEnabled: defaults.default_async_enabled ?? true,
            defaultAsyncMaxWorkers: defaults.default_async_max_workers ?? null,
            savedInterface: defaults.default_interface,
            savedProvider: defaults.default_provider,
            savedModel: defaults.default_model,
            savedEndpointBaseUrl: defaults.default_endpoint_base_url || '',
            savedEndpointApiKey: storedApiKey,
            savedAnthropicBaseUrl: defaults.default_anthropic_base_url || '',
            savedAnthropicApiKey: storedAnthropicApiKey,
            savedAnthropicOpusModel: defaults.default_anthropic_opus_model || '',
            savedAnthropicSonnetModel: defaults.default_anthropic_sonnet_model || '',
            savedAnthropicHaikuModel: defaults.default_anthropic_haiku_model || '',
            savedAsyncEnabled: defaults.default_async_enabled ?? true,
            savedAsyncMaxWorkers: defaults.default_async_max_workers ?? null,
            originalDefaults: {
              defaultInterface: defaults.default_interface,
              defaultProvider: defaults.default_provider,
              defaultModel: defaults.default_model,
              defaultEndpointBaseUrl: defaults.default_endpoint_base_url || '',
              defaultAnthropicBaseUrl: defaults.default_anthropic_base_url || '',
              defaultAnthropicOpusModel: defaults.default_anthropic_opus_model || '',
              defaultAnthropicSonnetModel: defaults.default_anthropic_sonnet_model || '',
              defaultAnthropicHaikuModel: defaults.default_anthropic_haiku_model || '',
              defaultAsyncEnabled: defaults.default_async_enabled ?? true,
              defaultAsyncMaxWorkers: defaults.default_async_max_workers ?? null,
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
          const response = await fetch(API_ENDPOINTS.CONFIG_ENV_VARS_UNMASKED);
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

      // Update endpoint configuration
      updateDefaultEndpointBaseUrl: (url) => {
        set({ defaultEndpointBaseUrl: url });
      },

      updateDefaultEndpointApiKey: (key) => {
        set({ defaultEndpointApiKey: key });
      },

      // Update Anthropic settings
      updateDefaultAnthropicBaseUrl: (url) => {
        set({ defaultAnthropicBaseUrl: url });
      },

      updateDefaultAnthropicApiKey: (key) => {
        set({ defaultAnthropicApiKey: key });
      },

      updateDefaultAnthropicOpusModel: (model) => {
        set({ defaultAnthropicOpusModel: model });
      },

      updateDefaultAnthropicSonnetModel: (model) => {
        set({ defaultAnthropicSonnetModel: model });
      },

      updateDefaultAnthropicHaikuModel: (model) => {
        set({ defaultAnthropicHaikuModel: model });
      },

      // Update async settings
      updateDefaultAsyncEnabled: (enabled) => {
        set({ defaultAsyncEnabled: enabled });
      },

      updateDefaultAsyncMaxWorkers: (maxWorkers) => {
        set({ defaultAsyncMaxWorkers: maxWorkers });
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
            default_endpoint_base_url: state.defaultEndpointBaseUrl,
            default_anthropic_base_url: state.defaultAnthropicBaseUrl || null,
            default_anthropic_opus_model: state.defaultAnthropicOpusModel || null,
            default_anthropic_sonnet_model: state.defaultAnthropicSonnetModel || null,
            default_anthropic_haiku_model: state.defaultAnthropicHaikuModel || null,
            default_async_enabled: state.defaultAsyncEnabled,
            default_async_max_workers: state.defaultAsyncMaxWorkers,
          };

          const response = await fetch(API_ENDPOINTS.CONFIG_DEFAULTS, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(defaultsToSave),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to save defaults');
          }

          // Store API key in session storage for convenience (if provided)
          // Session storage is used instead of local storage for better security:
          // - Keys are cleared when the tab/window closes
          // - Keys do not persist across browser restarts
          if (state.defaultEndpointApiKey) {
            apiKeyStorage.setEndpointApiKey(state.defaultEndpointApiKey);
          } else {
            apiKeyStorage.removeEndpointApiKey();
          }

          // Store Anthropic API key in session storage (if provided)
          if (state.defaultAnthropicApiKey) {
            apiKeyStorage.setAnthropicApiKey(state.defaultAnthropicApiKey);
          } else {
            apiKeyStorage.removeAnthropicApiKey();
          }

          // Update saved values and original defaults to match current working values
          set({
            savedInterface: state.defaultInterface,
            savedProvider: state.defaultProvider,
            savedModel: state.defaultModel,
            savedEndpointBaseUrl: state.defaultEndpointBaseUrl,
            savedEndpointApiKey: state.defaultEndpointApiKey,
            savedAnthropicBaseUrl: state.defaultAnthropicBaseUrl,
            savedAnthropicApiKey: state.defaultAnthropicApiKey,
            savedAnthropicOpusModel: state.defaultAnthropicOpusModel,
            savedAnthropicSonnetModel: state.defaultAnthropicSonnetModel,
            savedAnthropicHaikuModel: state.defaultAnthropicHaikuModel,
            savedAsyncEnabled: state.defaultAsyncEnabled,
            savedAsyncMaxWorkers: state.defaultAsyncMaxWorkers,
            originalDefaults: {
              defaultInterface: state.defaultInterface,
              defaultProvider: state.defaultProvider,
              defaultModel: state.defaultModel,
              defaultEndpointBaseUrl: state.defaultEndpointBaseUrl,
              defaultAnthropicBaseUrl: state.defaultAnthropicBaseUrl,
              defaultAnthropicOpusModel: state.defaultAnthropicOpusModel,
              defaultAnthropicSonnetModel: state.defaultAnthropicSonnetModel,
              defaultAnthropicHaikuModel: state.defaultAnthropicHaikuModel,
              defaultAsyncEnabled: state.defaultAsyncEnabled,
              defaultAsyncMaxWorkers: state.defaultAsyncMaxWorkers,
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
          defaultEndpointBaseUrl: state.originalDefaults.defaultEndpointBaseUrl,
          defaultEndpointApiKey: state.savedEndpointApiKey,
          defaultAnthropicBaseUrl: state.originalDefaults.defaultAnthropicBaseUrl,
          defaultAnthropicApiKey: state.savedAnthropicApiKey,
          defaultAnthropicOpusModel: state.originalDefaults.defaultAnthropicOpusModel,
          defaultAnthropicSonnetModel: state.originalDefaults.defaultAnthropicSonnetModel,
          defaultAnthropicHaikuModel: state.originalDefaults.defaultAnthropicHaikuModel,
          defaultAsyncEnabled: state.originalDefaults.defaultAsyncEnabled,
          defaultAsyncMaxWorkers: state.originalDefaults.defaultAsyncMaxWorkers,
        });
      },

      // Update a single environment variable
      updateEnvVariable: async (key, value) => {
        set({ isSaving: true, error: null });
        try {
          const response = await fetch(API_ENDPOINTS.CONFIG_ENV_VARS, {
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
          const response = await fetch(API_ENDPOINTS.CONFIG_ENV_VARS_BULK, {
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
          const response = await fetch(API_ENDPOINTS.CONFIG_ENV_FILE, {
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
          const response = await fetch(API_ENDPOINTS.CONFIG_ENV_VAR_DELETE(key), {
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

      // Update ADeLe defaults (partial updates supported)
      updateAdeleDefaults: (defaults) => {
        set((state) => ({
          adeleDefaults: state.adeleDefaults
            ? { ...state.adeleDefaults, ...defaults }
            : {
                interface: defaults.interface || 'langchain',
                provider: defaults.provider || 'anthropic',
                modelName: defaults.modelName || 'claude-3-5-haiku-latest',
                temperature: defaults.temperature ?? 0.0,
                endpointBaseUrl: defaults.endpointBaseUrl,
                endpointApiKey: defaults.endpointApiKey,
                selectedTraits: defaults.selectedTraits || [],
                traitEvalMode: defaults.traitEvalMode || 'batch',
              },
        }));
      },

      // Reset ADeLe defaults to built-in values
      resetAdeleDefaults: () => {
        set({
          adeleDefaults: {
            interface: 'langchain',
            provider: 'anthropic',
            modelName: 'claude-3-5-haiku-latest',
            temperature: 0.0,
            endpointBaseUrl: undefined,
            endpointApiKey: undefined,
            selectedTraits: [],
            traitEvalMode: 'batch',
          },
        });
      },
    }),
    {
      name: 'karenina-config-storage',
      // Only persist adeleDefaults to localStorage
      partialize: (state) => ({ adeleDefaults: state.adeleDefaults }),
    }
  )
);
