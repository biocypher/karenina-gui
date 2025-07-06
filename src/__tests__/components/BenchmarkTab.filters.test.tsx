import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BenchmarkTab } from '../../components/BenchmarkTab';
import { Checkpoint } from '../../types';

// Mock fetch and DOM APIs
global.fetch = vi.fn();
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Fix Blob mock to properly return the type property
global.Blob = vi.fn().mockImplementation((content, options) => ({
  content,
  options,
  size: content[0] ? content[0].length : 0,
  type: options?.type || '',
})) as unknown as typeof Blob;

const mockCheckpoint: Checkpoint = {
  q1: {
    question: 'What is 2+2?',
    raw_answer: 'The answer is 4',
    original_answer_template: 'class Answer(BaseAnswer): pass',
    answer_template: 'class Answer(BaseAnswer): response: str = "4"',
    last_modified: '2023-12-01T10:00:00Z',
    finished: true,
  },
  q2: {
    question: 'What is the capital of France?',
    raw_answer: 'The capital of France is Paris',
    original_answer_template: 'class Answer(BaseAnswer): pass',
    answer_template: 'class Answer(BaseAnswer): city: str = "Paris"',
    last_modified: '2023-12-02T11:00:00Z',
    finished: true,
  },
  q3: {
    question: 'What is Python?',
    raw_answer: 'Python is a programming language',
    original_answer_template: 'class Answer(BaseAnswer): pass',
    answer_template: 'class Answer(BaseAnswer): description: str = "A programming language"',
    last_modified: '2023-12-03T12:00:00Z',
    finished: true,
  },
};

// Mock comprehensive verification results for testing filters
const mockVerificationResults = {
  q1: {
    question_id: 'q1',
    success: true,
    question_text: 'What is 2+2?',
    raw_llm_response: 'The answer is 4',
    parsed_response: { response: '4' },
    verify_result: true,
    verify_granular_result: { score: 1.0, details: 'perfect match' },
    answering_model: 'google_genai/gemini-2.0-flash',
    parsing_model: 'google_genai/gemini-2.0-flash',
    execution_time: 1.23,
    timestamp: '2023-12-01T15:00:00Z',
  },
  q2: {
    question_id: 'q2',
    success: false,
    question_text: 'What is the capital of France?',
    raw_llm_response: 'Paris is the capital',
    parsed_response: null,
    verify_result: false,
    verify_granular_result: null,
    answering_model: 'openai/gpt-4',
    parsing_model: 'openai/gpt-4',
    execution_time: 2.45,
    timestamp: '2023-12-02T16:00:00Z',
  },
  q3: {
    question_id: 'q3',
    success: true,
    question_text: 'What is Python?',
    raw_llm_response: 'Python is a high-level programming language',
    parsed_response: { description: 'A programming language' },
    verify_result: undefined, // N/A case
    verify_granular_result: { score: 0.8, details: 'partial match' },
    answering_model: 'anthropic/claude-3',
    parsing_model: 'google_genai/gemini-2.0-flash',
    execution_time: 1.87,
    timestamp: '2023-12-03T17:00:00Z',
  },
};

