import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTemplateStore } from '../useTemplateStore';
import {
  QuestionData,
  TemplateGenerationConfig,
  TemplateGenerationProgress,
  TemplateGenerationResult,
  GeneratedTemplate,
} from '../../types';

// Mock logger and error handler
vi.mock('../../utils/logger', () => ({
  logger: {
    data: {
      templatesGenerated: vi.fn(),
    },
    warn: {
      noGeneratedTemplates: vi.fn(),
    },
  },
}));

vi.mock('../../utils/errorHandler', () => ({
  handleApiError: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock createElement for download tests
const mockCreateElement = vi.fn();
const mockClick = vi.fn();
const mockSetAttribute = vi.fn();

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement.mockReturnValue({
    setAttribute: mockSetAttribute,
    click: mockClick,
  }),
});

describe('useTemplateStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTemplateStore.getState().resetTemplateState();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Mock data
  const mockQuestions: QuestionData = {
    q1: {
      question: 'What is the capital of France?',
      raw_answer: 'Paris',
      answer_template: 'placeholder template',
    },
    q2: {
      question: 'What is 2+2?',
      raw_answer: '4',
      answer_template: 'placeholder template',
    },
  };

  const mockConfig: TemplateGenerationConfig = {
    model_provider: 'openai',
    model_name: 'gpt-4',
    temperature: 0.2,
    interface: 'langchain',
  };

  const mockGeneratedTemplate: GeneratedTemplate = {
    success: true,
    template_code: 'class Answer(BaseAnswer):\n    capital: str = Field(description="Capital city")',
    error: null,
    metadata: {
      processing_time: 1.5,
      model_used: 'gpt-4',
    },
  };

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const store = useTemplateStore.getState();

      expect(store.config.model_provider).toBe('google_genai');
      expect(store.config.model_name).toBe('gemini-2.0-flash');
      expect(store.customSystemPrompt).toBe(null);
      expect(store.selectedQuestions.size).toBe(0);
      expect(store.hasInitialized).toBe(false);
      expect(store.isGenerating).toBe(false);
      expect(store.generatedTemplates).toEqual({});
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const store = useTemplateStore.getState();

      store.setConfig(mockConfig);

      expect(useTemplateStore.getState().config).toEqual(mockConfig);
    });

    it('should update custom system prompt', () => {
      const store = useTemplateStore.getState();

      store.setCustomSystemPrompt('Custom prompt');

      expect(useTemplateStore.getState().customSystemPrompt).toBe('Custom prompt');
    });
  });

  describe('Question Selection', () => {
    it('should set selected questions', () => {
      const store = useTemplateStore.getState();
      const selectedSet = new Set(['q1', 'q2']);

      store.setSelectedQuestions(selectedSet);

      expect(useTemplateStore.getState().selectedQuestions).toEqual(selectedSet);
    });

    it('should initialize selection with pending questions', () => {
      const store = useTemplateStore.getState();

      store.initializeSelection(mockQuestions);

      const state = useTemplateStore.getState();
      expect(state.selectedQuestions.has('q1')).toBe(true);
      expect(state.selectedQuestions.has('q2')).toBe(true);
      expect(state.hasInitialized).toBe(true);
    });
  });

  describe('Generation Process', () => {
    it('should start generation successfully', async () => {
      const store = useTemplateStore.getState();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ job_id: 'job123' }),
      });

      store.setSelectedQuestions(new Set(['q1']));

      await store.startGeneration(mockQuestions);

      const state = useTemplateStore.getState();
      expect(state.isGenerating).toBe(true);
      expect(state.jobId).toBe('job123');
      expect(state.error).toBe(null);
    });

    it('should require selected questions to start generation', async () => {
      const store = useTemplateStore.getState();

      await store.startGeneration(mockQuestions);

      const state = useTemplateStore.getState();
      expect(state.error).toBe('Please select at least one question to generate templates for.');
      expect(state.isGenerating).toBe(false);
    });
  });

  describe('Progress Management', () => {
    it('should update progress', () => {
      const store = useTemplateStore.getState();
      const mockProgress: TemplateGenerationProgress = {
        status: 'running',
        current_question: 'q1',
        completed_questions: ['q1'],
        total_questions: 2,
        progress_percentage: 50,
        estimated_time_remaining: 30,
      };

      store.updateProgress(mockProgress);

      expect(useTemplateStore.getState().progress).toEqual(mockProgress);
    });

    it('should complete generation', () => {
      const store = useTemplateStore.getState();
      const mockResult: TemplateGenerationResult = {
        templates: {
          q1: mockGeneratedTemplate,
        },
        summary: {
          total_questions: 1,
          successful_generations: 1,
          failed_generations: 0,
          total_processing_time: 1.5,
        },
      };

      store.completeGeneration(mockResult);

      const state = useTemplateStore.getState();
      expect(state.isGenerating).toBe(false);
      expect(state.result).toEqual(mockResult);
      expect(state.generatedTemplates['q1']).toEqual(mockGeneratedTemplate);
    });

    it('should fail generation', () => {
      const store = useTemplateStore.getState();

      store.failGeneration('Custom error');

      const state = useTemplateStore.getState();
      expect(state.isGenerating).toBe(false);
      expect(state.error).toBe('Custom error');
    });
  });

  describe('Template Management', () => {
    it('should remove generated template', () => {
      const store = useTemplateStore.getState();

      // Set up templates
      useTemplateStore.setState({
        generatedTemplates: {
          q1: mockGeneratedTemplate,
          q2: { ...mockGeneratedTemplate, success: false },
        },
      });

      store.removeGeneratedTemplate('q1');

      const state = useTemplateStore.getState();
      expect(state.generatedTemplates['q1']).toBeUndefined();
      expect(state.generatedTemplates['q2']).toBeDefined();
    });
  });

  describe('Computed Getters', () => {
    it('should get pending questions', () => {
      const store = useTemplateStore.getState();

      // Set up some generated templates
      useTemplateStore.setState({
        generatedTemplates: {
          q1: mockGeneratedTemplate, // q1 is successfully generated
        },
      });

      const pending = store.getPendingQuestions(mockQuestions);

      expect(Object.keys(pending)).toEqual(['q2']); // only q2 is pending
    });

    it('should get selected count', () => {
      const store = useTemplateStore.getState();

      store.setSelectedQuestions(new Set(['q1', 'q2']));

      expect(store.getSelectedCount()).toBe(2);
    });

    it('should get generated count', () => {
      const store = useTemplateStore.getState();

      useTemplateStore.setState({
        generatedTemplates: {
          q1: mockGeneratedTemplate,
          q2: { ...mockGeneratedTemplate, success: false },
        },
      });

      expect(store.getGeneratedCount()).toBe(2);
    });

    it('should get successful templates', () => {
      const store = useTemplateStore.getState();

      useTemplateStore.setState({
        generatedTemplates: {
          q1: mockGeneratedTemplate,
          q2: { ...mockGeneratedTemplate, success: false },
        },
      });

      const successful = store.getSuccessfulTemplates();

      expect(Object.keys(successful)).toEqual(['q1']);
      expect(successful['q1']).toEqual(mockGeneratedTemplate);
    });
  });

  describe('Add to Curation', () => {
    it('should add successful templates to curation', () => {
      const store = useTemplateStore.getState();
      const onTemplatesGenerated = vi.fn();
      const onSwitchToCurator = vi.fn();

      useTemplateStore.setState({
        generatedTemplates: {
          q1: mockGeneratedTemplate,
          q2: { ...mockGeneratedTemplate, success: false },
        },
      });

      store.addToCuration(mockQuestions, onTemplatesGenerated, onSwitchToCurator);

      expect(onTemplatesGenerated).toHaveBeenCalledWith({
        q1: {
          ...mockQuestions['q1'],
          answer_template: mockGeneratedTemplate.template_code,
        },
      });
      expect(onSwitchToCurator).toHaveBeenCalled();
    });
  });

  describe('Reset State', () => {
    it('should reset all template state', () => {
      const store = useTemplateStore.getState();

      // Set up some state
      store.setConfig(mockConfig);
      store.setSelectedQuestions(new Set(['q1']));
      store.setCustomSystemPrompt('test');
      useTemplateStore.setState({
        isGenerating: true,
        generatedTemplates: { q1: mockGeneratedTemplate },
      });

      // Reset
      store.resetTemplateState();

      const state = useTemplateStore.getState();
      expect(state.config.model_provider).toBe('google_genai');
      expect(state.selectedQuestions.size).toBe(0);
      expect(state.customSystemPrompt).toBe(null);
      expect(state.isGenerating).toBe(false);
      expect(state.generatedTemplates).toEqual({});
      expect(state.hasInitialized).toBe(false);
    });
  });

  describe('Retry Failed Template', () => {
    it('should retry a failed template', async () => {
      const store = useTemplateStore.getState();

      // Set up a failed template
      useTemplateStore.setState({
        generatedTemplates: {
          q1: {
            question_id: 'q1',
            template_code: '',
            generation_time: 1000,
            success: false,
            error_message: 'Generation failed',
          },
        },
      });

      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ job_id: 'retry-job-123' }),
      });

      // Retry the failed template
      await store.retryFailedTemplate('q1', mockQuestions);

      // Check that selected questions were set to only the failed question
      const state = useTemplateStore.getState();
      expect(state.selectedQuestions.has('q1')).toBe(true);
      expect(state.selectedQuestions.size).toBe(1);

      // Check that generation was started with force regenerate
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/generate-answer-templates',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"force_regenerate":true'),
        })
      );
    });

    it('should not retry a successful template', async () => {
      const store = useTemplateStore.getState();

      // Set up a successful template
      useTemplateStore.setState({
        generatedTemplates: {
          q1: mockGeneratedTemplate,
        },
      });

      await store.retryFailedTemplate('q1', mockQuestions);

      // Should not make any API calls
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle missing question data', async () => {
      const store = useTemplateStore.getState();

      // Set up a failed template
      useTemplateStore.setState({
        generatedTemplates: {
          q1: {
            question_id: 'q1',
            template_code: '',
            generation_time: 1000,
            success: false,
            error_message: 'Generation failed',
          },
        },
      });

      // Try to retry with empty questions data
      await store.retryFailedTemplate('q1', {});

      // Should set error state
      const state = useTemplateStore.getState();
      expect(state.error).toBe('Question not found for retry');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle non-existent template', async () => {
      const store = useTemplateStore.getState();

      await store.retryFailedTemplate('non-existent', mockQuestions);

      // Should not make any API calls
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
