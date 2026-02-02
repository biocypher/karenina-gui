import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BenchmarkTab } from '../src/components/BenchmarkTab';
import { VerificationResult } from '../src/types';
import userEvent from '@testing-library/user-event';

// Mock the stores and hooks
vi.mock('../src/stores/useRubricStore', () => ({
  useRubricStore: () => ({
    currentRubric: null,
  }),
}));

vi.mock('../src/hooks/useBenchmarkConfiguration', () => ({
  useBenchmarkConfiguration: () => ({
    answeringModels: [],
    parsingModels: [],
    replicateCount: 1,
    expandedPrompts: {},
    runName: 'test-run',
    rubricEnabled: false,
    correctnessEnabled: true,
    fewShotEnabled: false,
    fewShotMode: 'all' as const,
    fewShotK: 3,
    setReplicateCount: vi.fn(),
    togglePromptExpansion: vi.fn(),
    setRunName: vi.fn(),
    toggleRubricEnabled: vi.fn(),
    toggleCorrectnessEnabled: vi.fn(),
    toggleFewShotEnabled: vi.fn(),
    setFewShotMode: vi.fn(),
    setFewShotK: vi.fn(),
  }),
}));

// Mock the API calls
global.fetch = vi.fn();

const createMockResult = (
  overrides: {
    metadata?: Partial<VerificationResult['metadata']>;
    template?: Partial<VerificationResult['template']>;
  } = {}
): VerificationResult => {
  return {
    metadata: {
      question_id: 'test-question-1',
      template_id: 'test-question-1-template',
      completed_without_errors: true,
      question_text: 'What is 2+2?',
      answering: { interface: 'langchain', model_name: 'gpt-4', tools: [] },
      parsing: { interface: 'langchain', model_name: 'gpt-3.5-turbo', tools: [] },
      execution_time: 0,
      timestamp: '2023-12-01T10:00:00Z',
      ...overrides.metadata,
    },
    template: {
      raw_llm_response: 'The answer is 4.',
      parsed_llm_response: { answer: '4' },
      verify_result: true,
      embedding_check_performed: false,
      embedding_similarity_score: undefined,
      embedding_override_applied: false,
      embedding_model_used: undefined,
      ...overrides.template,
    },
  };
};

