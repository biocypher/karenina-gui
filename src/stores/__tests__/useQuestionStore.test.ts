import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useQuestionStore } from '../useQuestionStore';
import { act, renderHook } from '@testing-library/react';
import { QuestionData, Checkpoint, UnifiedCheckpoint } from '../../types';

// Mock alert and console methods
const mockAlert = vi.fn();
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.alert = mockAlert;
  global.console = {
    ...global.console,
    log: mockConsoleLog,
    error: mockConsoleError,
  };
});

describe('useQuestionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useQuestionStore.getState().resetQuestionState();
  });

  // Mock data
  const mockQuestionData: QuestionData = {
    q1: {
      question: 'What is the capital of France?',
      raw_answer: 'Paris',
      answer_template: 'class Answer(BaseAnswer):\n    capital: str = Field(description="The capital city")',
    },
    q2: {
      question: 'What is 2+2?',
      raw_answer: '4',
      answer_template: 'class Answer(BaseAnswer):\n    result: int = Field(description="The mathematical result")',
    },
  };

  const mockCheckpoint: Checkpoint = {
    q1: {
      question: 'What is the capital of France?',
      raw_answer: 'Paris',
      original_answer_template: 'class Answer(BaseAnswer):\n    capital: str = Field(description="The capital city")',
      answer_template: 'class Answer(BaseAnswer):\n    capital: str = Field(description="The capital city - modified")',
      last_modified: '2024-01-01T00:00:00Z',
      finished: false,
    },
  };

  const mockUnifiedCheckpoint: UnifiedCheckpoint = {
    version: '2.0',
    global_rubric: null,
    checkpoint: mockCheckpoint,
  };

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useQuestionStore());

      expect(result.current.questionData).toEqual({});
      expect(result.current.checkpoint).toEqual({});
      expect(result.current.selectedQuestionId).toBe('');
      expect(result.current.currentTemplate).toBe('');
      expect(result.current.dataSource).toBe('default');
    });
  });

  describe('Basic Setters', () => {
    it('should set question data', () => {
      const { result } = renderHook(() => useQuestionStore());

      act(() => {
        result.current.setQuestionData(mockQuestionData);
      });

      expect(result.current.questionData).toEqual(mockQuestionData);
    });

    it('should set checkpoint', () => {
      const { result } = renderHook(() => useQuestionStore());

      act(() => {
        result.current.setCheckpoint(mockCheckpoint);
      });

      expect(result.current.checkpoint).toEqual(mockCheckpoint);
    });

    it('should set selected question ID', () => {
      const { result } = renderHook(() => useQuestionStore());

      act(() => {
        result.current.setSelectedQuestionId('q1');
      });

      expect(result.current.selectedQuestionId).toBe('q1');
    });

    it('should set current template', () => {
      const { result } = renderHook(() => useQuestionStore());

      act(() => {
        result.current.setCurrentTemplate('test template');
      });

      expect(result.current.currentTemplate).toBe('test template');
    });
  });

  describe('Load Question Data', () => {
    it('should load valid question data and create fresh checkpoint', () => {
      const { result } = renderHook(() => useQuestionStore());

      act(() => {
        result.current.loadQuestionData(mockQuestionData);
      });

      expect(result.current.questionData).toEqual(mockQuestionData);
      expect(result.current.dataSource).toBe('uploaded');
      expect(result.current.selectedQuestionId).toBe('q1');
      expect(Object.keys(result.current.checkpoint)).toHaveLength(2);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Created fresh checkpoint'));
    });

    it('should reject data with placeholder templates', () => {
      const { result } = renderHook(() => useQuestionStore());

      const badData: QuestionData = {
        q1: {
          question: 'Test?',
          raw_answer: 'Test',
          answer_template: 'Answer to the question: placeholder',
        },
      };

      act(() => {
        result.current.loadQuestionData(badData);
      });

      expect(result.current.questionData).toEqual({});
      expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('placeholder templates'));
    });

    it('should reject data without answer templates', () => {
      const { result } = renderHook(() => useQuestionStore());

      const badData: QuestionData = {
        q1: {
          question: 'Test?',
          raw_answer: 'Test',
          answer_template: '',
        },
      };

      act(() => {
        result.current.loadQuestionData(badData);
      });

      expect(result.current.questionData).toEqual({});
      expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining("don't have answer templates"));
    });

    it('should merge with existing checkpoint when there are matching questions', () => {
      const { result } = renderHook(() => useQuestionStore());

      // Set up existing checkpoint
      act(() => {
        result.current.setCheckpoint(mockCheckpoint);
      });

      // Load question data that matches the checkpoint
      act(() => {
        result.current.loadQuestionData(mockQuestionData);
      });

      expect(result.current.selectedQuestionId).toBe('q1');
      expect(result.current.currentTemplate).toContain('modified');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Checkpoint matches'));
    });
  });

  describe('Load Checkpoint', () => {
    it('should load unified checkpoint', () => {
      const { result } = renderHook(() => useQuestionStore());

      act(() => {
        result.current.loadCheckpoint(mockUnifiedCheckpoint);
      });

      expect(result.current.checkpoint).toEqual(mockCheckpoint);
      expect(result.current.questionData['q1'].question).toBe('What is the capital of France?');
      expect(result.current.selectedQuestionId).toBe('q1');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Unified checkpoint loaded'));
    });

    it('should extract question data from unified checkpoint', () => {
      const { result } = renderHook(() => useQuestionStore());

      act(() => {
        result.current.loadCheckpoint(mockUnifiedCheckpoint);
      });

      expect(result.current.questionData['q1'].question).toBe('What is the capital of France?');
      expect(result.current.questionData['q1'].raw_answer).toBe('Paris');
      expect(result.current.questionData['q1'].answer_template).toBe(mockCheckpoint['q1'].original_answer_template);
      expect(result.current.dataSource).toBe('uploaded');
    });

    it('should set current template from checkpoint', () => {
      const { result } = renderHook(() => useQuestionStore());

      act(() => {
        result.current.loadCheckpoint(mockUnifiedCheckpoint);
      });

      expect(result.current.currentTemplate).toBe(mockCheckpoint['q1'].answer_template);
      expect(result.current.selectedQuestionId).toBe('q1');
    });
  });

  describe('Template Operations', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useQuestionStore());
      act(() => {
        result.current.setQuestionData(mockQuestionData);
        result.current.setSelectedQuestionId('q1');
        result.current.setCurrentTemplate('updated template');
      });
    });

    it('should save current template', () => {
      const { result } = renderHook(() => useQuestionStore());

      act(() => {
        result.current.saveCurrentTemplate();
      });

      expect(result.current.checkpoint['q1'].answer_template).toBe('updated template');
      expect(result.current.checkpoint['q1'].last_modified).toBeDefined();
    });

    it('should toggle finished status', () => {
      const { result } = renderHook(() => useQuestionStore());

      // Initially not finished
      expect(result.current.checkpoint['q1']?.finished || false).toBe(false);

      act(() => {
        result.current.toggleFinished();
      });

      expect(result.current.checkpoint['q1'].finished).toBe(true);

      act(() => {
        result.current.toggleFinished();
      });

      expect(result.current.checkpoint['q1'].finished).toBe(false);
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useQuestionStore());
      act(() => {
        result.current.setQuestionData(mockQuestionData);
        result.current.setCheckpoint(mockCheckpoint);
      });
    });

    it('should navigate to question', () => {
      const { result } = renderHook(() => useQuestionStore());

      act(() => {
        result.current.navigateToQuestion('q1');
      });

      expect(result.current.selectedQuestionId).toBe('q1');
      expect(result.current.currentTemplate).toContain('modified');
    });
  });

  describe('Computed Getters', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useQuestionStore());
      act(() => {
        result.current.setQuestionData(mockQuestionData);
        result.current.setCheckpoint(mockCheckpoint);
        result.current.setSelectedQuestionId('q1');
      });
    });

    it('should get question IDs', () => {
      const { result } = renderHook(() => useQuestionStore());

      const questionIds = result.current.getQuestionIds();
      expect(questionIds).toEqual(['q1', 'q2']);
    });

    it('should get current index', () => {
      const { result } = renderHook(() => useQuestionStore());

      const currentIndex = result.current.getCurrentIndex();
      expect(currentIndex).toBe(0);
    });

    it('should get selected question', () => {
      const { result } = renderHook(() => useQuestionStore());

      const selectedQuestion = result.current.getSelectedQuestion();
      expect(selectedQuestion?.question).toBe('What is the capital of France?');
    });

    it('should get checkpoint item', () => {
      const { result } = renderHook(() => useQuestionStore());

      const checkpointItem = result.current.getCheckpointItem();
      expect(checkpointItem?.finished).toBe(false);
    });

    it('should detect if template is modified', () => {
      const { result } = renderHook(() => useQuestionStore());

      const isModified = result.current.getIsModified();
      expect(isModified).toBe(true); // mockCheckpoint has modified template
    });

    it('should get original and saved code', () => {
      const { result } = renderHook(() => useQuestionStore());

      const originalCode = result.current.getOriginalCode();
      const savedCode = result.current.getSavedCode();

      expect(originalCode).toContain('The capital city');
      expect(savedCode).toContain('modified');
    });
  });

  describe('Reset State', () => {
    it('should reset all question state', () => {
      const { result } = renderHook(() => useQuestionStore());

      // Set up some state
      act(() => {
        result.current.setQuestionData(mockQuestionData);
        result.current.setSelectedQuestionId('q1');
        result.current.setCurrentTemplate('test');
      });

      // Reset
      act(() => {
        result.current.resetQuestionState();
      });

      expect(result.current.questionData).toEqual({});
      expect(result.current.checkpoint).toEqual({});
      expect(result.current.selectedQuestionId).toBe('');
      expect(result.current.currentTemplate).toBe('');
      expect(result.current.dataSource).toBe('default');
    });
  });
});
