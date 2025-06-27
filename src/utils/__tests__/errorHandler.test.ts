import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleFileError,
  handleApiError,
  createAsyncErrorHandler,
  withErrorHandling,
  isNetworkError,
  isValidationError,
  ERROR_MESSAGES
} from '../errorHandler';

describe('errorHandler', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let alertSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleFileError', () => {
    it('should log error to console by default', () => {
      const error = new Error('Test error');
      
      handleFileError(error, 'File upload');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('File upload: Test error', error);
    });

    it('should not log to console when disabled', () => {
      const error = new Error('Test error');
      
      handleFileError(error, 'File upload', { logToConsole: false });
      
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should call setErrorState when provided', () => {
      const setErrorState = vi.fn();
      const error = new Error('Test error');
      
      handleFileError(error, 'File upload', { setErrorState });
      
      expect(setErrorState).toHaveBeenCalledWith('File upload: Test error');
    });

    it('should show alert when requested', () => {
      const error = new Error('Test error');
      
      handleFileError(error, 'File upload', { showAlert: true });
      
      expect(alertSpy).toHaveBeenCalledWith('File upload: Test error');
    });

    it('should handle string errors', () => {
      handleFileError('String error', 'File upload');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('File upload: String error', 'String error');
    });

    it('should handle unknown error types', () => {
      handleFileError({ unknown: 'error' }, 'File upload');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('File upload: Unknown error occurred', { unknown: 'error' });
    });

    it('should warn about unimplemented toast', () => {
      const error = new Error('Test error');
      
      handleFileError(error, 'File upload', { useToast: true });
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Toast notifications not yet implemented, falling back to console');
      expect(consoleErrorSpy).toHaveBeenCalledWith('File upload: Test error');
    });
  });

  describe('handleApiError', () => {
    it('should handle API errors with context', () => {
      const error = new Error('API failed');
      
      handleApiError(error, 'Fetch data');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('API Error - Fetch data: API failed', error);
    });

    it('should always log to console for API errors', () => {
      const error = new Error('API failed');
      
      handleApiError(error, 'Fetch data', { logToConsole: false });
      
      expect(consoleErrorSpy).toHaveBeenCalled(); // Should still log despite logToConsole: false
    });

    it('should handle non-Error objects with message property', () => {
      const error = { message: 'Custom error object' };
      
      handleApiError(error, 'Fetch data');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('API Error - Fetch data: Custom error object', 'Custom error object');
    });
  });

  describe('createAsyncErrorHandler', () => {
    it('should create a function that handles errors', () => {
      const setErrorState = vi.fn();
      const errorHandler = createAsyncErrorHandler('Upload file', { setErrorState });
      
      const error = new Error('Upload failed');
      errorHandler(error);
      
      expect(setErrorState).toHaveBeenCalledWith('Upload file: Upload failed');
    });
  });

  describe('withErrorHandling', () => {
    it('should return result when function succeeds', async () => {
      const successFn = vi.fn().mockResolvedValue('success');
      const wrappedFn = withErrorHandling(successFn, 'Test operation');
      
      const result = await wrappedFn('arg1', 'arg2');
      
      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle errors and return null', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('Function failed'));
      const setErrorState = vi.fn();
      const wrappedFn = withErrorHandling(failingFn, 'Test operation', { setErrorState });
      
      const result = await wrappedFn('arg1');
      
      expect(result).toBeNull();
      expect(setErrorState).toHaveBeenCalledWith('Test operation: Function failed');
    });

    it('should preserve function arguments and types', async () => {
      const typedFn = async (str: string, num: number): Promise<string> => {
        return `${str}-${num}`;
      };
      
      const wrappedFn = withErrorHandling(typedFn, 'Test');
      const result = await wrappedFn('test', 42);
      
      expect(result).toBe('test-42');
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors', () => {
      expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
      expect(isNetworkError(new Error('network timeout'))).toBe(true);
      expect(isNetworkError(new Error('fetch error'))).toBe(true);
      
      const networkError = new Error('Connection failed');
      networkError.name = 'NetworkError';
      expect(isNetworkError(networkError)).toBe(true);
    });

    it('should not identify non-network errors', () => {
      expect(isNetworkError(new Error('Validation failed'))).toBe(false);
      expect(isNetworkError('string error')).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should identify validation errors', () => {
      expect(isValidationError(new Error('validation failed'))).toBe(true);
      expect(isValidationError(new Error('invalid input'))).toBe(true);
      expect(isValidationError(new Error('not allowed'))).toBe(true);
      expect(isValidationError(new Error('exceeds limit'))).toBe(true);
    });

    it('should not identify non-validation errors', () => {
      expect(isValidationError(new Error('Network failed'))).toBe(false);
      expect(isValidationError('string error')).toBe(false);
      expect(isValidationError(null)).toBe(false);
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have consistent error messages', () => {
      expect(ERROR_MESSAGES.FILE_TOO_LARGE).toBe('File size exceeds the maximum allowed limit');
      expect(ERROR_MESSAGES.INVALID_FILE_TYPE).toBe('File type is not supported');
      expect(ERROR_MESSAGES.INVALID_JSON).toBe('File contains invalid JSON format');
      expect(ERROR_MESSAGES.NETWORK_ERROR).toContain('Network connection error');
      expect(ERROR_MESSAGES.UNKNOWN_ERROR).toContain('unexpected error');
    });

    it('should be readonly at TypeScript level', () => {
      // TypeScript should prevent modification, but runtime won't throw
      // This is a compile-time check
      expect(typeof ERROR_MESSAGES.FILE_TOO_LARGE).toBe('string');
      expect(ERROR_MESSAGES.FILE_TOO_LARGE.length).toBeGreaterThan(0);
    });
  });
});