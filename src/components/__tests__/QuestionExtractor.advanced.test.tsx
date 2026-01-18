import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuestionExtractor } from '../QuestionExtractor';
import { useTemplateStore } from '../../stores/useTemplateStore';

// Mock fetch globally
global.fetch = vi.fn();

describe('QuestionExtractor - Advanced Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the Zustand store state before each test
    useTemplateStore.getState().resetExtractionWorkflow();
  });

  const mockFileUploadResponse = {
    success: true,
    file_id: 'test-file-id',
    filename: 'test.xlsx',
    size: 1024,
  };

  const mockPreviewResponse = {
    success: true,
    total_rows: 10,
    columns: ['Question', 'Answer', 'Author_Name', 'Author_Email', 'Keywords', 'URL'],
    preview_rows: 3,
    data: [
      {
        Question: 'What is 2+2?',
        Answer: '4',
        Author_Name: 'John Doe',
        Author_Email: 'john@example.com',
        Keywords: 'math,arithmetic',
        URL: 'https://example.com',
      },
      {
        Question: 'What is the capital of France?',
        Answer: 'Paris',
        Author_Name: 'Jane Smith',
        Author_Email: 'jane@example.com',
        Keywords: 'geography,france',
        URL: 'https://example2.com',
      },
    ],
  };

  const mockExtractResponse = {
    success: true,
    questions_count: 2,
    questions_data: {
      abc123: {
        question: 'What is 2+2?',
        raw_answer: '4',
        answer_template: 'template1',
        metadata: {
          author: { '@type': 'Person', name: 'John Doe', email: 'john@example.com' },
          keywords: ['math', 'arithmetic'],
          url: 'https://example.com',
        },
      },
      def456: {
        question: 'What is the capital of France?',
        raw_answer: 'Paris',
        answer_template: 'template2',
        metadata: {
          author: { '@type': 'Person', name: 'Jane Smith', email: 'jane@example.com' },
          keywords: ['geography', 'france'],
          url: 'https://example2.com',
        },
      },
    },
  };

  it('shows advanced extraction panel after file preview and column selection', async () => {
    // Mock the fetch calls
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFileUploadResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPreviewResponse),
      });

    render(<QuestionExtractor />);

    // Create a test file and trigger upload
    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    // Use querySelector to find the hidden file input
    const input = document.querySelector('input[type="file"][aria-label="Select File"]') as HTMLInputElement;
    expect(input).not.toBeNull();

    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);

    // Wait for upload and preview to complete
    await waitFor(() => {
      expect(screen.getByText('Question Column')).toBeInTheDocument();
    });

    // Select question and answer columns - get comboboxes by position
    const comboboxes = screen.getAllByRole('combobox');
    const questionSelect = comboboxes[0]; // First combobox is Question Column
    const answerSelect = comboboxes[1]; // Second combobox is Answer Column

    fireEvent.change(questionSelect, { target: { value: 'Question' } });
    fireEvent.change(answerSelect, { target: { value: 'Answer' } });

    // Advanced extraction panel should now be visible
    expect(screen.getByText('Advanced extraction')).toBeInTheDocument();
    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(screen.getByText('Map additional columns for metadata')).toBeInTheDocument();
  });

  it('includes metadata settings in extraction API call when advanced options are configured', async () => {
    const user = userEvent.setup();
    // Mock the fetch calls
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFileUploadResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPreviewResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExtractResponse),
      });

    render(<QuestionExtractor />);

    // Upload file - the file input is hidden, so we need to use querySelector
    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const input = document.querySelector('input[type="file"][aria-label="Select File"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);

    // Wait for setup to complete
    await waitFor(() => {
      expect(screen.getByText('Question Column')).toBeInTheDocument();
    });

    // Select basic columns - get comboboxes by position
    const comboboxes = screen.getAllByRole('combobox');
    const questionSelect = comboboxes[0]; // First combobox is Question Column
    const answerSelect = comboboxes[1]; // Second combobox is Answer Column
    fireEvent.change(questionSelect, { target: { value: 'Question' } });
    fireEvent.change(answerSelect, { target: { value: 'Answer' } });

    // Expand advanced options (text is now split, so find the button that contains "Advanced extraction")
    const toggleButton = screen.getByRole('button', { name: /advanced extraction/i });
    await user.click(toggleButton);

    // Wait for the advanced panel content to appear
    const authorInfo = await screen.findByText('Author Information', {}, { timeout: 3000 });
    expect(authorInfo).toBeInTheDocument();

    // Configure metadata columns
    const authorNameSelect = screen.getByLabelText('Author Name');
    const authorEmailSelect = screen.getByLabelText('Author Email');
    const urlSelect = screen.getByLabelText('URL/Link');
    // Keywords section has "Column" label - there are multiple "Column" labels in the document
    // so we need to find the one for keywords (first one in the keywords section)
    const keywordsSelects = screen.getAllByLabelText('Column');
    const keywordsSelect =
      keywordsSelects.find((select) => select.closest('.bg-purple-50\\/30, .dark\\:bg-purple-900\\/10')) ||
      keywordsSelects[0];

    fireEvent.change(authorNameSelect, { target: { value: 'Author_Name' } });
    fireEvent.change(authorEmailSelect, { target: { value: 'Author_Email' } });
    fireEvent.change(keywordsSelect, { target: { value: 'Keywords' } });
    fireEvent.change(urlSelect, { target: { value: 'URL' } });

    // Trigger extraction
    const extractButton = screen.getByRole('button', { name: 'Extract Questions' });
    fireEvent.click(extractButton);

    // Wait for API call and verify payload includes metadata settings
    // V2 API: file_id is in URL path, not in body
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v2/files/test-file-id/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_column: 'Question',
          answer_column: 'Answer',
          sheet_name: null,
          author_name_column: 'Author_Name',
          author_email_column: 'Author_Email',
          author_affiliation_column: null,
          url_column: 'URL',
          keywords_columns: [{ column: 'Keywords', separator: ',' }],
        }),
      });
    });
  });

  it('sends null values for unselected metadata columns', async () => {
    // Mock the fetch calls
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFileUploadResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPreviewResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExtractResponse),
      });

    render(<QuestionExtractor />);

    // Setup file upload and column selection
    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const input = screen.getByLabelText('Select File');
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Question Column')).toBeInTheDocument();
    });

    const comboboxes = screen.getAllByRole('combobox');
    const questionSelect = comboboxes[0]; // First combobox is Question Column
    const answerSelect = comboboxes[1]; // Second combobox is Answer Column
    fireEvent.change(questionSelect, { target: { value: 'Question' } });
    fireEvent.change(answerSelect, { target: { value: 'Answer' } });

    // Don't configure any advanced options - extract directly
    const extractButton = screen.getByRole('button', { name: 'Extract Questions' });
    fireEvent.click(extractButton);

    // Verify API call includes null values for metadata columns
    // V2 API: file_id is in URL path, not in body
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v2/files/test-file-id/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_column: 'Question',
          answer_column: 'Answer',
          sheet_name: null,
          author_name_column: null,
          author_email_column: null,
          author_affiliation_column: null,
          url_column: null,
          keywords_columns: null,
        }),
      });
    });
  });

  it('resets advanced settings when starting over', async () => {
    // Mock the fetch calls
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFileUploadResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPreviewResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExtractResponse),
      });

    render(<QuestionExtractor />);

    // Complete the full flow
    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const input = screen.getByLabelText('Select File');
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Question Column')).toBeInTheDocument();
    });

    const comboboxes = screen.getAllByRole('combobox');
    const questionSelect = comboboxes[0]; // First combobox is Question Column
    const answerSelect = comboboxes[1]; // Second combobox is Answer Column
    fireEvent.change(questionSelect, { target: { value: 'Question' } });
    fireEvent.change(answerSelect, { target: { value: 'Answer' } });

    // Extract questions
    const extractButton = screen.getByRole('button', { name: 'Extract Questions' });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByText('Extraction Complete')).toBeInTheDocument();
    });

    // Click "Start Over" button
    const startOverButton = screen.getByText('Start Over');
    fireEvent.click(startOverButton);

    // Should be back to the upload state
    expect(screen.getByText('Choose a file to upload')).toBeInTheDocument();
    expect(screen.queryByText('Advanced extraction')).not.toBeInTheDocument();
  });
});
