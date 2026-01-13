/**
 * Model Comparison types
 * Data structures for model comparison and visualization
 */

export interface ModelConfig {
  answering_model: string;
  mcp_config: string;
}

export interface HeatmapCell {
  replicate?: number;
  passed: boolean | null;
  score: number | null;
  abstained: boolean;
  error: boolean;
  execution_type?: string;
  input_tokens?: number;
  output_tokens?: number;
  iterations?: number;
  // Rubric trait scores for badge overlays
  rubric_scores?: {
    llm?: Record<string, number | boolean>; // LLM traits can be score (1-5) OR boolean
    regex?: Record<string, boolean>; // Regex traits are always boolean
    callable?: Record<string, boolean | number>; // Callable traits can be boolean or score
  };
}

export interface HeatmapModelReplicates {
  replicates: HeatmapCell[];
}

export interface HeatmapQuestion {
  question_id: string;
  question_text: string;
  keywords?: string[];
  results_by_model: Record<string, HeatmapModelReplicates>;
}

export interface ModelComparisonRequest {
  results: Record<string, import('./verification').VerificationResult>;
  models: ModelConfig[];
  parsing_model: string;
}

// Per-question token data for bar charts
export interface QuestionTokenModelData {
  model_key: string;
  model_display_name: string;
  input_tokens_median: number;
  input_tokens_std: number;
  output_tokens_median: number;
  output_tokens_std: number;
}

export interface QuestionTokenData {
  question_id: string;
  question_text: string;
  models: QuestionTokenModelData[];
}

export interface ModelComparisonResponse {
  model_summaries: Record<string, import('./summary').SummaryStats>;
  heatmap_data: HeatmapQuestion[];
  question_token_data: QuestionTokenData[];
}

// Rubric Badge Overlay Types
export interface TraitLetterAssignment {
  traitName: string;
  traitType: 'llm' | 'regex' | 'callable';
  kind: 'boolean' | 'score';
  letters: string; // 1-2 characters, e.g., "A" or "AB"
}

export type TraitLetterMap = Record<string, TraitLetterAssignment>;

// Visibility filter for rubric badges on heatmap
export type BadgeVisibilityFilter = 'all' | 'passed' | 'failed' | 'hidden';
