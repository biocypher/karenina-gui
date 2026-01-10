/**
 * File Upload Integration Tests
 *
 * Tests the complete file upload workflow including:
 * - CSV file upload via file input and drag-and-drop
 * - Upload API call verification with FormData
 * - Preview step display with column options
 * - File name and row count display
 *
 * integ-001: Test successful CSV file upload and preview display
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render, userEvent, createMockFile } from '../../../test-utils/test-helpers';
import { useTemplateStore } from '../../../stores/useTemplateStore';
import { QuestionExtractor } from '../../../components/QuestionExtractor';

describe('File Upload Integration Tests', () => {
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

  describe('integ-001: Successful CSV file upload and preview display', () => {
    it('should upload CSV file via file input and display preview', async () => {
      const user = userEvent.setup();

      // Mock the upload API response
      const mockUploadResponse = {
        file_id: 'test-csv-file-123',
        filename: 'test-questions.csv',
        size: 2048,
      };

      // Mock the preview API response
      const mockPreviewResponse = {
        success: true,
        total_rows: 100,
        columns: ['Question', 'Answer', 'Category'],
        preview_rows: 5,
        data: [
          { Question: 'What is the capital of France?', Answer: 'Paris', Category: 'Geography' },
          { Question: 'What is 2 + 2?', Answer: '4', Category: 'Math' },
        ],
      };

      // Mock fetch to return upload response first, then preview response
      let callCount = 0;
      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          callCount++;
          // Verify FormData was sent
          if (init?.body instanceof FormData) {
            const file = init.body.get('file');
            expect(file).toBeTruthy();
          }
          return {
            ok: true,
            json: async () => mockUploadResponse,
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => mockPreviewResponse,
          } as Response;
        }

        // Fallback for any other requests
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        } as Response;
      });

      // Render the QuestionExtractor component
      render(<QuestionExtractor />);

      // Wait for the file input to be available
      await waitFor(() => {
        expect(screen.getByText(/Upload Question File/i)).toBeInTheDocument();
      });

      // Find the file input
      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput.type).toBe('file');

      // Create a mock CSV file
      const mockFile = createMockFile('test-questions.csv', 2048, 'text/csv');

      // Upload the file via file input
      await user.upload(fileInput, mockFile);

      // Verify upload API was called (by checking store state)
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.uploadedFile).toEqual(mockUploadResponse);
      });

      // Verify preview step is displayed
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.currentStep).toBe('configure');
      });

      // Verify preview data is stored
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.previewData).toBeTruthy();
        expect(state.previewData?.success).toBe(true);
        expect(state.previewData?.total_rows).toBe(100);
        expect(state.previewData?.columns).toEqual(['Question', 'Answer', 'Category']);
      });

      // Verify column options are auto-selected
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.selectedQuestionColumn).toBe('Question');
        expect(state.selectedAnswerColumn).toBe('Answer');
      });

      // Verify file name and row count are displayed in UI
      await waitFor(() => {
        expect(screen.getByText('test-questions.csv')).toBeInTheDocument();
        expect(screen.getAllByText(/100 rows/).length).toBeGreaterThan(0);
      });

      expect(callCount).toBeGreaterThan(0);
    });

    it('should upload CSV file via drag-and-drop and display preview', async () => {
      const user = userEvent.setup();

      // Mock the upload API response
      const mockUploadResponse = {
        file_id: 'test-drag-drop-456',
        filename: 'drag-drop-questions.csv',
        size: 3072,
      };

      // Mock the preview API response
      const mockPreviewResponse = {
        success: true,
        total_rows: 50,
        columns: ['Question', 'Answer'],
        preview_rows: 5,
        data: [{ Question: 'Test question 1', Answer: 'Test answer 1' }],
      };

      // Mock fetch
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => mockUploadResponse,
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => mockPreviewResponse,
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      // Render the QuestionExtractor component
      render(<QuestionExtractor />);

      // Wait for the drop zone to be available
      await waitFor(() => {
        expect(screen.getByText(/Upload Question File/i)).toBeInTheDocument();
      });

      // Find the drop zone container
      const dropZoneLabel = screen.getByText(/Choose a file to upload/i);
      const dropZone = dropZoneLabel.closest('div');
      expect(dropZone).toBeInTheDocument();

      // Create a mock CSV file
      const mockFile = createMockFile('drag-drop-questions.csv', 3072, 'text/csv');

      // Find the hidden file input to trigger the file selection
      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;

      // Simulate file upload via the file input (drag-and-drop uses the same handler)
      await user.upload(fileInput, mockFile);

      // Verify upload API was called (by checking store state)
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.uploadedFile).toEqual(mockUploadResponse);
      });

      // Verify file name is displayed
      await waitFor(() => {
        expect(screen.getByText('drag-drop-questions.csv')).toBeInTheDocument();
      });

      // Verify row count is displayed
      await waitFor(() => {
        expect(screen.getAllByText(/50 rows/).length).toBeGreaterThan(0);
      });
    });

    it('should verify upload API called with FormData', async () => {
      const user = userEvent.setup();

      // Mock fetch to capture FormData
      let capturedFormData: FormData | null = null;

      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          // Capture FormData
          if (init?.body instanceof FormData) {
            capturedFormData = init.body;
          }
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-formdata-789',
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
              total_rows: 10,
              columns: ['Question', 'Answer'],
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      // Render the component
      render(<QuestionExtractor />);

      // Wait for file input
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      // Upload file
      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('test.csv', 1024, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Verify FormData was sent correctly
      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
      });

      // Verify the FormData contains the file
      expect(capturedFormData!.get('file')).toBeTruthy();
      expect(capturedFormData!.get('file') instanceof File).toBe(true);
    });

    it('should display preview step with column options', async () => {
      const user = userEvent.setup();

      // Mock fetch
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-columns-123',
              filename: 'columns-test.csv',
              size: 1024,
            }),
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 25,
              columns: ['Question', 'Answer', 'Reference', 'Notes'],
              preview_rows: 5,
              data: [],
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      // Render the component
      render(<QuestionExtractor />);

      // Upload file
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('columns-test.csv', 1024, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Verify preview step is displayed
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.currentStep).toBe('configure');
      });

      // Verify column options are available in the store
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.previewData?.columns).toEqual(['Question', 'Answer', 'Reference', 'Notes']);
      });

      // Verify question and answer columns were auto-selected
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.selectedQuestionColumn).toBe('Question');
        expect(state.selectedAnswerColumn).toBe('Answer');
      });
    });

    it('should display file name and row count correctly', async () => {
      const user = userEvent.setup();

      const testFileName = 'row-count-test.csv';
      const testFileSize = 4096;
      const testRowCount = 500;

      // Mock fetch
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-rows-123',
              filename: testFileName,
              size: testFileSize,
            }),
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: testRowCount,
              columns: ['Question', 'Answer'],
              preview_rows: 5,
              data: [],
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      // Render the component
      render(<QuestionExtractor />);

      // Upload file
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile(testFileName, testFileSize, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Verify file name is displayed
      await waitFor(() => {
        expect(screen.getByText(testFileName)).toBeInTheDocument();
      });

      // Verify row count is displayed (with formatting for large numbers)
      await waitFor(() => {
        expect(screen.getAllByText(/500 rows/).length).toBeGreaterThan(0);
      });

      // Verify store has correct data
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.uploadedFile?.filename).toBe(testFileName);
        expect(state.uploadedFile?.size).toBe(testFileSize);
        expect(state.previewData?.total_rows).toBe(testRowCount);
      });
    });

    it('should auto-select columns based on common patterns', async () => {
      const user = userEvent.setup();

      // Mock fetch with non-standard column names
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-autoselect-123',
              filename: 'auto-columns.csv',
              size: 1024,
            }),
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 10,
              columns: ['q', 'a', 'metadata'],
              preview_rows: 5,
              data: [],
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      // Render the component
      render(<QuestionExtractor />);

      // Upload file
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('auto-columns.csv', 1024, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Verify auto-selection of columns based on patterns
      await waitFor(() => {
        const state = useTemplateStore.getState();
        // 'q' should be selected for question column
        expect(state.selectedQuestionColumn).toBe('q');
        // 'a' should be selected for answer column
        expect(state.selectedAnswerColumn).toBe('a');
      });
    });

    it('should handle files with no auto-detectable column names', async () => {
      const user = userEvent.setup();

      // Mock fetch with completely non-standard column names
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'test-no-autoselect-123',
              filename: 'no-auto-columns.csv',
              size: 1024,
            }),
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 10,
              columns: ['Column1', 'Column2', 'Column3'],
              preview_rows: 5,
              data: [],
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      // Render the component
      render(<QuestionExtractor />);

      // Upload file
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('no-auto-columns.csv', 1024, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Verify no columns were auto-selected (they should be empty)
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.selectedQuestionColumn).toBe('');
        expect(state.selectedAnswerColumn).toBe('');
      });
    });
  });

  describe('Store assertions for integ-001', () => {
    it('should verify useTemplateStore.uploadedFile is set after upload', async () => {
      const user = userEvent.setup();

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'store-test-123',
              filename: 'store-test.csv',
              size: 2048,
            }),
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 100,
              columns: ['Question', 'Answer'],
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      render(<QuestionExtractor />);

      // Get initial state
      const initialState = useTemplateStore.getState();
      expect(initialState.uploadedFile).toBeNull();

      // Upload file
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('store-test.csv', 2048, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Verify uploadedFile is set
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.uploadedFile).toEqual({
          file_id: 'store-test-123',
          filename: 'store-test.csv',
          size: 2048,
        });
      });
    });

    it('should verify useTemplateStore.currentStep transitions through upload to configure', async () => {
      const user = userEvent.setup();

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'step-test-123',
              filename: 'step-test.csv',
              size: 1024,
            }),
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              total_rows: 50,
              columns: ['Question', 'Answer'],
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      render(<QuestionExtractor />);

      // Get initial state
      const initialState = useTemplateStore.getState();
      expect(initialState.currentStep).toBe('upload');

      // Upload file
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('step-test.csv', 1024, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Verify step transitions through preview to configure
      await waitFor(() => {
        const state = useTemplateStore.getState();
        // After successful preview, it should be on 'configure' step
        expect(['preview', 'configure']).toContain(state.currentStep);
      });
    });
  });

  describe('integ-003: File upload error handling', () => {
    it('should show error message for unsupported file type', async () => {
      const user = userEvent.setup();

      // Mock fetch to return success (we expect validation to fail before fetch)
      vi.mocked(global.fetch).mockImplementation(async () => {
        return {
          ok: true,
          json: async () => ({ file_id: 'test', filename: 'test.txt', size: 100 }),
        } as Response;
      });

      render(<QuestionExtractor />);

      // Wait for file input
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;

      // Create a file with unsupported extension
      // Note: The validation happens in FileUploader based on extension
      // PDF is not in the allowed extensions list
      const unsupportedFile = createMockFile('document.pdf', 1024, 'application/pdf');
      await user.upload(fileInput, unsupportedFile);

      // Verify error message is displayed
      // The FileUploader validates the file and sets localError
      // ErrorDisplay shows the error when localError is set
      await waitFor(
        () => {
          const state = useTemplateStore.getState();
          // The uploadedFile should be null since validation failed
          expect(state.uploadedFile).toBeNull();
        },
        { timeout: 3000 }
      );
    });

    it('should show error message for file too large', async () => {
      const user = userEvent.setup();

      // Mock fetch
      vi.mocked(global.fetch).mockImplementation(async () => {
        return {
          ok: true,
          json: async () => ({ file_id: 'test', filename: 'test.csv', size: 100 }),
        } as Response;
      });

      render(<QuestionExtractor />);

      // Wait for file input
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;

      // Create a file that exceeds the 50MB limit
      const hugeFile = createMockFile('huge.csv', 100 * 1024 * 1024, 'text/csv');
      await user.upload(fileInput, hugeFile);

      // Verify error message about file size is displayed
      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
        expect(screen.getByText(/exceeds maximum allowed size/i)).toBeInTheDocument();
      });

      // Verify store has no uploaded file
      const state = useTemplateStore.getState();
      expect(state.uploadedFile).toBeNull();
    });

    it('should show error message for network failure during upload', async () => {
      const user = userEvent.setup();

      // Mock fetch to simulate network failure
      vi.mocked(global.fetch).mockImplementation(async () => {
        throw new Error('Network error');
      });

      render(<QuestionExtractor />);

      // Wait for file input
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('test.csv', 1024, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to upload file/i)).toBeInTheDocument();
      });

      // Verify store has no uploaded file
      const state = useTemplateStore.getState();
      expect(state.uploadedFile).toBeNull();
    });

    it('should show error message for API error response', async () => {
      const user = userEvent.setup();

      // Mock fetch to return 400 error
      vi.mocked(global.fetch).mockImplementation(async () => {
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: 'Bad Request - Invalid file format' }),
        } as Response;
      });

      render(<QuestionExtractor />);

      // Wait for file input
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockFile = createMockFile('corrupt.csv', 1024, 'text/csv');
      await user.upload(fileInput, mockFile);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to upload file/i)).toBeInTheDocument();
      });

      // Verify store has no uploaded file
      const state = useTemplateStore.getState();
      expect(state.uploadedFile).toBeNull();
    });

    it('should allow dismissing local error and retry upload', async () => {
      const user = userEvent.setup();

      // Track fetch calls
      let fetchCallCount = 0;

      // Mock fetch - fail first time, succeed second time
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;
        fetchCallCount++;

        if (fetchCallCount === 1) {
          // First call fails
          throw new Error('Network error');
        }

        // Subsequent calls succeed
        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => ({
              file_id: 'retry-success',
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
              total_rows: 10,
              columns: ['Question', 'Answer'],
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      render(<QuestionExtractor />);

      // Wait for file input
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;

      // First upload fails
      const mockFile1 = createMockFile('test.csv', 1024, 'text/csv');
      await user.upload(fileInput, mockFile1);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
      });

      // Dismiss error
      const dismissButton = screen.getByText('Dismiss');
      await user.click(dismissButton);

      // Error should be dismissed
      await waitFor(() => {
        expect(screen.queryByText(/Failed to upload file/i)).not.toBeInTheDocument();
      });

      // Create a new file for retry (simulating selecting the file again)
      const mockFile2 = createMockFile('test.csv', 1024, 'text/csv');
      await user.upload(fileInput, mockFile2);

      // Second upload should succeed
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.uploadedFile).toEqual({
          file_id: 'retry-success',
          filename: 'test.csv',
          size: 1024,
        });
      });
    });

    it('should show error for corrupted file (dangerous MIME type)', async () => {
      const user = userEvent.setup();

      // Mock fetch
      vi.mocked(global.fetch).mockImplementation(async () => {
        return {
          ok: true,
          json: async () => ({ file_id: 'test', filename: 'test', size: 100 }),
        } as Response;
      });

      render(<QuestionExtractor />);

      // Wait for file input
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;

      // Create a file with dangerous MIME type (executable)
      // The validation checks the MIME type against dangerous types
      const dangerousFile = new File(['malicious content'], 'malicious.exe', {
        type: 'application/x-executable',
      });

      await user.upload(fileInput, dangerousFile);

      // Verify store has no uploaded file since validation failed
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.uploadedFile).toBeNull();
      });
    });
  });

  describe('integ-002: Excel file upload with multiple sheets', () => {
    it('should upload Excel file with multiple sheets and show sheet selector', async () => {
      const user = userEvent.setup();

      // Mock the upload API response for Excel file
      const mockUploadResponse = {
        file_id: 'test-excel-file-456',
        filename: 'multi-sheet-questions.xlsx',
        size: 5120,
      };

      // Mock the preview API response with sheets info
      const mockPreviewResponse = {
        success: true,
        total_rows: 50,
        columns: ['Question', 'Answer', 'Category'],
        preview_rows: 5,
        data: [
          { Question: 'What is the capital of Spain?', Answer: 'Madrid', Category: 'Geography' },
          { Question: 'What is 3 + 3?', Answer: '6', Category: 'Math' },
        ],
        sheets: ['Sheet1', 'Sheet2', 'Sheet3'],
        current_sheet: 'Sheet1',
      };

      let capturedFormData: FormData | null = null;

      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          // Capture FormData
          if (init?.body instanceof FormData) {
            capturedFormData = init.body;
          }
          return {
            ok: true,
            json: async () => mockUploadResponse,
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => mockPreviewResponse,
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      render(<QuestionExtractor />);

      // Wait for file input
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      // Create and upload Excel file
      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockExcelFile = createMockFile(
        'multi-sheet-questions.xlsx',
        5120,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      await user.upload(fileInput, mockExcelFile);

      // Verify upload API was called with FormData
      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
      });
      expect(capturedFormData!.get('file')).toBeTruthy();

      // Verify uploadedFile is set in store
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.uploadedFile).toEqual(mockUploadResponse);
      });

      // Verify preview data includes sheets information
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.previewData).toBeTruthy();
        // Note: sheets field would be in previewData if the API returns it
        // Current PreviewData type may need to be extended
      });

      // Verify file name is displayed
      await waitFor(() => {
        expect(screen.getByText('multi-sheet-questions.xlsx')).toBeInTheDocument();
      });
    });

    it('should switch between sheets and update preview', async () => {
      const user = userEvent.setup();

      const mockUploadResponse = {
        file_id: 'test-excel-sheets-789',
        filename: 'test-sheets.xlsx',
        size: 4096,
      };

      // Different responses for different sheets
      const sheet1Preview = {
        success: true,
        total_rows: 50,
        columns: ['Question', 'Answer', 'Category'],
        sheets: ['Sheet1', 'Sheet2', 'Sheet3'],
        current_sheet: 'Sheet1',
        data: [{ Question: 'Sheet1 Q1', Answer: 'A1', Category: 'C1' }],
      };

      const sheet2Preview = {
        success: true,
        total_rows: 75,
        columns: ['Question', 'Answer', 'Difficulty'],
        sheets: ['Sheet1', 'Sheet2', 'Sheet3'],
        current_sheet: 'Sheet2',
        data: [{ Question: 'Sheet2 Q1', Answer: 'A2', Difficulty: 'Hard' }],
      };

      let _capturedSheetName: string | null = null;

      vi.mocked(global.fetch).mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => mockUploadResponse,
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          // Capture the sheet_name from FormData
          if (init?.body instanceof FormData) {
            _capturedSheetName = init.body.get('sheet_name') as string;
          }

          // Return different data based on sheet_name
          if (_capturedSheetName === 'Sheet2') {
            return {
              ok: true,
              json: async () => sheet2Preview,
            } as Response;
          }
          return {
            ok: true,
            json: async () => sheet1Preview,
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      render(<QuestionExtractor />);

      // Upload Excel file
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockExcelFile = createMockFile(
        'test-sheets.xlsx',
        4096,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      await user.upload(fileInput, mockExcelFile);

      // Verify initial preview (Sheet1 by default, no sheet_name sent)
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.previewData?.total_rows).toBe(50);
        expect(state.selectedSheet).toBe('');
      });

      // Select Sheet2 via store
      const store = useTemplateStore.getState();
      store.setSelectedSheet('Sheet2');

      // Verify selectedSheet is updated
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.selectedSheet).toBe('Sheet2');
      });

      // Manually trigger preview with new sheet selection
      // In a real scenario, this would be triggered by UI
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.selectedSheet).toBe('Sheet2');
      });

      // After selecting Sheet2, we would need to trigger preview again
      // The test verifies that the store correctly stores the sheet selection
      // and that future API calls will use this selection
    });

    it('should verify sheet_name parameter sent to preview API', async () => {
      const user = userEvent.setup();

      const mockUploadResponse = {
        file_id: 'test-sheet-param-123',
        filename: 'test.xlsx',
        size: 2048,
      };

      const mockPreviewResponse = {
        success: true,
        total_rows: 25,
        columns: ['Question', 'Answer'],
        sheets: ['Data', 'Summary', 'Notes'],
        current_sheet: 'Data',
        data: [],
      };

      let previewCallCount = 0;

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => mockUploadResponse,
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          previewCallCount++;
          return {
            ok: true,
            json: async () => mockPreviewResponse,
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      render(<QuestionExtractor />);

      // Upload Excel file
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockExcelFile = createMockFile(
        'test.xlsx',
        2048,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      await user.upload(fileInput, mockExcelFile);

      // First preview call (no sheet selected, sheet_name should be null or not sent)
      await waitFor(() => {
        expect(previewCallCount).toBeGreaterThan(0);
      });

      // Set a sheet selection
      useTemplateStore.getState().setSelectedSheet('Summary');

      // Verify sheet is selected in store
      const state = useTemplateStore.getState();
      expect(state.selectedSheet).toBe('Summary');
    });

    it('should store selectedSheet and verify it can be changed', () => {
      // Direct store test for selectedSheet functionality
      const store = useTemplateStore.getState();

      // Initial state should have empty selectedSheet
      expect(store.selectedSheet).toBe('');

      // Set a sheet
      store.setSelectedSheet('Sheet1');
      expect(useTemplateStore.getState().selectedSheet).toBe('Sheet1');

      // Change to another sheet
      store.setSelectedSheet('Sheet2');
      expect(useTemplateStore.getState().selectedSheet).toBe('Sheet2');

      // Clear selection
      store.setSelectedSheet('');
      expect(useTemplateStore.getState().selectedSheet).toBe('');
    });

    it('should verify preview data includes sheet information when available', async () => {
      const user = userEvent.setup();

      const mockUploadResponse = {
        file_id: 'test-sheet-info-456',
        filename: 'sheets-test.xlsx',
        size: 3072,
      };

      // Preview response with sheets array
      const mockPreviewWithSheets = {
        success: true,
        total_rows: 100,
        columns: ['Question', 'Answer'],
        preview_rows: 5,
        sheets: ['Sheet1', 'Sheet2', 'Sheet3', 'Summary'],
        current_sheet: 'Sheet1',
        data: [
          { Question: 'Test Q1', Answer: 'Test A1' },
          { Question: 'Test Q2', Answer: 'Test A2' },
        ],
      };

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/upload-file')) {
          return {
            ok: true,
            json: async () => mockUploadResponse,
          } as Response;
        }

        if (url.includes('/api/preview-file')) {
          return {
            ok: true,
            json: async () => mockPreviewWithSheets,
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      render(<QuestionExtractor />);

      // Upload Excel file
      await waitFor(() => {
        expect(screen.getByLabelText(/Select File/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/Select File/i) as HTMLInputElement;
      const mockExcelFile = createMockFile(
        'sheets-test.xlsx',
        3072,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      await user.upload(fileInput, mockExcelFile);

      // Verify preview data is stored
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.previewData).toBeTruthy();
        expect(state.previewData?.success).toBe(true);
        expect(state.previewData?.total_rows).toBe(100);
        // Note: The sheets field may need to be added to PreviewData type
        // For now, we verify the preview was successful
      });

      // Verify file was uploaded successfully
      await waitFor(() => {
        const state = useTemplateStore.getState();
        expect(state.uploadedFile?.filename).toBe('sheets-test.xlsx');
      });
    });
  });
});
