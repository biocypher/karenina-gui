import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetadataEditor } from '../src/components/MetadataEditor';
import { CheckpointItem } from '../src/types';

describe('MetadataEditor', () => {
  const mockCheckpointItem: CheckpointItem = {
    question: 'What is the capital of France?',
    raw_answer: 'Paris',
    original_answer_template: 'class Answer(BaseModel): capital: str',
    answer_template: 'class Answer(BaseModel): capital: str',
    last_modified: '2025-01-20T10:00:00Z',
    finished: false,
  };

  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    checkpointItem: mockCheckpointItem,
    questionId: 'test-question-1',
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<MetadataEditor {...mockProps} />);

    expect(screen.getByText('Edit Metadata')).toBeInTheDocument();
    expect(screen.getByText('Editable Metadata')).toBeInTheDocument();
    expect(screen.getByText('System Information (Read-Only)')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<MetadataEditor {...mockProps} isOpen={false} />);

    expect(screen.queryByText('Edit Metadata')).not.toBeInTheDocument();
  });

  it('displays correct system information', () => {
    render(<MetadataEditor {...mockProps} />);

    expect(screen.getByText('test-question-1')).toBeInTheDocument();
    expect(screen.getByText(/2025/)).toBeInTheDocument(); // Date should be formatted
    expect(screen.getByText(`${mockCheckpointItem.question.length} characters`)).toBeInTheDocument(); // Question length
    expect(screen.getByText(`${mockCheckpointItem.raw_answer.length} characters`)).toBeInTheDocument(); // Answer length
  });

  it('shows finished status correctly', () => {
    render(<MetadataEditor {...mockProps} />);

    const finishedCheckbox = screen.getByLabelText('Mark as finished');
    expect(finishedCheckbox).not.toBeChecked();
  });

  it('shows finished status as checked when item is finished', () => {
    const finishedItem = { ...mockCheckpointItem, finished: true };
    render(<MetadataEditor {...mockProps} checkpointItem={finishedItem} />);

    const finishedCheckbox = screen.getByLabelText('Mark as finished');
    expect(finishedCheckbox).toBeChecked();
  });

  it('allows toggling finished status', async () => {
    const user = userEvent.setup();
    render(<MetadataEditor {...mockProps} />);

    const finishedCheckbox = screen.getByLabelText('Mark as finished');
    expect(finishedCheckbox).not.toBeChecked();

    await user.click(finishedCheckbox);
    expect(finishedCheckbox).toBeChecked();
  });

  it('shows custom properties section', () => {
    render(<MetadataEditor {...mockProps} />);

    expect(screen.getByText('Custom Properties')).toBeInTheDocument();
    expect(screen.getByText('Add Property')).toBeInTheDocument();
    expect(screen.getByText(/No custom properties defined/)).toBeInTheDocument();
  });

  it('allows adding custom properties', async () => {
    const user = userEvent.setup();
    // Mock window.prompt
    vi.stubGlobal(
      'prompt',
      vi.fn(() => 'test-property')
    );

    render(<MetadataEditor {...mockProps} />);

    const addButton = screen.getByText('Add Property');
    await user.click(addButton);

    expect(screen.getByDisplayValue('test-property')).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it('shows template metadata when template exists', () => {
    render(<MetadataEditor {...mockProps} />);

    expect(screen.getByText('Template Metadata (Read-Only)')).toBeInTheDocument();
    // Check for both template length appearances (current and original)
    const templateLengthElements = screen.getAllByText(`${mockCheckpointItem.answer_template.length} characters`);
    expect(templateLengthElements).toHaveLength(2); // Both current and original template lengths
  });

  it('shows rubric metadata when rubric exists', () => {
    const itemWithRubric = {
      ...mockCheckpointItem,
      question_rubric: {
        traits: [
          { name: 'Accuracy', description: 'How accurate is the answer', kind: 'boolean' as const },
          {
            name: 'Completeness',
            description: 'How complete is the answer',
            kind: 'score' as const,
            min_score: 0,
            max_score: 10,
          },
        ],
      },
    };

    render(<MetadataEditor {...mockProps} checkpointItem={itemWithRubric} />);

    expect(screen.getByText('Rubric Metadata (Read-Only)')).toBeInTheDocument();
    expect(screen.getByText('2 traits')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Completeness')).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<MetadataEditor {...mockProps} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when X button is clicked', async () => {
    const user = userEvent.setup();
    render(<MetadataEditor {...mockProps} />);

    // Find all buttons and click the first one (which is the X close button)
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons[0]; // First button is the X close button
    await user.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalledOnce();
  });

  it('saves changes when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<MetadataEditor {...mockProps} />);

    // Make a change to enable save button
    const finishedCheckbox = screen.getByLabelText('Mark as finished');
    await user.click(finishedCheckbox);

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    expect(mockProps.onSave).toHaveBeenCalledOnce();
    expect(mockProps.onSave).toHaveBeenCalledWith(
      'test-question-1',
      expect.objectContaining({
        finished: true,
        last_modified: expect.any(String),
      })
    );
    expect(mockProps.onClose).toHaveBeenCalledOnce();
  });

  it('save button is disabled when no changes are made', () => {
    render(<MetadataEditor {...mockProps} />);

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
  });

  it('shows confirmation dialog when closing with unsaved changes', async () => {
    const user = userEvent.setup();
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<MetadataEditor {...mockProps} />);

    // Make a change
    const finishedCheckbox = screen.getByLabelText('Mark as finished');
    await user.click(finishedCheckbox);

    // Try to close
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to discard them?');
    expect(mockProps.onClose).not.toHaveBeenCalled(); // Should not close when confirmation is cancelled

    confirmSpy.mockRestore();
  });

  it('formats timestamp correctly', () => {
    render(<MetadataEditor {...mockProps} />);

    // The timestamp should be formatted to a readable date
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });
});
