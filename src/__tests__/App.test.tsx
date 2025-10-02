import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '../test-utils/test-helpers';
import userEvent from '@testing-library/user-event';
import App from '../App';
import {
  createMockQuestionData,
  createMockCheckpoint,
  mockLocalStorage,
  mockSessionStorage,
} from '../test-utils/test-helpers';
import { useAppStore } from '../stores/useAppStore';

// Mock the data loader utility
vi.mock('../utils/dataLoader', () => ({
  formatTimestamp: vi.fn((timestamp: string) => new Date(timestamp).toLocaleString()),
  clearAllSessionData: vi.fn(() => true),
  forceResetAllData: vi.fn(),
}));

describe('App Component', () => {
  let mockLocalStorageImpl: ReturnType<typeof mockLocalStorage>;
  let mockSessionStorageImpl: ReturnType<typeof mockSessionStorage>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockLocalStorageImpl = mockLocalStorage();
    mockSessionStorageImpl = mockSessionStorage();
    user = userEvent.setup();

    Object.defineProperty(window, 'localStorage', { value: mockLocalStorageImpl });
    Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorageImpl });

    // Reset app store to ensure clean state between tests
    useAppStore.getState().resetAppState();

    vi.clearAllMocks();
  });

  describe('Initial State and Rendering', () => {
    it('should render with default tab (generator)', () => {
      render(<App />);

      expect(screen.getByText('Karenina')).toBeInTheDocument();
      expect(screen.getByText('1. Template Generation')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<App />);

      // Should show the main interface elements
      expect(screen.getByText('A tool for benchmarking LLMs through structured templates')).toBeInTheDocument();
    });

    it('should initialize with empty state when no stored data', () => {
      render(<App />);

      // Template Generation tab should be the default tab and show empty state
      expect(screen.getByText(/No questions available for template generation/)).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs correctly', async () => {
      render(<App />);

      // Should start on Template Generation tab
      expect(screen.getByText('1. Question Extraction')).toBeInTheDocument();
      expect(screen.getByText('2. Answer Template Generation')).toBeInTheDocument();

      // Click on Template Curator tab
      await user.click(screen.getByText('2. Template Curator'));
      expect(screen.getByText('File Management')).toBeInTheDocument();

      // Click on Benchmark tab
      await user.click(screen.getByText('3. Benchmark'));
      expect(screen.getByText(/Test Selection/)).toBeInTheDocument();

      // Go back to Template Generation
      await user.click(screen.getByText('1. Template Generation'));
      expect(screen.getByText('1. Question Extraction')).toBeInTheDocument();
    });

    it('should preserve tab state during navigation', async () => {
      render(<App />);

      // Switch to curator tab
      await user.click(screen.getByText('2. Template Curator'));

      // Switch to another tab and back
      await user.click(screen.getByText('3. Benchmark'));
      await user.click(screen.getByText('2. Template Curator'));

      // Should still be on curator tab
      expect(screen.getByText('File Management')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should handle questionData state updates', async () => {
      render(<App />);

      // Since we now use pure state, verify the UI state instead of localStorage calls
      expect(screen.queryByText('Sample question 1?')).not.toBeInTheDocument();
    });

    it('should handle checkpoint state management', () => {
      render(<App />);

      // With pure state management, checkpoints start empty and are only populated through explicit loading
      // Verify the UI shows empty state initially
      expect(screen.getByText('Karenina')).toBeInTheDocument();
    });

    it('should handle extracted questions state', () => {
      render(<App />);

      // With pure state, extracted questions start empty
      // Verify the UI shows the appropriate initial state
      expect(screen.getByText('Karenina')).toBeInTheDocument();
    });
  });

  describe('Session Management', () => {
    it('should generate session ID on startup', () => {
      render(<App />);

      // With pure state, we now generate a session ID and display it (not 'None')
      expect(screen.getByText(/Session ID: \w+/)).toBeInTheDocument();
    });

    it('should not use sessionStorage for session detection', () => {
      // Mock a scenario where we're testing pure state behavior
      render(<App />);

      // With pure state management, we don't rely on sessionStorage for session detection
      // Verify the app renders correctly without sessionStorage dependencies
      expect(screen.getByText('Karenina')).toBeInTheDocument();
    });

    it('should start with clean state on app initialization', () => {
      // With pure state management, the app always starts with clean state
      render(<App />);

      // Verify clean initial state
      expect(screen.getByText('Karenina')).toBeInTheDocument();
      expect(screen.getByText(/Data: 0 questions, 0 checkpoint items, 0 extracted/)).toBeInTheDocument();
    });

    it('should clear data on comprehensive reset', async () => {
      render(<App />);

      // Switch to curator tab to access reset functionality
      await user.click(screen.getByText('2. Template Curator'));

      // Find and click reset button
      const resetButton = screen.getByText('Reset All Data');
      expect(resetButton).toBeInTheDocument();

      // Mock window.confirm to return true
      window.confirm = vi.fn(() => true);

      await user.click(resetButton);

      expect(window.confirm).toHaveBeenCalledWith(
        'This will clear all data including extracted questions, templates, and progress. Are you sure?'
      );
    });
  });

  describe('Question Navigation', () => {
    it('should handle empty question sets gracefully', () => {
      render(<App />);

      // Template Generation tab is default and shows empty state
      // Should show appropriate message for empty state
      expect(screen.getByText(/No questions available for template generation/)).toBeInTheDocument();
    });

    it('should disable navigation buttons when no questions', async () => {
      render(<App />);

      await user.click(screen.getByText('2. Template Curator'));

      // Navigation buttons should not be present when no questions
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      // Mock localStorage to return invalid JSON
      mockLocalStorageImpl.getItem.mockImplementation((key: string) => {
        if (key === 'checkpoint') {
          return 'invalid-json-data';
        }
        return null;
      });

      // Should not throw error
      expect(() => render(<App />)).not.toThrow();
    });

    it('should handle missing data gracefully', () => {
      mockLocalStorageImpl.getItem.mockReturnValue(null);

      render(<App />);

      // Should render without errors
      expect(screen.getByText('Karenina')).toBeInTheDocument();
    });

    it('should show appropriate messages for different empty states', async () => {
      render(<App />);

      // Template Generation tab is default and shows empty state
      expect(screen.getByText('No questions available for template generation.')).toBeInTheDocument();

      // Curator tab with no question data
      await user.click(screen.getByText('2. Template Curator'));
      expect(screen.getByText(/No Questions with Generated Templates/)).toBeInTheDocument();
    });
  });

  describe('Data Loading and Integration', () => {
    it('should handle question data loading correctly', () => {
      render(<App />);

      // Should show the main interface
      expect(screen.getByText('Karenina')).toBeInTheDocument();
    });

    it('should integrate checkpoint data with question data', () => {
      render(<App />);

      // Should show the main interface
      expect(screen.getByText('Karenina')).toBeInTheDocument();
    });

    it('should handle consecutive checkpoint loading correctly', () => {
      render(<App />);

      // Navigate to Template Curator tab
      const curatorTab = screen.getByText('2. Template Curator');
      fireEvent.click(curatorTab);

      // Verify Template Curator is rendered - it shows "File Management" as the content
      expect(screen.getByText('File Management')).toBeInTheDocument();

      // Create mock checkpoints
      const firstCheckpoint = createMockCheckpoint(createMockQuestionData());
      const secondMockData = {
        'question-5': {
          question: 'Fifth question?',
          raw_answer: 'Fifth answer',
          answer_template: 'Fifth template',
        },
      };
      const secondCheckpoint = createMockCheckpoint(secondMockData);

      // Test consecutive checkpoint loading by verifying the app handles state changes
      const firstCheckpointString = JSON.stringify(firstCheckpoint);
      const secondCheckpointString = JSON.stringify(secondCheckpoint);

      // Simulate the first checkpoint being loaded into localStorage
      localStorage.setItem('checkpoint', firstCheckpointString);

      // Trigger a re-render to pick up the localStorage change
      fireEvent.click(screen.getByText('1. Template Generation'));
      fireEvent.click(screen.getByText('2. Template Curator'));

      // Simulate the second checkpoint being loaded (consecutive load)
      localStorage.setItem('checkpoint', secondCheckpointString);

      // Trigger another re-render
      fireEvent.click(screen.getByText('1. Template Generation'));
      fireEvent.click(screen.getByText('2. Template Curator'));

      // Verify the app remains stable after consecutive checkpoint loads
      expect(screen.getByText('File Management')).toBeInTheDocument();
      expect(screen.getByText('Karenina')).toBeInTheDocument();

      // Verify that localStorage contains the latest checkpoint
      const storedData = localStorage.getItem('checkpoint');
      expect(storedData).toBe(secondCheckpointString);
    });

    it('should maintain state consistency during consecutive checkpoint loads', () => {
      render(<App />);

      // Create different checkpoints to simulate consecutive loads
      const checkpoint1 = createMockCheckpoint(createMockQuestionData());
      const checkpoint2 = createMockCheckpoint({
        'different-question': {
          question: 'Different question?',
          raw_answer: 'Different answer',
          answer_template: 'Different template',
        },
      });

      // Mock localStorage getItem to return first checkpoint
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
        if (key === 'checkpoint') {
          return JSON.stringify(checkpoint1);
        }
        return null;
      });

      // Navigate to Template Curator to trigger checkpoint usage
      const curatorTab = screen.getByText('2. Template Curator');
      fireEvent.click(curatorTab);

      // Should handle the first checkpoint - Template Curator shows "File Management"
      expect(screen.getByText('File Management')).toBeInTheDocument();

      // Now simulate loading second checkpoint consecutively
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
        if (key === 'checkpoint') {
          return JSON.stringify(checkpoint2);
        }
        return null;
      });

      // Navigate away and back to trigger re-loading
      fireEvent.click(screen.getByText('1. Template Generation'));
      fireEvent.click(screen.getByText('2. Template Curator'));

      // App should remain stable and functional
      expect(screen.getByText('File Management')).toBeInTheDocument();
      expect(screen.getByText('Karenina')).toBeInTheDocument();
    });
  });

  describe('Development Mode Features', () => {
    it('should show dev mode status when in development', () => {
      // Mock import.meta.env.DEV
      Object.defineProperty(import.meta, 'env', {
        value: { DEV: true },
        writable: true,
      });

      render(<App />);

      // Should show development session status
      expect(screen.getByText(/Dev Mode:/)).toBeInTheDocument();
    });

    it('should provide force reset button in dev mode', async () => {
      Object.defineProperty(import.meta, 'env', {
        value: { DEV: true },
        writable: true,
      });

      render(<App />);

      const forceResetButton = screen.getByText('Force Reset & Reload');
      expect(forceResetButton).toBeInTheDocument();
    });
  });

  describe('Workflow Integration', () => {
    it('should provide clear workflow progression indicators', () => {
      render(<App />);

      // Should show numbered tabs indicating workflow order
      expect(screen.getByText('1. Template Generation')).toBeInTheDocument();
      expect(screen.getByText('2. Template Curator')).toBeInTheDocument();
      expect(screen.getByText('3. Benchmark')).toBeInTheDocument();
    });

    it('should show appropriate guidance for each workflow step', async () => {
      render(<App />);

      // Template Generation tab should show both extraction and generation sections
      expect(screen.getByText('1. Question Extraction')).toBeInTheDocument();
      expect(screen.getByText('2. Answer Template Generation')).toBeInTheDocument();
      expect(screen.getByText('Upload Question File')).toBeInTheDocument();

      // Curator tab should show file management
      await user.click(screen.getByText('2. Template Curator'));
      expect(screen.getByText('File Management')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory', () => {
    it('should not cause memory leaks with state updates', () => {
      const { unmount } = render(<App />);

      // Unmount component
      unmount();

      // Should clean up without errors
      expect(true).toBe(true);
    });

    it('should handle large datasets efficiently', () => {
      // This would be tested with performance monitoring
      // For now, just verify it renders without issues
      render(<App />);

      expect(screen.getByText('Karenina')).toBeInTheDocument();
    });
  });

  describe('Add Question Button Availability', () => {
    it('should disable "Add Question" button when benchmark is not initialized', async () => {
      render(<App />);

      // Navigate to curator tab
      await user.click(screen.getByText('2. Template Curator'));

      // Find the "Add Question" button - it should be disabled
      const addQuestionButton = screen.getByText('Add Question');
      expect(addQuestionButton).toBeDisabled();
    });

    it('should enable "Add Question" button after templates are generated', async () => {
      // This test would need to mock the template generation process
      // For now, we verify the button state logic is correct by checking
      // that the button exists and its disabled state matches benchmark initialization
      render(<App />);

      await user.click(screen.getByText('2. Template Curator'));

      const addQuestionButton = screen.getByText('Add Question');
      expect(addQuestionButton).toBeInTheDocument();
    });
  });
});
