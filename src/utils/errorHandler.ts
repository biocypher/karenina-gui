export interface ErrorHandlerOptions {
  useToast?: boolean;
  logToConsole?: boolean;
  setErrorState?: (error: string) => void;
  showAlert?: boolean;
}

/**
 * Standardized error handling for file operations
 */
export function handleFileError(
  error: unknown, 
  context: string, 
  options: ErrorHandlerOptions = {}
): void {
  const {
    logToConsole = true,
    setErrorState,
    showAlert = false,
    useToast = false
  } = options;

  // Extract meaningful error message
  const errorMessage = error instanceof Error 
    ? error.message 
    : typeof error === 'string' 
      ? error 
      : 'Unknown error occurred';

  const fullMessage = `${context}: ${errorMessage}`;

  // Log to console if requested
  if (logToConsole) {
    console.error(fullMessage, error);
  }

  // Set error state if provided
  if (setErrorState) {
    setErrorState(fullMessage);
  }

  // Show alert if requested (deprecated pattern but still used in legacy code)
  if (showAlert) {
    alert(fullMessage);
  }

  // TODO: Implement toast notifications when UI component is available
  if (useToast) {
    console.warn('Toast notifications not yet implemented, falling back to console');
    console.error(fullMessage);
  }
}

/**
 * Standardized error handling for API operations
 */
export function handleApiError(
  error: unknown,
  context: string,
  options: ErrorHandlerOptions = {}
): void {
  // Process the error first to get the right message
  let processedError: Error | string;
  
  if (error instanceof Error) {
    processedError = error;
  } else if (typeof error === 'string') {
    processedError = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    processedError = String((error as { message: unknown }).message);
  } else {
    processedError = 'An unexpected error occurred';
  }

  handleFileError(processedError, `API Error - ${context}`, {
    ...options,
    logToConsole: true, // Always log API errors
  });
}

/**
 * Creates a standardized error handler for async operations
 */
export function createAsyncErrorHandler(
  context: string,
  options: ErrorHandlerOptions = {}
) {
  return (error: unknown) => {
    handleFileError(error, context, options);
  };
}

/**
 * Wraps an async function with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: string,
  options: ErrorHandlerOptions = {}
) {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleFileError(error, context, options);
      return null;
    }
  };
}

/**
 * Type guard for checking if an error is a specific type
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('Failed to fetch') ||
    error.name === 'NetworkError'
  );
}

/**
 * Type guard for checking if an error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes('validation') ||
    error.message.includes('invalid') ||
    error.message.includes('not allowed') ||
    error.message.includes('exceeds')
  );
}

/**
 * Common error messages for consistency
 */
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit',
  INVALID_FILE_TYPE: 'File type is not supported',
  INVALID_JSON: 'File contains invalid JSON format',
  NETWORK_ERROR: 'Network connection error. Please check your internet connection',
  UPLOAD_FAILED: 'File upload failed. Please try again',
  DOWNLOAD_FAILED: 'File download failed. Please try again',
  PARSING_FAILED: 'Failed to parse file content',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again',
} as const;