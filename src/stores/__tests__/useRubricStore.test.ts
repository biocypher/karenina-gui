import { describe, it, expect, beforeEach } from 'vitest';
import { useRubricStore } from '../useRubricStore';
import { act, renderHook } from '@testing-library/react';
import type { RubricTrait } from '../../types';

describe('useRubricStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useRubricStore.getState().reset();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useRubricStore());

    expect(result.current.currentRubric).toBeNull();
    expect(result.current.generatedSuggestions).toEqual([]);
    expect(result.current.isGeneratingTraits).toBe(false);
    expect(result.current.isLoadingRubric).toBe(false);
    expect(result.current.isSavingRubric).toBe(false);
    expect(result.current.lastError).toBeNull();
  });

  it('should set current rubric', () => {
    const { result } = renderHook(() => useRubricStore());

    const mockRubric = {
      llm_traits: [
        {
          name: 'accuracy',
          description: 'Is the response accurate?',
          kind: 'boolean' as const,
          min_score: null,
          max_score: null,
        },
      ],
    };

    act(() => {
      result.current.setCurrentRubric(mockRubric);
    });

    expect(result.current.currentRubric).toEqual(mockRubric);
    expect(result.current.lastError).toBeNull();
  });

  it('should clear current rubric', () => {
    const { result } = renderHook(() => useRubricStore());

    const mockRubric = {
      llm_traits: [],
    };

    act(() => {
      result.current.setCurrentRubric(mockRubric);
    });

    expect(result.current.currentRubric).toEqual(mockRubric);

    act(() => {
      result.current.setCurrentRubric(null);
    });

    expect(result.current.currentRubric).toBeNull();
  });

  it('should add new trait', () => {
    const { result } = renderHook(() => useRubricStore());

    const mockRubric = {
      llm_traits: [],
    };

    act(() => {
      result.current.setCurrentRubric(mockRubric);
    });

    const newTrait: RubricTrait = {
      name: 'accuracy',
      description: 'Is the response accurate?',
      kind: 'boolean',
      min_score: null,
      max_score: null,
    };

    act(() => {
      result.current.addTrait(newTrait);
    });

    expect(result.current.currentRubric?.traits).toHaveLength(1);
    expect(result.current.currentRubric?.traits[0]).toEqual(newTrait);
  });

  it('should prevent adding duplicate trait names', () => {
    const { result } = renderHook(() => useRubricStore());

    const mockRubric = {
      llm_traits: [
        {
          name: 'accuracy',
          description: 'First accuracy trait',
          kind: 'boolean' as const,
          min_score: null,
          max_score: null,
        },
      ],
    };

    act(() => {
      result.current.setCurrentRubric(mockRubric);
    });

    const duplicateTrait: RubricTrait = {
      name: 'accuracy', // Same name
      description: 'Second accuracy trait',
      kind: 'score',
      min_score: 1,
      max_score: 5,
    };

    act(() => {
      result.current.addTrait(duplicateTrait);
    });

    expect(result.current.currentRubric?.traits).toHaveLength(1); // Should not add
    expect(result.current.lastError).toContain('already exists');
  });

  it('should update existing trait', () => {
    const { result } = renderHook(() => useRubricStore());

    const mockRubric = {
      llm_traits: [
        {
          name: 'accuracy',
          description: 'Original description',
          kind: 'boolean' as const,
          min_score: null,
          max_score: null,
        },
      ],
    };

    act(() => {
      result.current.setCurrentRubric(mockRubric);
    });

    const updatedTrait: RubricTrait = {
      name: 'accuracy',
      description: 'Updated description',
      kind: 'score',
      min_score: 1,
      max_score: 5,
    };

    act(() => {
      result.current.updateTrait(0, updatedTrait);
    });

    expect(result.current.currentRubric?.traits[0]).toEqual(updatedTrait);
  });

  it('should remove trait', () => {
    const { result } = renderHook(() => useRubricStore());

    const mockRubric = {
      llm_traits: [
        {
          name: 'accuracy',
          description: 'Accuracy trait',
          kind: 'boolean' as const,
          min_score: null,
          max_score: null,
        },
        {
          name: 'completeness',
          description: 'Completeness trait',
          kind: 'score' as const,
          min_score: 1,
          max_score: 5,
        },
      ],
    };

    act(() => {
      result.current.setCurrentRubric(mockRubric);
    });

    act(() => {
      result.current.removeTrait(0);
    });

    expect(result.current.currentRubric?.traits).toHaveLength(1);
    expect(result.current.currentRubric?.traits[0].name).toBe('completeness');
  });

  it('should reorder traits', () => {
    const { result } = renderHook(() => useRubricStore());

    const mockRubric = {
      llm_traits: [
        {
          name: 'accuracy',
          description: 'Accuracy trait',
          kind: 'boolean' as const,
          min_score: null,
          max_score: null,
        },
        {
          name: 'completeness',
          description: 'Completeness trait',
          kind: 'score' as const,
          min_score: 1,
          max_score: 5,
        },
      ],
    };

    act(() => {
      result.current.setCurrentRubric(mockRubric);
    });

    act(() => {
      result.current.reorderTraits(0, 1); // Move first trait to second position
    });

    expect(result.current.currentRubric?.traits[0].name).toBe('completeness');
    expect(result.current.currentRubric?.traits[1].name).toBe('accuracy');
  });

  it('should apply generated traits', () => {
    const { result } = renderHook(() => useRubricStore());

    const mockRubric = {
      llm_traits: [
        {
          name: 'existing',
          description: 'Existing trait',
          kind: 'boolean' as const,
          min_score: null,
          max_score: null,
        },
      ],
    };

    act(() => {
      result.current.setCurrentRubric(mockRubric);
    });

    const generatedTraits: RubricTrait[] = [
      {
        name: 'generated1',
        description: 'Generated trait 1',
        kind: 'boolean',
        min_score: null,
        max_score: null,
      },
      {
        name: 'generated2',
        description: 'Generated trait 2',
        kind: 'score',
        min_score: 1,
        max_score: 3,
      },
    ];

    act(() => {
      result.current.applyGeneratedTraits(generatedTraits);
    });

    expect(result.current.currentRubric?.traits).toHaveLength(3);
    expect(result.current.currentRubric?.traits[0].name).toBe('existing');
    expect(result.current.currentRubric?.traits[1].name).toBe('generated1');
    expect(result.current.currentRubric?.traits[2].name).toBe('generated2');
    expect(result.current.generatedSuggestions).toEqual([]);
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useRubricStore());

    // Trigger an error
    act(() => {
      result.current.updateTrait(-1, {
        name: 'invalid',
        description: 'Invalid trait',
        kind: 'boolean',
        min_score: null,
        max_score: null,
      });
    });

    expect(result.current.lastError).toBeTruthy();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.lastError).toBeNull();
  });

  it('should reset all state', () => {
    const { result } = renderHook(() => useRubricStore());

    const mockRubric = {
      llm_traits: [],
    };

    // Set various state values
    act(() => {
      result.current.setCurrentRubric(mockRubric);
      // Simulate some async state
      result.current.isGeneratingTraits = true;
      result.current.isLoadingRubric = true;
      result.current.isSavingRubric = true;
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.currentRubric).toBeNull();
    expect(result.current.generatedSuggestions).toEqual([]);
    expect(result.current.isGeneratingTraits).toBe(false);
    expect(result.current.isLoadingRubric).toBe(false);
    expect(result.current.isSavingRubric).toBe(false);
    expect(result.current.lastError).toBeNull();
  });

  it('should handle edge cases for trait manipulation', () => {
    const { result } = renderHook(() => useRubricStore());

    // Try to update trait when no rubric exists
    act(() => {
      result.current.updateTrait(0, {
        name: 'test',
        description: 'Test trait',
        kind: 'boolean',
        min_score: null,
        max_score: null,
      });
    });

    expect(result.current.lastError).toContain('Invalid trait index');

    // Try to remove trait with invalid index
    act(() => {
      result.current.removeTrait(99);
    });

    expect(result.current.lastError).toContain('Invalid trait index');
  });
});
