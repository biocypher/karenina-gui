import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddQuestionModal } from '../AddQuestionModal';

// Mock the config store
vi.mock('../../stores/useConfigStore', () => ({
  useConfigStore: () => ({
    savedInterface: 'langchain',
    savedProvider: 'openai',
    savedModel: 'gpt-4.1-mini',
  }),
}));

describe('AddQuestionModal', () => {
  const mockOnClose = vi.fn();
  const mockOnAdd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    expect(screen.getByText('Add New Question')).toBeInTheDocument();
    expect(screen.getByText(/Add a new question manually to your benchmark/)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<AddQuestionModal isOpen={false} onClose={mockOnClose} onAdd={mockOnAdd} />);

    expect(screen.queryByText('Add New Question')).not.toBeInTheDocument();
  });

  it('displays all required and optional fields', () => {
    render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    // Required fields - use placeholders as they're unique
    expect(screen.getByPlaceholderText('Enter the question text...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter the answer text...')).toBeInTheDocument();

    // Optional fields
    expect(screen.getByPlaceholderText('Question author name...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., math, geometry, basic')).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Question/ })).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty required fields', async () => {
    const user = userEvent.setup();
    render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    const addButton = screen.getByRole('button', { name: /Add Question/ });
    await user.click(addButton);

    expect(screen.getByText('Question is required')).toBeInTheDocument();
    expect(screen.getByText('Answer is required')).toBeInTheDocument();
    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it('successfully submits with valid required fields only', async () => {
    const user = userEvent.setup();
    render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    const questionInput = screen.getByPlaceholderText('Enter the question text...');
    const answerInput = screen.getByPlaceholderText('Enter the answer text...');
    const addButton = screen.getByRole('button', { name: /Add Question/ });

    await user.type(questionInput, 'What is 2+2?');
    await user.type(answerInput, 'The answer is 4');
    await user.click(addButton);

    expect(mockOnAdd).toHaveBeenCalledWith('What is 2+2?', 'The answer is 4', undefined, undefined, undefined);
  });

  it('successfully submits with all fields filled', async () => {
    const user = userEvent.setup();
    render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    const questionInput = screen.getByPlaceholderText('Enter the question text...');
    const answerInput = screen.getByPlaceholderText('Enter the answer text...');
    const authorInput = screen.getByPlaceholderText('Question author name...');
    const keywordsInput = screen.getByPlaceholderText('e.g., math, geometry, basic');
    const addButton = screen.getByRole('button', { name: /Add Question/ });

    await user.type(questionInput, 'What is 2+2?');
    await user.type(answerInput, 'The answer is 4');
    await user.type(authorInput, 'John Doe');
    await user.type(keywordsInput, 'math, arithmetic, basic');
    await user.click(addButton);

    expect(mockOnAdd).toHaveBeenCalledWith(
      'What is 2+2?',
      'The answer is 4',
      'John Doe',
      ['math', 'arithmetic', 'basic'],
      undefined
    );
  });

  it('trims whitespace from inputs', async () => {
    const user = userEvent.setup();
    render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    const questionInput = screen.getByPlaceholderText('Enter the question text...');
    const answerInput = screen.getByPlaceholderText('Enter the answer text...');
    const addButton = screen.getByRole('button', { name: /Add Question/ });

    await user.type(questionInput, '  What is 2+2?  ');
    await user.type(answerInput, '  The answer is 4  ');
    await user.click(addButton);

    expect(mockOnAdd).toHaveBeenCalledWith('What is 2+2?', 'The answer is 4', undefined, undefined, undefined);
  });

  it('parses keywords correctly with various separators', async () => {
    const user = userEvent.setup();
    render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    const questionInput = screen.getByPlaceholderText('Enter the question text...');
    const answerInput = screen.getByPlaceholderText('Enter the answer text...');
    const keywordsInput = screen.getByPlaceholderText('e.g., math, geometry, basic');
    const addButton = screen.getByRole('button', { name: /Add Question/ });

    await user.type(questionInput, 'Test question');
    await user.type(answerInput, 'Test answer');
    await user.type(keywordsInput, ' math , arithmetic,  ,basic, ');
    await user.click(addButton);

    // Should filter out empty keywords and trim whitespace
    expect(mockOnAdd).toHaveBeenCalledWith(
      'Test question',
      'Test answer',
      undefined,
      ['math', 'arithmetic', 'basic'],
      undefined
    );
  });

  it('clears validation errors when user types in fields', async () => {
    const user = userEvent.setup();
    render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    const addButton = screen.getByRole('button', { name: /Add Question/ });
    const questionInput = screen.getByPlaceholderText('Enter the question text...');

    // Trigger validation errors
    await user.click(addButton);
    expect(screen.getByText('Question is required')).toBeInTheDocument();

    // Type in question field
    await user.type(questionInput, 'Test question');

    // Error should be cleared
    expect(screen.queryByText('Question is required')).not.toBeInTheDocument();
  });

  it('resets form when closing modal', async () => {
    const user = userEvent.setup();
    render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    const questionInput = screen.getByPlaceholderText('Enter the question text...');
    const cancelButton = screen.getByRole('button', { name: /Cancel/ });

    await user.type(questionInput, 'Test question');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles optional author field correctly', async () => {
    const user = userEvent.setup();
    render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    const questionInput = screen.getByPlaceholderText('Enter the question text...');
    const answerInput = screen.getByPlaceholderText('Enter the answer text...');
    const authorInput = screen.getByPlaceholderText('Question author name...');
    const addButton = screen.getByRole('button', { name: /Add Question/ });

    // Test with author containing only whitespace
    await user.type(questionInput, 'Test question');
    await user.type(answerInput, 'Test answer');
    await user.type(authorInput, '   ');
    await user.click(addButton);

    // Should pass undefined for author when it's only whitespace
    expect(mockOnAdd).toHaveBeenCalledWith('Test question', 'Test answer', undefined, undefined, undefined);
  });

  it('handles empty keywords field correctly', async () => {
    const user = userEvent.setup();
    render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    const questionInput = screen.getByPlaceholderText('Enter the question text...');
    const answerInput = screen.getByPlaceholderText('Enter the answer text...');
    const keywordsInput = screen.getByPlaceholderText('e.g., math, geometry, basic');
    const addButton = screen.getByRole('button', { name: /Add Question/ });

    await user.type(questionInput, 'Test question');
    await user.type(answerInput, 'Test answer');
    await user.type(keywordsInput, '  ,  , ');
    await user.click(addButton);

    // Should pass undefined for keywords when only empty/whitespace values
    expect(mockOnAdd).toHaveBeenCalledWith('Test question', 'Test answer', undefined, undefined, undefined);
  });

  describe('Template Generation', () => {
    it('displays generate template button when both fields are filled', async () => {
      const user = userEvent.setup();
      render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

      const generateButton = screen.getByRole('button', { name: /Generate Answer Template/i });
      expect(generateButton).toBeDisabled();

      const questionInput = screen.getByPlaceholderText('Enter the question text...');
      const answerInput = screen.getByPlaceholderText('Enter the answer text...');

      await user.type(questionInput, 'What is 2+2?');
      await user.type(answerInput, 'The answer is 4');

      expect(generateButton).toBeEnabled();
    });

    it('opens settings menu when settings icon is clicked', async () => {
      const user = userEvent.setup();
      render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

      const settingsButton = screen.getByTitle('Generation settings');
      await user.click(settingsButton);

      expect(screen.getByText('Generation Settings')).toBeInTheDocument();
      expect(screen.getByLabelText('LangChain')).toBeInTheDocument();
      expect(screen.getByLabelText('OpenRouter')).toBeInTheDocument();
    });

    it('updates config when settings are changed', async () => {
      const user = userEvent.setup();
      render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

      const settingsButton = screen.getByTitle('Generation settings');
      await user.click(settingsButton);

      const providerInput = screen.getByPlaceholderText('e.g., openai, google_genai, anthropic');
      await user.clear(providerInput);
      await user.type(providerInput, 'anthropic');

      expect(providerInput).toHaveValue('anthropic');
    });

    it('starts template generation when generate button is clicked', async () => {
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ job_id: 'test-job-123', status: 'started' }),
      });
      global.fetch = mockFetch;

      render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

      const questionInput = screen.getByPlaceholderText('Enter the question text...');
      const answerInput = screen.getByPlaceholderText('Enter the answer text...');
      const generateButton = screen.getByRole('button', { name: /Generate Answer Template/i });

      await user.type(questionInput, 'What is 2+2?');
      await user.type(answerInput, 'The answer is 4');
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/generate-answer-templates',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('shows success message when generation completes', async () => {
      const user = userEvent.setup();

      const generatedTemplate = `from karenina.schemas.answer_class import BaseAnswer
from pydantic import Field

class Answer(BaseAnswer):
    """Generated answer"""
    value: int = Field(description="The numeric answer")`;

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ job_id: 'test-job-123', status: 'started' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'completed',
            result: { 'test-id': generatedTemplate },
          }),
        });
      global.fetch = mockFetch;

      render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

      const questionInput = screen.getByPlaceholderText('Enter the question text...');
      const answerInput = screen.getByPlaceholderText('Enter the answer text...');
      const generateButton = screen.getByRole('button', { name: /Generate Answer Template/i });

      await user.type(questionInput, 'What is 2+2?');
      await user.type(answerInput, 'The answer is 4');
      await user.click(generateButton);

      await waitFor(
        () => {
          expect(screen.getByText(/Template generated successfully!/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    }, 10000);

    it('shows error message when generation fails', async () => {
      const user = userEvent.setup();

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ job_id: 'test-job-123', status: 'started' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'failed',
            error: 'LLM API error',
          }),
        });
      global.fetch = mockFetch;

      render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

      const questionInput = screen.getByPlaceholderText('Enter the question text...');
      const answerInput = screen.getByPlaceholderText('Enter the answer text...');
      const generateButton = screen.getByRole('button', { name: /Generate Answer Template/i });

      await user.type(questionInput, 'What is 2+2?');
      await user.type(answerInput, 'The answer is 4');
      await user.click(generateButton);

      await waitFor(
        () => {
          expect(screen.getByText(/Error: LLM API error/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    }, 10000);

    it('includes generated template in onAdd callback', async () => {
      const user = userEvent.setup();

      const generatedTemplate = `from karenina.schemas.answer_class import BaseAnswer
from pydantic import Field

class Answer(BaseAnswer):
    """Generated answer"""
    value: int = Field(description="The numeric answer")`;

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ job_id: 'test-job-123', status: 'started' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'completed',
            result: { 'test-id': generatedTemplate },
          }),
        });
      global.fetch = mockFetch;

      render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

      const questionInput = screen.getByPlaceholderText('Enter the question text...');
      const answerInput = screen.getByPlaceholderText('Enter the answer text...');
      const generateButton = screen.getByRole('button', { name: /Generate Answer Template/i });

      await user.type(questionInput, 'What is 2+2?');
      await user.type(answerInput, 'The answer is 4');
      await user.click(generateButton);

      await waitFor(
        () => {
          expect(screen.getByText(/Template generated successfully!/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const addButton = screen.getByRole('button', { name: /Add Question/ });
      await user.click(addButton);

      expect(mockOnAdd).toHaveBeenCalledWith(
        'What is 2+2?',
        'The answer is 4',
        undefined,
        undefined,
        generatedTemplate
      );
    }, 10000);

    it('disables form actions during generation', async () => {
      const user = userEvent.setup();
      // Mock to keep generation running
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ job_id: 'test-job-123', status: 'started' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'running',
            percentage: 50,
          }),
        });
      global.fetch = mockFetch;

      render(<AddQuestionModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

      const questionInput = screen.getByPlaceholderText('Enter the question text...');
      const answerInput = screen.getByPlaceholderText('Enter the answer text...');
      const generateButton = screen.getByRole('button', { name: /Generate Answer Template/i });

      await user.type(questionInput, 'What is 2+2?');
      await user.type(answerInput, 'The answer is 4');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /Add Question/ });
      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      const settingsButton = screen.getByTitle('Generation settings');

      expect(addButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
      expect(settingsButton).toBeDisabled();
    });
  });
});
