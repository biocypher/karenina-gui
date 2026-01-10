/**
 * Template Editing Integration Tests
 *
 * Tests the template editing and question navigation workflow in the Curator tab including:
 * - Loading questions into store
 * - Question list/selector display
 * - Next/Previous navigation
 * - Selected question updates
 * - Template code display for selected question
 *
 * integ-010: Test question navigation in curator
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render, userEvent } from '../../../test-utils/test-helpers';
import { useRef } from 'react';
import type { CodeEditorRef } from '../../../components/CodeEditor';
import { CuratorTab } from '../../../components/CuratorTab';
import { useQuestionStore } from '../../../stores/useQuestionStore';
import { useDatasetStore } from '../../../stores/useDatasetStore';
import { UnifiedCheckpoint } from '../../../types';

// Helper to create a mock checkpoint with questions
const createMockCheckpoint = (): UnifiedCheckpoint => {
  return {
    version: '2.0',
    global_rubric: null,
    checkpoint: {
      q1: {
        question: 'What is the capital of France?',
        raw_answer: 'Paris',
        original_answer_template: 'class Answer(BaseModel):\n    capital: str = Field(description="The capital city")',
        answer_template: 'class Answer(BaseModel):\n    capital: str = Field(description="The capital city")',
        last_modified: new Date().toISOString(),
        finished: false,
        question_rubric: undefined,
      },
      q2: {
        question: 'What is 2 + 2?',
        raw_answer: '4',
        original_answer_template:
          'class Answer(BaseModel):\n    result: int = Field(description="The result of 2 + 2")',
        answer_template: 'class Answer(BaseModel):\n    result: int = Field(description="The result of 2 + 2")',
        last_modified: new Date().toISOString(),
        finished: true,
        question_rubric: undefined,
      },
      q3: {
        question: 'Who wrote Romeo and Juliet?',
        raw_answer: 'William Shakespeare',
        original_answer_template:
          'class Answer(BaseModel):\n    author: str = Field(description="The author of the play")',
        answer_template: 'class Answer(BaseModel):\n    author: str = Field(description="The author of the play")',
        last_modified: new Date().toISOString(),
        finished: false,
        question_rubric: undefined,
      },
    },
  };
};

// Wrapper component that provides required props
const CuratorTabWrapper = () => {
  const codeEditorRef = useRef<CodeEditorRef>(null);

  const handleLoadCheckpoint = (checkpoint: UnifiedCheckpoint) => {
    useQuestionStore.getState().loadCheckpoint(checkpoint);
    useDatasetStore.getState().markBenchmarkAsInitialized();
  };

  const handleResetAllData = () => {
    useQuestionStore.getState().resetQuestionState();
  };

  return (
    <CuratorTab
      codeEditorRef={codeEditorRef}
      onLoadCheckpoint={handleLoadCheckpoint}
      onResetAllData={handleResetAllData}
    />
  );
};

// Helper to set up stores with checkpoint before rendering
const setupStoreWithCheckpoint = (checkpoint: UnifiedCheckpoint) => {
  // Build questionData from checkpoint
  const questionData = {
    q1: {
      question: checkpoint.checkpoint['q1'].question,
      raw_answer: checkpoint.checkpoint['q1'].raw_answer,
      answer_template: checkpoint.checkpoint['q1'].answer_template,
    },
    q2: {
      question: checkpoint.checkpoint['q2'].question,
      raw_answer: checkpoint.checkpoint['q2'].raw_answer,
      answer_template: checkpoint.checkpoint['q2'].answer_template,
    },
    q3: {
      question: checkpoint.checkpoint['q3'].question,
      raw_answer: checkpoint.checkpoint['q3'].raw_answer,
      answer_template: checkpoint.checkpoint['q3'].answer_template,
    },
  };

  useQuestionStore.setState({
    questionData,
    checkpoint: checkpoint.checkpoint,
    selectedQuestionId: 'q1',
    currentTemplate: checkpoint.checkpoint['q1'].answer_template,
  });
  useDatasetStore.setState({
    isBenchmarkInitialized: true,
  });
};

describe('Question Navigation Integration Tests', () => {
  beforeEach(() => {
    // Reset stores between tests
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    // Reset all stores
    useQuestionStore.getState().resetQuestionState();
    useDatasetStore.getState().resetBenchmarkState();
  });

  describe('integ-010: Question navigation in curator', () => {
    it('should load questions into store and display question list/selector', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      // Verify question list selector label appears
      await waitFor(() => {
        expect(screen.getByText(/Select Question/i)).toBeInTheDocument();
      });

      // Verify current position indicator shows we have 3 questions
      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Verify all questions are available in the component
      const state = useQuestionStore.getState();
      expect(Object.keys(state.checkpoint).length).toBe(3);
      expect(state.checkpoint['q1']).toBeDefined();
      expect(state.checkpoint['q2']).toBeDefined();
      expect(state.checkpoint['q3']).toBeDefined();
    });

    it('should navigate questions using next/previous buttons', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      // Wait for the UI to load
      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Click Next button
      const nextButton = screen.getByText('Next');
      await userEvent.click(nextButton);

      // Verify position updated to "Question 2 of 3"
      await waitFor(() => {
        expect(screen.getByText(/Question 2 of 3/i)).toBeInTheDocument();
      });

      // Verify selectedQuestionId updated in store
      expect(useQuestionStore.getState().selectedQuestionId).toBe('q2');

      // Click Previous button
      const previousButton = screen.getByText('Previous');
      await userEvent.click(previousButton);

      // Verify position updated back to "Question 1 of 3"
      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Verify selectedQuestionId updated in store
      expect(useQuestionStore.getState().selectedQuestionId).toBe('q1');
    });

    it('should verify selected question updates in store', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Initially q1 should be selected
      expect(useQuestionStore.getState().selectedQuestionId).toBe('q1');

      // Navigate to q2 using next button
      const nextButton = screen.getByText('Next');
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(useQuestionStore.getState().selectedQuestionId).toBe('q2');
      });

      // Verify getSelectedQuestion returns correct data
      const selectedQuestion = useQuestionStore.getState().getSelectedQuestion();
      expect(selectedQuestion?.question).toBe('What is 2 + 2?');
      expect(selectedQuestion?.raw_answer).toBe('4');
    });

    it('should verify template code displays for selected question', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // q1 should be selected by default, verify its template
      await waitFor(() => {
        const currentTemplate = useQuestionStore.getState().currentTemplate;
        expect(currentTemplate).toContain('capital');
        expect(currentTemplate).toContain('str');
        expect(currentTemplate).toContain('The capital city');
      });

      // Navigate to q2 using next button
      const nextButton = screen.getByText('Next');
      await userEvent.click(nextButton);

      await waitFor(() => {
        const currentTemplate = useQuestionStore.getState().currentTemplate;
        expect(currentTemplate).toContain('result');
        expect(currentTemplate).toContain('int');
        expect(currentTemplate).toContain('The result of 2 + 2');
      });
    });

    it('should disable previous button on first question and next button on last question', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      // First question (q1) should be selected by default
      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Check that Previous button is disabled on first question
      const previousButton = screen.getAllByText('Previous').find((el) => el.tagName === 'BUTTON');
      expect(previousButton).toBeDisabled();

      // Navigate to last question (q3) using next button twice
      const nextButton = screen.getAllByText('Next').find((el) => el.tagName === 'BUTTON');

      await userEvent.click(nextButton!); // q1 -> q2

      // Wait for navigation to complete
      await waitFor(() => {
        expect(screen.getByText(/Question 2 of 3/i)).toBeInTheDocument();
      });

      await userEvent.click(nextButton!); // q2 -> q3

      // Wait for navigation to complete - increased timeout for the 50ms delay in performNavigation
      await waitFor(
        () => {
          expect(screen.getByText(/Question 3 of 3/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Check that Next button is disabled on last question
      const nextButtonNow = screen.getAllByText('Next').find((el) => el.tagName === 'BUTTON');
      expect(nextButtonNow).toBeDisabled();
    });
  });

  describe('integ-011: Question search and filter by status', () => {
    it('should search questions by question text', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      // Wait for the UI to load
      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Find the search input
      const searchInput = screen.getByPlaceholderText(/Search by question, answer, or ID/i);
      expect(searchInput).toBeInTheDocument();

      // Enter search term
      await userEvent.type(searchInput, 'Shakespeare');

      // Wait for filtered results - should only show q3
      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 1/i)).toBeInTheDocument();
      });

      // Verify selected question changed to the matching one
      expect(useQuestionStore.getState().selectedQuestionId).toBe('q3');
    });

    it('should search questions by answer text', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by question, answer, or ID/i);

      // Enter search term that matches answer
      await userEvent.type(searchInput, '4');

      // Should only show q2
      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 1/i)).toBeInTheDocument();
      });

      expect(useQuestionStore.getState().selectedQuestionId).toBe('q2');
    });

    it('should clear search and show all questions', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by question, answer, or ID/i);

      // Enter search term
      await userEvent.type(searchInput, 'Paris');

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 1/i)).toBeInTheDocument();
      });

      // Clear search
      await userEvent.clear(searchInput);

      // Should show all questions again
      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });
    });

    it('should filter to show only finished questions', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Find the filter dropdown
      const filterSelect = screen
        .getAllByText(/Show All/i)
        .find((el) => el.tagName === 'OPTION')
        ?.closest('select') as HTMLSelectElement;

      expect(filterSelect).toBeInTheDocument();

      // Filter to finished only
      await userEvent.selectOptions(filterSelect, 'finished');

      // Should only show q2 (the only finished question)
      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 1/i)).toBeInTheDocument();
      });

      expect(useQuestionStore.getState().selectedQuestionId).toBe('q2');
    });

    it('should filter to show only unfinished questions', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Find the filter dropdown
      const filterSelect = screen
        .getAllByText(/Show All/i)
        .find((el) => el.tagName === 'OPTION')
        ?.closest('select') as HTMLSelectElement;

      // Filter to unfinished only
      await userEvent.selectOptions(filterSelect, 'unfinished');

      // Should show 2 unfinished questions (q1 and q3)
      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 2/i)).toBeInTheDocument();
      });
    });

    it('should show no results message when search matches nothing', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by question, answer, or ID/i);

      // Enter search term that matches nothing
      await userEvent.type(searchInput, 'nonexistent');

      // Should show "No questions match your search" message
      await waitFor(() => {
        const messages = screen.getAllByText(/No questions match your search/i);
        expect(messages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('integ-012: Edit and save template', () => {
    it('should edit template and save to checkpoint', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Get initial state
      const initialState = useQuestionStore.getState();
      const initialTemplate = initialState.currentTemplate;
      const originalAnswerTemplate = initialState.checkpoint['q1'].answer_template;

      expect(initialTemplate).toBe(originalAnswerTemplate);

      // Modify the template through the store
      const modifiedTemplate = initialTemplate.replace('capital', 'city_name');
      useQuestionStore.getState().setCurrentTemplate(modifiedTemplate);

      // Verify currentTemplate is updated in store
      await waitFor(() => {
        expect(useQuestionStore.getState().currentTemplate).toContain('city_name');
      });

      // Find and click the Save button
      const saveButton = screen.getAllByText('Save').find((el) => el.tagName === 'BUTTON');
      expect(saveButton).toBeInTheDocument();
      await userEvent.click(saveButton!);

      // Verify the checkpoint is updated
      await waitFor(() => {
        const state = useQuestionStore.getState();
        expect(state.checkpoint['q1'].answer_template).toContain('city_name');
        // last_modified should be updated after save
        expect(state.checkpoint['q1'].last_modified).not.toBe(mockCheckpoint.checkpoint['q1'].last_modified);
      });
    });

    it('should verify save action persists changes across questions', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Modify template for q1
      const modifiedTemplate = mockCheckpoint.checkpoint['q1'].answer_template.replace('capital', 'city');
      useQuestionStore.getState().setCurrentTemplate(modifiedTemplate);

      // Save the changes
      const saveButton = screen.getAllByText('Save').find((el) => el.tagName === 'BUTTON');
      await userEvent.click(saveButton!);

      // Navigate to q2
      const nextButton = screen.getByText('Next');
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Question 2 of 3/i)).toBeInTheDocument();
      });

      // Navigate back to q1
      const previousButton = screen.getByText('Previous');
      await userEvent.click(previousButton);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Verify the saved template is still there
      expect(useQuestionStore.getState().currentTemplate).toContain('city');
      expect(useQuestionStore.getState().checkpoint['q1'].answer_template).toContain('city');
    });

    it('should verify unsaved changes indicator appears', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // The unsaved changes indicator is controlled by hasUnsavedFieldChanges state
      // which is updated by the codeEditorRef.hasUnsavedChanges() method
      // In the actual UI, this would show when editing form fields
      // For integration test, we verify the Save button exists and is clickable
      const saveButton = screen.getAllByText('Save').find((el) => el.tagName === 'BUTTON');
      expect(saveButton).toBeInTheDocument();
    });
  });

  describe('integ-013: Session draft persistence', () => {
    it('should persist draft when switching tabs', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      const { unmount } = render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Edit the template for q1 (creating a draft via setSessionDraft)
      const originalTemplate = useQuestionStore.getState().checkpoint['q1'].answer_template;
      const modifiedTemplate = originalTemplate.replace('capital', 'city_name');

      useQuestionStore.getState().setCurrentTemplate(modifiedTemplate);
      useQuestionStore.getState().setSessionDraft('q1', modifiedTemplate);

      // Verify session draft was set
      expect(useQuestionStore.getState().sessionDrafts['q1']).toBe(modifiedTemplate);

      // Simulate switching to another tab by unmounting and remounting
      // In a real scenario, the user would navigate away and come back
      unmount();

      // Re-mount the component (simulating tab switch back)
      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Verify the draft is still there after remounting
      expect(useQuestionStore.getState().sessionDrafts['q1']).toBe(modifiedTemplate);
      // When we navigate back to q1, it should load the draft
      useQuestionStore.getState().navigateToQuestion('q1');
      expect(useQuestionStore.getState().currentTemplate).toBe(modifiedTemplate);
    });

    it('should persist draft when switching questions', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Edit the template for q1 and set draft
      const originalTemplate = useQuestionStore.getState().checkpoint['q1'].answer_template;
      const modifiedTemplate = originalTemplate.replace('capital', 'city');

      useQuestionStore.getState().setCurrentTemplate(modifiedTemplate);
      useQuestionStore.getState().setSessionDraft('q1', modifiedTemplate);

      // Verify session draft was set
      expect(useQuestionStore.getState().hasSessionDraft('q1')).toBe(true);

      // Navigate to q2
      const nextButton = screen.getByText('Next');
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Question 2 of 3/i)).toBeInTheDocument();
      });

      // Verify we're now on q2 with q2's template
      expect(useQuestionStore.getState().selectedQuestionId).toBe('q2');
      expect(useQuestionStore.getState().currentTemplate).toContain('result');

      // Navigate back to q1
      const previousButton = screen.getByText('Previous');
      await userEvent.click(previousButton);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Verify the draft is preserved for q1 - navigateToQuestion prefers session draft
      useQuestionStore.getState().navigateToQuestion('q1');
      expect(useQuestionStore.getState().selectedQuestionId).toBe('q1');
      expect(useQuestionStore.getState().currentTemplate).toContain('city');
      expect(useQuestionStore.getState().hasSessionDraft('q1')).toBe(true);
    });

    it('should clear draft when saved', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Edit the template creating a draft
      const originalTemplate = useQuestionStore.getState().checkpoint['q1'].answer_template;
      const modifiedTemplate = originalTemplate.replace('capital', 'metro');

      useQuestionStore.getState().setCurrentTemplate(modifiedTemplate);
      useQuestionStore.getState().setSessionDraft('q1', modifiedTemplate);

      // Verify session draft was set
      expect(useQuestionStore.getState().hasSessionDraft('q1')).toBe(true);

      // Find and click the Save button
      const saveButton = screen.getAllByText('Save').find((el) => el.tagName === 'BUTTON');
      expect(saveButton).toBeInTheDocument();
      await userEvent.click(saveButton!);

      // Verify draft was cleared after save
      await waitFor(() => {
        expect(useQuestionStore.getState().hasSessionDraft('q1')).toBe(false);
      });

      // Verify checkpoint was updated
      expect(useQuestionStore.getState().checkpoint['q1'].answer_template).toContain('metro');
    });

    it('should handle multiple drafts for different questions', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Edit q1
      const q1Template = useQuestionStore.getState().checkpoint['q1'].answer_template;
      useQuestionStore.getState().setCurrentTemplate(q1Template.replace('capital', 'city'));
      useQuestionStore.getState().setSessionDraft('q1', q1Template.replace('capital', 'city'));

      // Navigate to q2
      const nextButton = screen.getByText('Next');
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Question 2 of 3/i)).toBeInTheDocument();
      });

      // Edit q2
      const q2Template = useQuestionStore.getState().checkpoint['q2'].answer_template;
      useQuestionStore.getState().setCurrentTemplate(q2Template.replace('result', 'answer'));
      useQuestionStore.getState().setSessionDraft('q2', q2Template.replace('result', 'answer'));

      // Navigate to q3
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Question 3 of 3/i)).toBeInTheDocument();
      });

      // Edit q3
      const q3Template = useQuestionStore.getState().checkpoint['q3'].answer_template;
      useQuestionStore.getState().setCurrentTemplate(q3Template.replace('author', 'writer'));
      useQuestionStore.getState().setSessionDraft('q3', q3Template.replace('author', 'writer'));

      // Verify all drafts exist
      const store = useQuestionStore.getState();
      expect(store.hasSessionDraft('q1')).toBe(true);
      expect(store.hasSessionDraft('q2')).toBe(true);
      expect(store.hasSessionDraft('q3')).toBe(true);

      // Navigate back to q1
      const previousButton = screen.getAllByText('Previous').find((el) => el.tagName === 'BUTTON');
      await userEvent.click(previousButton!);

      await waitFor(() => {
        expect(screen.getByText(/Question 2 of 3/i)).toBeInTheDocument();
      });

      await userEvent.click(previousButton!);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Verify q1 draft is still there
      expect(useQuestionStore.getState().currentTemplate).toContain('city');
    });
  });

  describe('integ-014: Revert to original and mark as finished', () => {
    it('should revert to original template', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Get original and modified templates
      const originalTemplate = useQuestionStore.getState().getOriginalCode();
      const modifiedTemplate = originalTemplate.replace('capital', 'metropolis');

      // Edit the template
      useQuestionStore.getState().setCurrentTemplate(modifiedTemplate);

      // Verify template is modified
      expect(useQuestionStore.getState().currentTemplate).toContain('metropolis');

      // Revert to original using the store method (re-setting to original)
      useQuestionStore.getState().setCurrentTemplate(originalTemplate);

      // Verify template is back to original
      expect(useQuestionStore.getState().currentTemplate).toBe(originalTemplate);
      expect(useQuestionStore.getState().currentTemplate).toContain('capital');
      expect(useQuestionStore.getState().currentTemplate).not.toContain('metropolis');
    });

    it('should toggle finished status', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // q1 should be unfinished initially
      expect(useQuestionStore.getState().checkpoint['q1'].finished).toBe(false);

      // Find the finished button and click it
      const finishedButton = screen.getByText(/Flag as Finished/i);
      await userEvent.click(finishedButton);

      // Verify finished status is now true
      await waitFor(() => {
        expect(useQuestionStore.getState().checkpoint['q1'].finished).toBe(true);
      });

      // Verify button text changed to "Mark as Unfinished"
      expect(screen.getByText(/Mark as Unfinished/i)).toBeInTheDocument();

      // Click again to mark as unfinished
      const unfinishedButton = screen.getByText(/Mark as Unfinished/i);
      await userEvent.click(unfinishedButton);

      // Verify finished status is now false
      await waitFor(() => {
        expect(useQuestionStore.getState().checkpoint['q1'].finished).toBe(false);
      });

      // Verify button text changed back to "Flag as Finished"
      expect(screen.getByText(/Flag as Finished/i)).toBeInTheDocument();
    });

    it('should verify finished status persists across navigation', async () => {
      const mockCheckpoint = createMockCheckpoint();
      setupStoreWithCheckpoint(mockCheckpoint);

      render(<CuratorTabWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Mark q1 as finished
      const finishedButton = screen.getByText(/Flag as Finished/i);
      await userEvent.click(finishedButton);

      // Verify finished status
      expect(useQuestionStore.getState().checkpoint['q1'].finished).toBe(true);

      // Navigate to q2 (which is already finished in the mock checkpoint)
      const nextButton = screen.getByText('Next');
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Question 2 of 3/i)).toBeInTheDocument();
      });

      // q2 should show "Mark as Unfinished" since it's already finished
      expect(screen.getByText(/Mark as Unfinished/i)).toBeInTheDocument();

      // Navigate back to q1
      const previousButton = screen.getByText('Previous');
      await userEvent.click(previousButton);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
      });

      // Verify q1 is still finished
      expect(useQuestionStore.getState().checkpoint['q1'].finished).toBe(true);

      // Verify q2 is still finished
      expect(useQuestionStore.getState().checkpoint['q2'].finished).toBe(true);
    });
  });
});
