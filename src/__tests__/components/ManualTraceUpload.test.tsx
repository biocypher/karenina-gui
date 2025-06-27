import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
    expect(screen.getByText('Upload a JSON file containing precomputed answer traces keyed by question hash.')).toBeInTheDocument();
    expect(screen.getByText('Click to upload')).toBeInTheDocument();
    expect(screen.getByText('JSON files only')).toBeInTheDocument();
  });

  it('shows expected JSON format in help text', () => {
    render(<ManualTraceUpload />);
    
    expect(screen.getByText('Expected JSON Format:')).toBeInTheDocument();
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
    expect(screen.getByText(/This is the answer trace for question/)).toBeInTheDocument();
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
});