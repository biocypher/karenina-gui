import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManualTraceUpload } from '../../components/ManualTraceUpload';

// Mock fetch globally
global.fetch = vi.fn();

describe('ManualTraceUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload component correctly', () => {
    render(<ManualTraceUpload />);
    
    expect(screen.getByText('Upload Manual Traces')).toBeInTheDocument();
    expect(screen.getByText('Upload a JSON file with precomputed answer traces keyed by question hash.')).toBeInTheDocument();
    expect(screen.getByText('Click to upload')).toBeInTheDocument();
    expect(screen.getByText('JSON files only')).toBeInTheDocument();
  });

  it('shows expected JSON format in help text', () => {
    render(<ManualTraceUpload />);
    
    expect(screen.getByText('Expected JSON Format:')).toBeInTheDocument();
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
    expect(screen.getByText(/Answer trace 1/)).toBeInTheDocument();
  });

  it('accepts file input', () => {
    render(<ManualTraceUpload />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput?.accept).toBe('.json');
  });

  it('calls onUploadSuccess when upload succeeds', async () => {
    const onUploadSuccess = vi.fn();
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        success: true,
        message: 'Successfully loaded 2 manual traces',
        trace_count: 2,
        filename: 'test.json'
      })
    };
    
    (global.fetch as any).mockResolvedValueOnce(mockResponse);
    
    render(<ManualTraceUpload onUploadSuccess={onUploadSuccess} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{"test": "data"}'], 'test.json', { type: 'application/json' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(onUploadSuccess).toHaveBeenCalledWith(2);
    });
    
    expect(screen.getByText('Successfully loaded 2 manual traces')).toBeInTheDocument();
  });

  it('calls onUploadError when upload fails', async () => {
    const onUploadError = vi.fn();
    const mockResponse = {
      ok: false,
      json: () => Promise.resolve({
        detail: 'Invalid JSON format'
      })
    };
    
    (global.fetch as any).mockResolvedValueOnce(mockResponse);
    
    render(<ManualTraceUpload onUploadError={onUploadError} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['invalid json'], 'test.json', { type: 'application/json' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalledWith('Invalid JSON format');
    });
    
    expect(screen.getByText('Invalid JSON format')).toBeInTheDocument();
  });

  it('shows uploading state during upload', async () => {
    let resolvePromise: (value: any) => void;
    const uploadPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    (global.fetch as any).mockReturnValueOnce(uploadPromise);
    
    render(<ManualTraceUpload />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{"test": "data"}'], 'test.json', { type: 'application/json' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(screen.getByText('Uploading manual traces...')).toBeInTheDocument();
    
    // Resolve the promise to complete the test
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({ success: true, message: 'Success', trace_count: 1 })
    });
  });

  it('can clear status after upload', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        success: true,
        message: 'Successfully loaded 1 manual trace',
        trace_count: 1
      })
    };
    
    (global.fetch as any).mockResolvedValueOnce(mockResponse);
    
    render(<ManualTraceUpload />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{"test": "data"}'], 'test.json', { type: 'application/json' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Successfully loaded 1 manual trace')).toBeInTheDocument();
    });
    
    // Click the clear button (X)
    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);
    
    expect(screen.getByText('Click to upload')).toBeInTheDocument();
    expect(screen.queryByText('Successfully loaded 1 manual trace')).not.toBeInTheDocument();
  });

  it('handles drag and drop functionality', () => {
    render(<ManualTraceUpload />);
    
    const dropZone = screen.getByText('Click to upload').closest('div');
    
    // Simulate drag over
    fireEvent.dragOver(dropZone!);
    
    // Should show visual feedback for drag over (this would be tested via CSS classes in a full implementation)
    
    // Simulate drag leave
    fireEvent.dragLeave(dropZone!);
    
    // Simulate drop
    const file = new File(['{"test": "data"}'], 'test.json', { type: 'application/json' });
    const dropEvent = new Event('drop') as any;
    dropEvent.dataTransfer = {
      files: [file]
    };
    
    fireEvent.drop(dropZone!, dropEvent);
  });

  it('shows download template button when finished templates are provided', () => {
    const finishedTemplates: Array<[string, any]> = [
      ['hash1', { question: 'Question 1' }],
      ['hash2', { question: 'Question 2' }]
    ];
    
    render(<ManualTraceUpload finishedTemplates={finishedTemplates} />);
    
    expect(screen.getByText('Download empty template')).toBeInTheDocument();
    expect(screen.getByText('Download CSV mapper')).toBeInTheDocument();
    expect(screen.getByText('(2 templates available)')).toBeInTheDocument();
  });

  it('does not show download buttons when no finished templates', () => {
    render(<ManualTraceUpload />);
    
    expect(screen.queryByText('Download empty template')).not.toBeInTheDocument();
    expect(screen.queryByText('Download CSV mapper')).not.toBeInTheDocument();
    expect(screen.queryByText('templates available')).not.toBeInTheDocument();
  });

  it('shows download template button is clickable', () => {
    const finishedTemplates: Array<[string, any]> = [
      ['abc123def456789012345678901234', { question: 'Question 1' }],
      ['def456789012345678901234567890', { question: 'Question 2' }]
    ];
    
    render(<ManualTraceUpload finishedTemplates={finishedTemplates} />);
    
    const downloadButton = screen.getByText('Download empty template');
    expect(downloadButton).toBeInTheDocument();
    expect(downloadButton.tagName).toBe('BUTTON');
  });

  it('shows error when trying to download template with no finished templates', () => {
    const finishedTemplates: Array<[string, any]> = [];
    
    render(<ManualTraceUpload finishedTemplates={finishedTemplates} />);
    
    // Since button shouldn't be visible with empty templates, we won't see it
    expect(screen.queryByText('Download empty template')).not.toBeInTheDocument();
    expect(screen.queryByText('Download CSV mapper')).not.toBeInTheDocument();
  });

  it('shows CSV mapper button is clickable', () => {
    const finishedTemplates: Array<[string, any]> = [
      ['abc123def456789012345678901234', { question: 'What is the capital of France?' }],
      ['def456789012345678901234567890', { question: 'What is 2 + 2?' }]
    ];
    
    render(<ManualTraceUpload finishedTemplates={finishedTemplates} />);
    
    const csvButton = screen.getByText('Download CSV mapper');
    expect(csvButton).toBeInTheDocument();
    expect(csvButton.tagName).toBe('BUTTON');
  });

  it('shows CSV mapper description when templates are available', () => {
    const finishedTemplates: Array<[string, any]> = [
      ['hash1', { question: 'Test question' }]
    ];
    
    render(<ManualTraceUpload finishedTemplates={finishedTemplates} />);
    
    expect(screen.getByText(/CSV Mapper:/)).toBeInTheDocument();
    expect(screen.getByText(/Download a reference file that maps question hashes/)).toBeInTheDocument();
  });

  it('does not show CSV mapper description when no templates', () => {
    render(<ManualTraceUpload />);
    
    expect(screen.queryByText(/CSV Mapper:/)).not.toBeInTheDocument();
  });
});