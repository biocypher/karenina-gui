import { create } from 'zustand';
import {
  fetchPresets,
  getPreset,
  createPreset,
  updatePreset,
  deletePreset,
  PresetListItem,
  Preset,
  PresetApiError,
  CreatePresetRequest,
  UpdatePresetRequest,
} from '../utils/presetApi';
import { logger } from '../utils/logger';

/**
 * Preset management store state interface
 */
interface PresetState {
  // State
  presets: PresetListItem[];
  currentPresetId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadPresets: () => Promise<void>;
  getPresetDetail: (id: string) => Promise<Preset | null>;
  createNewPreset: (request: CreatePresetRequest) => Promise<Preset | null>;
  updateExistingPreset: (id: string, request: UpdatePresetRequest) => Promise<Preset | null>;
  deleteExistingPreset: (id: string) => Promise<boolean>;
  setCurrentPresetId: (id: string | null) => void;
  clearError: () => void;
}

export const usePresetStore = create<PresetState>((set) => ({
  // Initial state
  presets: [],
  currentPresetId: null,
  isLoading: false,
  error: null,

  // Load all presets
  loadPresets: async () => {
    set({ isLoading: true, error: null });
    try {
      const presets = await fetchPresets();
      set({ presets, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof PresetApiError ? error.message : 'Failed to load presets';
      set({ error: errorMessage, isLoading: false });
      logger.error('PRESET', 'Error loading presets', 'usePresetStore', { error });
    }
  },

  // Get full preset details
  getPresetDetail: async (id: string): Promise<Preset | null> => {
    set({ error: null });
    try {
      const preset = await getPreset(id);
      return preset;
    } catch (error) {
      const errorMessage = error instanceof PresetApiError ? error.message : `Failed to load preset ${id}`;
      set({ error: errorMessage });
      logger.error('PRESET', 'Error getting preset', 'usePresetStore', { error });
      return null;
    }
  },

  // Create a new preset
  createNewPreset: async (request: CreatePresetRequest): Promise<Preset | null> => {
    set({ isLoading: true, error: null });
    try {
      const newPreset = await createPreset(request);

      // Add to list (will be properly sorted on next loadPresets)
      const summary = {
        answering_model_count: newPreset.config.answering_models?.length || 0,
        parsing_model_count: newPreset.config.parsing_models?.length || 0,
        total_model_count:
          (newPreset.config.answering_models?.length || 0) + (newPreset.config.parsing_models?.length || 0),
        replicate_count: newPreset.config.replicate_count || 1,
        enabled_features: [] as string[],
        interfaces: [] as string[],
      };

      // Determine enabled features
      if (newPreset.config.rubric_enabled) summary.enabled_features.push('rubric');
      if (newPreset.config.abstention_enabled) summary.enabled_features.push('abstention');
      if (newPreset.config.deep_judgment_enabled) summary.enabled_features.push('deep_judgment');
      if (newPreset.config.deep_judgment_search_enabled) summary.enabled_features.push('deep_judgment_search');
      if (newPreset.config.few_shot_config?.enabled) summary.enabled_features.push('few_shot');

      const listItem: PresetListItem = {
        id: newPreset.id,
        name: newPreset.name,
        description: newPreset.description,
        created_at: newPreset.created_at,
        updated_at: newPreset.updated_at,
        summary,
      };

      set((state) => ({
        presets: [...state.presets, listItem].sort((a, b) => a.name.localeCompare(b.name)),
        isLoading: false,
        currentPresetId: newPreset.id,
      }));

      return newPreset;
    } catch (error) {
      const errorMessage = error instanceof PresetApiError ? error.message : 'Failed to create preset';
      set({ error: errorMessage, isLoading: false });
      logger.error('PRESET', 'Error creating preset', 'usePresetStore', { error });
      return null;
    }
  },

  // Update an existing preset
  updateExistingPreset: async (id: string, request: UpdatePresetRequest): Promise<Preset | null> => {
    set({ isLoading: true, error: null });
    try {
      const updatedPreset = await updatePreset(id, request);

      // Update in list
      set((state) => ({
        presets: state.presets
          .map((p) =>
            p.id === id
              ? {
                  ...p,
                  name: updatedPreset.name,
                  description: updatedPreset.description,
                  updated_at: updatedPreset.updated_at,
                }
              : p
          )
          .sort((a, b) => a.name.localeCompare(b.name)),
        isLoading: false,
      }));

      return updatedPreset;
    } catch (error) {
      const errorMessage = error instanceof PresetApiError ? error.message : `Failed to update preset ${id}`;
      set({ error: errorMessage, isLoading: false });
      logger.error('PRESET', 'Error updating preset', 'usePresetStore', { error });
      return null;
    }
  },

  // Delete a preset
  deleteExistingPreset: async (id: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      await deletePreset(id);

      // Remove from list and clear current if it was selected
      set((state) => ({
        presets: state.presets.filter((p) => p.id !== id),
        currentPresetId: state.currentPresetId === id ? null : state.currentPresetId,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof PresetApiError ? error.message : `Failed to delete preset ${id}`;
      set({ error: errorMessage, isLoading: false });
      logger.error('PRESET', 'Error deleting preset', 'usePresetStore', { error });
      return false;
    }
  },

  // Set current preset selection
  setCurrentPresetId: (id: string | null) => {
    set({ currentPresetId: id });
  },

  // Clear error message
  clearError: () => {
    set({ error: null });
  },
}));
