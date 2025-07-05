import { useState, useCallback, useRef } from 'react';
import { 
  validateFile, 
  readFileAsText, 
  parseJSONFile, 
  resetFileInput,
  type FileValidationOptions 
} from '../utils/fileOperations';
import { handleFileError, type ErrorHandlerOptions } from '../utils/errorHandler';

export interface UseFileUploadOptions<T> extends ErrorHandlerOptions {
  validationOptions?: FileValidationOptions;
  validator?: (data: unknown) => data is T;
  onSuccess: (data: T, file: File) => void;
  onError?: (error: string) => void;
  resetOnSuccess?: boolean;
}

export interface FileUploadState {
  isUploading: boolean;
  error: string | null;
  progress?: number;
}

/**
 * Hook for handling file uploads with validation and error handling
 */
export function useFileUpload<T>(options: UseFileUploadOptions<T>) {
  const {
    validationOptions,
    validator,
    onSuccess,
    onError,
    resetOnSuccess = true,
    ...errorHandlerOptions
  } = options;

  const [state, setState] = useState<FileUploadState>({
    isUploading: false,
    error: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isUploading: true, error: null }));

    try {
      // Validate file first
      if (validationOptions) {
        const validation = validateFile(file, validationOptions);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
      }

      let data: T;

      // Parse file based on type
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        data = await parseJSONFile(file, validator);
      } else {
        // For non-JSON files, read as text and let the validator handle it
        const text = await readFileAsText(file);
        if (validator) {
          try {
            const parsedData = JSON.parse(text);
            if (!validator(parsedData)) {
              throw new Error('Data does not match expected format');
            }
            data = parsedData;
          } catch {
            throw new Error('Invalid file format or content');
          }
        } else {
          data = text as unknown as T;
        }
      }

      // Success
      setState(prev => ({ ...prev, isUploading: false }));
      onSuccess(data, file);

      // Reset file input if requested
      if (resetOnSuccess) {
        resetFileInput(fileInputRef);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: errorMessage 
      }));

      // Handle error using centralized error handler
      handleFileError(error, 'File upload', {
        ...errorHandlerOptions,
        setErrorState: onError,
      });
    }
  }, [validationOptions, validator, onSuccess, onError, resetOnSuccess, errorHandlerOptions]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({ isUploading: false, error: null });
    resetFileInput(fileInputRef);
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    handleUpload,
    handleFileInputChange,
    clearError,
    reset,
    
    // Refs
    fileInputRef,
  };
}

/**
 * Simplified hook for JSON file uploads
 */
export function useJSONFileUpload<T>(
  validator: (data: unknown) => data is T,
  onSuccess: (data: T, file: File) => void,
  onError?: (error: string) => void
) {
  return useFileUpload({
    validationOptions: {
      allowedExtensions: ['.json'],
      allowedMimeTypes: ['application/json', 'text/plain'],
      maxSizeBytes: 50 * 1024 * 1024, // 50MB
    },
    validator,
    onSuccess,
    onError,
    logToConsole: true,
  });
}

/**
 * Hook for spreadsheet file uploads (Excel, CSV, TSV)
 */
export function useSpreadsheetUpload(
  onSuccess: (content: string, file: File) => void,
  onError?: (error: string) => void
) {
  return useFileUpload<string>({
    validationOptions: {
      allowedExtensions: ['.xlsx', '.xls', '.csv', '.tsv'],
      maxSizeBytes: 100 * 1024 * 1024, // 100MB
    },
    onSuccess,
    onError,
    logToConsole: true,
  });
}