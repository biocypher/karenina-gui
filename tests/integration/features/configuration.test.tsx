/**
 * Configuration Integration Tests
 *
 * Tests configuration management including:
 * - Load and save default settings
 * - Environment variables management
 * - Configuration persistence
 *
 * integ-017: Test load and save default settings
 * integ-018: Test environment variables management
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConfigStore } from '../../../src/stores/useConfigStore';

// Mock CSRF
vi.mock('../../../utils/csrf', () => ({
  csrf: {
    fetchWithCsrf: vi.fn(),
    getCsrfToken: vi.fn(() => 'mock-csrf-token'),
  },
}));

// Mock fetch
vi.mocked(global.fetch).mockImplementation(
  async () =>
    ({
      ok: true,
      json: async () => ({}),
    }) as Response
);

describe('Configuration Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Reset config store to default state
    // Reset to initial state
    useConfigStore.setState({
      defaultInterface: 'langchain',
      defaultProvider: 'anthropic',
      defaultModel: 'claude-haiku-4-5',
      defaultEndpointBaseUrl: '',
      defaultEndpointApiKey: '',
      defaultAsyncEnabled: true,
      defaultAsyncMaxWorkers: null,
      savedInterface: 'langchain',
      savedProvider: 'anthropic',
      savedModel: 'claude-haiku-4-5',
      savedEndpointBaseUrl: '',
      savedEndpointApiKey: '',
      savedAsyncEnabled: true,
      savedAsyncMaxWorkers: null,
      originalDefaults: {
        defaultInterface: 'langchain',
        defaultProvider: 'anthropic',
        defaultModel: 'claude-haiku-4-5',
        defaultEndpointBaseUrl: '',
        defaultAsyncEnabled: true,
        defaultAsyncMaxWorkers: null,
      },
      envVariables: {},
      unmaskedEnvVariables: {},
      isLoading: false,
      isSaving: false,
      isSavingDefaults: false,
      error: null,
    });
  });

  describe('integ-017: Load and save default settings', () => {
    it('should load default configuration from API', async () => {
      const mockDefaultsResponse = {
        default_interface: 'openrouter',
        default_provider: 'openai',
        default_model: 'gpt-4',
        default_endpoint_base_url: 'http://localhost:8080',
        default_async_enabled: false,
        default_async_max_workers: 4,
      };

      const mockEnvVarsResponse = {
        ANTHROPIC_API_KEY: '***masked***',
        OPENAI_API_KEY: '***masked***',
      };

      let fetchCallCount = 0;
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/v2/config/defaults')) {
          fetchCallCount++;
          return {
            ok: true,
            json: async () => mockDefaultsResponse,
          } as Response;
        }

        if (url.includes('/api/v2/config/env-vars')) {
          fetchCallCount++;
          return {
            ok: true,
            json: async () => mockEnvVarsResponse,
          } as Response;
        }

        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        } as Response;
      });

      const store = useConfigStore.getState();

      // Call loadConfiguration
      await store.loadConfiguration();

      // Verify defaults were loaded into working values
      const state = useConfigStore.getState();
      expect(state.defaultInterface).toBe('openrouter');
      expect(state.defaultProvider).toBe('openai');
      expect(state.defaultModel).toBe('gpt-4');
      expect(state.defaultEndpointBaseUrl).toBe('http://localhost:8080');
      expect(state.defaultAsyncEnabled).toBe(false);
      expect(state.defaultAsyncMaxWorkers).toBe(4);

      // Verify defaults were also loaded into saved values
      expect(state.savedInterface).toBe('openrouter');
      expect(state.savedProvider).toBe('openai');
      expect(state.savedModel).toBe('gpt-4');

      // Verify original defaults were set
      expect(state.originalDefaults.defaultInterface).toBe('openrouter');
      expect(state.originalDefaults.defaultProvider).toBe('openai');
      expect(state.originalDefaults.defaultModel).toBe('gpt-4');

      // Verify env vars were loaded
      expect(state.envVariables).toEqual(mockEnvVarsResponse);

      // Verify fetch was called for both endpoints
      expect(fetchCallCount).toBe(2);
    });

    it('should update working default values', () => {
      const store = useConfigStore.getState();

      // Update interface
      store.updateDefaultInterface('openai_endpoint');
      expect(useConfigStore.getState().defaultInterface).toBe('openai_endpoint');

      // Update provider
      store.updateDefaultProvider('google_genai');
      expect(useConfigStore.getState().defaultProvider).toBe('google_genai');

      // Update model
      store.updateDefaultModel('gemini-2.0-flash');
      expect(useConfigStore.getState().defaultModel).toBe('gemini-2.0-flash');

      // Update endpoint URL
      store.updateDefaultEndpointBaseUrl('http://localhost:11434/v1');
      expect(useConfigStore.getState().defaultEndpointBaseUrl).toBe('http://localhost:11434/v1');

      // Update endpoint API key
      store.updateDefaultEndpointApiKey('sk-test-key-123');
      expect(useConfigStore.getState().defaultEndpointApiKey).toBe('sk-test-key-123');

      // Update async settings
      store.updateDefaultAsyncEnabled(false);
      expect(useConfigStore.getState().defaultAsyncEnabled).toBe(false);

      store.updateDefaultAsyncMaxWorkers(8);
      expect(useConfigStore.getState().defaultAsyncMaxWorkers).toBe(8);
    });

    it('should save defaults to backend', async () => {
      // First, update working values
      const store = useConfigStore.getState();
      store.updateDefaultInterface('openai_endpoint');
      store.updateDefaultProvider('ollama');
      store.updateDefaultModel('llama2');
      store.updateDefaultEndpointBaseUrl('http://localhost:11434/v1');
      store.updateDefaultEndpointApiKey('test-api-key');
      store.updateDefaultAsyncEnabled(false);
      store.updateDefaultAsyncMaxWorkers(2);

      // Mock the save API
      let capturedBody: Record<string, unknown> | null = null;
      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/v2/config/defaults') && init?.method === 'PUT') {
          capturedBody = JSON.parse(init.body as string);
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      });

      // Call saveDefaults
      await store.saveDefaults();

      // Verify the API was called with correct payload
      expect(capturedBody).toEqual({
        default_interface: 'openai_endpoint',
        default_provider: 'ollama',
        default_model: 'llama2',
        default_endpoint_base_url: 'http://localhost:11434/v1',
        default_async_enabled: false,
        default_async_max_workers: 2,
      });

      // Verify saved values were updated
      const state = useConfigStore.getState();
      expect(state.savedInterface).toBe('openai_endpoint');
      expect(state.savedProvider).toBe('ollama');
      expect(state.savedModel).toBe('llama2');
      expect(state.savedEndpointBaseUrl).toBe('http://localhost:11434/v1');
      expect(state.savedAsyncEnabled).toBe(false);
      expect(state.savedAsyncMaxWorkers).toBe(2);

      // Verify original defaults were updated to match new saved values
      expect(state.originalDefaults.defaultInterface).toBe('openai_endpoint');
      expect(state.originalDefaults.defaultProvider).toBe('ollama');
      expect(state.originalDefaults.defaultModel).toBe('llama2');
    });

    it('should reset working values to original defaults', () => {
      const store = useConfigStore.getState();

      // Verify initial state
      expect(useConfigStore.getState().defaultInterface).toBe('langchain');
      expect(useConfigStore.getState().defaultProvider).toBe('anthropic');

      // Update working values
      store.updateDefaultInterface('openrouter');
      store.updateDefaultProvider('openai');
      store.updateDefaultModel('gpt-4');

      // Verify working values changed
      expect(useConfigStore.getState().defaultInterface).toBe('openrouter');
      expect(useConfigStore.getState().defaultProvider).toBe('openai');
      expect(useConfigStore.getState().defaultModel).toBe('gpt-4');

      // Reset to original defaults
      store.resetDefaults();

      // Verify values are back to original
      expect(useConfigStore.getState().defaultInterface).toBe('langchain');
      expect(useConfigStore.getState().defaultProvider).toBe('anthropic');
      expect(useConfigStore.getState().defaultModel).toBe('claude-haiku-4-5');
    });

    it('should track unsaved changes with hasUnsavedDefaults', () => {
      const store = useConfigStore.getState();

      // Initially, no unsaved changes (matches original defaults)
      expect(store.hasUnsavedDefaults()).toBe(false);

      // Change a value
      store.updateDefaultInterface('openrouter');

      // Now there are unsaved changes
      expect(useConfigStore.getState().hasUnsavedDefaults()).toBe(true);

      // Reset
      store.resetDefaults();

      // No more unsaved changes
      expect(useConfigStore.getState().hasUnsavedDefaults()).toBe(false);
    });

    it('should handle loading error gracefully', async () => {
      const store = useConfigStore.getState();

      // Mock fetch to return error
      vi.mocked(global.fetch).mockImplementation(async () => {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        } as Response;
      });

      // Call loadConfiguration - should not throw
      await store.loadConfiguration();

      // Verify error state is set
      const state = useConfigStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.isLoading).toBe(false);
    });

    it('should handle saving error gracefully', async () => {
      const store = useConfigStore.getState();

      // Make a change first
      store.updateDefaultInterface('openrouter');

      // Mock fetch to return error
      vi.mocked(global.fetch).mockImplementation(async () => {
        return {
          ok: false,
          status: 400,
          json: async () => ({ detail: 'Validation error' }),
        } as Response;
      });

      // Call saveDefaults - should throw
      await expect(store.saveDefaults()).rejects.toThrow();

      // Verify error state is set
      const state = useConfigStore.getState();
      expect(state.error).toBe('Validation error');
      expect(state.isSavingDefaults).toBe(false);

      // Verify saved values were NOT updated
      expect(state.savedInterface).toBe('langchain');
    });

    it('should persist settings across save cycle', async () => {
      const store = useConfigStore.getState();

      // Update multiple settings
      store.updateDefaultInterface('openai_endpoint');
      store.updateDefaultProvider('ollama');
      store.updateDefaultModel('llama2');
      store.updateDefaultEndpointBaseUrl('http://localhost:11434/v1');
      store.updateDefaultEndpointApiKey('my-api-key');
      store.updateDefaultAsyncEnabled(false);
      store.updateDefaultAsyncMaxWorkers(4);

      // Mock successful save
      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/api/v2/config/defaults') && init?.method === 'PUT') {
          return { ok: true, json: async () => ({ success: true }) } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      });

      // Save defaults
      await store.saveDefaults();

      // Verify all settings persisted
      const state = useConfigStore.getState();
      expect(state.savedInterface).toBe('openai_endpoint');
      expect(state.savedProvider).toBe('ollama');
      expect(state.savedModel).toBe('llama2');
      expect(state.savedEndpointBaseUrl).toBe('http://localhost:11434/v1');
      expect(state.savedEndpointApiKey).toBe('my-api-key');
      expect(state.savedAsyncEnabled).toBe(false);
      expect(state.savedAsyncMaxWorkers).toBe(4);

      // Verify original defaults updated
      expect(state.originalDefaults.defaultInterface).toBe('openai_endpoint');
      expect(state.originalDefaults.defaultProvider).toBe('ollama');

      // hasUnsavedDefaults should now be false
      expect(state.hasUnsavedDefaults()).toBe(false);
    });

    it('should support all interface types', async () => {
      const store = useConfigStore.getState();

      // Test langchain interface
      store.updateDefaultInterface('langchain');
      expect(useConfigStore.getState().defaultInterface).toBe('langchain');

      // Test openrouter interface
      store.updateDefaultInterface('openrouter');
      expect(useConfigStore.getState().defaultInterface).toBe('openrouter');

      // Test openai_endpoint interface
      store.updateDefaultInterface('openai_endpoint');
      expect(useConfigStore.getState().defaultInterface).toBe('openai_endpoint');
    });
  });

  describe('integ-018: Environment variables management', () => {
    it('should load environment variables from API', async () => {
      const mockEnvVars = {
        ANTHROPIC_API_KEY: '***masked***',
        OPENAI_API_KEY: '***masked***',
        GOOGLE_API_KEY: '***masked***',
        CUSTOM_VAR: 'value123',
      };

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/api/v2/config/env-vars')) {
          return {
            ok: true,
            json: async () => mockEnvVars,
          } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      });

      const store = useConfigStore.getState();
      await store.loadConfiguration();

      const state = useConfigStore.getState();
      expect(state.envVariables).toEqual(mockEnvVars);
    });

    it('should load unmasked environment variables for editing', async () => {
      const mockUnmaskedVars = {
        ANTHROPIC_API_KEY: 'sk-ant-real-key-12345',
        OPENAI_API_KEY: 'sk-openai-real-key-67890',
      };

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/api/v2/config/env-vars/unmasked')) {
          return {
            ok: true,
            json: async () => mockUnmaskedVars,
          } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      });

      const store = useConfigStore.getState();
      await store.loadUnmaskedEnvVariables();

      const state = useConfigStore.getState();
      expect(state.unmaskedEnvVariables).toEqual(mockUnmaskedVars);
    });

    it('should update a single environment variable', async () => {
      let capturedKey: string | null = null;
      let capturedValue: string | null = null;

      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/v2/config/env-vars') && init?.method === 'PUT') {
          const body = JSON.parse(init.body as string);
          capturedKey = body.key;
          capturedValue = body.value;
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        // After update, reload configuration
        return {
          ok: true,
          json: async () => ({ NEW_VAR: '***masked***' }),
        } as Response;
      });

      const store = useConfigStore.getState();
      await store.updateEnvVariable('NEW_VAR', 'new-value');

      expect(capturedKey).toBe('NEW_VAR');
      expect(capturedValue).toBe('new-value');
    });

    it('should update multiple environment variables in bulk', async () => {
      const variables = [
        { key: 'VAR1', value: 'value1' },
        { key: 'VAR2', value: 'value2' },
        { key: 'VAR3', value: 'value3' },
      ];

      let capturedVariables: Array<{ key: string; value: string }> | null = null;

      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/v2/config/env-vars/bulk')) {
          const body = JSON.parse(init.body as string);
          capturedVariables = body.variables;
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      });

      const store = useConfigStore.getState();
      await store.updateEnvVariables(variables);

      expect(capturedVariables).toEqual(variables);
    });

    it('should remove an environment variable', async () => {
      let capturedKey: string | null = null;

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : url;

        if (url.includes('/api/v2/config/env-vars/VAR_TO_DELETE')) {
          capturedKey = 'VAR_TO_DELETE';
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      });

      const store = useConfigStore.getState();
      await store.removeEnvVariable('VAR_TO_DELETE');

      expect(capturedKey).toBe('VAR_TO_DELETE');
    });

    it('should update .env file contents', async () => {
      const newContents = 'ANTHROPIC_API_KEY=sk-new-key\nOPENAI_API_KEY=sk-new-openai\nNEW_VAR=value';

      let capturedContents: string | null = null;

      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/v2/config/env-file') && init?.method === 'PUT') {
          const body = JSON.parse(init.body as string);
          capturedContents = body.content;
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      });

      const store = useConfigStore.getState();
      await store.updateEnvFileContents(newContents);

      expect(capturedContents).toBe(newContents);
    });

    it('should handle environment variable update error', async () => {
      vi.mocked(global.fetch).mockImplementation(async () => {
        return {
          ok: false,
          status: 400,
          json: async () => ({ detail: 'Invalid variable name' }),
        } as Response;
      });

      const store = useConfigStore.getState();

      await expect(store.updateEnvVariable('INVALID NAME', 'value')).rejects.toThrow();

      const state = useConfigStore.getState();
      expect(state.error).toBe('Invalid variable name');
    });
  });

  describe('Configuration loading states', () => {
    it('should set loading state during loadConfiguration', async () => {
      let resolveFetch: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      vi.mocked(global.fetch).mockImplementation(async () => {
        await fetchPromise;
        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      });

      const store = useConfigStore.getState();

      // Start loading (don't await)
      const loadPromise = store.loadConfiguration();

      // Check loading state is true
      expect(useConfigStore.getState().isLoading).toBe(true);

      // Resolve fetch
      resolveFetch!({ ok: true, json: async () => ({}) });

      // Wait for load to complete
      await loadPromise;

      // Loading state should be false
      expect(useConfigStore.getState().isLoading).toBe(false);
    });

    it('should set saving state during saveDefaults', async () => {
      let resolveFetch: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      vi.mocked(global.fetch).mockImplementation(async () => {
        await fetchPromise;
        return {
          ok: true,
          json: async () => ({ success: true }),
        } as Response;
      });

      const store = useConfigStore.getState();
      store.updateDefaultInterface('openrouter'); // Make a change first

      // Start saving (don't await)
      const savePromise = store.saveDefaults();

      // Check saving state is true
      expect(useConfigStore.getState().isSavingDefaults).toBe(true);

      // Resolve fetch
      resolveFetch!({ ok: true, json: async () => ({ success: true }) });

      // Wait for save to complete
      await savePromise;

      // Saving state should be false
      expect(useConfigStore.getState().isSavingDefaults).toBe(false);
    });
  });
});
