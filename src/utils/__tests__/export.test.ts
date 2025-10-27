import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  downloadFile,
  exportFromServer,
  exportToJSON,
  exportToCSV,
  exportFilteredResults,
  ExportableResult,
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
      verify_rubric: {
        Conciseness: true,
        Directness: 4,
        specific_trait: 3,
      },
      answering_model: 'gpt-4',
      parsing_model: 'gpt-4-parser',
      answering_replicate: 1,
      parsing_replicate: 1,
      answering_system_prompt: 'You are a math expert',
      parsing_system_prompt: 'Parse the answer',
      completed_without_errors: true,
      execution_time: 1.5,
      timestamp: '2023-01-01T00:00:00Z',
      run_name: 'test-run',
      job_id: 'job-123',
      // Embedding check metadata
      embedding_check_performed: true,
      embedding_similarity_score: 0.95,
      embedding_override_applied: false,
      embedding_model_used: 'all-MiniLM-L6-v2',
    },
    {
      question_id: 'q2',
      question_text: 'What is "hello, world"?',
      raw_llm_response: "It's a greeting",
      verify_rubric: {
        Conciseness: false,
        Directness: 2,
        another_specific: true,
      },
      answering_model: 'gpt-4',
      parsing_model: 'gpt-4-parser',
      completed_without_errors: false,
      error: 'Parse error',
      execution_time: 0.8,
      timestamp: '2023-01-01T00:01:00Z',
      // Embedding check metadata
      embedding_check_performed: true,
      embedding_similarity_score: 0.72,
      embedding_override_applied: true,
      embedding_model_used: 'all-MiniLM-L6-v2',
    },
  ];

  const mockGlobalRubric = {
    traits: [
      { name: 'Conciseness', description: 'Is the response concise?', kind: 'boolean' },
      { name: 'Directness', description: 'Is the response direct?', kind: 'score', min_score: 1, max_score: 5 },
    ],
  };

  beforeEach(() => {
    // Mock document methods
    document.createElement = vi.fn((tagName) => {
      if (tagName === 'a') {
        return {
          style: { display: '' },
          href: '',
          download: '',
          click: vi.fn(),
        } as HTMLAnchorElement;
      }
      return {} as HTMLElement;
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
        blob: vi.fn().mockResolvedValue(mockBlob),
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await exportFromServer('job-123', 'json');

      expect(global.fetch).toHaveBeenCalledWith(API_ENDPOINTS.EXPORT_VERIFICATION('job-123', 'json'));
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    });

    it('should throw error when server request fails', async () => {
      const mockResponse = { ok: false };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await expect(exportFromServer('job-123', 'json')).rejects.toThrow('Failed to export results');
    });

    it('should handle network errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

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

    it('should replace completed_without_errors with "abstained" when abstention is detected in JSON export', () => {
      const resultsWithAbstention: ExportableResult[] = [
        {
          question_id: 'q1',
          question_text: 'Test question',
          raw_llm_response: 'I cannot answer that',
          answering_model: 'test-model',
          parsing_model: 'test-parser',
          completed_without_errors: true,
          execution_time: 1.0,
          timestamp: '2023-01-01T00:00:00Z',
          // Abstention detected
          abstention_check_performed: true,
          abstention_detected: true,
          abstention_override_applied: true,
          abstention_reasoning: 'Model refused to answer',
        },
        {
          question_id: 'q2',
          question_text: 'Normal question',
          raw_llm_response: 'Normal answer',
          answering_model: 'test-model',
          parsing_model: 'test-parser',
          completed_without_errors: false,
          execution_time: 1.0,
          timestamp: '2023-01-01T00:00:00Z',
          // No abstention
          abstention_check_performed: true,
          abstention_detected: false,
          abstention_override_applied: false,
        },
      ];

      const json = exportToJSON(resultsWithAbstention);
      const parsed = JSON.parse(json);

      // First result should show "abstained" instead of true
      expect(parsed[0]).toHaveProperty('completed_without_errors', 'abstained');

      // Second result should show normal boolean
      expect(parsed[1]).toHaveProperty('completed_without_errors', false);
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
          completed_without_errors: true,
          execution_time: 1.0,
          timestamp: '2023-01-01T00:00:00Z',
        },
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
          completed_without_errors: true,
          execution_time: 1.0,
          timestamp: '2023-01-01T00:00:00Z',
          // Optional fields left undefined
          run_name: undefined,
          error: undefined,
        },
      ];

      const csv = exportToCSV(resultsWithNulls);
      expect(csv).not.toContain('undefined');
      expect(csv).not.toContain('null');
    });

    it('should consolidate question-specific rubrics when global rubric is provided', () => {
      const csv = exportToCSV(mockResults, mockGlobalRubric);
      const lines = csv.split('\n');

      // Check headers include global rubrics but not question-specific ones
      expect(lines[0]).toContain('rubric_Conciseness');
      expect(lines[0]).toContain('rubric_Directness');
      expect(lines[0]).toContain('question_specific_rubrics');
      expect(lines[0]).not.toContain('rubric_specific_trait');
      expect(lines[0]).not.toContain('rubric_another_specific');

      // Check first row has global rubric values and consolidated question-specific
      expect(lines[1]).toContain('true'); // Conciseness
      expect(lines[1]).toContain('4'); // Directness
      expect(lines[1]).toContain('"{""specific_trait"":3}"'); // question-specific rubrics as JSON (CSV escaped)

      // Check second row
      expect(lines[2]).toContain('false'); // Conciseness
      expect(lines[2]).toContain('2'); // Directness
      expect(lines[2]).toContain('"{""another_specific"":true}"'); // question-specific rubrics as JSON (CSV escaped)
    });

    it('should handle all global rubrics when no question-specific rubrics exist', () => {
      const resultsOnlyGlobal: ExportableResult[] = [
        {
          question_id: 'q1',
          question_text: 'Test question',
          raw_llm_response: 'Test response',
          verify_rubric: {
            Conciseness: true,
            Directness: 4,
          },
          answering_model: 'test-model',
          parsing_model: 'test-parser',
          completed_without_errors: true,
          execution_time: 1.0,
          timestamp: '2023-01-01T00:00:00Z',
        },
      ];

      const csv = exportToCSV(resultsOnlyGlobal, mockGlobalRubric);
      const lines = csv.split('\n');

      // Should not include question_specific_rubrics column when no question-specific rubrics exist
      expect(lines[0]).toContain('rubric_Conciseness');
      expect(lines[0]).toContain('rubric_Directness');
      expect(lines[0]).not.toContain('question_specific_rubrics');
    });

    it('should handle no global rubric (all rubrics become question-specific)', () => {
      const csv = exportToCSV(mockResults); // No global rubric provided
      const lines = csv.split('\n');

      // All rubrics should be in question_specific_rubrics column
      expect(lines[0]).not.toContain('rubric_Conciseness');
      expect(lines[0]).not.toContain('rubric_Directness');
      expect(lines[0]).toContain('question_specific_rubrics');

      // Check JSON consolidation (CSV escaped)
      expect(lines[1]).toContain('"{""Conciseness"":true,""Directness"":4,""specific_trait"":3}"');
      expect(lines[2]).toContain('"{""Conciseness"":false,""Directness"":2,""another_specific"":true}"');
    });

    it('should handle empty question-specific rubrics with proper JSON', () => {
      const resultsNoQuestionSpecific: ExportableResult[] = [
        {
          question_id: 'q1',
          question_text: 'Test question',
          raw_llm_response: 'Test response',
          verify_rubric: {
            Conciseness: true,
            Directness: 4,
          },
          answering_model: 'test-model',
          parsing_model: 'test-parser',
          completed_without_errors: true,
          execution_time: 1.0,
          timestamp: '2023-01-01T00:00:00Z',
        },
        {
          question_id: 'q2',
          question_text: 'Test question 2',
          raw_llm_response: 'Test response 2',
          verify_rubric: {
            Conciseness: false,
            // Missing Directness and other specific traits
          },
          answering_model: 'test-model',
          parsing_model: 'test-parser',
          completed_without_errors: true,
          execution_time: 1.0,
          timestamp: '2023-01-01T00:00:00Z',
        },
      ];

      // Mock global rubric that includes some traits not in all results
      const extendedGlobalRubric = {
        traits: [
          { name: 'Conciseness', description: 'Is the response concise?', kind: 'boolean' },
          { name: 'Directness', description: 'Is the response direct?', kind: 'score', min_score: 1, max_score: 5 },
          { name: 'extra_trait', description: 'Extra trait', kind: 'boolean' },
        ],
      };

      const csv = exportToCSV(resultsNoQuestionSpecific, extendedGlobalRubric);
      const lines = csv.split('\n');

      // Should handle missing global traits gracefully
      expect(lines[1]).toContain('true'); // Conciseness
      expect(lines[1]).toContain('4'); // Directness
      expect(lines[1]).toContain(''); // extra_trait missing (empty)

      expect(lines[2]).toContain('false'); // Conciseness
      expect(lines[2]).toContain(''); // Directness missing (empty)
      expect(lines[2]).toContain(''); // extra_trait missing (empty)
    });

    it('should include embedding check fields in CSV export', () => {
      const csv = exportToCSV(mockResults);
      const lines = csv.split('\n');

      // Check that embedding fields are in the header
      expect(lines[0]).toContain('embedding_check_performed');
      expect(lines[0]).toContain('embedding_similarity_score');
      expect(lines[0]).toContain('embedding_override_applied');
      expect(lines[0]).toContain('embedding_model_used');

      // Check that embedding values are in the data rows
      expect(lines[1]).toContain('true'); // embedding_check_performed for first result
      expect(lines[1]).toContain('0.95'); // embedding_similarity_score for first result
      expect(lines[1]).toContain('false'); // embedding_override_applied for first result
      expect(lines[1]).toContain('all-MiniLM-L6-v2'); // embedding_model_used for first result

      // Check second result
      expect(lines[2]).toContain('true'); // embedding_check_performed for second result
      expect(lines[2]).toContain('0.72'); // embedding_similarity_score for second result
      expect(lines[2]).toContain('true'); // embedding_override_applied for second result (this one was overridden)
    });

    it('should replace completed_without_errors with "abstained" when abstention is detected in CSV export', () => {
      const resultsWithAbstention: ExportableResult[] = [
        {
          question_id: 'q1',
          question_text: 'Test question',
          raw_llm_response: 'I cannot answer that',
          answering_model: 'test-model',
          parsing_model: 'test-parser',
          completed_without_errors: true,
          execution_time: 1.0,
          timestamp: '2023-01-01T00:00:00Z',
          // Abstention detected
          abstention_check_performed: true,
          abstention_detected: true,
          abstention_override_applied: true,
          abstention_reasoning: 'Model refused to answer',
        },
        {
          question_id: 'q2',
          question_text: 'Normal question',
          raw_llm_response: 'Normal answer',
          answering_model: 'test-model',
          parsing_model: 'test-parser',
          completed_without_errors: true,
          execution_time: 1.0,
          timestamp: '2023-01-01T00:00:00Z',
          // No abstention
          abstention_check_performed: true,
          abstention_detected: false,
          abstention_override_applied: false,
        },
      ];

      const csv = exportToCSV(resultsWithAbstention);
      const lines = csv.split('\n');

      // Parse CSV to check specific field values
      const headers = lines[0].split(',');
      const firstRow = lines[1].split(',');
      const secondRow = lines[2].split(',');

      const completedWithoutErrorsIndex = headers.indexOf('completed_without_errors');
      expect(completedWithoutErrorsIndex).toBeGreaterThan(-1);

      // First result should show "abstained" instead of true for completed_without_errors field
      expect(firstRow[completedWithoutErrorsIndex]).toBe('abstained');

      // Second result should show true for completed_without_errors field
      expect(secondRow[completedWithoutErrorsIndex]).toBe('true');
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
      (window.URL.createObjectURL as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Mock error');
      });

      exportFilteredResults(mockResults, 'json', onError);

      expect(onError).toHaveBeenCalledWith('Failed to export filtered results. Please try again.');
    });
  });
});