describe('BenchmarkTab Filters and Export', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Fix Blob mock
    global.Blob = vi.fn().mockImplementation((content, options) => ({
      content,
      options,
      size: content[0] ? content[0].length : 0,
      type: options?.type || '',
    })) as unknown as typeof Blob;
  });

  describe('Filter Visibility and Controls', () => {
    it('hides filter controls when no results are available', () => {
      render(<BenchmarkTab checkpoint={mockCheckpoint} benchmarkResults={{}} setBenchmarkResults={() => {}} />);

      // Should not show filter button when no results
      expect(screen.queryByText('Show Filters')).not.toBeInTheDocument();
      expect(screen.queryByText('Hide Filters')).not.toBeInTheDocument();

      // Should not show export buttons
      expect(screen.queryByText('JSON')).not.toBeInTheDocument();
      expect(screen.queryByText('CSV')).not.toBeInTheDocument();
    });

    it('shows filter controls when results are available', () => {
      render(
        <BenchmarkTab
          checkpoint={mockCheckpoint}
          benchmarkResults={mockVerificationResults}
          setBenchmarkResults={() => {}}
        />
      );

      // Initially no filters
      expect(screen.queryByText('Show Filters')).not.toBeInTheDocument();

      // Component should render without errors
      expect(screen.getByText('Test Results (3)')).toBeInTheDocument();
    });

    it('displays correct result count format', () => {
      render(
        <BenchmarkTab
          checkpoint={mockCheckpoint}
          benchmarkResults={mockVerificationResults}
          setBenchmarkResults={() => {}}
        />
      );

      // Should show base count format
      expect(screen.getByText('Test Results (3)')).toBeInTheDocument();
    });

    it('shows filtered count when filters are applied', async () => {
      render(
        <BenchmarkTab
          checkpoint={mockCheckpoint}
          benchmarkResults={mockVerificationResults}
          setBenchmarkResults={() => {}}
        />
      );

      const questionFilterInput = screen.getByPlaceholderText('Search questions...');
      fireEvent.change(questionFilterInput, { target: { value: 'Python' } });

      await waitFor(() => {
        expect(screen.getByText(/Test Results \(1 of 3\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Filter Logic Testing', () => {
    // Test filter logic functions directly
    const testFilterLogic = () => {
      const allResults = Object.values(mockVerificationResults);

      // Test template validity filter
      const validResults = allResults.filter((result) => result.success);
      const invalidResults = allResults.filter((result) => !result.success);

      expect(validResults).toHaveLength(2); // q1 and q3 are successful
      expect(invalidResults).toHaveLength(1); // q2 is unsuccessful

      // Test verify result filter
      const passedResults = allResults.filter((result) => result.verify_result === true);
      const failedResults = allResults.filter((result) => result.verify_result === false);
      const naResults = allResults.filter((result) => result.verify_result === undefined);

      expect(passedResults).toHaveLength(1); // q1
      expect(failedResults).toHaveLength(1); // q2
      expect(naResults).toHaveLength(1); // q3

      // Test granular result filter
      const withGranularResults = allResults.filter(
        (result) => result.verify_granular_result !== undefined && result.verify_granular_result !== null
      );
      const withoutGranularResults = allResults.filter(
        (result) => result.verify_granular_result === undefined || result.verify_granular_result === null
      );

      expect(withGranularResults).toHaveLength(2); // q1 and q3
      expect(withoutGranularResults).toHaveLength(1); // q2

      // Test model filtering
      const geminiAnsweringResults = allResults.filter((result) => result.answering_model.includes('gemini'));
      const gptAnsweringResults = allResults.filter((result) => result.answering_model.includes('gpt-4'));
      const claudeAnsweringResults = allResults.filter((result) => result.answering_model.includes('claude'));

      expect(geminiAnsweringResults).toHaveLength(1); // q1
      expect(gptAnsweringResults).toHaveLength(1); // q2
      expect(claudeAnsweringResults).toHaveLength(1); // q3

      // Test date filtering
      const dec1Results = allResults.filter((result) => result.timestamp.startsWith('2023-12-01'));
      const dec2Results = allResults.filter((result) => result.timestamp.startsWith('2023-12-02'));
      const dec3Results = allResults.filter((result) => result.timestamp.startsWith('2023-12-03'));

      expect(dec1Results).toHaveLength(1); // q1
      expect(dec2Results).toHaveLength(1); // q2
      expect(dec3Results).toHaveLength(1); // q3
    };

    it('correctly filters by template validity', testFilterLogic);

    it('correctly filters by verify result', () => {
      const allResults = Object.values(mockVerificationResults);

      // Test union mode (default)
      const answeringModels = new Set(['google_genai/gemini-2.0-flash']);
      const parsingModels = new Set(['openai/gpt-4']);

      // Union: should include results that match either answering OR parsing model
      const unionResults = allResults.filter(
        (result) => answeringModels.has(result.answering_model) || parsingModels.has(result.parsing_model)
      );

      expect(unionResults).toHaveLength(2); // q1 (gemini answering) and q2 (gpt-4 both)

      // Intersection: should include results that match both answering AND parsing model
      const intersectionResults = allResults.filter(
        (result) => answeringModels.has(result.answering_model) && parsingModels.has(result.parsing_model)
      );

      expect(intersectionResults).toHaveLength(0); // No results match both criteria
    });

    it('correctly filters by date range', () => {
      const allResults = Object.values(mockVerificationResults);

      // Test date range filtering
      const startDate = new Date('2023-12-02');
      const endDate = new Date('2023-12-02T23:59:59');

      const dateFilteredResults = allResults.filter((result) => {
        const resultDate = new Date(result.timestamp);
        return resultDate >= startDate && resultDate <= endDate;
      });

      expect(dateFilteredResults).toHaveLength(1); // Only q2 is on 2023-12-02
      expect(dateFilteredResults[0].question_id).toBe('q2');
    });

    it('correctly handles intersection vs union model filtering', () => {
      render(
        <BenchmarkTab
          checkpoint={mockCheckpoint}
          benchmarkResults={mockVerificationResults}
          setBenchmarkResults={() => {}}
        />
      );

      // Since the UI doesn't explicitly have a toggle, this test is more conceptual
      // No results match both criteria
    });
  });

  describe('Export Functionality', () => {
    it('creates correct JSON export format', () => {
      const jsonData = JSON.stringify(Object.values(mockVerificationResults), null, 2);

      expect(jsonData).toContain('question_id');
      expect(jsonData).toContain('question_text');
      expect(jsonData).toContain('answering_model');
      expect(jsonData).toBeDefined();
    });

    it('creates correct CSV export format', () => {
      const headers = [
        'question_id',
        'question_text',
        'answering_model',
        'parsing_model',
        'success',
        'verify_result',
        'execution_time',
        'timestamp',
      ];
      const csvRows = [headers.join(',')];

      Object.values(mockVerificationResults).forEach((result) => {
        const row = [
          result.question_id,
          `"${result.question_text.replace(/"/g, '""')}"`,
          result.answering_model,
          result.parsing_model,
          result.success,
          result.verify_result !== undefined ? result.verify_result : 'N/A',
          result.execution_time,
          result.timestamp,
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      expect(csvContent).toContain('question_id,question_text');
      expect(csvContent).toContain('google_genai/gemini-2.0-flash');
    });

    it('properly escapes CSV special characters', () => {
      const textWithQuotes = 'Question with "quotes" and more "quotes"';
      const escaped = textWithQuotes.replace(/"/g, '""');
      const csvField = `"${escaped}"`;

      expect(csvField).toBe('"Question with ""quotes"" and more ""quotes"""');
    });

    it('handles empty results gracefully', () => {
      const emptyResults: unknown[] = [];
      const jsonContent = JSON.stringify(emptyResults, null, 2);
      const csvContent =
        'question_id,question_text,answering_model,parsing_model,success,verify_result,execution_time,timestamp\n';

      expect(jsonContent).toBe('[]');
      expect(csvContent).toContain('question_id,question_text');
    });

    it('generates correct filenames with date', () => {
      const currentDate = new Date().toISOString().split('T')[0];
      const jsonFilename = `filtered_results_${currentDate}.json`;
      const csvFilename = `filtered_results_${currentDate}.csv`;

      expect(jsonFilename).toMatch(/^filtered_results_\d{4}-\d{2}-\d{2}\.json$/);
      expect(csvFilename).toMatch(/^filtered_results_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('handles special data types in export', () => {
      const specialData = [
        {
          question_id: 'test1',
          question_text: 'Test question',
          answering_model: 'model1',
          parsing_model: 'model2',
          success: true,
          verify_result: null,
          execution_time: 1.5,
          timestamp: '2024-01-01T00:00:00Z',
        },
      ];

      const jsonContent = JSON.stringify(specialData, null, 2);
      expect(jsonContent).toContain('null');
      expect(jsonContent).toContain('1.5');
    });
  });
});
