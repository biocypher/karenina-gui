import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpandedEditor } from '../src/components/ExpandedEditor';
import { CodeEditorRef } from '../src/components/CodeEditor';
import React from 'react';

describe('ExpandedEditor Save Functionality', () => {
  it('should show unsaved changes indicator when there are unsaved field changes', () => {
    const mockCodeEditorRef = React.createRef<CodeEditorRef>();
    const mockSave = vi.fn();

    const { rerender } = render(
      <ExpandedEditor
        value="test template"
        onChange={vi.fn()}
        originalCode="original"
        savedCode="saved"
        selectedQuestion={{
          id: '1',
          question: 'Test question',
          raw_answer: 'Test answer',
          custom_metadata: {},
        }}
        questionIndex={0}
        totalQuestions={1}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        canGoPrevious={false}
        canGoNext={false}
        onClose={vi.fn()}
        onSave={mockSave}
        onToggleFinished={vi.fn()}
        isFinished={false}
        codeEditorRef={mockCodeEditorRef}
        hasUnsavedFieldChanges={false}
      />
    );

    // Initially no indicator
    expect(screen.queryByTitle('Unsaved field changes')).not.toBeInTheDocument();

    // Re-render with unsaved changes
    rerender(
      <ExpandedEditor
        value="test template"
        onChange={vi.fn()}
        originalCode="original"
        savedCode="saved"
        selectedQuestion={{
          id: '1',
          question: 'Test question',
          raw_answer: 'Test answer',
          custom_metadata: {},
        }}
        questionIndex={0}
        totalQuestions={1}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        canGoPrevious={false}
        canGoNext={false}
        onClose={vi.fn()}
        onSave={mockSave}
        onToggleFinished={vi.fn()}
        isFinished={false}
        codeEditorRef={mockCodeEditorRef}
        hasUnsavedFieldChanges={true}
      />
    );

    // Should show indicator
    expect(screen.getByTitle('Unsaved field changes')).toBeInTheDocument();
  });

  it('should call onSave when save button is clicked', () => {
    const mockCodeEditorRef = React.createRef<CodeEditorRef>();
    const mockSave = vi.fn();

    render(
      <ExpandedEditor
        value="test template"
        onChange={vi.fn()}
        originalCode="original"
        savedCode="saved"
        selectedQuestion={{
          id: '1',
          question: 'Test question',
          raw_answer: 'Test answer',
          custom_metadata: {},
        }}
        questionIndex={0}
        totalQuestions={1}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        canGoPrevious={false}
        canGoNext={false}
        onClose={vi.fn()}
        onSave={mockSave}
        onToggleFinished={vi.fn()}
        isFinished={false}
        codeEditorRef={mockCodeEditorRef}
        hasUnsavedFieldChanges={true}
      />
    );

    // Get the save button in the header (not the "Revert to Saved" button)
    const saveButton = screen.getByTitle('Save changes (Ctrl/Cmd + S)');
    fireEvent.click(saveButton);

    expect(mockSave).toHaveBeenCalledTimes(1);
  });
});
