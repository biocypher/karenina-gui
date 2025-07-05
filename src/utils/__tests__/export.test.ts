import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  downloadFile, 
  exportFromServer, 
  exportToJSON, 
  exportToCSV, 
  exportFilteredResults,
  ExportableResult 
} from '../export';
import { API_ENDPOINTS } from '../../constants/api';

// Mock DOM methods
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn(),
  },
  writable: true,
});

describe('Export Utils', () => {
  const mockResults: ExportableResult[] = [
    {
      question_id: 'q1',
      question_text: 'What is 2+2?',
      raw_llm_response: 'The answer is 4',
      parsed_response: { answer: 4 },
      verify_result: true,
      verify_granular_result: { correct: true },
      answering_model: 'gpt-4',
      parsing_model: 'gpt-4-parser',
      answering_replicate: 1,
      parsing_replicate: 1,
      answering_system_prompt: 'You are a math expert',
      parsing_system_prompt: 'Parse the answer',
      success: true,
      execution_time: 1.5,
      timestamp: '2023-01-01T00:00:00Z',
      run_name: 'test-run',
      job_id: 'job-123'
    },
    {
      question_id: 'q2',
      question_text: 'What is "hello, world"?',
      raw_llm_response: 'It\'s a greeting',
      answering_model: 'gpt-4',
      parsing_model: 'gpt-4-parser',
      success: false,
      error: 'Parse error',
      execution_time: 0.8,
      timestamp: '2023-01-01T00:01:00Z'
    }
  ];

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

    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('downloadFile', () => {
    it('should create and trigger file download', () => {
      const content = 'test content';
      const fileName = 'test.txt';
      const mimeType = 'text/plain';

      downloadFile(content, fileName, mimeType);

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });
  });

  describe('exportFromServer', () => {
    it('should export results from server successfully', async () => {
      const mockBlob = new Blob(['test data']);
      const mockResponse = {
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob)
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);

      await exportFromServer('job-123', 'json');

      expect(global.fetch).toHaveBeenCalledWith(API_ENDPOINTS.EXPORT_VERIFICATION('job-123', 'json'));
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    });

    it('should throw error when server request fails', async () => {
      const mockResponse = { ok: false };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(exportFromServer('job-123', 'json')).rejects.toThrow('Failed to export results');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(exportFromServer('job-123', 'json')).rejects.toThrow('Failed to export results');
    });
  });

  describe('exportToJSON', () => {
    it('should convert results to JSON with row indices', () => {
      const json = exportToJSON(mockResults);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toHaveProperty('row_index', 1);
      expect(parsed[1]).toHaveProperty('row_index', 2);
      expect(parsed[0]).toHaveProperty('question_id', 'q1');
      expect(parsed[1]).toHaveProperty('question_id', 'q2');
    });

    it('should handle empty results', () => {
      const json = exportToJSON([]);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual([]);
    });
  });

  describe('exportToCSV', () => {
    it('should convert results to CSV format', () => {
      const csv = exportToCSV(mockResults);
      const lines = csv.split('\n');

      expect(lines[0]).toContain('row_index,question_id,question_text');
      expect(lines[1]).toContain('1,q1,What is 2+2?');
      expect(lines[2]).toContain('2,q2,"What is ""hello, world""?"'); // CSV escaping test
    });

    it('should handle fields with commas and quotes', () => {
      const resultsWithSpecialChars: ExportableResult[] = [
        {
          question_id: 'q1',
          question_text: 'What is "hello, world"?',
          raw_llm_response: 'Answer with, commas and "quotes"',
          answering_model: 'test-model',
          parsing_model: 'test-parser',
          success: true,
          execution_time: 1.0,
          timestamp: '2023-01-01T00:00:00Z'
        }
      ];

      const csv = exportToCSV(resultsWithSpecialChars);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('"What is ""hello, world""?"');
      expect(lines[1]).toContain('"Answer with, commas and ""quotes"""');
    });

    it('should handle empty results', () => {
      const csv = exportToCSV([]);
      const lines = csv.split('\n');

      expect(lines).toHaveLength(1); // Only header
      expect(lines[0]).toContain('row_index,question_id,question_text');
    });

    it('should handle undefined/null values', () => {
      const resultsWithNulls: ExportableResult[] = [
        {
          question_id: 'q1',
          question_text: 'Test question',
          raw_llm_response: 'Test response',
          answering_model: 'test-model',
          parsing_model: 'test-parser',
          success: true,
          execution_time: 1.0,
          timestamp: '2023-01-01T00:00:00Z',
          // Optional fields left undefined
          run_name: undefined,
          error: undefined
        }
      ];

      const csv = exportToCSV(resultsWithNulls);
      expect(csv).not.toContain('undefined');
      expect(csv).not.toContain('null');
    });
  });

  describe('exportFilteredResults', () => {
    it('should export filtered results as JSON', () => {
      exportFilteredResults(mockResults, 'json');

      // Note: we can't easily spy on the module function, so we test the behavior
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should export filtered results as CSV', () => {
      exportFilteredResults(mockResults, 'csv');

      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should show alert when no results to export', () => {
      window.alert = vi.fn();
      
      exportFilteredResults([], 'json');

      expect(window.alert).toHaveBeenCalledWith('No results match the current filters.');
    });

    it('should call custom error handler when provided', () => {
      const onError = vi.fn();
      
      exportFilteredResults([], 'json', onError);

      expect(onError).toHaveBeenCalledWith('No results match the current filters.');
    });

    it('should handle export errors with custom error handler', () => {
      const onError = vi.fn();
      // Mock window.URL.createObjectURL to throw
      (window.URL.createObjectURL as any).mockImplementation(() => {
        throw new Error('Mock error');
      });

      exportFilteredResults(mockResults, 'json', onError);

      expect(onError).toHaveBeenCalledWith('Failed to export filtered results. Please try again.');
    });
  });
});