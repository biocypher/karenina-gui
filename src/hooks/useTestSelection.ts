import { useState, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { CheckpointItem } from '../types';

export type FinishedTemplate = [string, CheckpointItem];

export interface UseTestSelectionOptions {
  finishedTemplates: FinishedTemplate[];
}

export interface UseTestSelectionReturn {
  // State
  selectedTests: Set<string>;
  testSearchTerm: string;
  filteredTemplates: FinishedTemplate[];
  expandedQuestions: Set<string>;
  customFewShotSelections: Record<string, Set<number>>;

  // Setters
  setSelectedTests: Dispatch<SetStateAction<Set<string>>>;
  setTestSearchTerm: Dispatch<SetStateAction<string>>;
  setExpandedQuestions: Dispatch<SetStateAction<Set<string>>>;
  setCustomFewShotSelections: Dispatch<SetStateAction<Record<string, Set<number>>>>;

  // Actions
  handleSelectAll: () => void;
  handleSelectNone: () => void;
  handleClearAllSelections: () => void;
  handleToggleTest: (questionId: string) => void;
  handleToggleQuestionExpansion: (questionId: string) => void;
  handleToggleExampleSelection: (questionId: string, exampleIndex: number) => void;
}

/**
 * Hook for managing test selection and filtering in BenchmarkTab.
 * Handles test selection state, search filtering, and few-shot example selection.
 */
export function useTestSelection({ finishedTemplates }: UseTestSelectionOptions): UseTestSelectionReturn {
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [testSearchTerm, setTestSearchTerm] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [customFewShotSelections, setCustomFewShotSelections] = useState<Record<string, Set<number>>>({});

  // Filter templates based on search term
  const filteredTemplates = useMemo(() => {
    if (!testSearchTerm.trim()) {
      return finishedTemplates;
    }
    const searchLower = testSearchTerm.toLowerCase();
    return finishedTemplates.filter(
      ([id, item]) => item.question.toLowerCase().includes(searchLower) || id.toLowerCase().includes(searchLower)
    );
  }, [finishedTemplates, testSearchTerm]);

  // Select all currently visible (filtered) tests
  const handleSelectAll = useCallback(() => {
    const newSelected = new Set(selectedTests);
    filteredTemplates.forEach(([id]) => newSelected.add(id));
    setSelectedTests(newSelected);
  }, [selectedTests, filteredTemplates]);

  // Deselect only the currently visible (filtered) tests
  const handleSelectNone = useCallback(() => {
    const newSelected = new Set(selectedTests);
    filteredTemplates.forEach(([id]) => newSelected.delete(id));
    setSelectedTests(newSelected);
  }, [selectedTests, filteredTemplates]);

  const handleClearAllSelections = useCallback(() => {
    setSelectedTests(new Set());
  }, []);

  const handleToggleTest = useCallback((questionId: string) => {
    setSelectedTests((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(questionId)) {
        newSelected.delete(questionId);
      } else {
        newSelected.add(questionId);
      }
      return newSelected;
    });
  }, []);

  const handleToggleQuestionExpansion = useCallback((questionId: string) => {
    setExpandedQuestions((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(questionId)) {
        newExpanded.delete(questionId);
      } else {
        newExpanded.add(questionId);
      }
      return newExpanded;
    });
  }, []);

  const handleToggleExampleSelection = useCallback((questionId: string, exampleIndex: number) => {
    setCustomFewShotSelections((prev) => {
      const currentSelections = prev[questionId] || new Set<number>();
      const newSelections = new Set(currentSelections);

      if (newSelections.has(exampleIndex)) {
        newSelections.delete(exampleIndex);
      } else {
        newSelections.add(exampleIndex);
      }

      return {
        ...prev,
        [questionId]: newSelections,
      };
    });
  }, []);

  return {
    // State
    selectedTests,
    testSearchTerm,
    filteredTemplates,
    expandedQuestions,
    customFewShotSelections,

    // Setters
    setSelectedTests,
    setTestSearchTerm,
    setExpandedQuestions,
    setCustomFewShotSelections,

    // Actions
    handleSelectAll,
    handleSelectNone,
    handleClearAllSelections,
    handleToggleTest,
    handleToggleQuestionExpansion,
    handleToggleExampleSelection,
  };
}
