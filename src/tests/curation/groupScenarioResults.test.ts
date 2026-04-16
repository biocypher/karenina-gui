import { describe, it, expect } from 'vitest';
import { groupScenarioResults } from '../../utils/curation/groupScenarioResults';
import type { VerificationResult } from '../../types/verification';

/**
 * Minimal valid VerificationResult stub that passes validateResultStructure.
 * Contains the required metadata fields: question_id, question_text,
 * answering.{model_name, interface}, parsing.{model_name, interface}.
 */
function makeResult(
  overrides: Partial<VerificationResult['metadata']> & {
    template?: Partial<VerificationResult['template']>;
  } = {}
): VerificationResult {
  const { template: templateOverrides, ...metadataOverrides } = overrides;
  return {
    metadata: {
      question_id: 'q1',
      template_id: 'tpl1',
      failure: null,
      caveats: [],
      question_text: 'What is 2+2?',
      answering: {
        model_name: 'claude-3-opus',
        interface: 'claude_sdk',
        tools: [],
      },
      parsing: {
        model_name: 'claude-3-haiku',
        interface: 'claude_sdk',
        tools: [],
      },
      execution_time: 1.0,
      timestamp: '2026-04-13T00:00:00Z',
      ...metadataOverrides,
    },
    template: templateOverrides ? { raw_llm_response: '', ...templateOverrides } : undefined,
  } as VerificationResult;
}

