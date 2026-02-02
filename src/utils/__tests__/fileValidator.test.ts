/**
 * File validation utility tests
 *
 * These tests verify that file uploads are properly validated
 * to prevent security issues from malicious file uploads.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFileExtension, hasValidExtension, isFileNotEmpty } from '../fileValidator';

// Import the actual implementation and mock only the file reading part
import * as fileValidator from '../fileValidator';

// Mock the FileReader
const mockFileReader = {
  result: null as string | null,
  error: null as Error | null,
  onload: null as ((event: Event) => void) | null,
  onerror: null as ((event: Event) => void) | null,
  readAsText: vi.fn(function (this: typeof mockFileReader) {
    // Simulate async read - this will be called immediately in tests
    // The test will set the result and trigger onload manually
  }),
};

vi.stubGlobal('FileReader', vi.fn(() => mockFileReader) as unknown as typeof FileReader);

// Helper to trigger successful file read
function mockSuccessfulRead(content: string) {
  mockFileReader.result = content;
  mockFileReader.error = null;
  setTimeout(() => {
    if (mockFileReader.onload) {
      mockFileReader.onload(new Event('load'));
    }
  }, 0);
}

beforeEach(() => {
  // Reset mock state
  mockFileReader.result = null;
  mockFileReader.error = null;
  mockFileReader.onload = null;
  mockFileReader.onerror = null;
  mockFileReader.readAsText.mockClear();
});

describe('validateJsonFile', () => {
  describe('Valid JSON files', () => {
    it('should accept a valid JSON object file', async () => {
      const content = JSON.stringify({ key: 'value', number: 123 });
      const file = createMockFile('test.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateJsonFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept a valid JSON object file with text/plain MIME type', async () => {
      const content = JSON.stringify({ key: 'value' });
      const file = createMockFile('test.json', content, 'text/plain');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateJsonFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept a JSON file with no MIME type specified', async () => {
      const content = JSON.stringify({ key: 'value' });
      const file = createMockFile('test.json', content, '');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateJsonFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept a JSON file with nested objects', async () => {
      const content = JSON.stringify({
        level1: {
          level2: {
            level3: 'deep value',
          },
        },
      });
      const file = createMockFile('test.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateJsonFile(file);
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid JSON files', () => {
    it('should reject files without .json extension', async () => {
      const content = JSON.stringify({ key: 'value' });
      const file = createMockFile('test.txt', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateJsonFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('.json extension');
    });

    it('should reject files with wrong MIME type', async () => {
      const content = JSON.stringify({ key: 'value' });
      const file = createMockFile('test.json', content, 'image/png');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateJsonFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject malformed JSON', async () => {
      const content = '{"key": invalid json}';
      const file = createMockFile('test.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateJsonFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should reject JSON arrays when requireObject is true', async () => {
      const content = JSON.stringify([1, 2, 3]);
      const file = createMockFile('test.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateJsonFile(file, { requireObject: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must contain an object');
    });

    it('should accept JSON arrays when requireObject is false', async () => {
      const content = JSON.stringify([1, 2, 3]);
      const file = createMockFile('test.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateJsonFile(file, { requireObject: false });
      expect(result.valid).toBe(true);
    });

    it('should reject null values', async () => {
      const content = JSON.stringify(null);
      const file = createMockFile('test.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateJsonFile(file, { requireObject: true });
      expect(result.valid).toBe(false);
    });
  });

  describe('File size validation', () => {
    it('should accept files within size limit', async () => {
      const content = JSON.stringify({ key: 'value' });
      const file = createMockFile('test.json', content, 'application/json', 1000);

      mockSuccessfulRead(content);
      const result = await fileValidator.validateJsonFile(file, { maxSizeBytes: 10 * 1024 });
      expect(result.valid).toBe(true);
    });

    it('should reject files exceeding size limit', async () => {
      const content = 'x'.repeat(11 * 1024); // 11 KB
      const file = createMockFile('test.json', content, 'application/json', 11 * 1024);

      mockSuccessfulRead(content);
      const result = await fileValidator.validateJsonFile(file, { maxSizeBytes: 10 * 1024 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });
  });

  describe('Custom structure validation', () => {
    it('should accept files matching custom structure', async () => {
      const content = JSON.stringify({ name: 'test', count: 5 });
      const file = createMockFile('test.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateJsonFile(file, {
        checkStructure: (parsed) => {
          const obj = parsed as Record<string, unknown>;
          return typeof obj.name === 'string' && typeof obj.count === 'number';
        },
      });

      expect(result.valid).toBe(true);
    });

    it('should reject files not matching custom structure', async () => {
      const content = JSON.stringify({ name: 'test' });
      const file = createMockFile('test.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateJsonFile(file, {
        checkStructure: (parsed) => {
          const obj = parsed as Record<string, unknown>;
          return typeof obj.name === 'string' && typeof obj.count === 'number';
        },
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expected structure');
    });
  });
});

describe('validateManualTraceFile', () => {
  describe('Valid manual trace files', () => {
    it('should accept a valid manual trace file', async () => {
      const content = JSON.stringify({
        '1234567890abcdef1234567890abcdef': 'trace content 1',
        abcdef0123456789abcdef0123456789: 'trace content 2',
      });
      const file = createMockFile('traces.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateManualTraceFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept a manual trace file with 32-char hex keys', async () => {
      const content = JSON.stringify({
        '0123456789abcdef0123456789abcdef': 'content',
        fedcba9876543210fedcba9876543210: 'content2',
      });
      const file = createMockFile('traces.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateManualTraceFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept empty string values for traces', async () => {
      const content = JSON.stringify({
        '1234567890abcdef1234567890abcdef': '',
        abcdef0123456789abcdef0123456789: 'non-empty',
      });
      const file = createMockFile('traces.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateManualTraceFile(file);
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid manual trace files', () => {
    it('should reject non-object JSON', async () => {
      const content = JSON.stringify(['trace1', 'trace2']);
      const file = createMockFile('traces.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateManualTraceFile(file);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid MD5 hash keys', async () => {
      const content = JSON.stringify({
        'not-a-valid-hash': 'trace content',
      });
      const file = createMockFile('traces.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateManualTraceFile(file);
      expect(result.valid).toBe(false);
    });

    it('should reject keys that are too short', async () => {
      const content = JSON.stringify({
        '0123456789abcdef0123456789abcde': 'trace', // 31 chars
      });
      const file = createMockFile('traces.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateManualTraceFile(file);
      expect(result.valid).toBe(false);
    });

    it('should reject non-string values', async () => {
      const content = JSON.stringify({
        '1234567890abcdef1234567890abcdef': 123,
      });
      const file = createMockFile('traces.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateManualTraceFile(file);
      expect(result.valid).toBe(false);
    });

    it('should reject null values', async () => {
      const content = JSON.stringify({
        '1234567890abcdef1234567890abcdef': null,
      });
      const file = createMockFile('traces.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateManualTraceFile(file);
      expect(result.valid).toBe(false);
    });
  });

  describe('Security validation', () => {
    it('should reject files with executable MIME types', async () => {
      const content = JSON.stringify({
        '1234567890abcdef1234567890abcdef': 'trace content',
      });
      const file = createMockFile('test.json', content, 'application/x-msdownload');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateManualTraceFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject files with malicious content that is valid JSON', async () => {
      // Keys with characters outside hex range should be rejected
      const content = JSON.stringify({
        ghijklmnopqrstuvwxyzabcdefghijklmn: 'trace',
      });
      const file = createMockFile('traces.json', content, 'application/json');

      mockSuccessfulRead(content);
      const result = await fileValidator.validateManualTraceFile(file);
      expect(result.valid).toBe(false);
    });
  });
});

describe('getFileExtension', () => {
  it('should extract file extension', () => {
    expect(getFileExtension('test.json')).toBe('json');
    expect(getFileExtension('document.pdf')).toBe('pdf');
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
  });

  it('should handle files without extension', () => {
    expect(getFileExtension('README')).toBe('');
    expect(getFileExtension('Makefile')).toBe('');
  });

  it('should handle files ending with dot', () => {
    expect(getFileExtension('test.')).toBe('');
  });

  it('should handle empty string', () => {
    expect(getFileExtension('')).toBe('');
  });

  it('should return extension in lowercase', () => {
    expect(getFileExtension('TEST.JSON')).toBe('json');
    expect(getFileExtension('Document.PDF')).toBe('pdf');
  });
});

describe('hasValidExtension', () => {
  it('should return true for valid extensions', () => {
    const file = createMockFile('test.json', '{}', 'application/json');
    expect(hasValidExtension(file, ['json', 'txt'])).toBe(true);
  });

  it('should return false for invalid extensions', () => {
    const file = createMockFile('test.exe', 'content', 'application/octet-stream');
    expect(hasValidExtension(file, ['json', 'txt'])).toBe(false);
  });

  it('should be case-insensitive', () => {
    const file = createMockFile('TEST.JSON', '{}', 'application/json');
    expect(hasValidExtension(file, ['json'])).toBe(true);
  });
});

describe('isFileNotEmpty', () => {
  it('should return true for non-empty files', () => {
    const file = createMockFile('test.json', '{}', 'application/json', 100);
    expect(isFileNotEmpty(file)).toBe(true);
  });

  it('should return false for empty files', () => {
    const file = createMockFile('test.json', '', 'application/json', 0);
    expect(isFileNotEmpty(file)).toBe(false);
  });
});

describe('validateDataFile', () => {
  describe('Valid spreadsheet and text files', () => {
    it('should accept Excel .xlsx files with correct MIME type', () => {
      const file = createMockFile(
        'data.xlsx',
        'dummy content',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept Excel .xls files with correct MIME type', () => {
      const file = createMockFile('data.xls', 'dummy content', 'application/vnd.ms-excel');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept CSV files with text/csv MIME type', () => {
      const file = createMockFile('data.csv', 'col1,col2\nval1,val2', 'text/csv');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept TSV files with text/tab-separated-values MIME type', () => {
      const file = createMockFile('data.tsv', 'col1\tcol2\nval1\tval2', 'text/tab-separated-values');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept .txt files with text/plain MIME type', () => {
      const file = createMockFile('data.txt', 'some text content', 'text/plain');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept files with valid extensions but empty MIME type', () => {
      // Some browsers don't set MIME type for local files
      const file = createMockFile('data.csv', 'col1,col2', '');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(true);
    });

    it('should be case-insensitive for extensions', () => {
      const file = createMockFile(
        'DATA.XLSX',
        'content',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid file extensions', () => {
    it('should reject files with disallowed extensions', () => {
      const file = createMockFile('data.exe', 'content', 'application/octet-stream');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject files without extension', () => {
      const file = createMockFile('datafile', 'content', 'text/plain');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(false);
    });

    it('should reject .html files', () => {
      const file = createMockFile('data.html', '<html></html>', 'text/html');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(false);
    });

    it('should reject .js files', () => {
      const file = createMockFile('data.js', 'console.log("test")', 'text/javascript');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(false);
    });
  });

  describe('Dangerous MIME type blocking', () => {
    it('should reject files with executable MIME types', () => {
      const file = createMockFile('data.csv.exe', 'content', 'application/x-msdownload');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject files with script MIME types', () => {
      const file = createMockFile('data.csv', 'content', 'application/x-javascript');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(false);
    });

    it('should reject files with HTML MIME types', () => {
      const file = createMockFile('data.csv', 'content', 'text/html');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(false);
    });

    it('should reject files with shell script MIME types', () => {
      const file = createMockFile('data.csv', 'content', 'application/x-sh');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(false);
    });
  });

  describe('File size validation', () => {
    it('should accept files within default size limit (50 MB)', () => {
      const content = 'x'.repeat(10 * 1024); // 10 KB
      const file = createMockFile('data.csv', content, 'text/csv', 10 * 1024);
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject files exceeding default size limit', () => {
      const file = createMockFile('data.csv', 'content', 'text/csv', 51 * 1024 * 1024); // 51 MB
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should respect custom size limit', () => {
      const file = createMockFile('data.csv', 'content', 'text/csv', 5 * 1024); // 5 KB
      const result = fileValidator.validateDataFile(file, { maxSizeBytes: 4 * 1024 }); // 4 KB limit
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });
  });

  describe('Custom allowed extensions', () => {
    it('should accept only custom allowed extensions', () => {
      const file = createMockFile('data.csv', 'content', 'text/csv');
      const result = fileValidator.validateDataFile(file, {
        allowedExtensions: ['csv'],
      });
      expect(result.valid).toBe(true);
    });

    it('should reject files not in custom allowed extensions', () => {
      const file = createMockFile(
        'data.xlsx',
        'content',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const result = fileValidator.validateDataFile(file, {
        allowedExtensions: ['csv', 'txt'],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('.csv, .txt');
    });
  });

  describe('Security edge cases', () => {
    it('should reject executable MIME type even with valid extension', () => {
      // An executable renamed to .csv
      const file = createMockFile('data.csv', 'content', 'application/x-executable');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(false);
    });

    it('should reject Windows shortcut MIME type', () => {
      const file = createMockFile('data.csv', 'content', 'application/x-ms-shortcut');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(false);
    });

    it('should reject MSI installer MIME type', () => {
      const file = createMockFile('data.csv', 'content', 'application/x-msi');
      const result = fileValidator.validateDataFile(file);
      expect(result.valid).toBe(false);
    });
  });
});

/**
 * Helper function to create a mock File object for testing
 */
function createMockFile(name: string, content: string, mimeType: string, size?: number): File {
  const blob = new Blob([content], { type: mimeType });
  const file = new File([blob], name, { type: mimeType });

  // Override the size property if needed (for testing large files)
  if (size !== undefined) {
    Object.defineProperty(file, 'size', { value: size, writable: false });
  }

  return file;
}
