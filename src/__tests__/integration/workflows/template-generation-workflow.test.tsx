/**
 * Template Generation Workflow Integration Tests
 *
 * Tests the complete template generation workflow including:
 * - Starting generation with LLM configuration
 * - WebSocket progress updates
 * - Adding generated templates to Curator
 * - Cancellation handling
 * - Error handling
 *
 * integ-007: Test successful template generation workflow
 * integ-008: Test template generation cancellation
 * integ-009: Test template generation error handling
 * integ-052: Test generation with different model configs
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTemplateStore } from '../../../stores/useTemplateStore';
import type { QuestionData } from '../../../types';
import { setupWebSocketMock, teardownWebSocketMock } from '../../../test-utils/mocks/websocket-mock';

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

// Sample question data for testing
const mockQuestions: QuestionData = {
  q1: {
    question: 'What is the capital of France?',
    raw_answer: 'Paris is the capital of France.',
    answer_template: '',
  },
  q2: {
    question: 'What is 2 + 2?',
    raw_answer: 'Two plus two equals four.',
    answer_template: '',
  },
  q3: {
    question: 'Who wrote Hamlet?',
    raw_answer: 'William Shakespeare wrote Hamlet.',
    answer_template: '',
  },
};

describe('Template Generation Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupWebSocketMock();

    // Reset template store state
    useTemplateStore.getState().resetTemplateState();

    // Initialize selection for questions
    useTemplateStore.getState().initializeSelection(mockQuestions);
  });

  afterEach(() => {
    teardownWebSocketMock();
  });

  describe('integ-007: Successful template generation workflow', () => {
    it('should start generation and receive job_id', async () => {
      const mockJobId = 'test-job-123';

      // Mock the start generation API
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/generate-answer-templates')) {
          return {
            ok: true,
            json: async () => ({ job_id: mockJobId }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Initially not generating
      expect(store.isGenerating).toBe(false);

      // Start generation
      await store.startGeneration(mockQuestions);

      // Verify generation state (get fresh state after async operation)
      const stateAfterStart = useTemplateStore.getState();
      expect(stateAfterStart.isGenerating).toBe(true);
      expect(stateAfterStart.jobId).toBe(mockJobId);
      expect(stateAfterStart.error).toBeNull();
    });

    it('should receive progress updates', async () => {
      const mockJobId = 'test-job-456';

      // Mock the start generation API
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/generate-answer-templates')) {
          return {
            ok: true,
            json: async () => ({ job_id: mockJobId }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Start generation
      store.startGeneration(mockQuestions);

      // Simulate progress update via store method (bypasses WebSocket)
      store.updateProgress({
        job_id: mockJobId,
        status: 'running',
        percentage: 33,
        processed_count: 1,
        total_count: 3,
        current_question: 'q1',
        in_progress_questions: ['q1'],
      } as unknown);

      // Check progress was updated
      const progress = useTemplateStore.getState().progress;
      expect(progress?.status).toBe('running');
      expect(progress?.percentage).toBe(33);
    });

    it('should complete generation and store templates', async () => {
      const mockJobId = 'test-job-complete';

      // Mock fetch for start generation
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/generate-answer-templates')) {
          return {
            ok: true,
            json: async () => ({ job_id: mockJobId }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Start generation
      const generationPromise = store.startGeneration(mockQuestions);

      // Simulate completion directly via store method (bypasses WebSocket)
      store.completeGeneration({
        templates: {
          q1: {
            question_id: 'q1',
            template_code: 'class Answer(BaseModel):\n    capital: str',
            success: true,
          },
          q2: {
            question_id: 'q2',
            template_code: 'class Answer(BaseModel):\n    result: int',
            success: true,
          },
        },
        total_templates: 2,
        successful_generations: 2,
        failed_generations: 0,
      } as unknown);

      await generationPromise.catch(() => {});

      // Verify templates were stored (get fresh state)
      const finalState = useTemplateStore.getState();
      expect(finalState.isGenerating).toBe(false);
      expect(finalState.generatedTemplates).toBeDefined();
      expect(Object.keys(finalState.generatedTemplates).length).toBe(2);
    });

    it('should add generated templates to Curator', async () => {
      const mockJobId = 'test-job-add-to-curator';

      // Mock fetch
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/generate-answer-templates')) {
          return {
            ok: true,
            json: async () => ({ job_id: mockJobId }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Start generation
      store.startGeneration(mockQuestions);

      // Simulate completion with one successful template
      store.completeGeneration({
        templates: {
          q1: {
            question_id: 'q1',
            template_code: 'class Answer(BaseModel):\n    capital: str',
            success: true,
          },
        },
        total_templates: 1,
        successful_generations: 1,
        failed_generations: 0,
      } as unknown);

      // Add to curation
      let receivedData: QuestionData | null = null;
      const onTemplatesGenerated = (data: QuestionData) => {
        receivedData = data;
      };

      store.addToCuration(mockQuestions, onTemplatesGenerated);

      // Verify data was passed
      expect(receivedData).not.toBeNull();
      expect(receivedData?.q1).toBeDefined();
      expect(receivedData?.q1?.answer_template).toContain('capital: str');
    });

    it('should verify all scenarios from integ-007 PRD', async () => {
      // This test verifies all scenarios listed in integ-007:
      // 1. Select questions for generation
      // 2. Configure LLM settings (model, provider)
      // 3. Start generation
      // 4. Verify progress updates
      // 5. Verify completed templates stored
      // 6. Verify 'Add to Curator' action works

      const mockJobId = 'test-prd-verification';

      // Step 1: Questions already selected in beforeEach via initializeSelection
      let store = useTemplateStore.getState();
      expect(store.selectedQuestions.size).toBe(3);

      // Step 2: Configure LLM settings
      store.setConfig({
        model_provider: 'google_genai',
        model_name: 'gemini-2.0-flash',
        temperature: 0.2,
        interface: 'langchain',
      });
      store = useTemplateStore.getState();
      expect(store.config.model_provider).toBe('google_genai');
      expect(store.config.model_name).toBe('gemini-2.0-flash');

      // Mock fetch
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/generate-answer-templates')) {
          return {
            ok: true,
            json: async () => ({ job_id: mockJobId }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      // Step 3: Start generation
      const generationPromise = store.startGeneration(mockQuestions);

      // Step 4: Verify progress updates (using store method directly)
      store.updateProgress({
        job_id: mockJobId,
        status: 'running',
        percentage: 33,
        processed_count: 1,
        total_count: 3,
        current_question: 'q1',
        in_progress_questions: ['q1'],
      } as unknown);

      await new Promise((resolve) => setTimeout(resolve, 10));

      store = useTemplateStore.getState();
      expect(store.progress?.current_question).toBe('q1');
      expect(store.progress?.percentage).toBe(33);

      // Step 5: Complete generation and verify templates stored
      store.completeGeneration({
        templates: {
          q1: {
            question_id: 'q1',
            template_code: 'generated_template_1',
            success: true,
          },
          q2: {
            question_id: 'q2',
            template_code: 'generated_template_2',
            success: true,
          },
        },
        total_templates: 2,
        successful_generations: 2,
        failed_generations: 0,
      } as unknown);

      await generationPromise.catch(() => {});

      store = useTemplateStore.getState();
      expect(store.isGenerating).toBe(false);
      expect(Object.keys(store.generatedTemplates).length).toBe(2);
      expect(store.generatedTemplates.q1?.success).toBe(true);

      // Step 6: Verify 'Add to Curator' works
      let addedToCuration = false;
      store.addToCuration(mockQuestions, () => {
        addedToCuration = true;
      });
      expect(addedToCuration).toBe(true);
    });
  });

  describe('integ-008: Template generation cancellation', () => {
    it('should cancel generation while in progress', async () => {
      const mockJobId = 'test-job-cancel';

      // Mock fetch for start and cancel
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/generate-answer-templates')) {
          return {
            ok: true,
            json: async () => ({ job_id: mockJobId }),
          } as Response;
        }

        if (url.includes('/api/cancel-generation')) {
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Start generation
      const generationPromise = store.startGeneration(mockQuestions);

      // Simulate some progress using store method
      store.updateProgress({
        job_id: mockJobId,
        status: 'running',
        percentage: 50,
        processed_count: 1,
        total_count: 3,
        current_question: 'q1',
        in_progress_questions: ['q1'],
      } as unknown);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Cancel generation
      await store.cancelGeneration();

      // Verify cancellation state (get fresh state)
      const stateAfterCancel = useTemplateStore.getState();
      expect(stateAfterCancel.isGenerating).toBe(false);
      expect(stateAfterCancel.jobId).toBeNull();

      // Wait for original generation promise
      await generationPromise.catch(() => {});
    });

    it('should return to ready state after cancellation', async () => {
      const mockJobId = 'test-job-cancel-state';

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/generate-answer-templates')) {
          return {
            ok: true,
            json: async () => ({ job_id: mockJobId }),
          } as Response;
        }

        if (url.includes('/api/cancel-generation')) {
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Start generation
      await store.startGeneration(mockQuestions);

      // Cancel
      await store.cancelGeneration();

      // Verify UI can start new generation (get fresh state)
      const stateAfterCancel = useTemplateStore.getState();
      expect(stateAfterCancel.isGenerating).toBe(false);
      expect(stateAfterCancel.error).toBeNull();
      expect(stateAfterCancel.progress).toBeNull();
    });

    it('should preserve store state after cancellation', async () => {
      const mockJobId = 'test-job-partial';

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/generate-answer-templates')) {
          return {
            ok: true,
            json: async () => ({ job_id: mockJobId }),
          } as Response;
        }

        if (url.includes('/api/cancel-generation')) {
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Start generation
      const generationPromise = store.startGeneration(mockQuestions);

      // Simulate some progress
      store.updateProgress({
        job_id: mockJobId,
        status: 'running',
        percentage: 33,
        processed_count: 1,
        total_count: 3,
        current_question: 'q1',
        in_progress_questions: [],
      } as unknown);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Cancel
      await store.cancelGeneration();
      await generationPromise.catch(() => {});

      // Verify store is in clean state
      const stateAfterCancel = useTemplateStore.getState();
      expect(stateAfterCancel.isGenerating).toBe(false);
      expect(stateAfterCancel.jobId).toBeNull();
    });
  });

  describe('integ-009: Template generation error handling', () => {
    it('should handle model API quota exceeded error', async () => {
      // Mock fetch to return quota error
      vi.mocked(global.fetch).mockImplementation(async () => {
        return {
          ok: false,
          status: 429,
          json: async () => ({ error: 'Quota exceeded' }),
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Try to start generation
      await store.startGeneration(mockQuestions);

      // Verify error state (get fresh state after async operation)
      const stateAfterError = useTemplateStore.getState();
      expect(stateAfterError.isGenerating).toBe(false);
      // Error is formatted as 'HTTP error! status: 429' by the store's error handling
      expect(stateAfterError.error).toBeTruthy();
      expect(stateAfterError.error).toContain('429');
    });

    it('should handle model timeout error', async () => {
      // Mock fetch to return timeout error
      vi.mocked(global.fetch).mockImplementation(async () => {
        return {
          ok: false,
          status: 504,
          json: async () => ({ error: 'Request timeout' }),
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Try to start generation
      await store.startGeneration(mockQuestions);

      // Verify error state (get fresh state after async operation)
      const stateAfterError = useTemplateStore.getState();
      expect(stateAfterError.isGenerating).toBe(false);
      // Error is formatted as 'HTTP error! status: 504' by the store's error handling
      expect(stateAfterError.error).toBeTruthy();
      expect(stateAfterError.error).toContain('504');
    });

    it('should handle invalid model config error', async () => {
      // Set invalid config
      useTemplateStore.getState().setConfig({
        model_provider: '',
        model_name: '',
        temperature: 0,
        interface: 'langchain',
      });

      // Mock fetch to return validation error
      vi.mocked(global.fetch).mockImplementation(async () => {
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: 'Invalid model configuration' }),
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Try to start generation
      await store.startGeneration(mockQuestions);

      // Verify error state (get fresh state after async operation)
      const stateAfterError = useTemplateStore.getState();
      expect(stateAfterError.isGenerating).toBe(false);
      // Error is formatted as 'HTTP error! status: 400' by the store's error handling
      expect(stateAfterError.error).toBeTruthy();
      expect(stateAfterError.error).toContain('400');
    });

    it('should handle partial failure (some questions fail)', async () => {
      const mockJobId = 'test-job-partial-failure';

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/generate-answer-templates')) {
          return {
            ok: true,
            json: async () => ({ job_id: mockJobId }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Start generation
      const generationPromise = store.startGeneration(mockQuestions);

      // Simulate completion with partial failure directly via store methods
      store.completeGeneration({
        templates: {
          q1: {
            question_id: 'q1',
            template_code: 'class Answer(BaseModel):\n    capital: str',
            success: true,
          },
          q2: {
            question_id: 'q2',
            template_code: '',
            success: false,
            error: 'Failed to parse answer',
          },
          q3: {
            question_id: 'q3',
            template_code: 'class Answer(BaseModel):\n    author: str',
            success: true,
          },
        },
        total_templates: 3,
        successful_generations: 2,
        failed_generations: 1,
      } as unknown);

      await generationPromise.catch(() => {});

      // Verify partial results stored (get fresh state)
      const templates = useTemplateStore.getState().generatedTemplates;
      expect(templates.q1?.success).toBe(true);
      expect(templates.q2?.success).toBe(false);
      expect(templates.q3?.success).toBe(true);

      // Verify stats
      const successfulCount = Object.values(templates).filter((t) => t.success).length;
      expect(successfulCount).toBe(2);
    });

    it('should display results + errors for partial failure', async () => {
      const mockJobId = 'test-job-display-errors';

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/generate-answer-templates')) {
          return {
            ok: true,
            json: async () => ({ job_id: mockJobId }),
          } as Response;
        }

        if (url.includes('/api/generation-progress')) {
          return {
            ok: true,
            json: async () => ({
              result: {
                templates: {
                  q1: {
                    question_id: 'q1',
                    template_code: 'success_template',
                    success: true,
                  },
                  q2: {
                    question_id: 'q2',
                    template_code: '',
                    success: false,
                    error: 'Model output was empty',
                  },
                },
                total_templates: 2,
                successful_generations: 1,
                failed_generations: 1,
              },
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Start generation
      const generationPromise = store.startGeneration(mockQuestions);

      // Simulate completion directly via store methods
      // This bypasses WebSocket and directly calls the completion handler
      store.completeGeneration({
        templates: {
          q1: {
            question_id: 'q1',
            template_code: 'success_template',
            success: true,
          },
          q2: {
            question_id: 'q2',
            template_code: '',
            success: false,
            error: 'Model output was empty',
          },
        },
        total_templates: 2,
        successful_generations: 1,
        failed_generations: 1,
      } as unknown);

      await generationPromise.catch(() => {});

      // Verify both successful and failed templates accessible (get fresh state)
      const templates = useTemplateStore.getState().generatedTemplates;
      expect(templates.q1?.success).toBe(true);
      expect(templates.q1?.template_code).toBe('success_template');
      expect(templates.q2?.success).toBe(false);
      expect(templates.q2?.error).toBe('Model output was empty');
    });
  });

  describe('integ-052: Generation with different model configs', () => {
    it('should generate with Anthropic Claude config', async () => {
      const mockJobId = 'test-claude';

      let capturedConfig: Record<string, unknown> | null = null;

      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/generate-answer-templates')) {
          const body = JSON.parse((init?.body as string) ?? '{}');
          capturedConfig = body.config;
          return {
            ok: true,
            json: async () => ({ job_id: mockJobId }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Configure for Anthropic Claude
      store.setConfig({
        model_provider: 'anthropic',
        model_name: 'claude-sonnet-4-5',
        temperature: 0.1,
        interface: 'langchain',
      });

      // Start generation
      store.startGeneration(mockQuestions);

      // Verify config was sent
      expect(capturedConfig).toBeDefined();
      expect(capturedConfig?.model_provider).toBe('anthropic');
      expect(capturedConfig?.model_name).toBe('claude-sonnet-4-5');
      expect(capturedConfig?.interface).toBe('langchain');
    });

    it('should generate with OpenAI GPT-4 config', async () => {
      const mockJobId = 'test-gpt4';

      let capturedConfig: Record<string, unknown> | null = null;

      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/generate-answer-templates')) {
          const body = JSON.parse((init?.body as string) ?? '{}');
          capturedConfig = body.config;
          return {
            ok: true,
            json: async () => ({ job_id: mockJobId }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Configure for OpenAI GPT-4
      store.setConfig({
        model_provider: 'openai',
        model_name: 'gpt-4-turbo',
        temperature: 0.2,
        interface: 'langchain',
      });

      // Start generation
      store.startGeneration(mockQuestions);

      // Verify config was sent
      expect(capturedConfig?.model_provider).toBe('openai');
      expect(capturedConfig?.model_name).toBe('gpt-4-turbo');
    });

    it('should generate with custom endpoint config', async () => {
      const mockJobId = 'test-custom-endpoint';

      let capturedConfig: Record<string, unknown> | null = null;

      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/generate-answer-templates')) {
          const body = JSON.parse((init?.body as string) ?? '{}');
          capturedConfig = body.config;
          return {
            ok: true,
            json: async () => ({ job_id: mockJobId }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Configure for custom endpoint
      store.setConfig({
        model_provider: 'ollama',
        model_name: 'llama2',
        temperature: 0,
        interface: 'openai_endpoint',
      });

      // Start generation
      store.startGeneration(mockQuestions);

      // Verify config was sent with custom interface
      expect(capturedConfig?.interface).toBe('openai_endpoint');
      expect(capturedConfig?.model_provider).toBe('ollama');
      expect(capturedConfig?.model_name).toBe('llama2');
    });
  });

  describe('WebSocket connection management', () => {
    it('should start generation and receive job_id', async () => {
      const mockJobId = 'test-job-with-ws';

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/generate-answer-templates')) {
          return {
            ok: true,
            json: async () => ({ job_id: mockJobId }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const store = useTemplateStore.getState();

      // Start generation
      await store.startGeneration(mockQuestions);

      // Verify job ID is set (get fresh state after async operation)
      const stateAfterStart = useTemplateStore.getState();
      expect(stateAfterStart.jobId).toBe(mockJobId);
      expect(stateAfterStart.isGenerating).toBe(true);

      // Clean up - cancel generation
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/cancel-generation')) {
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      await store.cancelGeneration();

      // Verify cancellation state
      expect(store.isGenerating).toBe(false);
      expect(store.jobId).toBeNull();
    });
  });

  describe('Store state management', () => {
    it('should reset template state correctly', () => {
      const store = useTemplateStore.getState();

      // Set some state
      store.setConfig({
        model_provider: 'test',
        model_name: 'test-model',
        temperature: 0.5,
        interface: 'langchain',
      });

      store.setError('test error');

      // Reset
      store.resetTemplateState();

      // Verify reset
      const newState = useTemplateStore.getState();
      expect(newState.config.model_provider).toBe('anthropic'); // Reset to default
      expect(newState.error).toBeNull();
      expect(newState.jobId).toBeNull();
      expect(newState.progress).toBeNull();
      expect(newState.generatedTemplates).toEqual({});
    });
  });
});
