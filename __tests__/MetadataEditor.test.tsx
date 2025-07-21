import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom/vitest';
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
    custom_metadata: {
      existing_property: 'existing_value',
      another_prop: 'another_value',
    },
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
    expect(screen.getByText('Question Author')).toBeInTheDocument();
    expect(screen.getByText('Sources')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<MetadataEditor {...mockProps} isOpen={false} />);

    expect(screen.queryByText('Edit Metadata')).not.toBeInTheDocument();
  });

  it('displays author input fields', () => {
    render(<MetadataEditor {...mockProps} />);

    expect(screen.getByPlaceholderText('Author name...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('author@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('University or organization...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example.com')).toBeInTheDocument();
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
    const itemWithoutProps = { ...mockCheckpointItem, custom_metadata: undefined };
    render(<MetadataEditor {...mockProps} checkpointItem={itemWithoutProps} />);

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

  it('shows sources section', () => {
    render(<MetadataEditor {...mockProps} />);

    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('Academic')).toBeInTheDocument();
    expect(screen.getByText('Web')).toBeInTheDocument();
    expect(screen.getByText(/No sources added/)).toBeInTheDocument();
  });

  it('allows adding academic and web sources with correct field requirements', async () => {
    const user = userEvent.setup();
    render(<MetadataEditor {...mockProps} />);

    // Test Academic Source
    const academicButton = screen.getByText('Academic');
    await user.click(academicButton);

    expect(screen.getByText('Academic Source')).toBeInTheDocument();
    expect(screen.getAllByText('Title')).toHaveLength(1); // Title is optional for academic (only one exists)
    expect(screen.getByText('DOI/Identifier *')).toBeInTheDocument(); // DOI is required for academic
    expect(screen.queryByText('Published Date')).not.toBeInTheDocument(); // Published date removed

    // Test Web Source
    const webButton = screen.getByText('Web');
    await user.click(webButton);

    expect(screen.getByText('Web Source')).toBeInTheDocument();
    expect(screen.getAllByText('Title')).toHaveLength(2); // Now there are two Title labels (academic and web)
    expect(screen.getByText('URL *')).toBeInTheDocument(); // URL is required for web
    expect(screen.getByPlaceholderText('Publisher name...')).toBeInTheDocument();
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

  it('loads existing custom properties from checkpointItem', () => {
    render(<MetadataEditor {...mockProps} />);

    // Should display existing custom properties
    expect(screen.getByDisplayValue('existing_property')).toBeInTheDocument();
    expect(screen.getByDisplayValue('existing_value')).toBeInTheDocument();
    expect(screen.getByDisplayValue('another_prop')).toBeInTheDocument();
    expect(screen.getByDisplayValue('another_value')).toBeInTheDocument();
  });

  it('saves custom properties to checkpoint', async () => {
    const user = userEvent.setup();
    render(<MetadataEditor {...mockProps} />);

    // Add a new custom property
    vi.stubGlobal(
      'prompt',
      vi.fn(() => 'new_property')
    );
    const addButton = screen.getByText('Add Property');
    await user.click(addButton);

    // Set value for the new property
    const newValueInput = screen.getAllByPlaceholderText('Property value...').find((input) => {
      // Find the input in the same row as the 'new_property' key
      const parent = input.closest('.grid');
      const keyInput = parent?.querySelector('input[readonly]') as HTMLInputElement;
      return keyInput?.value === 'new_property';
    });
    if (newValueInput) {
      await user.clear(newValueInput);
      await user.type(newValueInput, 'new_value');
    }

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    // Verify onSave was called with custom_metadata
    expect(mockProps.onSave).toHaveBeenCalledWith(
      'test-question-1',
      expect.objectContaining({
        custom_metadata: expect.objectContaining({
          existing_property: 'existing_value',
          another_prop: 'another_value',
          new_property: 'new_value',
        }),
      })
    );

    vi.unstubAllGlobals();
  });

  it('saves author information to checkpoint', async () => {
    const user = userEvent.setup();
    render(<MetadataEditor {...mockProps} />);

    // Fill in author information
    const nameInput = screen.getByPlaceholderText('Author name...');
    await user.type(nameInput, 'John Doe');

    const emailInput = screen.getByPlaceholderText('author@example.com');
    await user.type(emailInput, 'john@example.com');

    const affiliationInput = screen.getByPlaceholderText('University or organization...');
    await user.type(affiliationInput, 'Example University');

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    // Verify onSave was called with author
    expect(mockProps.onSave).toHaveBeenCalledWith(
      'test-question-1',
      expect.objectContaining({
        author: expect.objectContaining({
          '@type': 'Person',
          name: 'John Doe',
          email: 'john@example.com',
          affiliation: 'Example University',
        }),
      })
    );
  });

  it('saves academic sources to checkpoint', async () => {
    const user = userEvent.setup();
    render(<MetadataEditor {...mockProps} />);

    // Add an academic source
    const academicButton = screen.getByText('Academic');
    await user.click(academicButton);

    const titleInput = screen.getByPlaceholderText('Source title...');
    await user.type(titleInput, 'Test Academic Paper');

    const urlInput = screen.getByPlaceholderText('https://...');
    await user.type(urlInput, 'https://example.com/paper');

    const doiInput = screen.getByPlaceholderText('DOI or identifier...');
    await user.type(doiInput, '10.1000/example');

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    // Verify onSave was called with sources (no datePublished field)
    expect(mockProps.onSave).toHaveBeenCalledWith(
      'test-question-1',
      expect.objectContaining({
        sources: [
          expect.objectContaining({
            '@type': 'ScholarlyArticle',
            name: 'Test Academic Paper',
            url: 'https://example.com/paper',
            identifier: '10.1000/example',
          }),
        ],
      })
    );
  });

  it('saves web sources to checkpoint', async () => {
    const user = userEvent.setup();
    render(<MetadataEditor {...mockProps} />);

    // Add a web source
    const webButton = screen.getByText('Web');
    await user.click(webButton);

    const titleInput = screen.getByPlaceholderText('Source title...');
    await user.type(titleInput, 'Example Website');

    const urlInput = screen.getByPlaceholderText('https://...');
    await user.type(urlInput, 'https://example.com');

    const publisherInput = screen.getByPlaceholderText('Publisher name...');
    await user.type(publisherInput, 'Example Corp');

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    // Verify onSave was called with web source
    expect(mockProps.onSave).toHaveBeenCalledWith(
      'test-question-1',
      expect.objectContaining({
        sources: [
          expect.objectContaining({
            '@type': 'WebPage',
            name: 'Example Website',
            url: 'https://example.com',
            publisher: 'Example Corp',
          }),
        ],
      })
    );
  });

  it('removes custom_metadata when all properties are deleted', async () => {
    const user = userEvent.setup();
    render(<MetadataEditor {...mockProps} />);

    // Find all delete buttons by finding buttons that have red text colors (trash buttons)
    const allButtons = screen.getAllByRole('button');
    const trashButtons = allButtons.filter((button) => button.className.includes('text-red-500'));

    // Click all trash buttons to remove properties
    for (const trashButton of trashButtons) {
      await user.click(trashButton);
    }

    // Make a change to enable save button
    const finishedCheckbox = screen.getByLabelText('Mark as finished');
    await user.click(finishedCheckbox);

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    // Verify custom_metadata is undefined when empty
    expect(mockProps.onSave).toHaveBeenCalledWith(
      'test-question-1',
      expect.objectContaining({
        custom_metadata: undefined,
      })
    );
  });

  it('resets form when checkpointItem changes (question switching)', () => {
    const { rerender } = render(<MetadataEditor {...mockProps} />);

    // Verify initial properties are loaded
    expect(screen.getByDisplayValue('existing_property')).toBeInTheDocument();

    // Change to different question with different metadata
    const newCheckpointItem: CheckpointItem = {
      ...mockCheckpointItem,
      custom_metadata: {
        different_prop: 'different_value',
      },
    };

    rerender(<MetadataEditor {...mockProps} checkpointItem={newCheckpointItem} questionId="different-question" />);

    // Should show new properties and not old ones
    expect(screen.getByDisplayValue('different_prop')).toBeInTheDocument();
    expect(screen.getByDisplayValue('different_value')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('existing_property')).not.toBeInTheDocument();
  });
});
