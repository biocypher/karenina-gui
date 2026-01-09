/**
 * Rubric types
 * Data structures for rubric trait definitions and evaluation
 */

export type TraitKind = 'boolean' | 'score';

export interface LLMRubricTrait {
  name: string;
  description?: string;
  kind: TraitKind;
  min_score?: number; // For score traits
  max_score?: number; // For score traits
  higher_is_better: boolean; // Whether higher values indicate better performance
  // Deep Judgment fields
  deep_judgment_enabled?: boolean; // Enable deep judgment for this trait (default: false)
  deep_judgment_excerpt_enabled?: boolean; // Extract excerpts from answer (default: true)
  deep_judgment_max_excerpts?: number; // Maximum excerpts to extract (overrides global default)
  deep_judgment_fuzzy_match_threshold?: number; // Fuzzy matching threshold 0.0-1.0 (overrides global default)
  deep_judgment_excerpt_retry_attempts?: number; // Retry attempts for excerpt extraction (overrides global default)
  deep_judgment_search_enabled?: boolean; // Enable search-enhanced hallucination detection (default: false)
}

export interface RegexTrait {
  name: string;
  description?: string;
  pattern: string; // Regex pattern
  case_sensitive?: boolean; // Whether pattern matching should be case sensitive (default: true)
  invert_result?: boolean; // Whether to invert the boolean result (default: false)
  higher_is_better: boolean; // Whether a regex match indicates a positive outcome
}

export interface CallableTrait {
  name: string;
  description?: string;
  callable_code: string; // Base64-encoded callable code (read-only in GUI)
  kind: TraitKind;
  min_score?: number; // For score traits
  max_score?: number; // For score traits
  invert_result?: boolean; // Whether to invert the boolean result (default: false)
  higher_is_better: boolean; // Whether higher return values indicate better performance
}

export interface MetricRubricTrait {
  name: string;
  description?: string;
  evaluation_mode: 'tp_only' | 'full_matrix'; // Evaluation mode: tp_only (only TP defined) or full_matrix (TP+TN defined)
  metrics: string[]; // Available metrics depend on evaluation_mode
  tp_instructions: string[]; // Correct extractions - what SHOULD be in the answer
  tn_instructions: string[]; // Incorrect extractions - what SHOULD NOT be in the answer (only required in full_matrix mode)
  repeated_extraction?: boolean; // Whether to deduplicate excerpts (default: true)
}

export interface Rubric {
  llm_traits: LLMRubricTrait[];
  regex_traits?: RegexTrait[];
  callable_traits?: CallableTrait[];
  metric_traits?: MetricRubricTrait[];
}

export interface RubricEvaluation {
  trait_scores: Record<string, number | boolean>;
}