describe('groupScenarioResults', () => {
  it('returns all results as standalone when none have scenario_id', () => {
    const results = [makeResult({ question_id: 'q1' }), makeResult({ question_id: 'q2' })];

    const { standaloneResults, scenarioResults } = groupScenarioResults(results);

    expect(standaloneResults).toHaveLength(2);
    expect(scenarioResults).toHaveLength(0);
  });

  it('returns all as scenarios when all have scenario_id (standaloneResults empty)', () => {
    const results = [
      makeResult({ question_id: 'q1', scenario_id: 's1', scenario_node: 'n1', scenario_turn: 0 }),
      makeResult({ question_id: 'q2', scenario_id: 's1', scenario_node: 'n2', scenario_turn: 1 }),
    ];

    const { standaloneResults, scenarioResults } = groupScenarioResults(results);

    expect(standaloneResults).toHaveLength(0);
    expect(scenarioResults).toHaveLength(1);
    expect(scenarioResults[0].scenario_id).toBe('s1');
  });

  it('splits correctly between standalone and scenario-linked (mixed)', () => {
    const results = [
      makeResult({ question_id: 'q1' }),
      makeResult({ question_id: 'q2', scenario_id: 's1', scenario_node: 'n1', scenario_turn: 0 }),
      makeResult({ question_id: 'q3' }),
      makeResult({ question_id: 'q4', scenario_id: 's1', scenario_node: 'n2', scenario_turn: 1 }),
    ];

    const { standaloneResults, scenarioResults } = groupScenarioResults(results);

    expect(standaloneResults).toHaveLength(2);
    expect(standaloneResults.map((r) => r.metadata.question_id)).toEqual(['q1', 'q3']);
    expect(scenarioResults).toHaveLength(1);
    expect(scenarioResults[0].turn_count).toBe(2);
  });

  it('groups by scenario_id correctly (multiple distinct scenarios)', () => {
    const results = [
      makeResult({ question_id: 'q1', scenario_id: 'sA', scenario_node: 'n1', scenario_turn: 0 }),
      makeResult({ question_id: 'q2', scenario_id: 'sB', scenario_node: 'n1', scenario_turn: 0 }),
      makeResult({ question_id: 'q3', scenario_id: 'sA', scenario_node: 'n2', scenario_turn: 1 }),
    ];

    const { scenarioResults } = groupScenarioResults(results);

    expect(scenarioResults).toHaveLength(2);
    const ids = scenarioResults.map((s) => s.scenario_id).sort();
    expect(ids).toEqual(['sA', 'sB']);

    const sA = scenarioResults.find((s) => s.scenario_id === 'sA')!;
    expect(sA.turn_count).toBe(2);

    const sB = scenarioResults.find((s) => s.scenario_id === 'sB')!;
    expect(sB.turn_count).toBe(1);
  });

  it('sorts turns within each scenario by scenario_turn ascending', () => {
    const results = [
      makeResult({ question_id: 'q3', scenario_id: 's1', scenario_node: 'n3', scenario_turn: 2 }),
      makeResult({ question_id: 'q1', scenario_id: 's1', scenario_node: 'n1', scenario_turn: 0 }),
      makeResult({ question_id: 'q2', scenario_id: 's1', scenario_node: 'n2', scenario_turn: 1 }),
    ];

    const { scenarioResults } = groupScenarioResults(results);
    const turns = scenarioResults[0].turn_results;

    expect(turns[0].metadata.question_id).toBe('q1');
    expect(turns[1].metadata.question_id).toBe('q2');
    expect(turns[2].metadata.question_id).toBe('q3');
  });

  it('derives path from last turn metadata.scenario_path', () => {
    const results = [
      makeResult({ question_id: 'q1', scenario_id: 's1', scenario_node: 'n1', scenario_turn: 0 }),
      makeResult({
        question_id: 'q2',
        scenario_id: 's1',
        scenario_node: 'n2',
        scenario_turn: 1,
        scenario_path: ['n1', 'n2'],
      }),
    ];

    const { scenarioResults } = groupScenarioResults(results);
    expect(scenarioResults[0].path).toEqual(['n1', 'n2']);
  });

  it('falls back to ordered scenario_node values when scenario_path is absent', () => {
    const results = [
      makeResult({ question_id: 'q1', scenario_id: 's1', scenario_node: 'n1', scenario_turn: 0 }),
      makeResult({ question_id: 'q2', scenario_id: 's1', scenario_node: 'n2', scenario_turn: 1 }),
      makeResult({ question_id: 'q3', scenario_id: 's1', scenario_node: 'n1', scenario_turn: 2 }),
    ];

    const { scenarioResults } = groupScenarioResults(results);
    // Unique ordered nodes: n1, n2 (n1 appears again but already seen)
    expect(scenarioResults[0].path).toEqual(['n1', 'n2']);
  });

  it('falls back to ordered scenario_node values when scenario_path is empty array', () => {
    const results = [
      makeResult({
        question_id: 'q1',
        scenario_id: 's1',
        scenario_node: 'n1',
        scenario_turn: 0,
        scenario_path: [],
      }),
      makeResult({
        question_id: 'q2',
        scenario_id: 's1',
        scenario_node: 'n2',
        scenario_turn: 1,
        scenario_path: [],
      }),
    ];

    const { scenarioResults } = groupScenarioResults(results);
    expect(scenarioResults[0].path).toEqual(['n1', 'n2']);
  });

  it('constructs history TurnRecords with correct field mapping', () => {
    const results = [
      makeResult({
        question_id: 'q1',
        scenario_id: 's1',
        scenario_node: 'node_a',
        scenario_turn: 0,
        question_text: 'Hello?',
        raw_answer: 'ground truth',
        result_id: 'rid1',
        template: {
          raw_llm_response: 'Hi there!',
          parsed_llm_response: { greeting: 'Hi there!' },
          verify_result: true,
        },
      }),
    ];

    const { scenarioResults } = groupScenarioResults(results);
    const turn = scenarioResults[0].history[0];

    expect(turn.node_id).toBe('node_a');
    expect(turn.question_text).toBe('Hello?');
    expect(turn.raw_response).toBe('Hi there!');
    expect(turn.parsed_fields).toEqual({ greeting: 'Hi there!' });
    expect(turn.verify_result).toBe(true);
    expect(turn.verification_result_id).toBe('rid1');
    expect(turn.question_messages).toEqual([]);
    expect(turn.trace_messages).toEqual([]);
  });

  it('sets turn_count correctly', () => {
    const results = [
      makeResult({ question_id: 'q1', scenario_id: 's1', scenario_node: 'n1', scenario_turn: 0 }),
      makeResult({ question_id: 'q2', scenario_id: 's1', scenario_node: 'n2', scenario_turn: 1 }),
      makeResult({ question_id: 'q3', scenario_id: 's1', scenario_node: 'n3', scenario_turn: 2 }),
    ];

    const { scenarioResults } = groupScenarioResults(results);
    expect(scenarioResults[0].turn_count).toBe(3);
  });

  it('single-turn scenario works (turn_count 1)', () => {
    const results = [
      makeResult({
        question_id: 'q1',
        scenario_id: 's1',
        scenario_node: 'only_node',
        scenario_turn: 0,
        template: { raw_llm_response: 'response', verify_result: false },
      }),
    ];

    const { scenarioResults } = groupScenarioResults(results);

    expect(scenarioResults).toHaveLength(1);
    expect(scenarioResults[0].turn_count).toBe(1);
    expect(scenarioResults[0].history).toHaveLength(1);
    expect(scenarioResults[0].final_state.turn).toBe(0);
    expect(scenarioResults[0].final_state.current_node).toBe('only_node');
    expect(scenarioResults[0].final_state.verify_result).toBe(false);
  });

  it('handles results with scenario_id but missing scenario_node/scenario_turn gracefully', () => {
    const results = [
      makeResult({ question_id: 'q1', scenario_id: 's1' }),
      makeResult({ question_id: 'q2', scenario_id: 's1', scenario_turn: 1, scenario_node: 'n2' }),
    ];

    const { standaloneResults, scenarioResults } = groupScenarioResults(results);

    expect(standaloneResults).toHaveLength(0);
    expect(scenarioResults).toHaveLength(1);
    expect(scenarioResults[0].turn_count).toBe(2);

    // Missing scenario_turn treated as 0, so q1 comes first
    expect(scenarioResults[0].turn_results[0].metadata.question_id).toBe('q1');
    // Missing scenario_node falls back to empty string
    expect(scenarioResults[0].history[0].node_id).toBe('');
    expect(scenarioResults[0].final_state.current_node).toBe('n2');
  });

  it('populates final_state correctly from the last turn', () => {
    const results = [
      makeResult({
        question_id: 'q1',
        scenario_id: 's1',
        scenario_node: 'n1',
        scenario_turn: 0,
        template: { raw_llm_response: 'r1', verify_result: true },
      }),
      makeResult({
        question_id: 'q2',
        scenario_id: 's1',
        scenario_node: 'n2',
        scenario_turn: 1,
        template: {
          raw_llm_response: 'r2',
          parsed_llm_response: { answer: 42 },
          verify_result: false,
        },
      }),
    ];

    const { scenarioResults } = groupScenarioResults(results);
    const fs = scenarioResults[0].final_state;

    expect(fs.turn).toBe(1);
    expect(fs.current_node).toBe('n2');
    expect(fs.verify_result).toBe(false);
    expect(fs.parsed).toEqual({ answer: 42 });
    expect(fs.node_visits).toEqual({ n1: 1, n2: 1 });
    expect(fs.accumulated).toEqual({});
    expect(fs.node_results).toEqual({});
  });

  it('counts node_visits correctly when a node is visited multiple times', () => {
    const results = [
      makeResult({ question_id: 'q1', scenario_id: 's1', scenario_node: 'n1', scenario_turn: 0 }),
      makeResult({ question_id: 'q2', scenario_id: 's1', scenario_node: 'n2', scenario_turn: 1 }),
      makeResult({ question_id: 'q3', scenario_id: 's1', scenario_node: 'n1', scenario_turn: 2 }),
    ];

    const { scenarioResults } = groupScenarioResults(results);
    expect(scenarioResults[0].final_state.node_visits).toEqual({ n1: 2, n2: 1 });
  });

  it('falls back to template_id for verification_result_id when result_id is absent', () => {
    const results = [
      makeResult({
        question_id: 'q1',
        scenario_id: 's1',
        scenario_node: 'n1',
        scenario_turn: 0,
        template_id: 'tpl_xyz',
      }),
    ];
    // Ensure result_id is not set
    delete results[0].metadata.result_id;

    const { scenarioResults } = groupScenarioResults(results);
    expect(scenarioResults[0].history[0].verification_result_id).toBe('tpl_xyz');
  });

  it('returns empty arrays when given empty input', () => {
    const { standaloneResults, scenarioResults } = groupScenarioResults([]);
    expect(standaloneResults).toEqual([]);
    expect(scenarioResults).toEqual([]);
  });

  it('populates outcome_results from the outcomes map when provided', () => {
    const results = [
      makeResult({ question_id: 'q1', scenario_id: 'sA', scenario_node: 'n1', scenario_turn: 0 }),
      makeResult({ question_id: 'q2', scenario_id: 'sB', scenario_node: 'n1', scenario_turn: 0 }),
    ];
    const outcomes = {
      sA: { initial_correct: true, resists_sycophancy: false },
      sB: { initial_correct: false },
    };

    const { scenarioResults } = groupScenarioResults(results, outcomes);

    const sA = scenarioResults.find((s) => s.scenario_id === 'sA')!;
    const sB = scenarioResults.find((s) => s.scenario_id === 'sB')!;
    expect(sA.outcome_results).toEqual({ initial_correct: true, resists_sycophancy: false });
    expect(sB.outcome_results).toEqual({ initial_correct: false });
  });

  it('defaults outcome_results to empty object when outcomes map is omitted', () => {
    const results = [makeResult({ question_id: 'q1', scenario_id: 's1', scenario_node: 'n1', scenario_turn: 0 })];

    const { scenarioResults } = groupScenarioResults(results);

    expect(scenarioResults[0].outcome_results).toEqual({});
  });

  it('defaults outcome_results to empty object when scenario has no entry in the map', () => {
    const results = [makeResult({ question_id: 'q1', scenario_id: 's1', scenario_node: 'n1', scenario_turn: 0 })];

    const { scenarioResults } = groupScenarioResults(results, { other: { x: true } });

    expect(scenarioResults[0].outcome_results).toEqual({});
  });
});
