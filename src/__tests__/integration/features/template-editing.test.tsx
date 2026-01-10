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
});
