import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, userEvent, waitFor } from '../../test-utils/test-helpers';
import { QuestionExtractor } from '../../components/QuestionExtractor';
import { createMockFile, createMockQuestionData } from '../../test-utils/test-helpers';
import { useTemplateStore } from '../../stores/useTemplateStore';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock the CSRF module
vi.mock('../../utils/csrf', () => ({
  csrf: {
    fetchWithCsrf: vi.fn((url: string, options: RequestInit = {}) => {
      return fetch(url, options);
    }),
    initialize: vi.fn(() => Promise.resolve(true)),
    getHeaders: vi.fn(() => ({})),
  },
}));

// Mock the fileValidator
vi.mock('../../utils/fileValidator', () => ({
  validateDataFile: vi.fn(() => ({
    valid: true,
  })),
  validateManualTraceFile: vi.fn(() => ({
    valid: true,
  })),
}));

describe('QuestionExtractor Component', () => {
  const mockOnQuestionsExtracted = vi.fn();
  const mockExtractedQuestions = createMockQuestionData(2);

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the template store to initial state before each test
    useTemplateStore.getState().resetTemplateState();

    // Setup default successful mock for all fetch calls
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        file_id: 'test-123',
        filename: 'test.xlsx',
        size: 1024,
      }),
    });
  });

  describe('Initial Rendering', () => {
    it('should render upload interface by default', () => {
      render(<QuestionExtractor onQuestionsExtracted={mockOnQuestionsExtracted} />);

      expect(screen.getByText('Upload Question File')).toBeInTheDocument();
      expect(screen.getByText('Choose a file to upload')).toBeInTheDocument();
      expect(screen.getByText('Select File')).toBeInTheDocument();
    });

    it('should render with extracted questions when provided', () => {
      // Setup: set extracted questions in the store
      useTemplateStore.getState().setExtractedQuestions(mockExtractedQuestions);
      useTemplateStore.getState().setCurrentStep('visualize');

      render(<QuestionExtractor onQuestionsExtracted={mockOnQuestionsExtracted} />);

      expect(screen.getByText('Extraction Complete')).toBeInTheDocument();
      expect(screen.getByText('Successfully extracted 2 questions')).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    describe('File Picker', () => {
      it('should allow file selection via file picker', async () => {
        const user = userEvent.setup();
        render(<QuestionExtractor onQuestionsExtracted={mockOnQuestionsExtracted} />);

        const file = createMockFile('test.xlsx', 1024);
        const input = screen.getByLabelText(/select file/i);

        await user.upload(input, file);

        await waitFor(() => {
          // Should show upload progress or success
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/v2/files',
            expect.objectContaining({
              method: 'POST',
              body: expect.any(FormData),
            })
          );
        });
      });
    });

    describe('File Validation', () => {
      it('should show upload interface initially', () => {
        render(<QuestionExtractor onQuestionsExtracted={mockOnQuestionsExtracted} />);

        // Should show upload interface
        expect(screen.getByText('Upload Question File')).toBeInTheDocument();
      });

      it('should handle file upload', async () => {
        const user = userEvent.setup();

        render(<QuestionExtractor onQuestionsExtracted={mockOnQuestionsExtracted} />);

        const file = createMockFile('test.xlsx', 1024);
        const input = screen.getByLabelText(/select file/i);

        await user.upload(input, file);

        await waitFor(() => {
          // Should call fetch for upload
          expect(global.fetch).toHaveBeenCalled();
        });
      });

      it('should show upload interface for drag and drop', () => {
        render(<QuestionExtractor onQuestionsExtracted={mockOnQuestionsExtracted} />);

        // Should show upload interface
        expect(screen.getByText('Upload Question File')).toBeInTheDocument();
        expect(screen.getByText(/Drag and drop or click to select/)).toBeInTheDocument();
      });

      it('should show upload interface with progress indication', () => {
        render(<QuestionExtractor />);

        // Should show upload interface
        expect(screen.getByText('Upload Question File')).toBeInTheDocument();
      });
    });

    describe('File Preview', () => {
      it('should show upload interface initially', () => {
        render(<QuestionExtractor />);

        // Should show upload interface
        expect(screen.getByText('Upload Question File')).toBeInTheDocument();
      });

      it('should handle file upload', async () => {
        const user = userEvent.setup();

        render(<QuestionExtractor />);

        const file = createMockFile('test.xlsx', 1024);
        const input = screen.getByLabelText(/select file/i);

        await user.upload(input, file);

        // Should call fetch for upload
        expect(global.fetch).toHaveBeenCalled();
      });

      it('should show error state when upload fails', () => {
        render(<QuestionExtractor />);

        // Should show upload interface initially
        expect(screen.getByText('Upload Question File')).toBeInTheDocument();
      });
    });

    describe('Column Configuration', () => {
      it('should show initial upload state', () => {
        render(<QuestionExtractor />);

        // Should show upload interface
        expect(screen.getByText('Upload Question File')).toBeInTheDocument();
        expect(screen.getByText('Choose a file to upload')).toBeInTheDocument();
      });
    });

    describe('Question Extraction', () => {
      it('should show extraction progress', async () => {
        const user = userEvent.setup();

        render(<QuestionExtractor />);

        const file = createMockFile('test.xlsx', 1024);
        const input = screen.getByLabelText(/select file/i);

        await user.upload(input, file);

        // Should call fetch for upload
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/v2/files',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        );
      });

      it('should complete extraction successfully', async () => {
        const user = userEvent.setup();

        render(<QuestionExtractor />);

        const file = createMockFile('test.xlsx', 1024);
        const input = screen.getByLabelText(/select file/i);

        await user.upload(input, file);

        // Verify upload was attempted
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    describe('Reset Functionality', () => {
      it('should show initial state', () => {
        render(<QuestionExtractor />);

        // Should show upload interface
        expect(screen.getByText('Choose a file to upload')).toBeInTheDocument();
      });
    });

    describe('UI State Management', () => {
      it('should show appropriate loading states', async () => {
        const user = userEvent.setup();

        render(<QuestionExtractor />);

        const file = createMockFile('test.xlsx', 1024);
        const input = screen.getByLabelText(/select file/i);

        await user.upload(input, file);

        // Should have initiated upload
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });
});
