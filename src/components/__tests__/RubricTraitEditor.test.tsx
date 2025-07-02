import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, userEvent, waitFor } from '../../test-utils/test-helpers';
import { RubricTraitEditor } from '../RubricTraitEditor';
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
  const mockClearCurrentRubric = vi.fn();

  const mockGeneratedTraits: RubricTrait[] = [
    {
      name: 'accuracy',
      description: 'Is the response factually accurate?',
      kind: 'boolean',
      min_score: null,
      max_score: null
    },
    {
      name: 'completeness',
      description: 'How complete is the response?',
      kind: 'score',
      min_score: 1,
      max_score: 5
    }
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
    mockUseRubricStore.mockReturnValue({
      currentRubric: null,
      generatedTraits: mockGeneratedTraits,
      isGeneratingTraits: false,
      traitGenerationError: null,
      setCurrentRubric: mockSetCurrentRubric,
      clearCurrentRubric: mockClearCurrentRubric,
      setGeneratedTraits: vi.fn(),
      clearGeneratedTraits: vi.fn(),
      setIsGeneratingTraits: vi.fn(),
      setTraitGenerationError: vi.fn(),
      resetRubricState: vi.fn(),
    });
  });

  describe('Initial Rendering', () => {
    it('should render with generated traits', () => {
      render(<RubricTraitEditor />);
      
      expect(screen.getByText('Edit Rubric')).toBeInTheDocument();
      expect(screen.getByLabelText(/rubric title/i)).toBeInTheDocument();
      expect(screen.getByText('accuracy')).toBeInTheDocument();
      expect(screen.getByText('completeness')).toBeInTheDocument();
    });

    it('should show empty state with no traits', () => {
      mockUseRubricStore.mockReturnValue({
        currentRubric: null,
        generatedTraits: [],
        isGeneratingTraits: false,
        traitGenerationError: null,
        setCurrentRubric: mockSetCurrentRubric,
        clearCurrentRubric: mockClearCurrentRubric,
        setGeneratedTraits: vi.fn(),
        clearGeneratedTraits: vi.fn(),
        setIsGeneratingTraits: vi.fn(),
        setTraitGenerationError: vi.fn(),
        resetRubricState: vi.fn(),
      });
      
      render(<RubricTraitEditor />);
      
      expect(screen.getByText('No traits available. Generate traits first using the generator above.')).toBeInTheDocument();
    });

    it('should load existing rubric when available', () => {
      const existingRubric = {
        title: 'Existing Rubric',
        traits: [
          {
            name: 'clarity',
            description: 'Is the response clear?',
            kind: 'boolean' as const,
            min_score: null,
            max_score: null
          }
        ]
      };

      mockUseRubricStore.mockReturnValue({
        currentRubric: existingRubric,
        generatedTraits: [],
        isGeneratingTraits: false,
        traitGenerationError: null,
        setCurrentRubric: mockSetCurrentRubric,
        clearCurrentRubric: mockClearCurrentRubric,
        setGeneratedTraits: vi.fn(),
        clearGeneratedTraits: vi.fn(),
        setIsGeneratingTraits: vi.fn(),
        setTraitGenerationError: vi.fn(),
        resetRubricState: vi.fn(),
      });
      
      render(<RubricTraitEditor />);
      
      expect(screen.getByDisplayValue('Existing Rubric')).toBeInTheDocument();
      expect(screen.getByText('clarity')).toBeInTheDocument();
    });
  });

  describe('Trait Editing', () => {
    it('should edit trait name', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);
      
      const nameInput = screen.getByDisplayValue('accuracy');
      await user.clear(nameInput);
      await user.type(nameInput, 'factual_accuracy');
      
      expect(nameInput).toHaveValue('factual_accuracy');
    });

    it('should edit trait description', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);
      
      const descriptionInput = screen.getByDisplayValue('Is the response factually accurate?');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description for accuracy');
      
      expect(descriptionInput).toHaveValue('Updated description for accuracy');
    });

    it('should change trait kind from boolean to score', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);
      
      // Find the boolean trait's kind selector
      const kindSelects = screen.getAllByDisplayValue('boolean');
      const accuracyKindSelect = kindSelects[0]; // First boolean trait is accuracy
      
      await user.selectOptions(accuracyKindSelect, 'score');
      
      expect(accuracyKindSelect).toHaveValue('score');
      
      // Should show score range inputs
      await waitFor(() => {
        expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // min_score
        expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // max_score
      });
    });

    it('should change trait kind from score to boolean', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);
      
      // Find the score trait's kind selector
      const kindSelect = screen.getByDisplayValue('score');
      
      await user.selectOptions(kindSelect, 'boolean');
      
      expect(kindSelect).toHaveValue('boolean');
      
      // Should hide score range inputs for this trait
      const minScoreInputs = screen.queryAllByDisplayValue('1');
      expect(minScoreInputs).toHaveLength(0); // No score traits left
    });

    it('should edit score range for score traits', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);
      
      // Find min and max score inputs for the completeness trait
      const minScoreInput = screen.getByDisplayValue('1');
      const maxScoreInput = screen.getByDisplayValue('5');
      
      await user.clear(minScoreInput);
      await user.type(minScoreInput, '0');
      
      await user.clear(maxScoreInput);
      await user.type(maxScoreInput, '10');
      
      expect(minScoreInput).toHaveValue('0');
      expect(maxScoreInput).toHaveValue('10');
    });
  });

  describe('Trait Management', () => {
    it('should add new trait', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);
      
      const addButton = screen.getByRole('button', { name: /add trait/i });
      await user.click(addButton);
      
      // Should have 3 traits now (2 original + 1 new)
      const nameInputs = screen.getAllByPlaceholderText('Enter trait name');
      expect(nameInputs).toHaveLength(3);
      
      // New trait should have default values
      const newNameInput = nameInputs[2];
      expect(newNameInput).toHaveValue('');
    });

    it('should remove trait', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);
      
      // Find remove buttons
      const removeButtons = screen.getAllByRole('button', { name: /remove trait/i });
      expect(removeButtons).toHaveLength(2);
      
      // Remove first trait
      await user.click(removeButtons[0]);
      
      // Should have only 1 trait left
      expect(screen.queryByDisplayValue('accuracy')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('completeness')).toBeInTheDocument();
    });

    it('should prevent removing last trait', async () => {
      const user = userEvent.setup();
      
      // Mock store with only one trait
      mockUseRubricStore.mockReturnValue({
        currentRubric: null,
        generatedTraits: [mockGeneratedTraits[0]], // Only accuracy trait
        isGeneratingTraits: false,
        traitGenerationError: null,
        setCurrentRubric: mockSetCurrentRubric,
        clearCurrentRubric: mockClearCurrentRubric,
        setGeneratedTraits: vi.fn(),
        clearGeneratedTraits: vi.fn(),
        setIsGeneratingTraits: vi.fn(),
        setTraitGenerationError: vi.fn(),
        resetRubricState: vi.fn(),
      });
      
      render(<RubricTraitEditor />);
      
      const removeButton = screen.getByRole('button', { name: /remove trait/i });
      expect(removeButton).toBeDisabled();
    });
  });

  describe('Rubric Operations', () => {
    it('should save rubric successfully', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);
      
      // Enter rubric title
      const titleInput = screen.getByLabelText(/rubric title/i);
      await user.type(titleInput, 'My Test Rubric');
      
      // Save rubric
      const saveButton = screen.getByRole('button', { name: /save rubric/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockSetCurrentRubric).toHaveBeenCalledWith({
          title: 'My Test Rubric',
          traits: expect.arrayContaining([
            expect.objectContaining({ name: 'accuracy' }),
            expect.objectContaining({ name: 'completeness' })
          ])
        });
      });
    });

    it('should prevent saving without title', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);
      
      const saveButton = screen.getByRole('button', { name: /save rubric/i });
      await user.click(saveButton);
      
      // Should show validation error
      expect(screen.getByText('Please enter a rubric title')).toBeInTheDocument();
    });

    it('should prevent saving with empty trait names', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);
      
      // Clear a trait name
      const nameInput = screen.getByDisplayValue('accuracy');
      await user.clear(nameInput);
      
      // Enter title and try to save
      const titleInput = screen.getByLabelText(/rubric title/i);
      await user.type(titleInput, 'Test Rubric');
      
      const saveButton = screen.getByRole('button', { name: /save rubric/i });
      await user.click(saveButton);
      
      // Should show validation error
      expect(screen.getByText('All traits must have names')).toBeInTheDocument();
    });

    it('should prevent saving with duplicate trait names', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);
      
      // Set duplicate name
      const nameInputs = screen.getAllByPlaceholderText('Enter trait name');
      await user.clear(nameInputs[1]);
      await user.type(nameInputs[1], 'accuracy'); // Same as first trait
      
      // Enter title and try to save
      const titleInput = screen.getByLabelText(/rubric title/i);
      await user.type(titleInput, 'Test Rubric');
      
      const saveButton = screen.getByRole('button', { name: /save rubric/i });
      await user.click(saveButton);
      
      // Should show validation error
      expect(screen.getByText('All trait names must be unique')).toBeInTheDocument();
    });

    it('should delete rubric successfully', async () => {
      const user = userEvent.setup();
      
      // Mock store with existing rubric
      mockUseRubricStore.mockReturnValue({
        currentRubric: {
          title: 'Existing Rubric',
          traits: mockGeneratedTraits
        },
        generatedTraits: [],
        isGeneratingTraits: false,
        traitGenerationError: null,
        setCurrentRubric: mockSetCurrentRubric,
        clearCurrentRubric: mockClearCurrentRubric,
        setGeneratedTraits: vi.fn(),
        clearGeneratedTraits: vi.fn(),
        setIsGeneratingTraits: vi.fn(),
        setTraitGenerationError: vi.fn(),
        resetRubricState: vi.fn(),
      });
      
      render(<RubricTraitEditor />);
      
      const deleteButton = screen.getByRole('button', { name: /delete rubric/i });
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(mockClearCurrentRubric).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle save API errors', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.post(`${API_ENDPOINTS.BASE}/rubric`, () => {
          return HttpResponse.json(
            { detail: 'Save failed' },
            { status: 500 }
          );
        })
      );
      
      render(<RubricTraitEditor />);
      
      const titleInput = screen.getByLabelText(/rubric title/i);
      await user.type(titleInput, 'Test Rubric');
      
      const saveButton = screen.getByRole('button', { name: /save rubric/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to save rubric: Save failed')).toBeInTheDocument();
      });
    });

    it('should handle delete API errors', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.delete(`${API_ENDPOINTS.BASE}/rubric`, () => {
          return HttpResponse.json(
            { detail: 'Delete failed' },
            { status: 500 }
          );
        })
      );
      
      // Mock store with existing rubric
      mockUseRubricStore.mockReturnValue({
        currentRubric: {
          title: 'Existing Rubric',
          traits: mockGeneratedTraits
        },
        generatedTraits: [],
        isGeneratingTraits: false,
        traitGenerationError: null,
        setCurrentRubric: mockSetCurrentRubric,
        clearCurrentRubric: mockClearCurrentRubric,
        setGeneratedTraits: vi.fn(),
        clearGeneratedTraits: vi.fn(),
        setIsGeneratingTraits: vi.fn(),
        setTraitGenerationError: vi.fn(),
        resetRubricState: vi.fn(),
      });
      
      render(<RubricTraitEditor />);
      
      const deleteButton = screen.getByRole('button', { name: /delete rubric/i });
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to delete rubric: Delete failed')).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.post(`${API_ENDPOINTS.BASE}/rubric`, () => {
          return HttpResponse.error();
        })
      );
      
      render(<RubricTraitEditor />);
      
      const titleInput = screen.getByLabelText(/rubric title/i);
      await user.type(titleInput, 'Test Rubric');
      
      const saveButton = screen.getByRole('button', { name: /save rubric/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to save rubric/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<RubricTraitEditor />);
      
      expect(screen.getByLabelText(/rubric title/i)).toBeInTheDocument();
      
      // Check trait form labels
      expect(screen.getByText('Trait Name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);
      
      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/rubric title/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByDisplayValue('accuracy')).toHaveFocus();
    });

    it('should have proper button semantics', () => {
      render(<RubricTraitEditor />);
      
      expect(screen.getByRole('button', { name: /add trait/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save rubric/i })).toBeInTheDocument();
      
      const removeButtons = screen.getAllByRole('button', { name: /remove trait/i });
      expect(removeButtons).toHaveLength(2);
    });
  });

  describe('Integration', () => {
    it('should work with complex trait combinations', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);
      
      // Add a new trait
      const addButton = screen.getByRole('button', { name: /add trait/i });
      await user.click(addButton);
      
      // Configure the new trait
      const nameInputs = screen.getAllByPlaceholderText('Enter trait name');
      const newTraitName = nameInputs[2];
      await user.type(newTraitName, 'relevance');
      
      const descInputs = screen.getAllByPlaceholderText('Describe what this trait evaluates');
      const newTraitDesc = descInputs[2];
      await user.type(newTraitDesc, 'How relevant is the response to the question?');
      
      // Save the rubric
      const titleInput = screen.getByLabelText(/rubric title/i);
      await user.type(titleInput, 'Comprehensive Rubric');
      
      const saveButton = screen.getByRole('button', { name: /save rubric/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockSetCurrentRubric).toHaveBeenCalledWith({
          title: 'Comprehensive Rubric',
          traits: expect.arrayContaining([
            expect.objectContaining({ name: 'accuracy' }),
            expect.objectContaining({ name: 'completeness' }),
            expect.objectContaining({ name: 'relevance' })
          ])
        });
      });
    });

    it('should maintain state during edits', async () => {
      const user = userEvent.setup();
      render(<RubricTraitEditor />);
      
      // Edit multiple traits
      const nameInputs = screen.getAllByPlaceholderText('Enter trait name');
      await user.clear(nameInputs[0]);
      await user.type(nameInputs[0], 'factual_correctness');
      
      await user.clear(nameInputs[1]);
      await user.type(nameInputs[1], 'response_depth');
      
      // Change trait types
      const kindSelects = screen.getAllByRole('combobox');
      await user.selectOptions(kindSelects[1], 'boolean'); // completeness -> boolean
      
      // Verify state is maintained
      expect(nameInputs[0]).toHaveValue('factual_correctness');
      expect(nameInputs[1]).toHaveValue('response_depth');
      expect(kindSelects[1]).toHaveValue('boolean');
    });
  });
});