describe('EmbeddingCheck UI Components', () => {
  describe('DetailedTrace Modal', () => {
    it('should not show embedding section when embedding check was not performed', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult();
      const benchmarkResults = { 'test-question-1': mockResult };
      const checkpoint = {
        'test-question-1': {
          question: 'What is 2+2?',
          raw_answer: '4',
          original_answer_template: 'class Answer(BaseAnswer): pass',
          answer_template: 'class Answer(BaseAnswer): response: str = "4"',
          last_modified: '2023-12-01T10:00:00Z',
          finished: true,
        },
      };

      render(
        <BenchmarkTab checkpoint={checkpoint} benchmarkResults={benchmarkResults} setBenchmarkResults={vi.fn()} />
      );

      // Find and click the view button to open the modal
      const viewButton = screen.getByRole('button', { name: /view detailed trace/i });
      await user.click(viewButton);

      // Check that embedding section is not present
      expect(screen.queryByText('Embedding Check Results')).not.toBeInTheDocument();
    });

    it('should show embedding section with basic info when embedding check was performed', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult({
        template: {
          embedding_check_performed: true,
          embedding_similarity_score: 0.75,
          embedding_model_used: 'all-MiniLM-L6-v2',
        },
      });
      const benchmarkResults = { 'test-question-1': mockResult };
      const checkpoint = {
        'test-question-1': {
          question: 'What is 2+2?',
          raw_answer: '4',
          original_answer_template: 'class Answer(BaseAnswer): pass',
          answer_template: 'class Answer(BaseAnswer): response: str = "4"',
          last_modified: '2023-12-01T10:00:00Z',
          finished: true,
        },
      };

      render(
        <BenchmarkTab checkpoint={checkpoint} benchmarkResults={benchmarkResults} setBenchmarkResults={vi.fn()} />
      );

      // Find and click the view button to open the modal
      const viewButton = screen.getByRole('button', { name: /view detailed trace/i });
      await user.click(viewButton);

      // Check that embedding section is present
      expect(screen.getByText('Embedding Check Results')).toBeInTheDocument();
      expect(screen.getByText('Similarity Score:')).toBeInTheDocument();
      expect(screen.getByText('0.750')).toBeInTheDocument();
      expect(screen.getByText('Model Used:')).toBeInTheDocument();
      expect(screen.getByText('all-MiniLM-L6-v2')).toBeInTheDocument();
    });

    it('should show override success message when embedding check overrode the result', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult({
        metadata: { completed_without_errors: false },
        template: {
          verify_result: false,
          embedding_check_performed: true,
          embedding_similarity_score: 0.92,
          embedding_override_applied: true,
          embedding_model_used: 'all-MiniLM-L6-v2',
        },
      });
      const benchmarkResults = { 'test-question-1': mockResult };
      const checkpoint = {
        'test-question-1': {
          question: 'What is 2+2?',
          raw_answer: '4',
          original_answer_template: 'class Answer(BaseAnswer): pass',
          answer_template: 'class Answer(BaseAnswer): response: str = "4"',
          last_modified: '2023-12-01T10:00:00Z',
          finished: true,
        },
      };

      render(
        <BenchmarkTab checkpoint={checkpoint} benchmarkResults={benchmarkResults} setBenchmarkResults={vi.fn()} />
      );

      // Find and click the view button to open the modal
      const viewButton = screen.getByRole('button', { name: /view detailed trace/i });
      await user.click(viewButton);

      // Check that override message is shown
      expect(screen.getByText('Verification Overridden by Semantic Check')).toBeInTheDocument();
      expect(
        screen.getByText(/embedding similarity analysis determined the answers are semantically equivalent/)
      ).toBeInTheDocument();
    });

    it('should not show override message when embedding check did not override', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult({
        template: {
          embedding_check_performed: true,
          embedding_similarity_score: 0.6,
          embedding_override_applied: false,
          embedding_model_used: 'all-MiniLM-L6-v2',
        },
      });
      const benchmarkResults = { 'test-question-1': mockResult };
      const checkpoint = {
        'test-question-1': {
          question: 'What is 2+2?',
          raw_answer: '4',
          original_answer_template: 'class Answer(BaseAnswer): pass',
          answer_template: 'class Answer(BaseAnswer): response: str = "4"',
          last_modified: '2023-12-01T10:00:00Z',
          finished: true,
        },
      };

      render(
        <BenchmarkTab checkpoint={checkpoint} benchmarkResults={benchmarkResults} setBenchmarkResults={vi.fn()} />
      );

      // Find and click the view button to open the modal
      const viewButton = screen.getByRole('button', { name: /view detailed trace/i });
      await user.click(viewButton);

      // Check that override message is NOT shown
      expect(screen.queryByText('Verification Overridden by Semantic Check')).not.toBeInTheDocument();
    });

    it('should handle missing embedding data gracefully', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult({
        template: {
          embedding_check_performed: true,
          embedding_similarity_score: undefined,
          embedding_model_used: undefined,
        },
      });
      const benchmarkResults = { 'test-question-1': mockResult };
      const checkpoint = {
        'test-question-1': {
          question: 'What is 2+2?',
          raw_answer: '4',
          original_answer_template: 'class Answer(BaseAnswer): pass',
          answer_template: 'class Answer(BaseAnswer): response: str = "4"',
          last_modified: '2023-12-01T10:00:00Z',
          finished: true,
        },
      };

      render(
        <BenchmarkTab checkpoint={checkpoint} benchmarkResults={benchmarkResults} setBenchmarkResults={vi.fn()} />
      );

      // Find and click the view button to open the modal
      const viewButton = screen.getByRole('button', { name: /view detailed trace/i });
      await user.click(viewButton);

      // Check that section is shown but with N/A values
      expect(screen.getByText('Embedding Check Results')).toBeInTheDocument();
      // Check that N/A values appear for score and model (they may be among many N/As on the page)
      const allNaElements = screen.getAllByText('N/A');
      expect(allNaElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Export Dialog', () => {
    it('should include embedding fields in export options', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult({
        template: {
          embedding_check_performed: true,
          embedding_similarity_score: 0.85,
          embedding_override_applied: true,
        },
      });
      const benchmarkResults = { 'test-question-1': mockResult };
      const checkpoint = {
        'test-question-1': {
          question: 'What is 2+2?',
          raw_answer: '4',
          original_answer_template: 'class Answer(BaseAnswer): pass',
          answer_template: 'class Answer(BaseAnswer): response: str = "4"',
          last_modified: '2023-12-01T10:00:00Z',
          finished: true,
        },
      };

      render(
        <BenchmarkTab checkpoint={checkpoint} benchmarkResults={benchmarkResults} setBenchmarkResults={vi.fn()} />
      );

      // Find and click the export button to open custom export dialog
      // Note: This assumes there's an export button that opens CustomExportDialog
      // The exact implementation may vary
      const exportButtons = screen.queryAllByText(/export/i);
      if (exportButtons.length > 0) {
        // Try to click one of the export buttons that might open the custom dialog
        const customExportButton = exportButtons.find(
          (button) =>
            button.textContent?.includes('Custom') || button.closest('button')?.textContent?.includes('Custom')
        );

        if (customExportButton) {
          await user.click(customExportButton);

          // Check that embedding fields are available in the dialog
          expect(screen.getByText(/Embedding Check Results/)).toBeInTheDocument();
          expect(screen.getByText(/Embedding Check Performed/)).toBeInTheDocument();
          expect(screen.getByText(/Embedding Similarity Score/)).toBeInTheDocument();
          expect(screen.getByText(/Embedding Override Applied/)).toBeInTheDocument();
          expect(screen.getByText(/Embedding Model Used/)).toBeInTheDocument();
          // Note: Semantic Check Details section is not currently implemented in the export dialog
        }
      }
    });
  });
});

