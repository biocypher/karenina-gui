import { describe, it, expect } from 'vitest';
import { parseVerificationResultsJSON, ImportValidationError } from '../../utils/import';

/**
 * Minimal valid VerificationResult stub that passes validateResultStructure.
 * Contains the required metadata fields: question_id, question_text,
 * answering.{model_name, interface}, parsing.{model_name, interface}.
 */
function makeResult(
  overrides: {
    question_id?: string;
    question_text?: string;
    answering_model?: string;
    answering_interface?: string;
    parsing_model?: string;
    parsing_interface?: string;
  } = {}
) {
  return {
    metadata: {
      question_id: overrides.question_id ?? 'q1',
      question_text: overrides.question_text ?? 'What is 2+2?',
      answering: {
        model_name: overrides.answering_model ?? 'claude-3-opus',
        interface: overrides.answering_interface ?? 'claude_sdk',
      },
      parsing: {
        model_name: overrides.parsing_model ?? 'claude-3-haiku',
        interface: overrides.parsing_interface ?? 'claude_sdk',
      },
    },
  };
}

describe('parseVerificationResultsJSON - runs format', () => {
  it('parses a single run with one result', () => {
    const input = JSON.stringify({
      runs: {
        run_alpha: [makeResult({ question_id: 'q1' })],
      },
    });

    const parsed = parseVerificationResultsJSON(input);
    expect(parsed.stats.totalResults).toBe(1);
    expect(parsed.stats.questions.has('q1')).toBe(true);
  });

  it('flattens multiple runs into a single results array', () => {
    const input = JSON.stringify({
      runs: {
        baseline: [
          makeResult({ question_id: 'q1', answering_model: 'model-a' }),
          makeResult({ question_id: 'q2', answering_model: 'model-a' }),
        ],
        experimental: [makeResult({ question_id: 'q1', answering_model: 'model-b' })],
      },
    });

    const parsed = parseVerificationResultsJSON(input);
    expect(parsed.stats.totalResults).toBe(3);
    expect(parsed.stats.questions).toEqual(new Set(['q1', 'q2']));
    expect(parsed.stats.models.size).toBe(2);
  });

  it('synthesizes metadata with run names', () => {
    const input = JSON.stringify({
      runs: {
        alpha: [makeResult()],
        beta: [makeResult()],
      },
    });

    const parsed = parseVerificationResultsJSON(input);
    expect(parsed.metadata).toBeDefined();
    expect(parsed.metadata!.job_id).toContain('alpha');
    expect(parsed.metadata!.job_id).toContain('beta');
  });

  it('throws ImportValidationError when all runs are empty arrays', () => {
    const input = JSON.stringify({
      runs: {
        empty_run: [],
        also_empty: [],
      },
    });

    expect(() => parseVerificationResultsJSON(input)).toThrow(ImportValidationError);
    expect(() => parseVerificationResultsJSON(input)).toThrow('No results found');
  });

  it('throws ImportValidationError when runs object is empty', () => {
    const input = JSON.stringify({ runs: {} });

    expect(() => parseVerificationResultsJSON(input)).toThrow(ImportValidationError);
    expect(() => parseVerificationResultsJSON(input)).toThrow('No results found');
  });

  it('throws ImportValidationError for invalid result within a run', () => {
    const input = JSON.stringify({
      runs: {
        bad_run: [{ metadata: { question_id: 'q1' } }], // missing required fields
      },
    });

    expect(() => parseVerificationResultsJSON(input)).toThrow(ImportValidationError);
    expect(() => parseVerificationResultsJSON(input)).toThrow('Invalid result structure');
  });

  it('throws ImportValidationError when a run value is not an array', () => {
    const input = JSON.stringify({
      runs: {
        bad_run: 'not an array',
      },
    });

    expect(() => parseVerificationResultsJSON(input)).toThrow(ImportValidationError);
    expect(() => parseVerificationResultsJSON(input)).toThrow('must be an array');
  });

  it('does not interfere with unified format that has metadata+results keys', () => {
    // A file with both metadata and results should be detected as unified format,
    // not as runs format, even if it also happened to have a runs key.
    const input = JSON.stringify({
      metadata: { job_id: 'test-job' },
      results: [makeResult()],
    });

    const parsed = parseVerificationResultsJSON(input);
    // Should successfully parse (unified format detection is before runs)
    expect(parsed.stats.totalResults).toBe(1);
    expect(parsed.metadata).toEqual({ job_id: 'test-job' });
  });

  it('collects results keyed by generated IDs', () => {
    const input = JSON.stringify({
      runs: {
        single_run: [makeResult({ question_id: 'q1' }), makeResult({ question_id: 'q2' })],
      },
    });

    const parsed = parseVerificationResultsJSON(input);
    const resultKeys = Object.keys(parsed.results);
    expect(resultKeys).toHaveLength(2);
    // Each key should contain the question_id
    expect(resultKeys.some((k) => k.includes('q1'))).toBe(true);
    expect(resultKeys.some((k) => k.includes('q2'))).toBe(true);
  });

  it('extracts scenario_outcomes when present in runs format', () => {
    const input = JSON.stringify({
      runs: {
        adversarial: [makeResult({ question_id: 'q1' })],
      },
      scenario_outcomes: {
        adversarial: {
          scn_001: { initial_correct: true, resists_sycophancy: false },
          scn_002: { initial_correct: false },
        },
      },
    });

    const parsed = parseVerificationResultsJSON(input);

    expect(parsed.scenarioOutcomes).toEqual({
      scn_001: { initial_correct: true, resists_sycophancy: false },
      scn_002: { initial_correct: false },
    });
  });

  it('flattens scenario_outcomes across multiple runs (last-write-wins)', () => {
    const input = JSON.stringify({
      runs: {
        baseline: [makeResult({ question_id: 'q1' })],
        experimental: [makeResult({ question_id: 'q2' })],
      },
      scenario_outcomes: {
        baseline: { scn_shared: { initial_correct: false } },
        experimental: { scn_shared: { initial_correct: true } },
      },
    });

    const parsed = parseVerificationResultsJSON(input);

    expect(parsed.scenarioOutcomes).toBeDefined();
    expect(parsed.scenarioOutcomes!.scn_shared).toEqual({ initial_correct: true });
  });

  it('omits scenarioOutcomes when scenario_outcomes is absent', () => {
    const input = JSON.stringify({
      runs: {
        only_run: [makeResult({ question_id: 'q1' })],
      },
    });

    const parsed = parseVerificationResultsJSON(input);

    expect(parsed.scenarioOutcomes).toBeUndefined();
  });

  it('filters non-boolean/non-number values out of scenario_outcomes', () => {
    const input = JSON.stringify({
      runs: {
        run_a: [makeResult({ question_id: 'q1' })],
      },
      scenario_outcomes: {
        run_a: {
          scn_001: {
            initial_correct: true,
            raw_note: 'not serializable here',
            scoring: 3,
          },
        },
      },
    });

    const parsed = parseVerificationResultsJSON(input);

    expect(parsed.scenarioOutcomes!.scn_001).toEqual({ initial_correct: true, scoring: 3 });
  });
});
