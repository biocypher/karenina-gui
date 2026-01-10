/**
 * Question Extraction Integration Tests
 *
 * Tests the complete question extraction workflow including:
 * - Configuring column mappings (question, answer columns)
 * - Clicking extract button
 * - Verifying extraction API called with correct config
 * - Verifying extracted questions appear in store
 * - Verifying transition to visualization step
 *
 * integ-004: Test successful question extraction from uploaded file
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render, userEvent, createMockFile } from '../../../test-utils/test-helpers';
import { useTemplateStore } from '../../../stores/useTemplateStore';
import { QuestionExtractor } from '../../../components/QuestionExtractor';

describe('Question Extraction Integration Tests', () => {
  beforeEach(() => {
    // Reset stores between tests
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    // Reset template store state
    useTemplateStore.getState().resetExtractionWorkflow();
  });

  afterEach(() => {
    // Reset template store after each test
    useTemplateStore.getState().resetExtractionWorkflow();
  });

  describe('integ-004: Successful question extraction from uploaded file', () => {
    it('should configure column mappings and extract questions', async () => {
      const user = userEvent.setup();

      // Track API calls
      let uploadCallCount = 0;
      let previewCallCount = 0;
      let extractCallCount = 0;

      // Mock fetch to handle all API calls
      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          uploadCallCount++;
          // Verify FormData was sent
          if (init?.body instanceof FormData) {
            const file = init.body.get('file');
            expect(file).toBeTruthy();
          }
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-extract-123',
              filename: 'questions.csv',
              size: 2048,
            }),
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          previewCallCount++;
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 5,
              columns: ['Question', 'Answer', 'Category'],
              preview_rows: 5,
              data: [
                { Question: 'What is the capital of France?', Answer: 'Paris', Category: 'Geography' },
                { Question: 'What is 2 + 2?', Answer: '4', Category: 'Math' },
              ],
            }),
          } as Response;
        }

        if (url.includes('/api/extract-questions')) {
          extractCallCount++;

          // Parse the request body to verify correct config
          const body = init?.body ? JSON.parse(init.body as string) : {};

          // Verify the extraction config
          expect(body.file_id).toBe('test-extract-123');
          expect(body.question_column).toBe('Question');
          expect(body.answer_column).toBe('Answer');
          expect(body.sheet_name).toBeNull();

          return {
            ok: true,
            json: async () => ({
              success: true,
              questions_data: {
                '0': { question: 'What is the capital of France?', raw_answer: 'Paris', answer_template: 'Paris' },
                '1': { question: 'What is 2 + 2?', raw_answer: '4', answer_template: '4' },
                '2': {
                  question: 'Who wrote Romeo and Juliet?',
                  raw_answer: 'William Shakespeare',
                  answer_template: 'William Shakespeare',
                },
                '3': { question: 'What is the chemical symbol for gold?', raw_answer: 'Au', answer_template: 'Au' },
                '4': { question: 'In what year did World War II end?', raw_answer: '1945', answer_template: '1945' },
              },
              total_extracted: 5,
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      // Render the QuestionExtractor component
      render(<QuestionExtractor />);

      // Wait for the file input to be available
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      // Step 1: Upload CSV file
      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('questions.csv', 2048, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Verify upload and preview succeeded
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.uploadedFile).toEqual({
          file_id: 'test-extract-123',
          filename: 'questions.csv',
          size: 2048,
        });
        expect(state.previewData?.columns).toEqual(['Question', 'Answer', 'Category']);
      });

      expect(uploadCallCount).toBe(1);
      expect(previewCallCount).toBe(1);

      // Step 2: Verify column configuration is displayed
      await waitFor(() => {
        expect(screen.getByText(/Configure Columns/i)).toBeInTheDocument();
      });

      // Step 3: Click extract button (columns should be auto-selected)
      const extractButton = screen.getByText('Extract Questions');
      expect(extractButton).toBeInTheDocument();

      await user.click(extractButton);

      // Step 4: Verify extraction API was called
      await waitFor(() => {
        expect(extractCallCount).toBe(1);
      });

      // Step 5: Verify extracted questions appear in store
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(Object.keys(state.extractedQuestions).length).toBe(5);
        expect(state.extractedQuestions['0']).toEqual({
          question: 'What is the capital of France?',
          raw_answer: 'Paris',
          answer_template: 'Paris',
        });
      });

      // Step 6: Verify transition to visualization step
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.currentStep).toBe('visualize');
      });
    });

    it('should handle column mapping change before extraction', async () => {
      const user = userEvent.setup();

      // Mock fetch
      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-columns-456',
              filename: 'data.csv',
              size: 1024,
            }),
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 3,
              columns: ['Q', 'A', 'Notes'],
              data: [],
            }),
          } as Response;
        }

        if (url.includes('/api/extract-questions')) {
          const body = init?.body ? JSON.parse(init.body as string) : {};

          // Verify the changed column mappings
          expect(body.question_column).toBe('Q');
          expect(body.answer_column).toBe('A');

          return {
            ok: true,
            json: async () => ({
              success: true,
              questions_data: {
                '0': { question: 'Test Q', raw_answer: 'Test A', answer_template: 'Test A' },
                '1': { question: 'Test Q2', raw_answer: 'Test A2', answer_template: 'Test A2' },
              },
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      render(<QuestionExtractor />);

      // Upload file
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('data.csv', 1024, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Wait for configure step
      await waitFor(() => {
        expect(screen.getByText(/Configure Columns/i)).toBeInTheDocument();
      });

      // Change question column
      const questionSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
      await user.selectOptions(questionSelect, 'Q');

      // Verify store updated
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.selectedQuestionColumn).toBe('Q');
      });

      // Change answer column
      const answerSelect = screen.getAllByRole('combobox')[1] as HTMLSelectElement;
      await user.selectOptions(answerSelect, 'A');

      // Verify store updated
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.selectedAnswerColumn).toBe('A');
      });

      // Click extract
      const extractButton = screen.getByText('Extract Questions');
      await user.click(extractButton);

      // Verify extraction succeeded with correct column mappings
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.currentStep).toBe('visualize');
        expect(Object.keys(state.extractedQuestions).length).toBe(2);
      });
    });

    it('should show extraction error when API fails', async () => {
      const user = userEvent.setup();

      // Mock fetch - extraction fails
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-error-789',
              filename: 'test.csv',
              size: 512,
            }),
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 2,
              columns: ['Question', 'Answer'],
              data: [],
            }),
          } as Response;
        }

        if (url.includes('/api/extract-questions')) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Internal server error' }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      render(<QuestionExtractor />);

      // Upload file
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('test.csv', 512, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Wait for configure step
      await waitFor(() => {
        expect(screen.getByText(/Configure Columns/i)).toBeInTheDocument();
      });

      // Click extract
      const extractButton = screen.getByText('Extract Questions');
      await user.click(extractButton);

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/Failed to extract questions/i)).toBeInTheDocument();
      });

      // Verify step did not transition and no questions extracted
      const state = useTemplateStore.getState();
      expect(state.currentStep).not.toBe('visualize');
      expect(Object.keys(state.extractedQuestions).length).toBe(0);
    });

    it('should disable extract button when columns not selected', async () => {
      const user = userEvent.setup();

      // Mock fetch with non-standard columns
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-disable-001',
              filename: 'data.csv',
              size: 512,
            }),
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 2,
              columns: ['Col1', 'Col2', 'Col3'],
              data: [],
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      render(<QuestionExtractor />);

      // Upload file
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('data.csv', 512, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Wait for configure step
      await waitFor(() => {
        expect(screen.getByText(/Configure Columns/i)).toBeInTheDocument();
      });

      // Verify extract button is disabled (columns not auto-selected)
      const extractButton = screen.getByText('Extract Questions');
      expect(extractButton).toBeDisabled();

      // Select question column
      const selectElements = screen.getAllByRole('combobox');
      const questionSelect = selectElements[0] as HTMLSelectElement;
      await user.selectOptions(questionSelect, 'Col1');

      // Still disabled - need answer column too
      expect(extractButton).toBeDisabled();

      // Select answer column
      const answerSelect = selectElements[1] as HTMLSelectElement;
      await user.selectOptions(answerSelect, 'Col2');

      // Now button should be enabled
      await waitFor(() => {
        expect(extractButton).not.toBeDisabled();
      });
    });
  });

  describe('Store assertions for integ-004', () => {
    it('should verify useTemplateStore.extractedQuestions has expected count after extraction', async () => {
      const user = userEvent.setup();

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'store-test-001',
              filename: 'test.csv',
              size: 1024,
            }),
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 3,
              columns: ['Question', 'Answer'],
              data: [],
            }),
          } as Response;
        }

        if (url.includes('/api/extract-questions')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              questions_data: {
                '0': { question: 'Q1', raw_answer: 'A1', answer_template: 'A1' },
                '1': { question: 'Q2', raw_answer: 'A2', answer_template: 'A2' },
                '2': { question: 'Q3', raw_answer: 'A3', answer_template: 'A3' },
              },
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      render(<QuestionExtractor />);

      // Upload and extract
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('test.csv', 1024, 'text/csv');
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByText('Extract Questions')).toBeInTheDocument();
      });

      const extractButton = screen.getByText('Extract Questions');
      await user.click(extractButton);

      // Verify extractedQuestions count
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(Object.keys(state.extractedQuestions).length).toBe(3);
        expect(state.extractedQuestions['0']).toEqual({ question: 'Q1', raw_answer: 'A1', answer_template: 'A1' });
      });
    });

    it('should verify useTemplateStore.currentStep is visualize after extraction', async () => {
      const user = userEvent.setup();

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'step-test-002',
              filename: 'test.csv',
              size: 1024,
            }),
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 2,
              columns: ['Question', 'Answer'],
              data: [],
            }),
          } as Response;
        }

        if (url.includes('/api/extract-questions')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              questions_data: {
                '0': { question: 'Q', raw_answer: 'A', answer_template: 'A' },
              },
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      render(<QuestionExtractor />);

      // Upload and extract
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('test.csv', 1024, 'text/csv');
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByText('Extract Questions')).toBeInTheDocument();
      });

      const extractButton = screen.getByText('Extract Questions');
      await user.click(extractButton);

      // Verify step transition
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.currentStep).toBe('visualize');
      });
    });
  });
});
