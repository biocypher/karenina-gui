import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, userEvent, waitFor } from '../../test-utils/test-helpers';
import { RubricTraitGenerator } from '../RubricTraitGenerator';
import { useRubricStore } from '../../stores/useRubricStore';
import { useQuestionStore } from '../../stores/useQuestionStore';
import { server } from '../../test-utils/mocks/server';
import { http, HttpResponse } from 'msw';
import { API_ENDPOINTS } from '../../constants/api';

// Mock the stores
vi.mock('../../stores/useRubricStore');
vi.mock('../../stores/useQuestionStore');

const mockUseRubricStore = vi.mocked(useRubricStore);
const mockUseQuestionStore = vi.mocked(useQuestionStore);

describe('RubricTraitGenerator', () => {
  const mockSetGeneratedTraits = vi.fn();
  const mockSetIsGeneratingTraits = vi.fn();
  const mockSetTraitGenerationError = vi.fn();

  const mockQuestionData = {
    'q1': {
      question: 'What is the capital of France?',
      raw_answer: 'Paris',
      answer_template: 'class Answer(BaseModel): capital: str'
    },
    'q2': {
      question: 'Explain photosynthesis.',
      raw_answer: 'Photosynthesis is...',
      answer_template: 'class Answer(BaseModel): explanation: str'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useRubricStore
    mockUseRubricStore.mockReturnValue({
      currentRubric: null,
      generatedTraits: [],
      isGeneratingTraits: false,
      traitGenerationError: null,
      setCurrentRubric: vi.fn(),
      clearCurrentRubric: vi.fn(),
      setGeneratedTraits: mockSetGeneratedTraits,
      clearGeneratedTraits: vi.fn(),
      setIsGeneratingTraits: mockSetIsGeneratingTraits,
      setTraitGenerationError: mockSetTraitGenerationError,
      resetRubricState: vi.fn(),
    });

    // Mock useQuestionStore
    mockUseQuestionStore.mockReturnValue({
      questionData: mockQuestionData,
      selectedQuestions: ['q1', 'q2'],
      setQuestionData: vi.fn(),
      setSelectedQuestions: vi.fn(),
      clearQuestionData: vi.fn(),
      resetQuestionState: vi.fn(),
    });
  });

  describe('Initial Rendering', () => {
    it('should render with default state', () => {
      render(<RubricTraitGenerator />);
      
      expect(screen.getByText('Generate Rubric Traits')).toBeInTheDocument();
      expect(screen.getByText('System Prompt')).toBeInTheDocument();
      expect(screen.getByText('Questions to Analyze')).toBeInTheDocument();
      expect(screen.getByText('Your Suggestions')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate traits/i })).toBeInTheDocument();
    });

    it('should show default system prompt', () => {
      render(<RubricTraitGenerator />);
      
      const systemPromptTextarea = screen.getByDisplayValue(/You are an expert in educational assessment/);
      expect(systemPromptTextarea).toBeInTheDocument();
    });

    it('should show selected questions from store', () => {
      render(<RubricTraitGenerator />);
      
      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
      expect(screen.getByText('Explain photosynthesis.')).toBeInTheDocument();
    });

    it('should display question count', () => {
      render(<RubricTraitGenerator />);
      
      expect(screen.getByText('2 questions selected')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should update system prompt', async () => {
      const user = userEvent.setup();
      render(<RubricTraitGenerator />);
      
      const systemPromptTextarea = screen.getByDisplayValue(/You are an expert in educational assessment/);
      
      await user.clear(systemPromptTextarea);
      await user.type(systemPromptTextarea, 'Custom system prompt');
      
      expect(systemPromptTextarea).toHaveValue('Custom system prompt');
    });

    it('should add user suggestions', async () => {
      const user = userEvent.setup();
      render(<RubricTraitGenerator />);
      
      const suggestionsInput = screen.getByPlaceholderText(/clarity, accuracy, relevance/);
      
      await user.type(suggestionsInput, 'clarity, depth, relevance');
      
      expect(suggestionsInput).toHaveValue('clarity, depth, relevance');
    });

    it('should update model configuration', async () => {
      const user = userEvent.setup();
      render(<RubricTraitGenerator />);
      
      // Change model provider
      const providerSelect = screen.getByDisplayValue('openai');
      await user.selectOptions(providerSelect, 'google_genai');
      expect(providerSelect).toHaveValue('google_genai');
      
      // Change model name
      const modelSelect = screen.getByDisplayValue('gpt-3.5-turbo');
      await user.selectOptions(modelSelect, 'gpt-4');
      expect(modelSelect).toHaveValue('gpt-4');
      
      // Change temperature
      const temperatureInput = screen.getByDisplayValue('0.1');
      await user.clear(temperatureInput);
      await user.type(temperatureInput, '0.3');
      expect(temperatureInput).toHaveValue('0.3');
    });
  });

  describe('Trait Generation', () => {
    beforeEach(() => {
      // Mock successful API response
      server.use(
        http.post(API_ENDPOINTS.GENERATE_RUBRIC_TRAITS, () => {
          return HttpResponse.json({
            traits: [
              {
                name: 'accuracy',
                description: 'Is the response factually accurate?',
                kind: 'boolean',
                min_score: null,
                max_score: null
              },
              {
                name: 'completeness',
                description: 'How complete is the response?',
                kind: 'score',
                min_score: 1,
                max_score: 5
              }
            ]
          });
        })
      );
    });

    it('should generate traits successfully', async () => {
      const user = userEvent.setup();
      render(<RubricTraitGenerator />);
      
      const generateButton = screen.getByRole('button', { name: /generate traits/i });
      await user.click(generateButton);
      
      expect(mockSetIsGeneratingTraits).toHaveBeenCalledWith(true);
      
      await waitFor(() => {
        expect(mockSetGeneratedTraits).toHaveBeenCalledWith([
          {
            name: 'accuracy',
            description: 'Is the response factually accurate?',
            kind: 'boolean',
            min_score: null,
            max_score: null
          },
          {
            name: 'completeness',
            description: 'How complete is the response?',
            kind: 'score',
            min_score: 1,
            max_score: 5
          }
        ]);
      });
      
      expect(mockSetIsGeneratingTraits).toHaveBeenCalledWith(false);
      expect(mockSetTraitGenerationError).toHaveBeenCalledWith(null);
    });

    it('should send correct request payload', async () => {
      const user = userEvent.setup();
      let requestBody: any;
      
      server.use(
        http.post(API_ENDPOINTS.GENERATE_RUBRIC_TRAITS, async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json({ traits: [] });
        })
      );
      
      render(<RubricTraitGenerator />);
      
      // Add user suggestions
      const suggestionsInput = screen.getByPlaceholderText(/clarity, accuracy, relevance/);
      await user.type(suggestionsInput, 'clarity, depth');
      
      // Generate traits
      const generateButton = screen.getByRole('button', { name: /generate traits/i });
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(requestBody).toEqual({
          questions: [
            { id: 'q1', text: 'What is the capital of France?' },
            { id: 'q2', text: 'Explain photosynthesis.' }
          ],
          system_prompt: expect.stringContaining('You are an expert in educational assessment'),
          user_suggestions: ['clarity', 'depth'],
          model_provider: 'openai',
          model_name: 'gpt-3.5-turbo',
          temperature: 0.1
        });
      });
    });

    it('should disable button during generation', async () => {
      const user = userEvent.setup();
      
      // Mock store to show generating state
      mockUseRubricStore.mockReturnValue({
        currentRubric: null,
        generatedTraits: [],
        isGeneratingTraits: true,
        traitGenerationError: null,
        setCurrentRubric: vi.fn(),
        clearCurrentRubric: vi.fn(),
        setGeneratedTraits: mockSetGeneratedTraits,
        clearGeneratedTraits: vi.fn(),
        setIsGeneratingTraits: mockSetIsGeneratingTraits,
        setTraitGenerationError: mockSetTraitGenerationError,
        resetRubricState: vi.fn(),
      });
      
      render(<RubricTraitGenerator />);
      
      const generateButton = screen.getByRole('button', { name: /generating/i });
      expect(generateButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.post(API_ENDPOINTS.GENERATE_RUBRIC_TRAITS, () => {
          return HttpResponse.json(
            { detail: 'Generation failed' },
            { status: 500 }
          );
        })
      );
      
      render(<RubricTraitGenerator />);
      
      const generateButton = screen.getByRole('button', { name: /generate traits/i });
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(mockSetTraitGenerationError).toHaveBeenCalledWith('Generation failed');
      });
      
      expect(mockSetIsGeneratingTraits).toHaveBeenCalledWith(false);
    });

    it('should handle network errors', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.post(API_ENDPOINTS.GENERATE_RUBRIC_TRAITS, () => {
          return HttpResponse.error();
        })
      );
      
      render(<RubricTraitGenerator />);
      
      const generateButton = screen.getByRole('button', { name: /generate traits/i });
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(mockSetTraitGenerationError).toHaveBeenCalledWith(
          expect.stringContaining('Failed to generate traits')
        );
      });
    });

    it('should show error message when present', () => {
      mockUseRubricStore.mockReturnValue({
        currentRubric: null,
        generatedTraits: [],
        isGeneratingTraits: false,
        traitGenerationError: 'Test error message',
        setCurrentRubric: vi.fn(),
        clearCurrentRubric: vi.fn(),
        setGeneratedTraits: mockSetGeneratedTraits,
        clearGeneratedTraits: vi.fn(),
        setIsGeneratingTraits: mockSetIsGeneratingTraits,
        setTraitGenerationError: mockSetTraitGenerationError,
        resetRubricState: vi.fn(),
      });
      
      render(<RubricTraitGenerator />);
      
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty question data', () => {
      mockUseQuestionStore.mockReturnValue({
        questionData: {},
        selectedQuestions: [],
        setQuestionData: vi.fn(),
        setSelectedQuestions: vi.fn(),
        clearQuestionData: vi.fn(),
        resetQuestionState: vi.fn(),
      });
      
      render(<RubricTraitGenerator />);
      
      expect(screen.getByText('0 questions selected')).toBeInTheDocument();
      expect(screen.getByText('No questions selected')).toBeInTheDocument();
    });

    it('should handle questions without selection', () => {
      mockUseQuestionStore.mockReturnValue({
        questionData: mockQuestionData,
        selectedQuestions: [],
        setQuestionData: vi.fn(),
        setSelectedQuestions: vi.fn(),
        clearQuestionData: vi.fn(),
        resetQuestionState: vi.fn(),
      });
      
      render(<RubricTraitGenerator />);
      
      expect(screen.getByText('0 questions selected')).toBeInTheDocument();
      expect(screen.getByText('No questions selected')).toBeInTheDocument();
    });

    it('should prevent generation with no questions', async () => {
      const user = userEvent.setup();
      
      mockUseQuestionStore.mockReturnValue({
        questionData: {},
        selectedQuestions: [],
        setQuestionData: vi.fn(),
        setSelectedQuestions: vi.fn(),
        clearQuestionData: vi.fn(),
        resetQuestionState: vi.fn(),
      });
      
      render(<RubricTraitGenerator />);
      
      const generateButton = screen.getByRole('button', { name: /generate traits/i });
      expect(generateButton).toBeDisabled();
    });

    it('should handle very long system prompts', async () => {
      const user = userEvent.setup();
      render(<RubricTraitGenerator />);
      
      const systemPromptTextarea = screen.getByDisplayValue(/You are an expert in educational assessment/);
      const longPrompt = 'A'.repeat(5000);
      
      await user.clear(systemPromptTextarea);
      await user.type(systemPromptTextarea, longPrompt);
      
      expect(systemPromptTextarea).toHaveValue(longPrompt);
    });

    it('should handle special characters in suggestions', async () => {
      const user = userEvent.setup();
      render(<RubricTraitGenerator />);
      
      const suggestionsInput = screen.getByPlaceholderText(/clarity, accuracy, relevance/);
      const specialChars = 'trait-1, trait_2, trait@3, trait#4';
      
      await user.type(suggestionsInput, specialChars);
      
      expect(suggestionsInput).toHaveValue(specialChars);
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<RubricTraitGenerator />);
      
      expect(screen.getByLabelText(/system prompt/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/your suggestions/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/model provider/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/model name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/temperature/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<RubricTraitGenerator />);
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByDisplayValue(/You are an expert in educational assessment/)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByPlaceholderText(/clarity, accuracy, relevance/)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByDisplayValue('openai')).toHaveFocus();
    });

    it('should have proper ARIA attributes', () => {
      render(<RubricTraitGenerator />);
      
      const generateButton = screen.getByRole('button', { name: /generate traits/i });
      expect(generateButton).toHaveAttribute('type', 'button');
      
      // Check for proper form structure
      const form = generateButton.closest('form');
      expect(form).toBeInTheDocument();
    });
  });
});