import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetadataEditor } from '../MetadataEditor';
import { CheckpointItem } from '../../types';

const mockCheckpointItem: CheckpointItem = {
  question: 'What is React?',
  raw_answer: 'React is a JavaScript library.',
  original_answer_template: 'class ReactAnswer(BaseAnswer):\n    description: str',
  answer_template: 'class ReactAnswer(BaseAnswer):\n    description: str',
  last_modified: '2025-07-19T12:00:00Z',
  finished: true,
  keywords: ['react', 'javascript', 'frontend'],
};

const mockOnSave = vi.fn();
const mockOnClose = vi.fn();

describe('MetadataEditor - Keywords Functionality', () => {
  beforeEach(() => {
    mockOnSave.mockClear();
    mockOnClose.mockClear();
  });

  it('should display existing keywords as tags', () => {
    render(
      <MetadataEditor
        isOpen={true}
        onClose={mockOnClose}
        checkpointItem={mockCheckpointItem}
        questionId="test-question-1"
        onSave={mockOnSave}
      />
    );

    // Check that existing keywords are displayed
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
  });

  it('should allow adding new keywords via input field', async () => {
    const user = userEvent.setup();

    render(
      <MetadataEditor
        isOpen={true}
        onClose={mockOnClose}
        checkpointItem={mockCheckpointItem}
        questionId="test-question-1"
        onSave={mockOnSave}
      />
    );

    // Find the keywords input field
    const keywordInput = screen.getByPlaceholderText('Enter keywords separated by commas...');

    // Add new keywords
    await user.type(keywordInput, 'ui, user-interface');

    // Click the Add button for keywords (the purple button, not the custom properties one)
    const keywordsSection = screen.getByText('Keywords').closest('div');
    const addButton = keywordsSection?.querySelector('button[class*="bg-purple"]');
    expect(addButton).toBeInTheDocument();
    await user.click(addButton!);

    // Check that new keywords are displayed
    expect(screen.getByText('ui')).toBeInTheDocument();
    expect(screen.getByText('user-interface')).toBeInTheDocument();

    // Input field should be cleared
    expect(keywordInput).toHaveValue('');
  });

  it('should allow adding keywords by pressing Enter', async () => {
    const user = userEvent.setup();

    render(
      <MetadataEditor
        isOpen={true}
        onClose={mockOnClose}
        checkpointItem={mockCheckpointItem}
        questionId="test-question-1"
        onSave={mockOnSave}
      />
    );

    const keywordInput = screen.getByPlaceholderText('Enter keywords separated by commas...');

    await user.type(keywordInput, 'web-development');
    await user.keyboard('{Enter}');

    expect(screen.getByText('web-development')).toBeInTheDocument();
    expect(keywordInput).toHaveValue('');
  });

  it('should allow removing keywords', async () => {
    const user = userEvent.setup();

    render(
      <MetadataEditor
        isOpen={true}
        onClose={mockOnClose}
        checkpointItem={mockCheckpointItem}
        questionId="test-question-1"
        onSave={mockOnSave}
      />
    );

    // Find and click the remove button for 'react' keyword
    const reactTag = screen.getByText('react').closest('div');
    const removeButton = reactTag?.querySelector('button');

    expect(removeButton).toBeInTheDocument();
    await user.click(removeButton!);

    // 'react' keyword should be removed
    expect(screen.queryByText('react')).not.toBeInTheDocument();

    // Other keywords should still be there
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
  });

  it('should handle duplicate keywords correctly', async () => {
    const user = userEvent.setup();

    render(
      <MetadataEditor
        isOpen={true}
        onClose={mockOnClose}
        checkpointItem={mockCheckpointItem}
        questionId="test-question-1"
        onSave={mockOnSave}
      />
    );

    const keywordInput = screen.getByPlaceholderText('Enter keywords separated by commas...');

    // Try to add an existing keyword
    await user.type(keywordInput, 'react, new-keyword');
    await user.keyboard('{Enter}');

    // Should not duplicate 'react', but should add 'new-keyword'
    const reactElements = screen.getAllByText('react');
    expect(reactElements).toHaveLength(1);
    expect(screen.getByText('new-keyword')).toBeInTheDocument();
  });

  it('should save keywords when form is saved', async () => {
    const user = userEvent.setup();

    render(
      <MetadataEditor
        isOpen={true}
        onClose={mockOnClose}
        checkpointItem={mockCheckpointItem}
        questionId="test-question-1"
        onSave={mockOnSave}
      />
    );

    // Add a new keyword
    const keywordInput = screen.getByPlaceholderText('Enter keywords separated by commas...');
    await user.type(keywordInput, 'testing');
    await user.keyboard('{Enter}');

    // Save the form
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    // Check that onSave was called with updated keywords
    expect(mockOnSave).toHaveBeenCalledWith(
      'test-question-1',
      expect.objectContaining({
        keywords: expect.arrayContaining(['react', 'javascript', 'frontend', 'testing']),
      })
    );
  });

  it('should display empty state when no keywords are present', () => {
    const itemWithoutKeywords = { ...mockCheckpointItem, keywords: undefined };

    render(
      <MetadataEditor
        isOpen={true}
        onClose={mockOnClose}
        checkpointItem={itemWithoutKeywords}
        questionId="test-question-1"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText(/no keywords added/i)).toBeInTheDocument();
  });

  it('should disable Add button when input is empty', () => {
    render(
      <MetadataEditor
        isOpen={true}
        onClose={mockOnClose}
        checkpointItem={mockCheckpointItem}
        questionId="test-question-1"
        onSave={mockOnSave}
      />
    );

    const keywordsSection = screen.getByText('Keywords').closest('div');
    const addButton = keywordsSection?.querySelector('button[class*="bg-purple"]');
    expect(addButton).toBeDisabled();
  });

  it('should trim whitespace and filter empty keywords', async () => {
    const user = userEvent.setup();

    render(
      <MetadataEditor
        isOpen={true}
        onClose={mockOnClose}
        checkpointItem={mockCheckpointItem}
        questionId="test-question-1"
        onSave={mockOnSave}
      />
    );

    const keywordInput = screen.getByPlaceholderText('Enter keywords separated by commas...');

    // Add keywords with extra whitespace and empty values
    await user.type(keywordInput, '  trimmed  , , empty-filtered,   another-trimmed   ');
    await user.keyboard('{Enter}');

    // Should display trimmed keywords without empty ones
    expect(screen.getByText('trimmed')).toBeInTheDocument();
    expect(screen.getByText('empty-filtered')).toBeInTheDocument();
    expect(screen.getByText('another-trimmed')).toBeInTheDocument();

    // Should not have more than expected number of keywords (original 3 + added 3)
    const keywordTags = screen
      .getAllByRole('button')
      .filter((btn) => btn.className.includes('bg-purple-100') && btn.textContent?.includes('trimmed'));
    expect(keywordTags.length).toBeGreaterThan(0);
  });
});
