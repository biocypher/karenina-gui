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
    completed_without_errors: true,
    verify_result: { completed_without_errors: true },
    verify_granular_result: { score: 1.0 },
    verify_rubric: undefined,
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

  it('displays "None" when deep-judgment performed without search enhancement', () => {
    const results = {
      q1: createMockResult({
        deep_judgment_enabled: true,
        deep_judgment_performed: true,
        deep_judgment_search_enabled: false,
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

    // Should show "None" since search enhancement is disabled
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('displays risk level when search enhancement enabled', () => {
    const results = {
      q1: createMockResult({
        deep_judgment_enabled: true,
        deep_judgment_performed: true,
        deep_judgment_search_enabled: true,
        extracted_excerpts: {
          attr1: [{ text: 'excerpt 1', confidence: 'high', similarity_score: 0.95 }],
        },
        attribute_reasoning: {
          attr1: 'reasoning for attr1',
        },
        hallucination_risk_assessment: {
          attr1: 'low',
        },
      }),
    };

    render(<BenchmarkTable benchmarkResults={results} onViewResult={mockOnViewResult} />);

    expect(screen.getByText('LOW')).toBeInTheDocument();
  });

  it('displays highest risk level when multiple attributes assessed', () => {
    const results = {
      q1: createMockResult({
        deep_judgment_enabled: true,
        deep_judgment_performed: true,
        deep_judgment_search_enabled: true,
        extracted_excerpts: {
          attr1: [{ text: 'excerpt 1', confidence: 'high', similarity_score: 0.95 }],
          attr2: [{ text: 'excerpt 2', confidence: 'medium', similarity_score: 0.85 }],
          attr3: [{ text: 'excerpt 3', confidence: 'high', similarity_score: 0.9 }],
        },
        hallucination_risk_assessment: {
          attr1: 'low',
          attr2: 'high',
          attr3: 'medium',
        },
      }),
    };

    render(<BenchmarkTable benchmarkResults={results} onViewResult={mockOnViewResult} />);

    // Should show highest risk level
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('includes Hallucination Risk column header', () => {
    const results = {
      q1: createMockResult(),
    };

    render(<BenchmarkTable benchmarkResults={results} onViewResult={mockOnViewResult} />);

    expect(screen.getByText('Hallucination Risk')).toBeInTheDocument();
  });
});
