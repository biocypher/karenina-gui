import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VerificationResultDetailModal } from '../VerificationResultDetailModal';
import { VerificationResult, Checkpoint, Rubric } from '../../../types';

describe('VerificationResultDetailModal', () => {
  const mockCheckpoint: Checkpoint = {
    q1: {
      question: 'Test question',
      raw_answer: 'Expected raw answer',
      original_answer_template: 'template',
      finished: true,
    },
  };

  const mockRubric: Rubric = {
    traits: [],
    description: 'Test rubric',
  };

  const mockOnClose = vi.fn();

  const createMockResult = (overrides: Partial<VerificationResult> = {}): VerificationResult => ({
    question_id: 'q1',
    question_text: 'Test question',
    parsed_gt_response: { answer: 'ground truth' },
    parsed_llm_response: { answer: 'llm response' },
    raw_llm_response: 'raw response text',
    keywords: ['test', 'keyword'],
    answering_model: 'gpt-4',
    parsing_model: 'gpt-4',
    answering_mcp_servers: [],
    completed_without_errors: true,
    verify_result: true,
    verify_granular_result: {},
    verify_rubric: null,
    execution_time: 1.23,
    timestamp: new Date().toISOString(),
    run_name: 'test-run',
    replicate: 1,
    deep_judgment_enabled: false,
    deep_judgment_performed: false,
    ...overrides,
  });

  it('returns null when result is null', () => {
    const { container } = render(
      <VerificationResultDetailModal
        result={null}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with basic result information', () => {
    const result = createMockResult();
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Detailed Answering Trace')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Test question')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const result = createMockResult();
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when ESC key is pressed', () => {
    const result = createMockResult();
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays error message when success is false', () => {
    const result = createMockResult({
      completed_without_errors: false,
      error: 'Test error message',
    });
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('displays raw answer from checkpoint', () => {
    const result = createMockResult();
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Raw Answer (Expected)')).toBeInTheDocument();
    expect(screen.getByText('Expected raw answer')).toBeInTheDocument();
  });

  it('displays ground truth and LLM extraction when available', () => {
    const result = createMockResult({
      parsed_gt_response: { answer: 'expected answer' },
      parsed_llm_response: { answer: 'llm answer' },
    });
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Ground Truth (Expected)')).toBeInTheDocument();
    expect(screen.getByText('LLM Extraction (Generated)')).toBeInTheDocument();
  });

  it('displays regex validation details when available', () => {
    const result = createMockResult({
      regex_validation_details: {
        field1: {
          pattern: 'test-pattern',
          expected: 'test-value',
          match_type: 'exact',
        },
      },
    });
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Regex Ground Truth (Expected)')).toBeInTheDocument();
  });

  it('displays embedding check results when performed', () => {
    const result = createMockResult({
      embedding_check_performed: true,
      embedding_similarity_score: 0.95,
      embedding_model_used: 'text-embedding-3-small',
    });
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Embedding Check Results')).toBeInTheDocument();
    expect(screen.getByText('Similarity Score:')).toBeInTheDocument();
    expect(screen.getByText('0.950')).toBeInTheDocument();
    expect(screen.getByText('text-embedding-3-small')).toBeInTheDocument();
  });

  it('displays embedding override message when applied', () => {
    const result = createMockResult({
      embedding_check_performed: true,
      embedding_override_applied: true,
      embedding_similarity_score: 0.85,
    });
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Verification Overridden by Semantic Check')).toBeInTheDocument();
  });

  it('displays abstention detection results when performed', () => {
    const result = createMockResult({
      abstention_check_performed: true,
      abstention_detected: true,
      abstention_override_applied: true,
      abstention_reasoning: 'Model refused to answer',
    });
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Abstention Detection Results')).toBeInTheDocument();
    expect(screen.getByText('Result Overridden by Abstention Detection')).toBeInTheDocument();
    expect(screen.getByText('Model refused to answer')).toBeInTheDocument();
  });

  it('displays deep-judgment summary statistics when performed', () => {
    const result = createMockResult({
      deep_judgment_performed: true,
      deep_judgment_stages_completed: ['excerpt_extraction', 'reasoning'],
      deep_judgment_model_calls: 5,
      deep_judgment_excerpt_retry_count: 2,
    });
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Deep-Judgment Results')).toBeInTheDocument();
    expect(screen.getByText('Stages Completed:')).toBeInTheDocument();
    expect(screen.getByText('excerpt_extraction, reasoning')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays extracted excerpts with hallucination risk', () => {
    const result = createMockResult({
      deep_judgment_performed: true,
      extracted_excerpts: {
        attribute1: [
          {
            text: 'Test excerpt',
            confidence: 'high',
            similarity_score: 0.95,
          },
        ],
      },
      hallucination_risk_assessment: {
        attribute1: 'low',
      },
    });
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Extracted Excerpts:')).toBeInTheDocument();
    expect(screen.getByText('attribute1')).toBeInTheDocument();
    expect(screen.getByText('"Test excerpt"')).toBeInTheDocument();
    expect(screen.getByText('Max Hallucination Risk: LOW')).toBeInTheDocument();
  });

  it('displays excerpts with missing explanation', () => {
    const result = createMockResult({
      deep_judgment_performed: true,
      extracted_excerpts: {
        attribute1: [
          {
            explanation: 'No matching text found in response',
          },
        ],
      },
    });
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('No excerpt found')).toBeInTheDocument();
    expect(screen.getByText('No matching text found in response')).toBeInTheDocument();
  });

  it('displays attribute reasoning when available', () => {
    const result = createMockResult({
      deep_judgment_performed: true,
      attribute_reasoning: {
        attribute1: 'This is the reasoning for attribute1',
        attribute2: 'This is the reasoning for attribute2',
      },
    });
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Attribute Reasoning:')).toBeInTheDocument();
    expect(screen.getByText('This is the reasoning for attribute1')).toBeInTheDocument();
    expect(screen.getByText('This is the reasoning for attribute2')).toBeInTheDocument();
  });

  it('displays attributes without excerpts warning', () => {
    const result = createMockResult({
      deep_judgment_performed: true,
      attributes_without_excerpts: ['attr1', 'attr2', 'attr3'],
    });
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Attributes Without Excerpts')).toBeInTheDocument();
    expect(screen.getByText('attr1')).toBeInTheDocument();
    expect(screen.getByText('attr2')).toBeInTheDocument();
    expect(screen.getByText('attr3')).toBeInTheDocument();
  });

  it('displays system prompts when available', () => {
    const result = createMockResult({
      answering_system_prompt: 'Answering system prompt text',
      parsing_system_prompt: 'Parsing system prompt text',
    });
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('System Prompts Used')).toBeInTheDocument();
    expect(screen.getByText('Answering Model System Prompt:')).toBeInTheDocument();
    expect(screen.getByText('Parsing Model System Prompt:')).toBeInTheDocument();
    expect(screen.getByText('Answering system prompt text')).toBeInTheDocument();
    expect(screen.getByText('Parsing system prompt text')).toBeInTheDocument();
  });

  it('displays metadata section with all fields', () => {
    const result = createMockResult({
      answering_model: 'gpt-4-turbo',
      parsing_model: 'gpt-4-mini',
      execution_time: 2.45,
      timestamp: '2025-01-15T10:30:00Z',
      answering_mcp_servers: ['filesystem', 'web-search'],
    });
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByText('gpt-4-turbo')).toBeInTheDocument();
    expect(screen.getByText('gpt-4-mini')).toBeInTheDocument();
    expect(screen.getByText('2.45s')).toBeInTheDocument();
    expect(screen.getByText('filesystem, web-search')).toBeInTheDocument();
  });

  it('renders without errors even with invalid data', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create a result with potentially problematic data
    const result = createMockResult({
      parsed_gt_response: undefined,
      parsed_llm_response: null,
      regex_validation_details: undefined,
    });

    const { container } = render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    // Modal should still render successfully
    expect(screen.getByText('Detailed Answering Trace')).toBeInTheDocument();
    expect(container.querySelector('.text-red-500')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('displays hallucination risk levels with correct styling', () => {
    const result = createMockResult({
      deep_judgment_performed: true,
      extracted_excerpts: {
        high_risk: [{ text: 'excerpt', confidence: 'high', similarity_score: 1 }],
        medium_risk: [{ text: 'excerpt', confidence: 'medium', similarity_score: 1 }],
        low_risk: [{ text: 'excerpt', confidence: 'low', similarity_score: 1 }],
        no_risk: [{ text: 'excerpt', confidence: 'high', similarity_score: 1 }],
      },
      hallucination_risk_assessment: {
        high_risk: 'high',
        medium_risk: 'medium',
        low_risk: 'low',
        no_risk: 'none',
      },
    });
    render(
      <VerificationResultDetailModal
        result={result}
        checkpoint={mockCheckpoint}
        currentRubric={mockRubric}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Max Hallucination Risk: HIGH')).toBeInTheDocument();
    expect(screen.getByText('Max Hallucination Risk: MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('Max Hallucination Risk: LOW')).toBeInTheDocument();
    expect(screen.getByText('Max Hallucination Risk: NONE')).toBeInTheDocument();
  });
});