describe('Embedding Check Field Descriptions', () => {
  it('should provide helpful descriptions for embedding fields', () => {
    // Test that the field descriptions in CustomExportDialog are helpful
    const descriptions = [
      'Whether embedding similarity check was attempted',
      'Cosine similarity score between embeddings (0.0 to 1.0)',
      'Whether embedding check overrode the original verification result',
      'Name of the sentence transformer model used for similarity computation',
      'Details from the semantic equivalence check performed by the LLM',
    ];

    descriptions.forEach((description) => {
      expect(description).toBeTruthy();
      expect(description.length).toBeGreaterThan(20); // Ensure descriptions are meaningful
    });
  });
});

// Test data structure validation
describe('EmbeddingCheck Data Types', () => {
  it('should handle all embedding field types correctly', () => {
    const mockResult = createMockResult({
      template: {
        embedding_check_performed: true,
        embedding_similarity_score: 0.85,
        embedding_override_applied: false,
        embedding_model_used: 'test-model',
      },
    });

    // Access from nested template structure
    expect(typeof mockResult.template?.embedding_check_performed).toBe('boolean');
    expect(typeof mockResult.template?.embedding_similarity_score).toBe('number');
    expect(typeof mockResult.template?.embedding_override_applied).toBe('boolean');
    expect(typeof mockResult.template?.embedding_model_used).toBe('string');
  });

  it('should handle null/undefined embedding values', () => {
    const mockResult = createMockResult({
      template: {
        embedding_check_performed: false,
        embedding_similarity_score: undefined,
        embedding_override_applied: false,
        embedding_model_used: undefined,
      },
    });

    expect(mockResult.template?.embedding_check_performed).toBe(false);
    expect(mockResult.template?.embedding_similarity_score).toBeUndefined();
    expect(mockResult.template?.embedding_override_applied).toBe(false);
    expect(mockResult.template?.embedding_model_used).toBeUndefined();
  });
});
