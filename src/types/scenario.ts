/**
 * Scenario types
 * Data structures for multi-turn scenario evaluation with branching dialogue paths
 */

import type { VerificationResult } from './verification';

export interface ScenarioNode {
  node_id: string;
  question: {
    question_id: string;
    text: string;
    raw_answer?: string;
  };
  model_override?: {
    answering_model?: Record<string, unknown> | null;
    parsing_model?: Record<string, unknown> | null;
  } | null;
  metadata?: Record<string, unknown>;
  agent_identity?: string | null;
}

export interface ScenarioEdge {
  source: string;
  target: string; // node_id or "__end__"
  condition?: Record<string, unknown> | null;
  condition_source?: string | null;
  handover?: string | null;
}

export interface ScenarioOutcomeCriterion {
  name: string;
  description: string;
  check?: Record<string, unknown> | null;
  evaluate_source?: string | null;
}

export interface ScenarioDefinition {
  name: string;
  description: string;
  nodes: Record<string, ScenarioNode>;
  edges: ScenarioEdge[];
  entry_node: string;
  outcome_criteria: ScenarioOutcomeCriterion[];
  metadata?: Record<string, unknown>;
}

export interface TurnRecord {
  node_id: string;
  question_text: string;
  question_messages: Record<string, unknown>[];
  trace_messages: Record<string, unknown>[];
  raw_response: string;
  parsed_fields: Record<string, unknown>;
  verify_result: boolean | null;
  verification_result_id: string | null;
}

export type ScenarioStatus = 'completed' | 'limit_reached' | 'error' | 'timeout';

export interface ScenarioExecutionResult {
  scenario_id: string;
  status: ScenarioStatus;
  path: string[];
  turn_count: number;
  history: TurnRecord[];
  turn_results: VerificationResult[];
  final_state: {
    turn: number;
    current_node: string;
    verify_result: boolean | null;
    parsed: Record<string, unknown>;
    node_visits: Record<string, number>;
    accumulated: Record<string, unknown>;
    node_results: Record<string, Record<string, unknown>>;
  };
  outcome_results: Record<string, boolean | number>;
}
