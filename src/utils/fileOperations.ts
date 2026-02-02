import { logger } from './logger';

export interface FileValidationOptions {
  allowedExtensions?: string[];
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
}

export interface DownloadOptions {
  filename: string;
  mimeType?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Downloads content as a file with consistent browser compatibility
 */
export function downloadFile(content: string | Blob, options: DownloadOptions): void {
  try {
    const blob = content instanceof Blob ? content : new Blob([content], { type: options.mimeType || 'text/plain' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = options.filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    logger.error('FILE_OPS', 'Failed to download file', 'fileOperations', { error, filename: options.filename });
    throw new Error(`Failed to download ${options.filename}`);
  }
}

/**
 * Validates a file against specified criteria
 */
export function validateFile(file: File, options: FileValidationOptions = {}): ValidationResult {
  const {
    allowedExtensions = [],
    maxSizeBytes = 10 * 1024 * 1024, // 10MB default
    allowedMimeTypes = [],
  } = options;

  // Check file size
  if (maxSizeBytes && file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(maxSizeBytes / 1024 / 1024)}MB)`,
    };
  }

  // Check file extension
  if (allowedExtensions.length > 0) {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const normalizedExtensions = allowedExtensions.map((ext) =>
      ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
    );

    if (!normalizedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: `File type ${fileExtension} is not allowed. Allowed types: ${normalizedExtensions.join(', ')}`,
      };
    }
  }

  // Check MIME type
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File MIME type ${file.type} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Reads a file as text with proper error handling
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };

    reader.readAsText(file);
  });
}

/**
 * Parses a JSON file with optional validation
 */
export async function parseJSONFile<T>(file: File, validator?: (data: unknown) => data is T): Promise<T> {
  try {
    const text = await readFileAsText(file);
    const data = JSON.parse(text);

    if (validator && !validator(data)) {
      throw new Error('JSON data does not match expected format');
    }

    return data as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON format in file: ${file.name}`);
    }
    throw error;
  }
}

/**
 * Resets a file input element
 */
export function resetFileInput(inputRef: React.RefObject<HTMLInputElement>): void {
  if (inputRef.current) {
    inputRef.current.value = '';
  }
}

/**
 * Gets human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Common file validation options for specific use cases
 */
export const FILE_VALIDATION_PRESETS = {
  JSON_ONLY: {
    allowedExtensions: ['.json'],
    allowedMimeTypes: ['application/json', 'text/plain'],
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
  },
  SPREADSHEET: {
    allowedExtensions: ['.xlsx', '.xls', '.csv', '.tsv'],
    allowedMimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/tab-separated-values',
    ],
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
  },
  TEXT_FILES: {
    allowedExtensions: ['.txt', '.csv', '.tsv'],
    allowedMimeTypes: ['text/plain', 'text/csv', 'text/tab-separated-values'],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
} as const;
