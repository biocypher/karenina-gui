/**
 * Preset Management Integration Tests
 *
 * Tests preset management including:
 * - Load and display preset list
 * - Create, update, delete presets
 * - Apply preset to current benchmark
 *
 * integ-019: Test preset list and load
 * integ-020: Test preset CRUD operations
 * integ-021: Test apply preset to current benchmark
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePresetStore } from '../../../src/stores/usePresetStore';
import type { CreatePresetRequest, UpdatePresetRequest } from '../../../src/utils/presetApi';

// Mock CSRF
vi.mock('../../../utils/csrf', () => ({
  csrf: {
    fetchWithCsrf: vi.fn(),
    getCsrfToken: vi.fn(() => 'mock-csrf-token'),
  },
}));

describe('Preset Management Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Reset preset store to default state
    usePresetStore.setState({
      presets: [],
      currentPresetId: null,
      isLoading: false,
      error: null,
    });
  });

  describe('integ-019: Preset list and load', () => {
    it('should load presets from API', async () => {
      // Mock fetch for loading presets
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/presets')) {
          return {
            ok: true,
            json: async () => ({
              presets: [
                {
                  id: 'preset-1',
                  name: 'Default Preset',
                  description: 'Default verification settings',
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                  summary: {
                    answering_model_count: 1,
                    parsing_model_count: 1,
                    total_model_count: 2,
                    replicate_count: 1,
                    enabled_features: [],
                    interfaces: ['langchain'],
                  },
                },
                {
                  id: 'preset-2',
                  name: 'With Rubric',
                  description: 'Verification with rubric evaluation',
                  created_at: '2024-01-02T00:00:00Z',
                  updated_at: '2024-01-02T00:00:00Z',
                  summary: {
                    answering_model_count: 1,
                    parsing_model_count: 1,
                    total_model_count: 2,
                    replicate_count: 1,
                    enabled_features: ['rubric'],
                    interfaces: ['langchain'],
                  },
                },
              ],
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        } as Response;
      });

      const store = usePresetStore.getState();

      // Initially empty
      expect(store.presets).toEqual([]);

      // Load presets
      await store.loadPresets();

      // Verify presets loaded
      const stateAfterLoad = usePresetStore.getState();
      expect(stateAfterLoad.presets).toHaveLength(2);
      expect(stateAfterLoad.presets[0].name).toBe('Default Preset');
      expect(stateAfterLoad.presets[1].name).toBe('With Rubric');
      expect(stateAfterLoad.isLoading).toBe(false);
      expect(stateAfterLoad.error).toBeNull();
    });

    it('should get preset detail by ID', async () => {
      const mockPresetDetail = {
        id: 'preset-1',
        name: 'Default Preset',
        description: 'Default verification settings',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        config: {
          replicate_count: 1,
          rubric_enabled: false,
          abstention_enabled: false,
          deep_judgment_enabled: false,
          evaluation_mode: 'template_only',
        },
      };

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/presets/preset-1')) {
          return {
            ok: true,
            json: async () => ({ preset: mockPresetDetail }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = usePresetStore.getState();

      // Get preset detail
      const preset = await store.getPresetDetail('preset-1');

      expect(preset).not.toBeNull();
      expect(preset?.name).toBe('Default Preset');
      expect(preset?.config.replicate_count).toBe(1);
      expect(store.error).toBeNull();
    });

    it('should handle load error gracefully', async () => {
      vi.mocked(global.fetch).mockImplementation(async () => {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        } as Response;
      });

      const store = usePresetStore.getState();

      // Try to load presets
      await store.loadPresets();

      // Verify error state
      const stateAfterError = usePresetStore.getState();
      expect(stateAfterError.presets).toEqual([]);
      expect(stateAfterError.isLoading).toBe(false);
      expect(stateAfterError.error).toBeTruthy();
    });

    it('should set current preset selection', () => {
      const store = usePresetStore.getState();

      // Initially no preset selected
      expect(store.currentPresetId).toBeNull();

      // Set current preset
      store.setCurrentPresetId('preset-1');

      // Verify selection
      const stateAfterSet = usePresetStore.getState();
      expect(stateAfterSet.currentPresetId).toBe('preset-1');

      // Clear selection
      store.setCurrentPresetId(null);

      // Verify cleared
      const stateAfterClear = usePresetStore.getState();
      expect(stateAfterClear.currentPresetId).toBeNull();
    });

    it('should clear error message', () => {
      const store = usePresetStore.getState();

      // Set an error
      store.setCurrentPresetId('test');
      usePresetStore.setState({ error: 'Test error' });

      expect(usePresetStore.getState().error).toBe('Test error');

      // Clear error
      store.clearError();

      expect(usePresetStore.getState().error).toBeNull();
    });
  });

  describe('integ-020: Preset CRUD operations', () => {
    it('should create a new preset', async () => {
      const newPresetRequest: CreatePresetRequest = {
        name: 'New Test Preset',
        description: 'A new preset for testing',
        config: {
          answering_models: [
            {
              id: 'model-1',
              model_provider: 'anthropic',
              model_name: 'claude-haiku-4-5',
              system_prompt: 'You are a helpful assistant.',
            },
          ],
          parsing_models: [
            {
              id: 'model-2',
              model_provider: 'anthropic',
              model_name: 'claude-haiku-4-5',
              system_prompt: 'Extract the answer.',
            },
          ],
          replicate_count: 3,
          rubric_enabled: true,
          abstention_enabled: false,
        },
      };

      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/presets') && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => ({
              preset: {
                id: 'preset-new',
                name: newPresetRequest.name,
                description: newPresetRequest.description,
                created_at: '2024-01-03T00:00:00Z',
                updated_at: '2024-01-03T00:00:00Z',
                config: newPresetRequest.config,
              },
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = usePresetStore.getState();

      // Create preset
      const newPreset = await store.createNewPreset(newPresetRequest);

      // Verify created
      expect(newPreset).not.toBeNull();
      expect(newPreset?.name).toBe('New Test Preset');
      expect(newPreset?.id).toBe('preset-new');

      // Verify added to store
      const stateAfterCreate = usePresetStore.getState();
      expect(stateAfterCreate.presets).toHaveLength(1);
      expect(stateAfterCreate.presets[0].id).toBe('preset-new');
      expect(stateAfterCreate.currentPresetId).toBe('preset-new');
      expect(stateAfterCreate.isLoading).toBe(false);
    });

    it('should update an existing preset', async () => {
      const updateRequest: UpdatePresetRequest = {
        name: 'Updated Preset Name',
        description: 'Updated description',
        config: {
          answering_models: [
            {
              id: 'model-1',
              model_provider: 'anthropic',
              model_name: 'claude-haiku-4-5',
              system_prompt: 'Updated prompt',
            },
          ],
          parsing_models: [
            {
              id: 'model-2',
              model_provider: 'anthropic',
              model_name: 'claude-haiku-4-5',
              system_prompt: 'Extract answer.',
            },
          ],
          replicate_count: 5,
          rubric_enabled: true,
          abstention_enabled: true,
        },
      };

      // First, add a preset to the store
      usePresetStore.setState({
        presets: [
          {
            id: 'preset-1',
            name: 'Original Name',
            description: 'Original description',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            summary: {
              answering_model_count: 1,
              parsing_model_count: 1,
              total_model_count: 2,
              replicate_count: 1,
              enabled_features: [],
              interfaces: ['langchain'],
            },
          },
        ],
      });

      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/presets/preset-1') && init?.method === 'PUT') {
          return {
            ok: true,
            json: async () => ({
              preset: {
                id: 'preset-1',
                name: updateRequest.name,
                description: updateRequest.description,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-04T00:00:00Z',
                config: updateRequest.config,
              },
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = usePresetStore.getState();

      // Update preset
      const updatedPreset = await store.updateExistingPreset('preset-1', updateRequest);

      // Verify updated
      expect(updatedPreset).not.toBeNull();
      expect(updatedPreset?.name).toBe('Updated Preset Name');

      // Verify updated in store
      const stateAfterUpdate = usePresetStore.getState();
      expect(stateAfterUpdate.presets[0].name).toBe('Updated Preset Name');
      expect(stateAfterUpdate.presets[0].description).toBe('Updated description');
    });

    it('should delete a preset', async () => {
      // First, add two presets to the store
      usePresetStore.setState({
        presets: [
          {
            id: 'preset-1',
            name: 'Preset to Delete',
            description: 'Will be deleted',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            summary: {
              answering_model_count: 1,
              parsing_model_count: 1,
              total_model_count: 2,
              replicate_count: 1,
              enabled_features: [],
              interfaces: ['langchain'],
            },
          },
          {
            id: 'preset-2',
            name: 'Keep This Preset',
            description: 'Will remain',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            summary: {
              answering_model_count: 1,
              parsing_model_count: 1,
              total_model_count: 2,
              replicate_count: 1,
              enabled_features: [],
              interfaces: ['langchain'],
            },
          },
        ],
        currentPresetId: 'preset-1',
      });

      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/presets/preset-1') && init?.method === 'DELETE') {
          return {
            ok: true,
            json: async () => ({ success: true, message: 'Preset deleted' }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = usePresetStore.getState();

      // Delete preset
      const result = await store.deleteExistingPreset('preset-1');

      // Verify deleted
      expect(result).toBe(true);

      // Verify removed from store
      const stateAfterDelete = usePresetStore.getState();
      expect(stateAfterDelete.presets).toHaveLength(1);
      expect(stateAfterDelete.presets[0].id).toBe('preset-2');
      // Current preset should be cleared since it was deleted
      expect(stateAfterDelete.currentPresetId).toBeNull();
    });

    it('should handle create error gracefully', async () => {
      const newPresetRequest: CreatePresetRequest = {
        name: 'Invalid Preset',
        description: 'Has invalid config',
        config: {
          answering_models: [
            {
              id: 'model-1',
              model_provider: 'anthropic',
              model_name: 'claude-haiku-4-5',
              system_prompt: 'You are helpful.',
            },
          ],
          parsing_models: [
            {
              id: 'model-2',
              model_provider: 'anthropic',
              model_name: 'claude-haiku-4-5',
              system_prompt: 'Extract answer.',
            },
          ],
          replicate_count: -1,
          rubric_enabled: false,
          abstention_enabled: false,
        },
      };

      vi.mocked(global.fetch).mockImplementation(async () => {
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: 'Invalid replicate count' }),
        } as Response;
      });

      const store = usePresetStore.getState();

      // Try to create
      const result = await store.createNewPreset(newPresetRequest);

      // Verify failure handled
      expect(result).toBeNull();

      const stateAfterError = usePresetStore.getState();
      expect(stateAfterError.error).toBeTruthy();
      expect(stateAfterError.isLoading).toBe(false);
    });

    it('should handle update error gracefully', async () => {
      const updateRequest: UpdatePresetRequest = {
        name: 'Updated Name',
        description: 'Updated',
        config: {
          answering_models: [
            {
              id: 'model-1',
              model_provider: 'anthropic',
              model_name: 'claude-haiku-4-5',
              system_prompt: 'You are helpful.',
            },
          ],
          parsing_models: [
            {
              id: 'model-2',
              model_provider: 'anthropic',
              model_name: 'claude-haiku-4-5',
              system_prompt: 'Extract answer.',
            },
          ],
          replicate_count: 1,
          rubric_enabled: false,
          abstention_enabled: false,
        },
      };

      vi.mocked(global.fetch).mockImplementation(async () => {
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Preset not found' }),
        } as Response;
      });

      const store = usePresetStore.getState();

      // Try to update non-existent preset
      const result = await store.updateExistingPreset('nonexistent', updateRequest);

      // Verify failure handled
      expect(result).toBeNull();

      const stateAfterError = usePresetStore.getState();
      expect(stateAfterError.error).toBeTruthy();
    });

    it('should handle delete error gracefully', async () => {
      vi.mocked(global.fetch).mockImplementation(async () => {
        return {
          ok: false,
          status: 403,
          json: async () => ({ error: 'Forbidden' }),
        } as Response;
      });

      const store = usePresetStore.getState();

      // Try to delete
      const result = await store.deleteExistingPreset('preset-1');

      // Verify failure handled
      expect(result).toBe(false);

      const stateAfterError = usePresetStore.getState();
      expect(stateAfterError.error).toBeTruthy();
    });
  });

  describe('integ-021: Apply preset to current benchmark', () => {
    it('should set current preset for application', () => {
      const store = usePresetStore.getState();

      // Initially no current preset
      expect(store.currentPresetId).toBeNull();

      // Set a preset as current
      store.setCurrentPresetId('preset-to-apply');

      // Verify it's set
      const stateAfterSet = usePresetStore.getState();
      expect(stateAfterSet.currentPresetId).toBe('preset-to-apply');

      // This indicates the preset is ready to be applied to the benchmark
      // (The actual application would be handled by another component/service)
    });

    it('should change current preset', () => {
      const store = usePresetStore.getState();

      // Set first preset
      store.setCurrentPresetId('preset-1');
      expect(usePresetStore.getState().currentPresetId).toBe('preset-1');

      // Change to different preset
      store.setCurrentPresetId('preset-2');

      // Verify changed
      const stateAfterChange = usePresetStore.getState();
      expect(stateAfterChange.currentPresetId).toBe('preset-2');
    });

    it('should clear current preset selection', () => {
      const store = usePresetStore.getState();

      // Set a preset
      store.setCurrentPresetId('preset-active');
      expect(usePresetStore.getState().currentPresetId).toBe('preset-active');

      // Clear selection
      store.setCurrentPresetId(null);

      // Verify cleared
      const stateAfterClear = usePresetStore.getState();
      expect(stateAfterClear.currentPresetId).toBeNull();
    });

    it('should load preset details before applying', async () => {
      const mockPresetDetail = {
        id: 'preset-to-apply',
        name: 'Preset to Apply',
        description: 'Configuration for benchmark',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        config: {
          replicate_count: 3,
          rubric_enabled: true,
          abstention_enabled: false,
          deep_judgment_enabled: true,
          evaluation_mode: 'template_and_rubric',
        },
      };

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/presets/preset-to-apply')) {
          return {
            ok: true,
            json: async () => ({ preset: mockPresetDetail }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = usePresetStore.getState();

      // Load preset details
      const preset = await store.getPresetDetail('preset-to-apply');

      // Verify loaded
      expect(preset).not.toBeNull();
      expect(preset?.config.replicate_count).toBe(3);
      expect(preset?.config.rubric_enabled).toBe(true);
      expect(preset?.config.deep_judgment_enabled).toBe(true);

      // Set as current (indicates ready to apply)
      store.setCurrentPresetId('preset-to-apply');

      // Verify current preset
      const stateAfterSet = usePresetStore.getState();
      expect(stateAfterSet.currentPresetId).toBe('preset-to-apply');
    });
  });

  describe('Preset sorting and ordering', () => {
    it('should sort presets alphabetically by name after creation', async () => {
      // Add existing preset in reverse alphabetical order
      usePresetStore.setState({
        presets: [
          {
            id: 'preset-z',
            name: 'Zebra Preset',
            description: 'Last alphabetically',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            summary: {
              answering_model_count: 1,
              parsing_model_count: 1,
              total_model_count: 2,
              replicate_count: 1,
              enabled_features: [],
              interfaces: ['langchain'],
            },
          },
        ],
      });

      const newPresetRequest: CreatePresetRequest = {
        name: 'Apple Preset',
        description: 'First alphabetically',
        config: {
          answering_models: [
            {
              id: 'model-1',
              model_provider: 'anthropic',
              model_name: 'claude-haiku-4-5',
              system_prompt: 'You are helpful.',
            },
          ],
          parsing_models: [
            {
              id: 'model-2',
              model_provider: 'anthropic',
              model_name: 'claude-haiku-4-5',
              system_prompt: 'Extract answer.',
            },
          ],
          replicate_count: 1,
          rubric_enabled: false,
          abstention_enabled: false,
        },
      };

      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/presets') && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => ({
              preset: {
                id: 'preset-a',
                name: newPresetRequest.name,
                description: newPresetRequest.description,
                created_at: '2024-01-03T00:00:00Z',
                updated_at: '2024-01-03T00:00:00Z',
                config: newPresetRequest.config,
              },
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = usePresetStore.getState();

      // Create preset that comes first alphabetically
      await store.createNewPreset(newPresetRequest);

      // Verify sorting (Apple should come before Zebra)
      const stateAfterCreate = usePresetStore.getState();
      expect(stateAfterCreate.presets).toHaveLength(2);
      expect(stateAfterCreate.presets[0].name).toBe('Apple Preset');
      expect(stateAfterCreate.presets[1].name).toBe('Zebra Preset');
    });
  });

  describe('Loading state management', () => {
    it('should set loading state during operations', async () => {
      let resolveFetch: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      vi.mocked(global.fetch).mockImplementation(async () => {
        await fetchPromise;
        return {
          ok: true,
          json: async () => ({ presets: [] }),
        } as Response;
      });

      const store = usePresetStore.getState();

      // Start loading (don't await)
      const loadPromise = store.loadPresets();

      // Check loading state is true
      expect(usePresetStore.getState().isLoading).toBe(true);

      // Resolve fetch
      resolveFetch!({ ok: true, json: async () => ({ presets: [] }) });

      // Wait for load to complete
      await loadPromise;

      // Loading state should be false
      expect(usePresetStore.getState().isLoading).toBe(false);
    });
  });
});
