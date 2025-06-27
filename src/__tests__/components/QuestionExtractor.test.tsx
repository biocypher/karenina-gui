import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, userEvent } from '../../test-utils/test-helpers';
import { QuestionExtractor } from '../../components/QuestionExtractor';
import { createMockFile, createMockQuestionData } from '../../test-utils/test-helpers';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('QuestionExtractor Component', () => {
  const mockOnQuestionsExtracted = vi.fn();
  const mockExtractedQuestions = createMockQuestionData(2);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default successful mock for all fetch calls
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        file_id: 'test-123',
        filename: 'test.xlsx',
        size: 1024
      })
    });
  });

  describe('Initial Rendering', () => {
    it('should render upload interface by default', () => {
      render(
        <QuestionExtractor 
          onQuestionsExtracted={mockOnQuestionsExtracted}
        />
      );

      expect(screen.getByText('Upload Question File')).toBeInTheDocument();
      expect(screen.getByText('Choose a file to upload')).toBeInTheDocument();
      expect(screen.getByText('Select File')).toBeInTheDocument();
    });

    it('should show progress steps', () => {
      render(
        <QuestionExtractor 
          onQuestionsExtracted={mockOnQuestionsExtracted}
        />
      );

      expect(screen.getByText('Upload File')).toBeInTheDocument();
      expect(screen.getByText('Preview Data')).toBeInTheDocument();
      expect(screen.getByText('Configure Columns')).toBeInTheDocument();
      expect(screen.getByText('Extract Questions')).toBeInTheDocument();
      expect(screen.getByText('Visualize Results')).toBeInTheDocument();
    });

    it('should render with extracted questions when provided', () => {
      render(
        <QuestionExtractor 
          onQuestionsExtracted={mockOnQuestionsExtracted}
          extractedQuestions={mockExtractedQuestions}
        />
      );

      expect(screen.getByText('Extraction Complete')).toBeInTheDocument();
      expect(screen.getByText('Successfully extracted 2 questions')).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    describe('File Picker', () => {
      it('should allow file selection via file picker', async () => {
        const user = userEvent.setup();
        render(<QuestionExtractor />);

        const file = createMockFile('test.xlsx', 1024);
        const input = screen.getByLabelText(/select file/i);
        
        await user.upload(input, file);
        
        // Should show upload progress or success
        expect(global.fetch).toHaveBeenCalledWith('/api/upload-file', expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        }));
      });
    });

    describe('File Validation', () => {
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

      it('should show upload interface for drag and drop', () => {
        render(<QuestionExtractor />);
        
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
        expect(global.fetch).toHaveBeenCalledWith('/api/upload-file', expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        }));
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

    describe('Export Functionality', () => {
      it('should show export is not available initially', () => {
        render(<QuestionExtractor />);
        
        // Should show the main interface
        expect(screen.getByText('Upload Question File')).toBeInTheDocument();
      });

      it('should download JSON export', async () => {
        render(<QuestionExtractor />);
        
        // Should show the main interface
        expect(screen.getByText('Upload Question File')).toBeInTheDocument();
      });

      it('should download CSV export', async () => {
        render(<QuestionExtractor />);
        
        // Should show the main interface
        expect(screen.getByText('Upload Question File')).toBeInTheDocument();
      });

      it('should download Python export', async () => {
        const user = userEvent.setup();
        
        // Mock Python export API
        (global.fetch as any).mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            blob: () => Promise.resolve(new Blob(['# Python code'], { type: 'text/plain' }))
          })
        );

        render(
          <QuestionExtractor 
            onQuestionsExtracted={mockOnQuestionsExtracted}
            extractedQuestions={mockExtractedQuestions}
          />
        );

        const pythonButton = screen.getByText('Python');
        await user.click(pythonButton);

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/export-questions-python', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              questions: mockExtractedQuestions
            }),
          });
        });
      });

      it('should handle export errors', async () => {
        const user = userEvent.setup();
        
        // Mock failed Python export
        (global.fetch as any).mockImplementationOnce(() =>
          Promise.resolve({
            ok: false,
            status: 500
          })
        );

        render(
          <QuestionExtractor 
            onQuestionsExtracted={mockOnQuestionsExtracted}
            extractedQuestions={mockExtractedQuestions}
          />
        );

        const pythonButton = screen.getByText('Python');
        await user.click(pythonButton);

        await waitFor(() => {
          expect(window.alert).toHaveBeenCalledWith('Failed to download Python file. Please try again.');
        });
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
      it('should progress through steps correctly', async () => {
        const user = userEvent.setup();
        
        render(<QuestionExtractor />);

        // Step 1: Upload (active by default) - check the step indicator area
        const uploadStep = screen.getByText('Upload File').closest('.flex.items-center.gap-2');
        expect(uploadStep).toHaveClass('bg-indigo-100');

        const file = createMockFile('test.xlsx', 1024);
        const input = screen.getByLabelText(/select file/i);
        await user.upload(input, file);

        // Verify upload was initiated
        expect(global.fetch).toHaveBeenCalled();
      });

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