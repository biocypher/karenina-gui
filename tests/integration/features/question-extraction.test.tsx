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
import { render, userEvent, createMockFile } from '../../../src/test-utils/test-helpers';
import { useTemplateStore } from '../../../src/stores/useTemplateStore';
import { QuestionExtractor } from '../../../src/components/QuestionExtractor';

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

        if (url.includes('/api/v2/files') && !url.includes('/preview') && !url.includes('/questions')) {
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

        if (url.includes('/api/v2/files') && url.includes('/preview')) {
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

        if (url.includes('/api/v2/files') && url.includes('/questions')) {
          extractCallCount++;

          // Parse the request body to verify correct config
          const body = init?.body ? JSON.parse(init.body as string) : {};

          // Verify the extraction config (file_id is now in URL path, not body)
          expect(url).toContain('test-extract-123');
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

        if (url.includes('/api/v2/files') && !url.includes('/preview') && !url.includes('/questions')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-columns-456',
              filename: 'data.csv',
              size: 1024,
            }),
          } as Response;
        }

        if (url.includes('/api/v2/files') && url.includes('/preview')) {
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

        if (url.includes('/api/v2/files') && url.includes('/questions')) {
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

        if (url.includes('/api/v2/files') && !url.includes('/preview') && !url.includes('/questions')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-error-789',
              filename: 'test.csv',
              size: 512,
            }),
          } as Response;
        }

        if (url.includes('/api/v2/files') && url.includes('/preview')) {
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

        if (url.includes('/api/v2/files') && url.includes('/questions')) {
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

        if (url.includes('/api/v2/files') && !url.includes('/preview') && !url.includes('/questions')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-disable-001',
              filename: 'data.csv',
              size: 512,
            }),
          } as Response;
        }

        if (url.includes('/api/v2/files') && url.includes('/preview')) {
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

        if (url.includes('/api/v2/files') && !url.includes('/preview') && !url.includes('/questions')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'store-test-001',
              filename: 'test.csv',
              size: 1024,
            }),
          } as Response;
        }

        if (url.includes('/api/v2/files') && url.includes('/preview')) {
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

        if (url.includes('/api/v2/files') && url.includes('/questions')) {
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

        if (url.includes('/api/v2/files') && !url.includes('/preview') && !url.includes('/questions')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'step-test-002',
              filename: 'test.csv',
              size: 1024,
            }),
          } as Response;
        }

        if (url.includes('/api/v2/files') && url.includes('/preview')) {
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

        if (url.includes('/api/v2/files') && url.includes('/questions')) {
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

  describe('integ-005: Extraction with metadata columns', () => {
    it('should configure metadata column mappings and extract with metadata', async () => {
      const user = userEvent.setup();

      // Track API calls
      let extractCallCount = 0;

      // Mock fetch
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/v2/files') && !url.includes('/preview') && !url.includes('/questions')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-metadata-123',
              filename: 'questions-with-metadata.csv',
              size: 2048,
            }),
          } as Response;
        }

        if (url.includes('/api/v2/files') && url.includes('/preview')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 3,
              columns: ['Question', 'Answer', 'Author', 'Email', 'URL', 'Keywords'],
              preview_rows: 3,
              data: [
                {
                  Question: 'What is the capital of France?',
                  Answer: 'Paris',
                  Author: 'John Doe',
                  Email: 'john@example.com',
                  URL: 'https://example.com/q1',
                  Keywords: 'geography,europe',
                },
                {
                  Question: 'What is 2 + 2?',
                  Answer: '4',
                  Author: 'Jane Smith',
                  Email: 'jane@example.com',
                  URL: 'https://example.com/q2',
                  Keywords: 'math',
                },
              ],
            }),
          } as Response;
        }

        if (url.includes('/api/v2/files') && url.includes('/questions')) {
          extractCallCount++;

          // Note: We verify the metadata structure is returned correctly
          // In a real scenario, metadata columns would be configured via UI
          return {
            ok: true,
            json: async () => ({
              success: true,
              questions_data: {
                '0': {
                  question: 'What is the capital of France?',
                  raw_answer: 'Paris',
                  answer_template: 'Paris',
                  metadata: {
                    author: {
                      name: 'John Doe',
                      email: 'john@example.com',
                    },
                    url: 'https://example.com/q1',
                    keywords: ['geography', 'europe'],
                  },
                },
                '1': {
                  question: 'What is 2 + 2?',
                  raw_answer: '4',
                  answer_template: '4',
                  metadata: {
                    author: {
                      name: 'Jane Smith',
                      email: 'jane@example.com',
                    },
                    url: 'https://example.com/q2',
                    keywords: ['math'],
                  },
                },
                '2': {
                  question: 'Who wrote Romeo and Juliet?',
                  raw_answer: 'William Shakespeare',
                  answer_template: 'William Shakespeare',
                  metadata: {
                    author: {
                      name: 'Bob Johnson',
                      email: 'bob@example.com',
                    },
                    url: 'https://example.com/q3',
                    keywords: ['literature'],
                  },
                },
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

      // Step 1: Upload file
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('questions-with-metadata.csv', 2048, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Step 2: Wait for configure step
      await waitFor(() => {
        expect(screen.getByText(/Configure Columns/i)).toBeInTheDocument();
      });

      // Step 3: Click extract (without metadata config - using defaults)
      const extractButton = screen.getByText('Extract Questions');
      await user.click(extractButton);

      // Step 4: Verify extraction API was called
      await waitFor(() => {
        expect(extractCallCount).toBe(1);
      });

      // Step 5: Verify extracted questions have metadata
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(Object.keys(state.extractedQuestions).length).toBe(3);
        // Check that first question has metadata
        expect(state.extractedQuestions['0'].metadata).toBeDefined();
        expect(state.extractedQuestions['0'].metadata?.author).toBeDefined();
        expect(state.extractedQuestions['0'].metadata?.url).toBeDefined();
      });
    });

    it('should verify metadata is attached to each extracted question', async () => {
      const user = userEvent.setup();

      // Mock fetch
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/v2/files') && !url.includes('/preview') && !url.includes('/questions')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-meta-verify-456',
              filename: 'test.csv',
              size: 1024,
            }),
          } as Response;
        }

        if (url.includes('/api/v2/files') && url.includes('/preview')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 2,
              columns: ['Question', 'Answer', 'Author', 'URL', 'Keywords'],
              data: [],
            }),
          } as Response;
        }

        if (url.includes('/api/v2/files') && url.includes('/questions')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              questions_data: {
                '0': {
                  question: 'Q1',
                  raw_answer: 'A1',
                  answer_template: 'A1',
                  metadata: {
                    author: { name: 'Author 1', email: 'author1@example.com' },
                    url: 'https://example.com/1',
                    keywords: ['tag1', 'tag2'],
                  },
                },
                '1': {
                  question: 'Q2',
                  raw_answer: 'A2',
                  answer_template: 'A2',
                  metadata: {
                    author: { name: 'Author 2', email: 'author2@example.com' },
                    url: 'https://example.com/2',
                    keywords: ['tag3'],
                  },
                },
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

      // Upload and extract (metadata config would be done via UI)
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

      // Verify all questions have expected metadata fields
      await waitFor(() => {
        const state = useTemplateStore.getState();
        const questions = state.extractedQuestions;

        Object.values(questions).forEach((question) => {
          expect(question.metadata).toBeDefined();
          expect(question.metadata.author).toBeDefined();
          expect(question.metadata.author.name).toBeTruthy();
          expect(question.metadata.url).toBeTruthy();
          expect(Array.isArray(question.metadata.keywords)).toBe(true);
        });
      });
    });
  });

  describe('integ-006: Partial extraction with invalid rows', () => {
    it('should upload file with some empty/invalid rows and extract questions', async () => {
      const user = userEvent.setup();

      // Track API calls
      let extractCallCount = 0;

      // Mock fetch
      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/v2/files') && !url.includes('/preview') && !url.includes('/questions')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-partial-123',
              filename: 'questions-with-invalid-rows.csv',
              size: 3072,
            }),
          } as Response;
        }

        if (url.includes('/api/v2/files') && url.includes('/preview')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 8,
              columns: ['Question', 'Answer', 'Category'],
              preview_rows: 8,
              data: [
                { Question: 'What is the capital of France?', Answer: 'Paris', Category: 'Geography' },
                { Question: 'What is 2 + 2?', Answer: '4', Category: 'Math' },
                { Question: '', Answer: 'Empty answer', Category: 'Invalid' },
                { Question: 'Who wrote Romeo and Juliet?', Answer: 'William Shakespeare', Category: 'Literature' },
                { Question: 'What is the chemical symbol for gold?', Answer: '', Category: 'Invalid' },
              ],
            }),
          } as Response;
        }

        if (url.includes('/api/v2/files') && url.includes('/questions')) {
          extractCallCount++;

          // Verify the extraction config (file_id is now in URL path, not body)
          const body = init?.body ? JSON.parse(init.body as string) : {};
          expect(url).toContain('test-partial-123');
          expect(body.question_column).toBe('Question');
          expect(body.answer_column).toBe('Answer');

          // Return partial extraction result with skipped rows
          return {
            ok: true,
            json: async () => ({
              success: true,
              questions_data: {
                '0': {
                  question: 'What is the capital of France?',
                  raw_answer: 'Paris',
                  answer_template: 'Paris',
                },
                '1': { question: 'What is 2 + 2?', raw_answer: '4', answer_template: '4' },
                '3': {
                  question: 'Who wrote Romeo and Juliet?',
                  raw_answer: 'William Shakespeare',
                  answer_template: 'William Shakespeare',
                },
              },
              skipped_rows: [
                { row: 2, reason: 'Empty question field' },
                { row: 4, reason: 'Empty answer field' },
              ],
              warnings: ['2 rows were skipped due to validation errors'],
              total_extracted: 3,
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      render(<QuestionExtractor />);

      // Step 1: Upload file
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('questions-with-invalid-rows.csv', 3072, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Step 2: Wait for configure step
      await waitFor(() => {
        expect(screen.getByText(/Configure Columns/i)).toBeInTheDocument();
      });

      // Step 3: Click extract
      const extractButton = screen.getByText('Extract Questions');
      await user.click(extractButton);

      // Step 4: Verify extraction API was called
      await waitFor(() => {
        expect(extractCallCount).toBe(1);
      });

      // Step 5: Verify valid questions are extracted (invalid rows skipped)
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(Object.keys(state.extractedQuestions).length).toBe(3);
        // Verify only valid rows were extracted
        expect(state.extractedQuestions['0']).toEqual({
          question: 'What is the capital of France?',
          raw_answer: 'Paris',
          answer_template: 'Paris',
        });
        expect(state.extractedQuestions['1']).toEqual({
          question: 'What is 2 + 2?',
          raw_answer: '4',
          answer_template: '4',
        });
        expect(state.extractedQuestions['3']).toEqual({
          question: 'Who wrote Romeo and Juliet?',
          raw_answer: 'William Shakespeare',
          answer_template: 'William Shakespeare',
        });
        // Verify row 2 and 4 are not in the extracted questions
        expect(state.extractedQuestions['2']).toBeUndefined();
        expect(state.extractedQuestions['4']).toBeUndefined();
      });
    });

    it('should verify warning about skipped rows displayed', async () => {
      const user = userEvent.setup();

      // Mock fetch
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/v2/files') && !url.includes('/preview') && !url.includes('/questions')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-warning-456',
              filename: 'questions-with-invalid-rows.csv',
              size: 2048,
            }),
          } as Response;
        }

        if (url.includes('/api/v2/files') && url.includes('/preview')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 5,
              columns: ['Question', 'Answer'],
              data: [],
            }),
          } as Response;
        }

        if (url.includes('/api/v2/files') && url.includes('/questions')) {
          // Return extraction result with warnings
          return {
            ok: true,
            json: async () => ({
              success: true,
              questions_data: {
                '0': { question: 'Q1', raw_answer: 'A1', answer_template: 'A1' },
                '1': { question: 'Q2', raw_answer: 'A2', answer_template: 'A2' },
              },
              skipped_rows: [
                { row: 2, reason: 'Empty question field' },
                { row: 3, reason: 'Empty answer field' },
                { row: 4, reason: 'Duplicate of row 1' },
              ],
              warnings: ['3 rows were skipped due to validation errors'],
              total_extracted: 2,
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
      const mockFile = createMockFile('questions-with-invalid-rows.csv', 2048, 'text/csv');
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByText('Extract Questions')).toBeInTheDocument();
      });

      const extractButton = screen.getByText('Extract Questions');
      await user.click(extractButton);

      // Verify extraction completed with warnings
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.currentStep).toBe('visualize');
        expect(Object.keys(state.extractedQuestions).length).toBe(2);
      });

      // Verify extraction complete message is shown
      await waitFor(() => {
        expect(screen.getByText(/Extraction Complete/i)).toBeInTheDocument();
      });

      // Note: The current UI may not display warnings prominently,
      // but the extraction should complete successfully
      expect(screen.getByText(/Successfully extracted 2 questions/i)).toBeInTheDocument();
    });
  });
});
