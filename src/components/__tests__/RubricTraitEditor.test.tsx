import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, userEvent, waitFor } from '../../test-utils/test-helpers';
import RubricTraitEditor from '../RubricTraitEditor';
import { useRubricStore } from '../../stores/useRubricStore';
import { server } from '../../test-utils/mocks/server';
import { http, HttpResponse } from 'msw';
import { API_ENDPOINTS } from '../../constants/api';
import type { RubricTrait } from '../../types';

// Mock the store
vi.mock('../../stores/useRubricStore');

const mockUseRubricStore = vi.mocked(useRubricStore);

describe('RubricTraitEditor', () => {
  const mockSetCurrentRubric = vi.fn();

  // Helper function to create a complete mock store
  const createMockStore = (overrides = {}) => ({
    currentRubric: { traits: mockGeneratedTraits },
    generatedSuggestions: mockGeneratedTraits,
    config: {
      model_provider: 'google_genai',
      model_name: 'gemini-2.0-flash',
      temperature: 0.1,
      interface: 'langchain',
    },
    isGeneratingTraits: false,
    isLoadingRubric: false,
    isSavingRubric: false,
    lastError: null,
    setCurrentRubric: mockSetCurrentRubric,
    addTrait: vi.fn(),
    updateTrait: vi.fn(),
    removeTrait: vi.fn(),
    reorderTraits: vi.fn(),
    setConfig: vi.fn(),
    generateTraits: vi.fn(),
    loadRubric: vi.fn(),
    saveRubric: vi.fn(),
    deleteRubric: vi.fn(),
    clearError: vi.fn(),
    reset: vi.fn(),
    applyGeneratedTraits: vi.fn(),
    ...overrides,
  });

  const mockGeneratedTraits: RubricTrait[] = [
    {
      name: 'accuracy',
      description: 'Is the response factually accurate?',
      kind: 'boolean',
      min_score: null,
      max_score: null,
    },
    {
      name: 'completeness',
      description: 'How complete is the response?',
      kind: 'score',
      min_score: 1,
      max_score: 5,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful API responses
    server.use(
      http.post(`${API_ENDPOINTS.BASE}/rubric`, () => {
        return HttpResponse.json({ message: 'Rubric saved successfully', title: 'Test Rubric' });
      }),
      http.delete(`${API_ENDPOINTS.BASE}/rubric`, () => {
        return HttpResponse.json({ message: 'Rubric deleted successfully' });
      })
    );

    // Mock useRubricStore with generated traits
    mockUseRubricStore.mockReturnValue(createMockStore());
  });

  describe('Initial Rendering', () => {
    it('should render with generated traits', () => {
      render(<RubricTraitEditor />);

      expect(screen.getByText('Rubric Trait Editor')).toBeInTheDocument();
      expect(screen.getByDisplayValue('accuracy')).toBeInTheDocument();
      expect(screen.getByDisplayValue('completeness')).toBeInTheDocument();
    });

    it('should show empty state with no traits', () => {
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          currentRubric: { traits: [] },
          generatedSuggestions: [],
        })
      );

      render(<RubricTraitEditor />);

      expect(screen.getByText('Add trait')).toBeInTheDocument();
      expect(screen.getByText('Set Traits')).toBeDisabled();
    });

    it('should load existing rubric when available', () => {
      const existingRubric = {
        traits: [
          {
            name: 'clarity',
            description: 'Is the response clear?',
            kind: 'boolean' as const,
            min_score: null,
            max_score: null,
          },
        ],
      };

      mockUseRubricStore.mockReturnValue(
        createMockStore({
          currentRubric: existingRubric,
          generatedSuggestions: [],
        })
      );

      render(<RubricTraitEditor />);

      expect(screen.getByDisplayValue('clarity')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Is the response clear?')).toBeInTheDocument();
    });
  });

  describe('Trait Editing', () => {
    it('should edit trait name', async () => {
      const user = userEvent.setup();
      const mockUpdateTrait = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          updateTrait: mockUpdateTrait,
        })
      );

      render(<RubricTraitEditor />);

      const nameInput = screen.getByDisplayValue('accuracy');
      await user.clear(nameInput);
      await user.type(nameInput, 'factual_accuracy');

      expect(mockUpdateTrait).toHaveBeenCalled();
    });

    it('should edit trait description', async () => {
      const user = userEvent.setup();
      const mockUpdateTrait = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          updateTrait: mockUpdateTrait,
        })
      );

      render(<RubricTraitEditor />);

      const descriptionInput = screen.getByDisplayValue('Is the response factually accurate?');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description for accuracy');

      expect(mockUpdateTrait).toHaveBeenCalled();
    });

    it('should change trait kind from boolean to score', async () => {
      const user = userEvent.setup();
      const mockUpdateTrait = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          updateTrait: mockUpdateTrait,
        })
      );

      render(<RubricTraitEditor />);

      // Find the first kind selector - it contains "Binary" and "Score" options
      const kindSelects = screen.getAllByLabelText('Trait type');
      const kindSelect = kindSelects[0]; // First trait (accuracy)

      await user.selectOptions(kindSelect, 'score');

      expect(mockUpdateTrait).toHaveBeenCalled();
    });

    it('should change trait kind from score to boolean', async () => {
      const user = userEvent.setup();
      const mockUpdateTrait = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          updateTrait: mockUpdateTrait,
        })
      );

      render(<RubricTraitEditor />);

      // Find the score trait's kind selector (completeness is score type)
      const kindSelects = screen.getAllByLabelText('Trait type');
      const scoreKindSelect = kindSelects[1]; // Second trait is completeness (score)

      await user.selectOptions(scoreKindSelect, 'boolean');

      expect(mockUpdateTrait).toHaveBeenCalled();
    });

    it('should edit score range for score traits', async () => {
      const user = userEvent.setup();
      const mockUpdateTrait = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          updateTrait: mockUpdateTrait,
        })
      );

      render(<RubricTraitEditor />);

      // Find min and max score inputs for the completeness trait
      const minScoreInput = screen.getByDisplayValue('1');
      const maxScoreInput = screen.getByDisplayValue('5');

      await user.clear(minScoreInput);
      await user.type(minScoreInput, '0');

      await user.clear(maxScoreInput);
      await user.type(maxScoreInput, '10');

      expect(mockUpdateTrait).toHaveBeenCalled();
    });
  });

  describe('Trait Management', () => {
    it('should add new trait', async () => {
      const user = userEvent.setup();
      const mockAddTrait = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          addTrait: mockAddTrait,
        })
      );

      render(<RubricTraitEditor />);

      const addButton = screen.getByRole('button', { name: /add trait/i });
      await user.click(addButton);

      expect(mockAddTrait).toHaveBeenCalled();
    });

    it('should remove trait', async () => {
      const user = userEvent.setup();
      const mockRemoveTrait = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          removeTrait: mockRemoveTrait,
        })
      );

      render(<RubricTraitEditor />);

      // Find remove buttons
      const removeButtons = screen.getAllByRole('button', { name: /delete.*trait/i });
      expect(removeButtons).toHaveLength(2);

      // Remove first trait
      await user.click(removeButtons[0]);

      expect(mockRemoveTrait).toHaveBeenCalledWith(0);
    });

    it('should allow removing traits when multiple exist', async () => {
      // Mock store with only one trait
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          currentRubric: { traits: [mockGeneratedTraits[0]] },
          generatedSuggestions: [],
        })
      );

      render(<RubricTraitEditor />);

      const removeButton = screen.getByRole('button', { name: /delete.*trait/i });
      expect(removeButton).toBeInTheDocument();
    });
  });

  describe('Rubric Operations', () => {
    it('should save rubric successfully', async () => {
      const user = userEvent.setup();
      const mockSaveRubric = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          saveRubric: mockSaveRubric,
        })
      );

      render(<RubricTraitEditor />);

      // Save rubric
      const saveButton = screen.getByRole('button', { name: /set traits/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveRubric).toHaveBeenCalled();
      });
    });

    it('should prevent saving without traits', async () => {
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          currentRubric: { traits: [] },
          generatedSuggestions: [],
        })
      );

      render(<RubricTraitEditor />);

      const saveButton = screen.getByRole('button', { name: /set traits/i });
      expect(saveButton).toBeDisabled();
    });

    it('should allow editing trait names', async () => {
      const user = userEvent.setup();
      const mockUpdateTrait = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          updateTrait: mockUpdateTrait,
        })
      );

      render(<RubricTraitEditor />);

      // Edit a trait name
      const nameInput = screen.getByDisplayValue('accuracy');
      await user.clear(nameInput);
      await user.type(nameInput, 'factual_accuracy');

      // Check that updateTrait was called
      expect(mockUpdateTrait).toHaveBeenCalled();
    });

    it('should allow editing trait descriptions', async () => {
      const user = userEvent.setup();
      const mockUpdateTrait = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          updateTrait: mockUpdateTrait,
        })
      );

      render(<RubricTraitEditor />);

      // Edit a trait description
      const descriptionInput = screen.getByDisplayValue('Is the response factually accurate?');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');

      // Check that updateTrait was called
      expect(mockUpdateTrait).toHaveBeenCalled();
    });

    it('should allow removing individual traits', async () => {
      const user = userEvent.setup();
      const mockRemoveTrait = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          removeTrait: mockRemoveTrait,
        })
      );

      render(<RubricTraitEditor />);

      const deleteButton = screen.getAllByRole('button', { name: /delete.*trait/i })[0];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockRemoveTrait).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle save API errors', async () => {
      const user = userEvent.setup();
      const mockClearError = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          lastError: 'Save failed',
          clearError: mockClearError,
        })
      );

      render(<RubricTraitEditor />);

      expect(screen.getByText('Save failed')).toBeInTheDocument();

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      expect(mockClearError).toHaveBeenCalled();
    });

    it('should show error messages when present', async () => {
      const user = userEvent.setup();
      const mockClearError = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          lastError: 'Error occurred',
          clearError: mockClearError,
        })
      );

      render(<RubricTraitEditor />);

      expect(screen.getByText('Error occurred')).toBeInTheDocument();

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      expect(mockClearError).toHaveBeenCalled();
    });

    it('should clear errors when dismiss is clicked', async () => {
      const user = userEvent.setup();
      const mockClearError = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          lastError: 'Test error message',
          clearError: mockClearError,
        })
      );

      render(<RubricTraitEditor />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<RubricTraitEditor />);

      // Check trait form labels (there are multiple traits, so use getAllByText)
      expect(screen.getAllByText('Trait Name')).toHaveLength(2);
      expect(screen.getAllByText('Trait Description')).toHaveLength(2);
      expect(screen.getAllByText('Trait Type')).toHaveLength(2);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);

      // Tab through form elements

      await user.tab();
      expect(screen.getByDisplayValue('accuracy')).toHaveFocus();
    });

    it('should have proper button semantics', () => {
      render(<RubricTraitEditor />);

      expect(screen.getByRole('button', { name: /add trait/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /set traits/i })).toBeInTheDocument();

      const removeButtons = screen.getAllByRole('button', { name: /delete.*trait/i });
      expect(removeButtons).toHaveLength(2);
    });
  });

  describe('Integration', () => {
    it('should work with complex trait combinations', async () => {
      const user = userEvent.setup();
      const mockAddTrait = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          addTrait: mockAddTrait,
        })
      );

      render(<RubricTraitEditor />);

      // Add a new trait
      const addButton = screen.getByRole('button', { name: /add trait/i });
      await user.click(addButton);

      expect(mockAddTrait).toHaveBeenCalled();
    });

    it('should maintain state during edits', async () => {
      const user = userEvent.setup();
      const mockUpdateTrait = vi.fn();
      mockUseRubricStore.mockReturnValue(
        createMockStore({
          updateTrait: mockUpdateTrait,
        })
      );

      render(<RubricTraitEditor />);

      // Edit multiple traits
      const nameInputs = screen.getAllByLabelText('Trait name');
      await user.clear(nameInputs[0]);
      await user.type(nameInputs[0], 'factual_correctness');

      // Change trait types
      const kindSelects = screen.getAllByRole('combobox');
      await user.selectOptions(kindSelects[1], 'boolean'); // completeness -> boolean

      // Verify updateTrait was called
      expect(mockUpdateTrait).toHaveBeenCalled();
    });
  });
});
