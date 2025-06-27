import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  downloadFile,
  validateFile,
  readFileAsText,
  parseJSONFile,
  resetFileInput,
  formatFileSize,
  FILE_VALIDATION_PRESETS
} from '../fileOperations';

// Mock DOM methods
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn(),
  },
  writable: true,
});

describe('fileOperations', () => {
  beforeEach(() => {
    // Mock document methods
    document.createElement = vi.fn((tagName) => {
      if (tagName === 'a') {
        return {
          style: { display: '' },
          href: '',
          download: '',
          click: vi.fn(),
        } as any;
      }
      return {} as any;
    });
    
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('downloadFile', () => {
    it('should download string content as file', () => {
      const content = 'test content';
      const options = { filename: 'test.txt', mimeType: 'text/plain' };

      downloadFile(content, options);

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    it('should download blob content as file', () => {
      const blob = new Blob(['test content']);
      const options = { filename: 'test.txt' };

      downloadFile(blob, options);

      expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob);
    });

    it('should use default mime type when not specified', () => {
      const content = 'test content';
      const options = { filename: 'test.txt' };

      downloadFile(content, options);

      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      (window.URL.createObjectURL as any).mockImplementation(() => {
        throw new Error('Mock error');
      });

      expect(() => {
        downloadFile('content', { filename: 'test.txt' });
      }).toThrow('Failed to download test.txt');
    });
  });

  describe('validateFile', () => {
    const createMockFile = (name: string, size: number, type: string) => {
      const file = new File(['content'], name, { type });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    it('should validate file size', () => {
      const file = createMockFile('test.txt', 2 * 1024 * 1024, 'text/plain'); // 2MB
      const options = { maxSizeBytes: 1 * 1024 * 1024 }; // 1MB limit

      const result = validateFile(file, options);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should validate file extensions', () => {
      const file = createMockFile('test.pdf', 1000, 'application/pdf');
      const options = { allowedExtensions: ['.txt', '.json'] };

      const result = validateFile(file, options);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File type .pdf is not allowed');
    });

    it('should handle extensions with and without dots', () => {
      const file = createMockFile('test.txt', 1000, 'text/plain');
      const options = { allowedExtensions: ['txt', '.json'] };

      const result = validateFile(file, options);

      expect(result.isValid).toBe(true);
    });

    it('should validate MIME types', () => {
      const file = createMockFile('test.txt', 1000, 'application/pdf');
      const options = { allowedMimeTypes: ['text/plain', 'text/csv'] };

      const result = validateFile(file, options);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('MIME type application/pdf is not allowed');
    });

    it('should return valid for files that pass all criteria', () => {
      const file = createMockFile('test.txt', 1000, 'text/plain');
      const options = {
        allowedExtensions: ['.txt'],
        allowedMimeTypes: ['text/plain'],
        maxSizeBytes: 10000
      };

      const result = validateFile(file, options);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should use default options when none provided', () => {
      const file = createMockFile('test.txt', 1000, 'text/plain');

      const result = validateFile(file);

      expect(result.isValid).toBe(true);
    });
  });

  describe('readFileAsText', () => {
    it('should read file as text successfully', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      // Mock FileReader
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        onerror: null as any,
      };
      
      global.FileReader = vi.fn(() => mockFileReader) as any;

      const promise = readFileAsText(file);
      
      // Simulate successful read
      mockFileReader.onload({ target: { result: 'test content' } });
      
      const result = await promise;
      expect(result).toBe('test content');
    });

    it('should handle read errors', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        onerror: null as any,
      };
      
      global.FileReader = vi.fn(() => mockFileReader) as any;

      const promise = readFileAsText(file);
      
      // Simulate error
      mockFileReader.onerror();
      
      await expect(promise).rejects.toThrow('Failed to read file: test.txt');
    });
  });

  describe('parseJSONFile', () => {
    it('should parse valid JSON file', async () => {
      const file = new File(['{"key": "value"}'], 'test.json', { type: 'application/json' });
      
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        onerror: null as any,
      };
      
      global.FileReader = vi.fn(() => mockFileReader) as any;

      const promise = parseJSONFile(file);
      
      // Simulate successful read
      mockFileReader.onload({ target: { result: '{"key": "value"}' } });
      
      const result = await promise;
      expect(result).toEqual({ key: 'value' });
    });

    it('should handle invalid JSON', async () => {
      const file = new File(['invalid json'], 'test.json', { type: 'application/json' });
      
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        onerror: null as any,
      };
      
      global.FileReader = vi.fn(() => mockFileReader) as any;

      const promise = parseJSONFile(file);
      
      // Simulate successful read of invalid JSON
      mockFileReader.onload({ target: { result: 'invalid json' } });
      
      await expect(promise).rejects.toThrow('Invalid JSON format in file: test.json');
    });

    it('should use validator when provided', async () => {
      const file = new File(['{"name": "test"}'], 'test.json', { type: 'application/json' });
      const validator = (data: any): data is { name: string } => {
        return typeof data === 'object' && typeof data.name === 'string';
      };
      
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        onerror: null as any,
      };
      
      global.FileReader = vi.fn(() => mockFileReader) as any;

      const promise = parseJSONFile(file, validator);
      
      // Simulate successful read
      mockFileReader.onload({ target: { result: '{"name": "test"}' } });
      
      const result = await promise;
      expect(result).toEqual({ name: 'test' });
    });

    it('should reject when validator fails', async () => {
      const file = new File(['{"invalid": "data"}'], 'test.json', { type: 'application/json' });
      const validator = (data: any): data is { name: string } => {
        return typeof data === 'object' && typeof data.name === 'string';
      };
      
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        onerror: null as any,
      };
      
      global.FileReader = vi.fn(() => mockFileReader) as any;

      const promise = parseJSONFile(file, validator);
      
      // Simulate successful read of data that fails validation
      mockFileReader.onload({ target: { result: '{"invalid": "data"}' } });
      
      await expect(promise).rejects.toThrow('JSON data does not match expected format');
    });
  });

  describe('resetFileInput', () => {
    it('should reset file input value', () => {
      const mockInput = { value: 'test.txt' };
      const ref = { current: mockInput } as React.RefObject<HTMLInputElement>;

      resetFileInput(ref);

      expect(mockInput.value).toBe('');
    });

    it('should handle null ref gracefully', () => {
      const ref = { current: null } as React.RefObject<HTMLInputElement>;

      expect(() => resetFileInput(ref)).not.toThrow();
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1000)).toBe('1000 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should format decimal values correctly', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB'); // 1.5 KB
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });
  });

  describe('FILE_VALIDATION_PRESETS', () => {
    it('should have correct JSON preset', () => {
      const preset = FILE_VALIDATION_PRESETS.JSON_ONLY;
      
      expect(preset.allowedExtensions).toContain('.json');
      expect(preset.allowedMimeTypes).toContain('application/json');
      expect(preset.maxSizeBytes).toBe(50 * 1024 * 1024);
    });

    it('should have correct spreadsheet preset', () => {
      const preset = FILE_VALIDATION_PRESETS.SPREADSHEET;
      
      expect(preset.allowedExtensions).toContain('.xlsx');
      expect(preset.allowedExtensions).toContain('.csv');
      expect(preset.allowedMimeTypes).toContain('text/csv');
    });

    it('should have correct text files preset', () => {
      const preset = FILE_VALIDATION_PRESETS.TEXT_FILES;
      
      expect(preset.allowedExtensions).toContain('.txt');
      expect(preset.allowedMimeTypes).toContain('text/plain');
    });
  });
});