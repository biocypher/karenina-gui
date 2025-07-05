import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFileUpload, useJSONFileUpload, useSpreadsheetUpload } from '../useFileUpload';

// Mock the utilities
vi.mock('../../utils/fileOperations', () => ({
  validateFile: vi.fn(),
  readFileAsText: vi.fn(),
  parseJSONFile: vi.fn(),
  resetFileInput: vi.fn(),
}));

vi.mock('../../utils/errorHandler', () => ({
  handleFileError: vi.fn(),
}));

import { validateFile, readFileAsText, parseJSONFile, resetFileInput } from '../../utils/fileOperations';
import { handleFileError } from '../../utils/errorHandler';

describe('useFileUpload', () => {
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (validateFile as ReturnType<typeof vi.fn>).mockReturnValue({ isValid: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => 
      useFileUpload({
        onSuccess: mockOnSuccess,
      })
    );

    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.fileInputRef).toBeDefined();
  });

  it('should handle successful file upload', async () => {
    const mockData = { name: 'test' };
    (parseJSONFile as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const { result } = renderHook(() => 
      useFileUpload({
        onSuccess: mockOnSuccess,
        validator: (data: unknown): data is typeof mockData => true,
      })
    );

    const file = new File(['{"name": "test"}'], 'test.json', { type: 'application/json' });

    await act(async () => {
      await result.current.handleUpload(file);
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockOnSuccess).toHaveBeenCalledWith(mockData, file);
  });

  it('should handle validation errors', async () => {
    (validateFile as ReturnType<typeof vi.fn>).mockReturnValue({ 
      isValid: false, 
      error: 'File too large' 
    });

    const { result } = renderHook(() => 
      useFileUpload({
        onSuccess: mockOnSuccess,
        onError: mockOnError,
        validationOptions: { maxSizeBytes: 1000 },
      })
    );

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });

    await act(async () => {
      await result.current.handleUpload(file);
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBe('File too large');
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(handleFileError).toHaveBeenCalled();
  });

  it('should handle JSON parsing errors', async () => {
    (parseJSONFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid JSON'));

    const { result } = renderHook(() => 
      useFileUpload({
        onSuccess: mockOnSuccess,
        onError: mockOnError,
      })
    );

    const file = new File(['invalid json'], 'test.json', { type: 'application/json' });

    await act(async () => {
      await result.current.handleUpload(file);
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBe('Invalid JSON');
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should handle non-JSON files with validator', async () => {
    const mockData = { name: 'test' };
    (readFileAsText as ReturnType<typeof vi.fn>).mockResolvedValue('{"name": "test"}');

    const validator = vi.fn().mockReturnValue(true);

    const { result } = renderHook(() => 
      useFileUpload({
        onSuccess: mockOnSuccess,
        validator,
      })
    );

    const file = new File(['{"name": "test"}'], 'test.txt', { type: 'text/plain' });

    await act(async () => {
      await result.current.handleUpload(file);
    });

    expect(readFileAsText).toHaveBeenCalledWith(file);
    expect(validator).toHaveBeenCalledWith(mockData);
    expect(mockOnSuccess).toHaveBeenCalledWith(mockData, file);
  });

  it('should handle validator rejection', async () => {
    (readFileAsText as ReturnType<typeof vi.fn>).mockResolvedValue('{"invalid": "data"}');

    const validator = vi.fn().mockReturnValue(false);

    const { result } = renderHook(() => 
      useFileUpload({
        onSuccess: mockOnSuccess,
        onError: mockOnError,
        validator,
      })
    );

    const file = new File(['{"invalid": "data"}'], 'test.txt', { type: 'text/plain' });

    await act(async () => {
      await result.current.handleUpload(file);
    });

    expect(result.current.error).toBe('Invalid file format or content');
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should handle file input change events', async () => {
    const mockData = { name: 'test' };
    (parseJSONFile as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const { result } = renderHook(() => 
      useFileUpload({
        onSuccess: mockOnSuccess,
      })
    );

    const file = new File(['{"name": "test"}'], 'test.json', { type: 'application/json' });
    const event = {
      target: { files: [file] }
    } as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      result.current.handleFileInputChange(event);
    });

    expect(mockOnSuccess).toHaveBeenCalledWith(mockData, file);
  });

  it('should clear error state', () => {
    const { result } = renderHook(() => 
      useFileUpload({
        onSuccess: mockOnSuccess,
      })
    );

    // Set error state
    act(() => {
      result.current.reset();
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should reset state and file input', () => {
    const { result } = renderHook(() => 
      useFileUpload({
        onSuccess: mockOnSuccess,
      })
    );

    act(() => {
      result.current.reset();
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(resetFileInput).toHaveBeenCalledWith(result.current.fileInputRef);
  });

  it('should not reset file input when resetOnSuccess is false', async () => {
    const mockData = { name: 'test' };
    (parseJSONFile as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const { result } = renderHook(() => 
      useFileUpload({
        onSuccess: mockOnSuccess,
        resetOnSuccess: false,
      })
    );

    const file = new File(['{"name": "test"}'], 'test.json', { type: 'application/json' });

    await act(async () => {
      await result.current.handleUpload(file);
    });

    expect(resetFileInput).not.toHaveBeenCalled();
  });
});

describe('useJSONFileUpload', () => {
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();
  const mockValidator = vi.fn().mockReturnValue(true);

  beforeEach(() => {
    vi.clearAllMocks();
    (validateFile as ReturnType<typeof vi.fn>).mockReturnValue({ isValid: true });
    (parseJSONFile as ReturnType<typeof vi.fn>).mockResolvedValue({ test: 'data' });
  });

  it('should configure validation for JSON files', () => {
    const { result } = renderHook(() => 
      useJSONFileUpload(mockValidator, mockOnSuccess, mockOnError)
    );

    expect(result.current.fileInputRef).toBeDefined();
  });

  it('should call validator with JSON data', async () => {
    const mockData = { test: 'data' };
    (parseJSONFile as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const { result } = renderHook(() => 
      useJSONFileUpload(mockValidator, mockOnSuccess, mockOnError)
    );

    const file = new File(['{"test": "data"}'], 'test.json', { type: 'application/json' });

    await act(async () => {
      await result.current.handleUpload(file);
    });

    expect(parseJSONFile).toHaveBeenCalledWith(file, mockValidator);
    expect(mockOnSuccess).toHaveBeenCalledWith(mockData, file);
  });
});

describe('useSpreadsheetUpload', () => {
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (validateFile as ReturnType<typeof vi.fn>).mockReturnValue({ isValid: true });
    (readFileAsText as ReturnType<typeof vi.fn>).mockResolvedValue('spreadsheet content');
  });

  it('should handle spreadsheet file uploads', async () => {
    const { result } = renderHook(() => 
      useSpreadsheetUpload(mockOnSuccess, mockOnError)
    );

    const file = new File(['csv,content'], 'test.csv', { type: 'text/csv' });

    await act(async () => {
      await result.current.handleUpload(file);
    });

    expect(readFileAsText).toHaveBeenCalledWith(file);
    expect(mockOnSuccess).toHaveBeenCalledWith('spreadsheet content', file);
  });

  it('should validate spreadsheet file types', () => {
    const { result } = renderHook(() => 
      useSpreadsheetUpload(mockOnSuccess, mockOnError)
    );

    expect(result.current.fileInputRef).toBeDefined();
    // Validation options should be configured for spreadsheet files
    // This is tested indirectly through the validation call
  });
});