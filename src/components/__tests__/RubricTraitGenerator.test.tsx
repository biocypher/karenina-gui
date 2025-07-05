import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RubricTraitGenerator from '../RubricTraitGenerator';
import { useRubricStore } from '../../stores/useRubricStore';
import { QuestionData } from '../../types';

// Mock the useRubricStore
vi.mock('../../stores/useRubricStore');

describe('RubricTraitGenerator', () => {
  const mockGenerateTraits = vi.fn();
  const mockApplyGeneratedTraits = vi.fn();
  const mockClearError = vi.fn();
  const mockOnTraitsGenerated = vi.fn();

  const mockQuestions: QuestionData = {
    q1: {
      question: 'What is the capital of France?',
      raw_answer: 'Paris',
      answer_template: '',
    },
    q2: {
      question: 'What is the largest planet in our solar system?',
      raw_answer: 'Jupiter',
      answer_template: '',
    },
    q3: {
      question: 'Who wrote Romeo and Juliet?',
      raw_answer: 'William Shakespeare',
      answer_template: '',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the default system prompt API call
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ prompt: 'You are an expert in rubric design. Test prompt for testing purposes.' }),
    });

    // Mock the store with the actual interface
    (useRubricStore as ReturnType<typeof vi.fn>).mockReturnValue({
      currentRubric: null,
      generatedSuggestions: [],
      isGeneratingTraits: false,
      isLoadingRubric: false,
      isSavingRubric: false,
      lastError: null,
      config: {
        model_provider: 'google_genai',
        model_name: 'gemini-2.0-flash',
        temperature: 0.1,
        interface: 'langchain',
      },
      setCurrentRubric: vi.fn(),
      addTrait: vi.fn(),
      updateTrait: vi.fn(),
      removeTrait: vi.fn(),
      reorderTraits: vi.fn(),
      generateTraits: mockGenerateTraits,
      loadRubric: vi.fn(),
      saveRubric: vi.fn(),
      deleteRubric: vi.fn(),
      clearError: mockClearError,
      reset: vi.fn(),
      applyGeneratedTraits: mockApplyGeneratedTraits,
      setConfig: vi.fn(),
    });
  });

  it('renders the component with collapsed state by default', async () => {
    await act(async () => {
      render(<RubricTraitGenerator questions={mockQuestions} />);
    });

    expect(screen.getByText('Rubric Trait Generator')).toBeInTheDocument();
    expect(screen.queryByText('System prompt')).not.toBeInTheDocument();
  });

  it('expands when header is clicked', async () => {
    await act(async () => {
      render(<RubricTraitGenerator questions={mockQuestions} />);
    });

    const header = screen.getByRole('button', { name: /Rubric Trait Generator/i });

    await act(async () => {
      fireEvent.click(header);
    });

    expect(screen.getByText('System prompt')).toBeInTheDocument();
    expect(screen.getByText('Context question - Answer pairs')).toBeInTheDocument();
  });

  it('displays questions in table format with actual content', async () => {
    await act(async () => {
      render(<RubricTraitGenerator questions={mockQuestions} />);
    });

    // Expand the component
    const header = screen.getByRole('button', { name: /Rubric Trait Generator/i });
    await act(async () => {
      fireEvent.click(header);
    });

    // Check table headers
    expect(screen.getByText('Question')).toBeInTheDocument();
    expect(screen.getByText('Answer')).toBeInTheDocument();
    expect(screen.getByText('ID')).toBeInTheDocument();

    // Check actual question content is displayed
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('What is the largest planet in our solar system?')).toBeInTheDocument();
    expect(screen.getByText('Jupiter')).toBeInTheDocument();
  });

  it('selects all questions by default', async () => {
    await act(async () => {
      render(<RubricTraitGenerator questions={mockQuestions} />);
    });

    const header = screen.getByRole('button', { name: /Rubric Trait Generator/i });
    await act(async () => {
      fireEvent.click(header);
    });

    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is the "select all" checkbox, rest are individual questions
    expect(checkboxes).toHaveLength(4); // 1 header + 3 questions

    // All checkboxes should be checked
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  });

  it('handles Select All and Select None buttons', async () => {
    await act(async () => {
      render(<RubricTraitGenerator questions={mockQuestions} />);
    });

    await act(async () => {
      const header = screen.getByRole('button', { name: /Rubric Trait Generator/i });
      fireEvent.click(header);
    });

    // Check that Select All and Select None buttons exist
    expect(screen.getByRole('button', { name: /Select All/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select None/i })).toBeInTheDocument();
  });

  it('handles individual question selection', async () => {
    await act(async () => {
      render(<RubricTraitGenerator questions={mockQuestions} />);
    });

    await act(async () => {
      const header = screen.getByRole('button', { name: /Rubric Trait Generator/i });
      fireEvent.click(header);
    });

    // Find the checkbox for the first question (skip the header checkbox)
    const checkboxes = screen.getAllByRole('checkbox');
    const firstQuestionCheckbox = checkboxes[1];

    // Uncheck it
    await act(async () => {
      fireEvent.click(firstQuestionCheckbox);
    });
    expect(firstQuestionCheckbox).not.toBeChecked();

    // Check it again
    await act(async () => {
      fireEvent.click(firstQuestionCheckbox);
    });
    expect(firstQuestionCheckbox).toBeChecked();
  });

  it('generates traits with selected questions and passes correct data', async () => {
    await act(async () => {
      render(<RubricTraitGenerator questions={mockQuestions} onTraitsGenerated={mockOnTraitsGenerated} />);
    });

    await act(async () => {
      const header = screen.getByRole('button', { name: /Rubric Trait Generator/i });
      fireEvent.click(header);
    });

    // Wait for the system prompt to load
    await waitFor(() => {
      expect(
        screen.getByDisplayValue('You are an expert in rubric design. Test prompt for testing purposes.')
      ).toBeInTheDocument();
    });

    // Enter system prompt
    const user = userEvent.setup();
    await act(async () => {
      const systemPromptInput = screen.getByDisplayValue(
        'You are an expert in rubric design. Test prompt for testing purposes.'
      );
      await user.clear(systemPromptInput);
      await user.type(systemPromptInput, 'Test system prompt');
    });

    // Enter user suggestions
    await act(async () => {
      const suggestionsInput = screen.getByPlaceholderText(/clarity, conciseness/i);
      fireEvent.change(suggestionsInput, { target: { value: 'clarity, accuracy' } });
    });

    // Click generate
    await act(async () => {
      const generateButton = screen.getByRole('button', { name: /Generate traits/i });
      fireEvent.click(generateButton);
    });

    // Verify the generateTraits was called with correct data
    expect(mockGenerateTraits).toHaveBeenCalledWith({
      questions: mockQuestions,
      system_prompt: 'Test system prompt',
      user_suggestions: ['clarity', 'accuracy'],
      config: {
        model_provider: 'google_genai',
        model_name: 'gemini-2.0-flash',
        temperature: 0.1,
        interface: 'langchain',
      },
    });
  });

  it('truncates long question and answer text', async () => {
    const longQuestions: QuestionData = {
      long1: {
        question:
          'This is a very long question that should be truncated because it exceeds the maximum length allowed for display in the table',
        raw_answer: 'This is a very long answer that should also be truncated when displayed',
        answer_template: '',
      },
    };

    await act(async () => {
      render(<RubricTraitGenerator questions={longQuestions} />);
    });

    await act(async () => {
      const header = screen.getByRole('button', { name: /Rubric Trait Generator/i });
      fireEvent.click(header);
    });

    // Check that text is truncated (ends with ...)
    const questionText = screen.getByText(/This is a very long question.*\.\.\./);
    const answerText = screen.getByText(/This is a very long answer.*\.\.\./);

    expect(questionText).toBeInTheDocument();
    expect(answerText).toBeInTheDocument();
  });

  it('displays error message when present', async () => {
    (useRubricStore as ReturnType<typeof vi.fn>).mockReturnValue({
      currentRubric: null,
      generatedSuggestions: [],
      isGeneratingTraits: false,
      isLoadingRubric: false,
      isSavingRubric: false,
      lastError: 'Failed to generate traits',
      config: {
        model_provider: 'google_genai',
        model_name: 'gemini-2.0-flash',
        temperature: 0.1,
        interface: 'langchain',
      },
      setCurrentRubric: vi.fn(),
      addTrait: vi.fn(),
      updateTrait: vi.fn(),
      removeTrait: vi.fn(),
      reorderTraits: vi.fn(),
      generateTraits: mockGenerateTraits,
      loadRubric: vi.fn(),
      saveRubric: vi.fn(),
      deleteRubric: vi.fn(),
      clearError: mockClearError,
      reset: vi.fn(),
      applyGeneratedTraits: mockApplyGeneratedTraits,
      setConfig: vi.fn(),
    });

    await act(async () => {
      render(<RubricTraitGenerator questions={mockQuestions} />);
    });

    await act(async () => {
      const header = screen.getByRole('button', { name: /Rubric Trait Generator/i });
      fireEvent.click(header);
    });

    expect(screen.getByText('Failed to generate traits')).toBeInTheDocument();

    // Click dismiss
    await act(async () => {
      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      fireEvent.click(dismissButton);
    });

    expect(mockClearError).toHaveBeenCalled();
  });

  it('displays and applies generated traits', async () => {
    const mockTraits = [
      { name: 'clarity', kind: 'binary', description: 'Is the answer clear?' },
      { name: 'accuracy', kind: 'scale', description: 'How accurate is the answer?' },
    ];

    (useRubricStore as ReturnType<typeof vi.fn>).mockReturnValue({
      currentRubric: null,
      generatedSuggestions: mockTraits,
      isGeneratingTraits: false,
      isLoadingRubric: false,
      isSavingRubric: false,
      lastError: null,
      config: {
        model_provider: 'google_genai',
        model_name: 'gemini-2.0-flash',
        temperature: 0.1,
        interface: 'langchain',
      },
      setCurrentRubric: vi.fn(),
      addTrait: vi.fn(),
      updateTrait: vi.fn(),
      removeTrait: vi.fn(),
      reorderTraits: vi.fn(),
      generateTraits: mockGenerateTraits,
      loadRubric: vi.fn(),
      saveRubric: vi.fn(),
      deleteRubric: vi.fn(),
      clearError: mockClearError,
      reset: vi.fn(),
      applyGeneratedTraits: mockApplyGeneratedTraits,
      setConfig: vi.fn(),
    });

    await act(async () => {
      render(<RubricTraitGenerator questions={mockQuestions} />);
    });

    await act(async () => {
      const header = screen.getByRole('button', { name: /Rubric Trait Generator/i });
      fireEvent.click(header);
    });

    // Check generated traits are displayed
    expect(screen.getByText('Generated Traits (2)')).toBeInTheDocument();
    expect(screen.getByText('clarity')).toBeInTheDocument();
    expect(screen.getByText('accuracy')).toBeInTheDocument();

    // Click apply traits
    await act(async () => {
      const applyButton = screen.getByRole('button', { name: /Apply Traits/i });
      fireEvent.click(applyButton);
    });

    expect(mockApplyGeneratedTraits).toHaveBeenCalledWith(mockTraits);
  });

  it('shows loading state during generation', async () => {
    (useRubricStore as ReturnType<typeof vi.fn>).mockReturnValue({
      currentRubric: null,
      generatedSuggestions: [],
      isGeneratingTraits: true,
      isLoadingRubric: false,
      isSavingRubric: false,
      lastError: null,
      config: {
        model_provider: 'google_genai',
        model_name: 'gemini-2.0-flash',
        temperature: 0.1,
        interface: 'langchain',
      },
      setCurrentRubric: vi.fn(),
      addTrait: vi.fn(),
      updateTrait: vi.fn(),
      removeTrait: vi.fn(),
      reorderTraits: vi.fn(),
      generateTraits: mockGenerateTraits,
      loadRubric: vi.fn(),
      saveRubric: vi.fn(),
      deleteRubric: vi.fn(),
      clearError: mockClearError,
      reset: vi.fn(),
      applyGeneratedTraits: mockApplyGeneratedTraits,
      setConfig: vi.fn(),
    });

    await act(async () => {
      render(<RubricTraitGenerator questions={mockQuestions} />);
    });

    await act(async () => {
      const header = screen.getByRole('button', { name: /Rubric Trait Generator/i });
      fireEvent.click(header);
    });

    expect(screen.getByText('Generating traits...')).toBeInTheDocument();
  });

  it('filters questions based on search term', async () => {
    (useRubricStore as ReturnType<typeof vi.fn>).mockReturnValue({
      currentRubric: null,
      generatedSuggestions: [],
      isGeneratingTraits: false,
      isLoadingRubric: false,
      isSavingRubric: false,
      lastError: null,
      config: {
        model_provider: 'google_genai',
        model_name: 'gemini-2.0-flash',
        temperature: 0.1,
        interface: 'langchain',
      },
      setCurrentRubric: vi.fn(),
      addTrait: vi.fn(),
      updateTrait: vi.fn(),
      removeTrait: vi.fn(),
      reorderTraits: vi.fn(),
      generateTraits: mockGenerateTraits,
      loadRubric: vi.fn(),
      saveRubric: vi.fn(),
      deleteRubric: vi.fn(),
      clearError: mockClearError,
      reset: vi.fn(),
      applyGeneratedTraits: mockApplyGeneratedTraits,
      setConfig: vi.fn(),
    });

    await act(async () => {
      render(<RubricTraitGenerator questions={mockQuestions} />);
    });

    await act(async () => {
      const header = screen.getByRole('button', { name: /Rubric Trait Generator/i });
      fireEvent.click(header);
    });

    // Initially all questions should be visible
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    expect(screen.getByText('What is the largest planet in our solar system?')).toBeInTheDocument();
    expect(screen.getByText('Who wrote Romeo and Juliet?')).toBeInTheDocument();

    // Search for 'France'
    await act(async () => {
      const searchInput = screen.getByPlaceholderText('Search questions, answers, or IDs...');
      fireEvent.change(searchInput, { target: { value: 'France' } });
    });

    // Should only show the France question
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    expect(screen.queryByText('What is the largest planet in our solar system?')).not.toBeInTheDocument();
    expect(screen.queryByText('Who wrote Romeo and Juliet?')).not.toBeInTheDocument();

    // Clear search
    await act(async () => {
      const searchInput = screen.getByPlaceholderText('Search questions, answers, or IDs...');
      fireEvent.change(searchInput, { target: { value: '' } });
    });

    // All questions should be visible again
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    expect(screen.getByText('What is the largest planet in our solar system?')).toBeInTheDocument();
    expect(screen.getByText('Who wrote Romeo and Juliet?')).toBeInTheDocument();
  });

  it('shows no results message when search has no matches', async () => {
    (useRubricStore as ReturnType<typeof vi.fn>).mockReturnValue({
      currentRubric: null,
      generatedSuggestions: [],
      isGeneratingTraits: false,
      isLoadingRubric: false,
      isSavingRubric: false,
      lastError: null,
      config: {
        model_provider: 'google_genai',
        model_name: 'gemini-2.0-flash',
        temperature: 0.1,
        interface: 'langchain',
      },
      setCurrentRubric: vi.fn(),
      addTrait: vi.fn(),
      updateTrait: vi.fn(),
      removeTrait: vi.fn(),
      reorderTraits: vi.fn(),
      generateTraits: mockGenerateTraits,
      loadRubric: vi.fn(),
      saveRubric: vi.fn(),
      deleteRubric: vi.fn(),
      clearError: mockClearError,
      reset: vi.fn(),
      applyGeneratedTraits: mockApplyGeneratedTraits,
      setConfig: vi.fn(),
    });

    await act(async () => {
      render(<RubricTraitGenerator questions={mockQuestions} />);
    });

    await act(async () => {
      const header = screen.getByRole('button', { name: /Rubric Trait Generator/i });
      fireEvent.click(header);
    });

    // Search for something that doesn't exist
    await act(async () => {
      const searchInput = screen.getByPlaceholderText('Search questions, answers, or IDs...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    });

    // Should show no results message
    expect(screen.getByText('No questions match your search criteria.')).toBeInTheDocument();
  });
});
