/**
 * Benchmark Configuration Integration Tests
 *
 * Tests the benchmark configuration settings in the Benchmark tab including:
 * - Evaluation mode configuration (template_only, template_and_rubric, rubric_only)
 * - Correctness and rubric toggle interactions
 * - Adding and configuring answering models
 *
 * integ-047: Test evaluation mode configuration
 * integ-045: Test add and configure answering model
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render, userEvent } from '../../../test-utils/test-helpers';
import { BenchmarkTab } from '../../../components/BenchmarkTab';
import { useBenchmarkStore } from '../../../stores/useBenchmarkStore';
import { useRubricStore } from '../../../stores/useRubricStore';
import { useDatasetStore } from '../../../stores/useDatasetStore';
import { Checkpoint } from '../../../types';
import type { ModelConfiguration } from '../../../types';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((this: WebSocket, ev: Event) => void) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => void) | null = null;
  onerror: ((this: WebSocket, ev: Event) => void) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send() {}
  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

// Mock the preset store
vi.mock('../../../stores/usePresetStore', () => ({
  usePresetStore: () => ({
    presets: [],
    isLoadingPresets: false,
    loadPresets: vi.fn(() => Promise.resolve()),
    savePreset: vi.fn(() => Promise.resolve()),
    deletePreset: vi.fn(() => Promise.resolve()),
    applyPreset: vi.fn(() => Promise.resolve()),
  }),
}));

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

const mockCheckpoint: Checkpoint = {
  'test-question-1': {
    question: 'What is 2+2?',
    raw_answer: 'The answer is 4',
    original_answer_template: 'class Answer(BaseAnswer): pass',
    answer_template: 'class Answer(BaseAnswer): response: str = "4"',
    last_modified: '2023-12-01T10:00:00Z',
    finished: true,
  },
  'test-question-2': {
    question: 'What is the capital of France?',
    raw_answer: 'The capital of France is Paris',
    original_answer_template: 'class Answer(BaseAnswer): pass',
    answer_template: 'class Answer(BaseAnswer): city: str = "Paris"',
    last_modified: '2023-12-01T11:00:00Z',
    finished: true,
  },
};

const renderBenchmarkTab = (checkpoint: Checkpoint = mockCheckpoint) => {
  return render(<BenchmarkTab checkpoint={checkpoint} benchmarkResults={{}} setBenchmarkResults={vi.fn()} />);
};

describe('Benchmark Configuration Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = '';

    // Reset stores
    useRubricStore.getState().reset();
    useDatasetStore.getState().reset?.();

    // Setup benchmark store with default models and evaluation settings
    const store = useBenchmarkStore.getState();
    store.setAnsweringModels([
      {
        id: 'answering-1',
        model_provider: 'anthropic',
        model_name: 'claude-haiku-4-5',
        temperature: 0.1,
        interface: 'langchain',
        system_prompt: 'You are an expert assistant.',
      },
    ]);
    store.setParsingModels([
      {
        id: 'parsing-1',
        model_provider: 'anthropic',
        model_name: 'claude-haiku-4-5',
        temperature: 0.1,
        interface: 'langchain',
        system_prompt: 'You are a validation assistant.',
      },
    ]);
    store.setEvaluationMode('template_only');
    store.setRubricEnabled(false);
    store.setCorrectnessEnabled(true);
    store.resetExpandedPrompts();
  });

  afterEach(() => {
    // Clean up any DOM elements created during tests
    document.body.innerHTML = '';
  });

  // Helper function to find the Rubric checkbox (not the Deep-Judgment Rubrics checkbox)
  const findRubricCheckbox = () => {
    // Find all checkboxes in the document
    const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));

    // The Rubric checkbox we want has a sibling span with text "Rubric" followed by
    // another span with "(Qualitative evaluation using defined traits)"
    for (const checkbox of allCheckboxes) {
      const parent = checkbox.closest('label');
      if (parent) {
        const textContent = parent.textContent || '';
        // Check if this label contains "Rubric" and the description text
        // This distinguishes it from the Deep-Judgment "Rubrics" checkbox
        if (textContent.includes('Rubric') && textContent.includes('Qualitative evaluation')) {
          return checkbox as HTMLInputElement;
        }
      }
    }
    return null;
  };

  describe('integ-047: Evaluation mode configuration', () => {
    it('should enable rubric and show evaluation mode options', async () => {
      renderBenchmarkTab();

      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByText(/Evaluation Settings/i)).toBeInTheDocument();
      });

      // Initially, correctness should be enabled, rubric disabled
      const correctnessCheckbox = screen.getByLabelText(/Correctness/i) as HTMLInputElement;
      expect(correctnessCheckbox.checked).toBe(true);

      // Find the Rubric checkbox
      const rubricCheckbox = findRubricCheckbox();
      expect(rubricCheckbox).toBeInTheDocument();
      expect(rubricCheckbox?.checked).toBe(false);

      // Enable rubric
      if (rubricCheckbox) {
        await userEvent.click(rubricCheckbox);
      }

      // Verify rubric is now enabled in store
      expect(useBenchmarkStore.getState().rubricEnabled).toBe(true);

      // Verify evaluation mode radio buttons appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Template \+ Rubric/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Rubric Only/i)).toBeInTheDocument();
      });

      // Verify evaluation mode changed to template_and_rubric
      expect(useBenchmarkStore.getState().evaluationMode).toBe('template_and_rubric');
    });

    it('should select template and rubric mode', async () => {
      renderBenchmarkTab();

      await waitFor(() => {
        expect(screen.getByText(/Evaluation Settings/i)).toBeInTheDocument();
      });

      // Enable rubric
      const rubricCheckbox = findRubricCheckbox();
      if (rubricCheckbox) {
        await userEvent.click(rubricCheckbox);
      }

      // Select Template + Rubric mode
      const templateAndRubricRadio = screen.getByLabelText(/Template \+ Rubric/i) as HTMLInputElement;
      await userEvent.click(templateAndRubricRadio);

      // Verify evaluation mode updated in store
      expect(useBenchmarkStore.getState().evaluationMode).toBe('template_and_rubric');
    });

    it('should select rubric only mode', async () => {
      renderBenchmarkTab();

      await waitFor(() => {
        expect(screen.getByText(/Evaluation Settings/i)).toBeInTheDocument();
      });

      // Enable rubric
      const rubricCheckbox = findRubricCheckbox();
      if (rubricCheckbox) {
        await userEvent.click(rubricCheckbox);
      }

      // Select Rubric Only mode
      const rubricOnlyRadio = screen.getByLabelText(/Rubric Only/i) as HTMLInputElement;
      await userEvent.click(rubricOnlyRadio);

      // Verify evaluation mode updated in store
      expect(useBenchmarkStore.getState().evaluationMode).toBe('rubric_only');

      // Verify correctness is still enabled (both can be on)
      const correctnessCheckbox = screen.getByLabelText(/Correctness/i) as HTMLInputElement;
      expect(correctnessCheckbox.checked).toBe(true);
    });

    it('should disable rubric and hide evaluation mode options', async () => {
      renderBenchmarkTab();

      await waitFor(() => {
        expect(screen.getByText(/Evaluation Settings/i)).toBeInTheDocument();
      });

      // Enable rubric
      const rubricCheckbox = findRubricCheckbox();
      if (rubricCheckbox) {
        await userEvent.click(rubricCheckbox);
      }

      // Verify evaluation mode options appeared
      await waitFor(() => {
        expect(screen.getByLabelText(/Template \+ Rubric/i)).toBeInTheDocument();
      });

      // Disable rubric
      if (rubricCheckbox) {
        await userEvent.click(rubricCheckbox);
      }

      // Verify rubric disabled in store
      expect(useBenchmarkStore.getState().rubricEnabled).toBe(false);

      // Verify evaluation mode radio buttons are hidden
      await waitFor(() => {
        expect(screen.queryByLabelText(/Template \+ Rubric/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/Rubric Only/i)).not.toBeInTheDocument();
      });
    });

    it('should verify correctness checkbox toggles correctly', async () => {
      renderBenchmarkTab();

      await waitFor(() => {
        expect(screen.getByText(/Evaluation Settings/i)).toBeInTheDocument();
      });

      const correctnessCheckbox = screen.getByLabelText(/Correctness/i) as HTMLInputElement;

      // Initially enabled
      expect(correctnessCheckbox.checked).toBe(true);
      expect(useBenchmarkStore.getState().correctnessEnabled).toBe(true);

      // Disable correctness
      await userEvent.click(correctnessCheckbox);
      expect(correctnessCheckbox.checked).toBe(false);
      expect(useBenchmarkStore.getState().correctnessEnabled).toBe(false);

      // Re-enable correctness
      await userEvent.click(correctnessCheckbox);
      expect(correctnessCheckbox.checked).toBe(true);
      expect(useBenchmarkStore.getState().correctnessEnabled).toBe(true);
    });
  });

  describe('integ-045: Add and configure answering model', () => {
    it('should add answering model and verify it appears in store', () => {
      // Get the store state (beforeEach has already set up the store with default model)
      const initialCount = useBenchmarkStore.getState().answeringModels.length;

      // Add a new answering model
      const newModel: ModelConfiguration = {
        id: 'new-answering-model',
        model_provider: 'openai',
        model_name: 'gpt-4',
        temperature: 0.7,
        interface: 'langchain',
        system_prompt: 'You are a helpful assistant.',
      };

      useBenchmarkStore.getState().addAnsweringModel(newModel);

      // Verify the model was added to the store - get fresh state
      const updatedModels = useBenchmarkStore.getState().answeringModels;
      expect(updatedModels.length).toBe(initialCount + 1);
      expect(updatedModels).toContainEqual(newModel);
    });

    it('should add multiple answering models with different providers', () => {
      // Get initial count (includes default model from beforeEach)
      const initialCount = useBenchmarkStore.getState().answeringModels.length;

      // Add OpenAI model
      const openaiModel: ModelConfiguration = {
        id: 'openai-model',
        model_provider: 'openai',
        model_name: 'gpt-4',
        temperature: 0.5,
        interface: 'langchain',
        system_prompt: 'OpenAI system prompt',
      };
      useBenchmarkStore.getState().addAnsweringModel(openaiModel);

      // Add Anthropic model
      const anthropicModel: ModelConfiguration = {
        id: 'anthropic-model',
        model_provider: 'anthropic',
        model_name: 'claude-3-opus-20240229',
        temperature: 0.3,
        interface: 'langchain',
        system_prompt: 'Anthropic system prompt',
      };
      useBenchmarkStore.getState().addAnsweringModel(anthropicModel);

      // Add OpenRouter model
      const openrouterModel: ModelConfiguration = {
        id: 'openrouter-model',
        model_provider: 'openrouter',
        model_name: 'mistralai/mistral-large',
        temperature: 0.6,
        interface: 'openrouter',
        system_prompt: 'OpenRouter system prompt',
      };
      useBenchmarkStore.getState().addAnsweringModel(openrouterModel);

      // Verify all models are in the store (initial + 3 new models) - get fresh state
      const models = useBenchmarkStore.getState().answeringModels;
      expect(models.length).toBe(initialCount + 3);
      expect(models.some((m) => m.id === 'openai-model')).toBe(true);
      expect(models.some((m) => m.id === 'anthropic-model')).toBe(true);
      expect(models.some((m) => m.id === 'openrouter-model')).toBe(true);
    });

    it('should configure model with different temperature values', () => {
      // Add model with low temperature
      const lowTempModel: ModelConfiguration = {
        id: 'low-temp',
        model_provider: 'anthropic',
        model_name: 'claude-3-haiku',
        temperature: 0.1,
        interface: 'langchain',
        system_prompt: 'Precise responses',
      };
      useBenchmarkStore.getState().addAnsweringModel(lowTempModel);

      // Add model with high temperature
      const highTempModel: ModelConfiguration = {
        id: 'high-temp',
        model_provider: 'anthropic',
        model_name: 'claude-3-haiku',
        temperature: 0.9,
        interface: 'langchain',
        system_prompt: 'Creative responses',
      };
      useBenchmarkStore.getState().addAnsweringModel(highTempModel);

      // Verify temperature values are preserved - get fresh state
      const models = useBenchmarkStore.getState().answeringModels;
      const lowTemp = models.find((m) => m.id === 'low-temp');
      const highTemp = models.find((m) => m.id === 'high-temp');

      expect(lowTemp?.temperature).toBe(0.1);
      expect(highTemp?.temperature).toBe(0.9);
    });

    it('should update existing model configuration', () => {
      // Add a model
      const model: ModelConfiguration = {
        id: 'update-test',
        model_provider: 'openai',
        model_name: 'gpt-3.5-turbo',
        temperature: 0.5,
        interface: 'langchain',
        system_prompt: 'Original prompt',
      };
      useBenchmarkStore.getState().addAnsweringModel(model);

      // Update the model
      useBenchmarkStore.getState().updateAnsweringModel('update-test', {
        temperature: 0.8,
        system_prompt: 'Updated prompt',
      });

      // Verify updates - get fresh state
      const updatedModel = useBenchmarkStore.getState().answeringModels.find((m) => m.id === 'update-test');
      expect(updatedModel?.temperature).toBe(0.8);
      expect(updatedModel?.system_prompt).toBe('Updated prompt');
      // Other fields remain unchanged
      expect(updatedModel?.model_name).toBe('gpt-3.5-turbo');
    });

    it('should remove answering model from store', () => {
      // Add two models
      const model1: ModelConfiguration = {
        id: 'model-to-remove',
        model_provider: 'openai',
        model_name: 'gpt-4',
        temperature: 0.5,
        interface: 'langchain',
        system_prompt: 'Prompt 1',
      };
      useBenchmarkStore.getState().addAnsweringModel(model1);

      const model2: ModelConfiguration = {
        id: 'model-to-keep',
        model_provider: 'anthropic',
        model_name: 'claude-3',
        temperature: 0.5,
        interface: 'langchain',
        system_prompt: 'Prompt 2',
      };
      useBenchmarkStore.getState().addAnsweringModel(model2);

      const beforeRemovalCount = useBenchmarkStore.getState().answeringModels.length;

      // Remove one model
      useBenchmarkStore.getState().removeAnsweringModel('model-to-remove');

      // Verify removal - get fresh state
      const afterRemovalState = useBenchmarkStore.getState();
      expect(afterRemovalState.answeringModels.length).toBe(beforeRemovalCount - 1);
      expect(afterRemovalState.answeringModels.some((m) => m.id === 'model-to-remove')).toBe(false);
      expect(afterRemovalState.answeringModels.some((m) => m.id === 'model-to-keep')).toBe(true);
    });
  });

  describe('integ-046: Model system prompt and custom endpoint', () => {
    it('should save and retrieve system prompt for model', () => {
      const customPrompt = 'You are a specialized assistant for medical diagnosis. Be thorough and accurate.';

      const modelWithPrompt: ModelConfiguration = {
        id: 'model-with-prompt',
        model_provider: 'anthropic',
        model_name: 'claude-3-opus',
        temperature: 0.3,
        interface: 'langchain',
        system_prompt: customPrompt,
      };

      useBenchmarkStore.getState().addAnsweringModel(modelWithPrompt);

      // Verify system prompt is saved correctly
      const savedModel = useBenchmarkStore.getState().answeringModels.find((m) => m.id === 'model-with-prompt');

      expect(savedModel).toBeDefined();
      expect(savedModel?.system_prompt).toBe(customPrompt);
    });

    it('should update system prompt for existing model', () => {
      const model: ModelConfiguration = {
        id: 'prompt-update-test',
        model_provider: 'openai',
        model_name: 'gpt-4',
        temperature: 0.5,
        interface: 'langchain',
        system_prompt: 'Original prompt',
      };

      useBenchmarkStore.getState().addAnsweringModel(model);

      const newPrompt = 'You are now a creative writing assistant. Help users write compelling stories.';
      useBenchmarkStore.getState().updateAnsweringModel('prompt-update-test', {
        system_prompt: newPrompt,
      });

      // Verify system prompt was updated
      const updatedModel = useBenchmarkStore.getState().answeringModels.find((m) => m.id === 'prompt-update-test');

      expect(updatedModel?.system_prompt).toBe(newPrompt);
      // Other fields unchanged
      expect(updatedModel?.model_name).toBe('gpt-4');
    });

    it('should configure model with openai_endpoint interface and custom settings', () => {
      const customEndpointModel: ModelConfiguration = {
        id: 'custom-endpoint-model',
        model_provider: 'openai',
        model_name: 'gpt-4',
        temperature: 0.7,
        interface: 'openai_endpoint',
        system_prompt: 'You are a helpful assistant.',
        endpoint_base_url: 'https://api.example.com/v1',
        endpoint_api_key: 'sk-test-key-12345',
      };

      useBenchmarkStore.getState().addAnsweringModel(customEndpointModel);

      // Verify custom endpoint settings are saved
      const savedModel = useBenchmarkStore.getState().answeringModels.find((m) => m.id === 'custom-endpoint-model');

      expect(savedModel).toBeDefined();
      expect(savedModel?.interface).toBe('openai_endpoint');
      expect(savedModel?.endpoint_base_url).toBe('https://api.example.com/v1');
      expect(savedModel?.endpoint_api_key).toBe('sk-test-key-12345');
    });

    it('should update endpoint configuration for existing model', () => {
      const model: ModelConfiguration = {
        id: 'endpoint-update-test',
        model_provider: 'openai',
        model_name: 'gpt-3.5-turbo',
        temperature: 0.5,
        interface: 'langchain',
        system_prompt: 'Helpful assistant',
      };

      useBenchmarkStore.getState().addAnsweringModel(model);

      // Update to use custom endpoint
      useBenchmarkStore.getState().updateAnsweringModel('endpoint-update-test', {
        interface: 'openai_endpoint',
        endpoint_base_url: 'https://new-api.example.com/v1',
        endpoint_api_key: 'sk-new-key-67890',
      });

      // Verify endpoint settings were updated
      const updatedModel = useBenchmarkStore.getState().answeringModels.find((m) => m.id === 'endpoint-update-test');

      expect(updatedModel?.interface).toBe('openai_endpoint');
      expect(updatedModel?.endpoint_base_url).toBe('https://new-api.example.com/v1');
      expect(updatedModel?.endpoint_api_key).toBe('sk-new-key-67890');
    });

    it('should support models with different interfaces side by side', () => {
      // Add langchain model
      const langchainModel: ModelConfiguration = {
        id: 'langchain-model',
        model_provider: 'anthropic',
        model_name: 'claude-3-haiku',
        temperature: 0.2,
        interface: 'langchain',
        system_prompt: 'Langchain interface prompt',
      };

      // Add openrouter model
      const openrouterModel: ModelConfiguration = {
        id: 'openrouter-model',
        model_provider: 'openrouter',
        model_name: 'mistralai/mistral-large',
        temperature: 0.6,
        interface: 'openrouter',
        system_prompt: 'OpenRouter interface prompt',
      };

      // Add custom endpoint model
      const customEndpointModel: ModelConfiguration = {
        id: 'custom-endpoint-model',
        model_provider: 'openai',
        model_name: 'gpt-4',
        temperature: 0.8,
        interface: 'openai_endpoint',
        system_prompt: 'Custom endpoint prompt',
        endpoint_base_url: 'https://custom.api.com/v1',
        endpoint_api_key: 'sk-custom-key',
      };

      useBenchmarkStore.getState().addAnsweringModel(langchainModel);
      useBenchmarkStore.getState().addAnsweringModel(openrouterModel);
      useBenchmarkStore.getState().addAnsweringModel(customEndpointModel);

      // Verify all models coexist with their respective configurations
      const models = useBenchmarkStore.getState().answeringModels;

      const langchain = models.find((m) => m.id === 'langchain-model');
      const openrouter = models.find((m) => m.id === 'openrouter-model');
      const customEndpoint = models.find((m) => m.id === 'custom-endpoint-model');

      expect(langchain?.interface).toBe('langchain');
      expect(langchain?.system_prompt).toBe('Langchain interface prompt');

      expect(openrouter?.interface).toBe('openrouter');
      expect(openrouter?.system_prompt).toBe('OpenRouter interface prompt');

      expect(customEndpoint?.interface).toBe('openai_endpoint');
      expect(customEndpoint?.system_prompt).toBe('Custom endpoint prompt');
      expect(customEndpoint?.endpoint_base_url).toBe('https://custom.api.com/v1');
      expect(customEndpoint?.endpoint_api_key).toBe('sk-custom-key');
    });
  });
});

describe('integ-048: Deep judgment and abstention configuration', () => {
  it('should enable deep judgment for templates', () => {
    const store = useBenchmarkStore.getState();

    // Initially disabled
    expect(store.deepJudgmentTemplateEnabled).toBe(false);

    // Enable deep judgment for templates
    store.setDeepJudgmentTemplateEnabled(true);

    // Verify setting is saved
    expect(useBenchmarkStore.getState().deepJudgmentTemplateEnabled).toBe(true);

    // Disable and verify
    store.setDeepJudgmentTemplateEnabled(false);
    expect(useBenchmarkStore.getState().deepJudgmentTemplateEnabled).toBe(false);
  });

  it('should enable deep judgment for rubrics', () => {
    const store = useBenchmarkStore.getState();

    // Initially disabled
    expect(store.deepJudgmentRubricEnabled).toBe(false);

    // Enable deep judgment for rubrics
    store.setDeepJudgmentRubricEnabled(true);

    // Verify setting is saved
    expect(useBenchmarkStore.getState().deepJudgmentRubricEnabled).toBe(true);

    // Disable and verify
    store.setDeepJudgmentRubricEnabled(false);
    expect(useBenchmarkStore.getState().deepJudgmentRubricEnabled).toBe(false);
  });

  it('should enable deep judgment search for template context', () => {
    const store = useBenchmarkStore.getState();

    // Initially disabled
    expect(store.deepJudgmentSearchEnabled).toBe(false);

    // Enable deep judgment search
    store.setDeepJudgmentSearchEnabled(true);

    // Verify setting is saved
    expect(useBenchmarkStore.getState().deepJudgmentSearchEnabled).toBe(true);

    // Disable and verify
    store.setDeepJudgmentSearchEnabled(false);
    expect(useBenchmarkStore.getState().deepJudgmentSearchEnabled).toBe(false);
  });

  it('should configure rubric mode (enable_all vs use_checkpoint)', () => {
    const store = useBenchmarkStore.getState();

    // Default mode is enable_all
    expect(store.deepJudgmentRubricMode).toBe('enable_all');

    // Switch to use_checkpoint mode
    store.setDeepJudgmentRubricMode('use_checkpoint');
    expect(useBenchmarkStore.getState().deepJudgmentRubricMode).toBe('use_checkpoint');

    // Switch back to enable_all
    store.setDeepJudgmentRubricMode('enable_all');
    expect(useBenchmarkStore.getState().deepJudgmentRubricMode).toBe('enable_all');
  });

  it('should configure excerpt extraction for deep judgment rubrics', () => {
    const store = useBenchmarkStore.getState();

    // Initially enabled by default
    expect(store.deepJudgmentRubricExtractExcerpts).toBe(true);

    // Disable excerpt extraction
    store.setDeepJudgmentRubricExtractExcerpts(false);
    expect(useBenchmarkStore.getState().deepJudgmentRubricExtractExcerpts).toBe(false);

    // Re-enable excerpt extraction
    store.setDeepJudgmentRubricExtractExcerpts(true);
    expect(useBenchmarkStore.getState().deepJudgmentRubricExtractExcerpts).toBe(true);
  });

  it('should enable abstention detection', () => {
    const store = useBenchmarkStore.getState();

    // Initially disabled
    expect(store.abstentionEnabled).toBe(false);

    // Enable abstention detection
    store.setAbstentionEnabled(true);

    // Verify setting is saved
    expect(useBenchmarkStore.getState().abstentionEnabled).toBe(true);

    // Disable and verify
    store.setAbstentionEnabled(false);
    expect(useBenchmarkStore.getState().abstentionEnabled).toBe(false);
  });

  it('should support multiple deep judgment settings simultaneously', () => {
    const store = useBenchmarkStore.getState();

    // Enable all deep judgment features
    store.setDeepJudgmentTemplateEnabled(true);
    store.setDeepJudgmentSearchEnabled(true);
    store.setDeepJudgmentRubricEnabled(true);
    store.setDeepJudgmentRubricMode('use_checkpoint');
    store.setDeepJudgmentRubricExtractExcerpts(false);

    // Verify all settings are saved correctly
    const finalState = useBenchmarkStore.getState();
    expect(finalState.deepJudgmentTemplateEnabled).toBe(true);
    expect(finalState.deepJudgmentSearchEnabled).toBe(true);
    expect(finalState.deepJudgmentRubricEnabled).toBe(true);
    expect(finalState.deepJudgmentRubricMode).toBe('use_checkpoint');
    expect(finalState.deepJudgmentRubricExtractExcerpts).toBe(false);
  });

  it('should support deep judgment and abstention together', () => {
    const store = useBenchmarkStore.getState();

    // Enable both deep judgment and abstention
    store.setDeepJudgmentTemplateEnabled(true);
    store.setDeepJudgmentRubricEnabled(true);
    store.setAbstentionEnabled(true);

    // Verify all settings coexist
    const finalState = useBenchmarkStore.getState();
    expect(finalState.deepJudgmentTemplateEnabled).toBe(true);
    expect(finalState.deepJudgmentRubricEnabled).toBe(true);
    expect(finalState.abstentionEnabled).toBe(true);
  });
});
