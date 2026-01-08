/**
 * File validation utilities for secure file uploads
 *
 * These utilities provide defense-in-depth validation for file uploads,
 * checking file extension, MIME type, and content validity.
 */

/**
 * Safe MIME types for JSON files
 */
const JSON_MIME_TYPES = ['application/json', 'text/plain', 'text/json', 'application/x-json'] as const;

/**
 * Result of file validation
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that a file is a valid JSON file.
 *
 * This function performs multiple checks:
 * 1. File extension check (.json)
 * 2. MIME type check
 * 3. JSON content parsing validation
 * 4. Basic JSON structure check
 *
 * @param file - The file to validate
 * @param options - Optional validation options
 * @returns FileValidationResult with valid flag and optional error message
 *
 * @example
 * ```ts
 * const result = await validateJsonFile(file);
 * if (result.valid) {
 *   // File is safe to process
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function validateJsonFile(
  file: File,
  options: {
    maxSizeBytes?: number;
    requireObject?: boolean;
    checkStructure?: (parsed: unknown) => boolean;
  } = {}
): Promise<FileValidationResult> {
  const {
    maxSizeBytes = 10 * 1024 * 1024, // 10 MB default
    requireObject = true,
    checkStructure,
  } = options;

  // Check file size
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSizeBytes)})`,
    };
  }

  // Check file extension
  if (!file.name.toLowerCase().endsWith('.json')) {
    return {
      valid: false,
      error: 'File must have a .json extension',
    };
  }

  // Check MIME type
  const mimeType = file.type.toLowerCase();
  const hasValidMimeType = JSON_MIME_TYPES.some((validType) => mimeType === validType.toLowerCase());

  // Some systems don't set MIME type correctly for .json files, so we allow empty/unknown MIME types
  // but reject explicitly wrong MIME types
  // Known dangerous or explicitly wrong MIME types
  const dangerousOrWrongMimeTypes = [
    'application/x-msdownload',
    'application/x-msdos-program',
    'application/x-executable',
    'application/exe',
    'application/x-exe',
    'application/x-sh',
    'application/x-bat',
    'application/x-msi',
    'application/x-ms-shortcut',
    'application/x-javascript',
    'text/javascript',
    'image/',
    'video/',
    'audio/',
  ];

  const isDangerousOrWrong =
    mimeType &&
    !hasValidMimeType &&
    dangerousOrWrongMimeTypes.some((dangerous) => mimeType === dangerous || mimeType.startsWith(dangerous));

  if (isDangerousOrWrong) {
    return {
      valid: false,
      error: `Invalid file type: ${mimeType}. Expected a JSON file.`,
    };
  }

  // Read and parse file content
  try {
    const content = await readFileAsText(file);

    // Try to parse as JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      return {
        valid: false,
        error: `Invalid JSON file: ${parseError instanceof Error ? parseError.message : 'Unable to parse JSON'}`,
      };
    }

    // Check if parsed value is an object (if required)
    if (requireObject && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {
      return {
        valid: false,
        error: 'JSON file must contain an object with key-value pairs',
      };
    }

    // Run custom structure validation if provided
    if (checkStructure && !checkStructure(parsed)) {
      return {
        valid: false,
        error: 'JSON file does not match the expected structure',
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validates a manual trace JSON file structure.
 *
 * Expected structure:
 * {
 *   "md5hash1": "trace content 1",
 *   "md5hash2": "trace content 2",
 *   ...
 * }
 *
 * @param file - The file to validate
 * @returns FileValidationResult with validation outcome
 */
export async function validateManualTraceFile(file: File): Promise<FileValidationResult> {
  return validateJsonFile(file, {
    maxSizeBytes: 50 * 1024 * 1024, // 50 MB for trace files
    requireObject: true,
    checkStructure: (parsed) => {
      // Must be an object with string keys
      if (typeof parsed !== 'object' || parsed === null) {
        return false;
      }

      const obj = parsed as Record<string, unknown>;

      // Check that values are strings (traces)
      for (const [key, value] of Object.entries(obj)) {
        // Keys should look like MD5 hashes (32 hex characters)
        if (!/^[a-f0-9]{32}$/i.test(key)) {
          return false;
        }

        // Values should be strings (trace content)
        if (typeof value !== 'string') {
          return false;
        }
      }

      return true;
    },
  });
}

/**
 * Reads a file as text
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (reader.result === null) {
        reject(new Error('FileReader returned null'));
      } else {
        resolve(reader.result as string);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Formats file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * Extracts file extension from a file name
 *
 * @param filename - The file name
 * @returns The file extension (without the dot), or empty string if none
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return '';
  }
  return filename.slice(lastDotIndex + 1).toLowerCase();
}

/**
 * Checks if a file has a valid extension for the allowed types
 *
 * @param file - The file to check
 * @param allowedExtensions - Array of allowed extensions (without dots)
 * @returns true if the file has an allowed extension
 */
export function hasValidExtension(file: File, allowedExtensions: string[]): boolean {
  const extension = getFileExtension(file.name);
  return allowedExtensions.includes(extension);
}

/**
 * Validates that a file is not empty
 *
 * @param file - The file to check
 * @returns true if the file has content
 */
export function isFileNotEmpty(file: File): boolean {
  return file.size > 0;
}
