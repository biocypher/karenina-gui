import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BenchmarkTable } from '../BenchmarkTable';
import { VerificationResult } from '../../types';

describe('BenchmarkTable - Deep-Judgment Column', () => {
  const mockOnViewResult = () => {};

  const createMockResult = (overrides: Partial<VerificationResult> = {}): VerificationResult => ({
    question_id: 'q1',
    question_text: 'Test question',
    parsed_gt_response: { answer: 'ground truth' },
    parsed_llm_response: { answer: 'llm response' },
    raw_llm_response: 'raw response',
    keywords: ['test'],
    answering_model: 'gpt-4',
    parsing_model: 'gpt-4',
    answering_mcp_servers: [],
    success: true,
    verify_result: true,
    verify_granular_result: {},
    verify_rubric: null,
    execution_time: 1.23,
    timestamp: new Date().toISOString(),
    run_name: 'test-run',
    answering_replicate: 1,
    parsing_replicate: 1,
    deep_judgment_enabled: false,
    deep_judgment_performed: false,
    ...overrides,
  });

  it('displays "Disabled" when deep-judgment is not enabled', () => {
    const results = {
      q1: createMockResult({ deep_judgment_enabled: false }),
    };

    render(<BenchmarkTable benchmarkResults={results} onViewResult={mockOnViewResult} />);

    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('displays "Not Performed" when enabled but not performed', () => {
    const results = {
      q1: createMockResult({
        deep_judgment_enabled: true,
        deep_judgment_performed: false,
      }),
    };

    render(<BenchmarkTable benchmarkResults={results} onViewResult={mockOnViewResult} />);

    expect(screen.getByText('Not Performed')).toBeInTheDocument();
  });

  it('displays excerpt count when deep-judgment performed with excerpts', () => {
    const results = {
      q1: createMockResult({
        deep_judgment_enabled: true,
        deep_judgment_performed: true,
        extracted_excerpts: {
          attr1: [{ text: 'excerpt 1', confidence: 'high', similarity_score: 0.95 }],
          attr2: [{ text: 'excerpt 2', confidence: 'medium', similarity_score: 0.85 }],
        },
        attribute_reasoning: {
          attr1: 'reasoning for attr1',
          attr2: 'reasoning for attr2',
        },
        attributes_without_excerpts: [],
      }),
    };

    render(<BenchmarkTable benchmarkResults={results} onViewResult={mockOnViewResult} />);

    expect(screen.getByText('E: 2')).toBeInTheDocument();
    expect(screen.getByText('R: 2')).toBeInTheDocument();
  });

  it('displays missing count when attributes have no excerpts', () => {
    const results = {
      q1: createMockResult({
        deep_judgment_enabled: true,
        deep_judgment_performed: true,
        extracted_excerpts: {
          attr1: [{ text: 'excerpt 1', confidence: 'high', similarity_score: 0.95 }],
        },
        attribute_reasoning: {
          attr1: 'reasoning for attr1',
        },
        attributes_without_excerpts: ['attr2', 'attr3'],
      }),
    };

    render(<BenchmarkTable benchmarkResults={results} onViewResult={mockOnViewResult} />);

    expect(screen.getByText('E: 1')).toBeInTheDocument();
    expect(screen.getByText('R: 1')).toBeInTheDocument();
    expect(screen.getByText('M: 2')).toBeInTheDocument();
  });

  it('displays "No Data" when performed but no deep-judgment data available', () => {
    const results = {
      q1: createMockResult({
        deep_judgment_enabled: true,
        deep_judgment_performed: true,
        extracted_excerpts: {},
        attribute_reasoning: {},
        attributes_without_excerpts: [],
      }),
    };

    render(<BenchmarkTable benchmarkResults={results} onViewResult={mockOnViewResult} />);

    expect(screen.getByText('No Data')).toBeInTheDocument();
  });

  it('includes Hallucination Risk column header', () => {
    const results = {
      q1: createMockResult(),
    };

    render(<BenchmarkTable benchmarkResults={results} onViewResult={mockOnViewResult} />);

    expect(screen.getByText('Hallucination Risk')).toBeInTheDocument();
  });
});
