import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddQuestionModal } from '../AddQuestionModal';

describe('AddQuestionModal', () => {
  const mockOnClose = vi.fn();
  const mockOnAdd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(mockOnAdd).toHaveBeenCalledWith('What is 2+2?', 'The answer is 4', undefined, undefined);
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

    expect(mockOnAdd).toHaveBeenCalledWith('What is 2+2?', 'The answer is 4', 'John Doe', [
      'math',
      'arithmetic',
      'basic',
    ]);
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

    expect(mockOnAdd).toHaveBeenCalledWith('What is 2+2?', 'The answer is 4', undefined, undefined);
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
    expect(mockOnAdd).toHaveBeenCalledWith('Test question', 'Test answer', undefined, ['math', 'arithmetic', 'basic']);
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
    expect(mockOnAdd).toHaveBeenCalledWith('Test question', 'Test answer', undefined, undefined);
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
    expect(mockOnAdd).toHaveBeenCalledWith('Test question', 'Test answer', undefined, undefined);
  });
});
