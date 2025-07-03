export interface Question {
  question: string;
  raw_answer: string;
  answer_template: string;
}

export interface QuestionData {
  [key: string]: Question;
}

export interface CheckpointItem {
  // Original question data
  question: string;
  raw_answer: string;
  original_answer_template: string;
  
  // Progress data
  answer_template: string;
  last_modified: string;
  finished: boolean;
}

export interface Checkpoint {
  [key: string]: CheckpointItem;
}

// Legacy checkpoint structure for backward compatibility
export interface LegacyCheckpointItem {
  answer_template: string;
  last_modified: string;
  finished: boolean;
}

export interface LegacyCheckpoint {
  [key: string]: LegacyCheckpointItem;
}

// Template Generation Types
export interface TemplateGenerationConfig {
  model_provider: string;
  model_name: string;
  temperature: number;
  interface: 'langchain' | 'openrouter' | 'manual';
}

export interface TemplateGenerationProgress {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  percentage: number;
  current_question: string;
  processed_count: number;
  total_count: number;
  estimated_time_remaining?: number; // in seconds
  error?: string;
  result?: any;
}

export interface GeneratedTemplate {
  question_id: string;
  template_code: string;
  generation_time: number; // milliseconds
  success: boolean;
  error_message?: string;
}

export interface TemplateGenerationResult {
  templates: Record<string, GeneratedTemplate>;
  total_templates: number;
  successful_generations: number;
  failed_generations: number;
  average_generation_time: number;
  model_info: {
    name: string;
    provider: string;
    temperature: number;
  };
}

// Extend Question interface to support template generation metadata
export interface QuestionWithTemplate extends Question {
  answer_template: string;
  generation_metadata?: {
    model_used: string;
    provider_used: string;
    generation_time: number;
    generated_at: string;
  };
}

// Benchmark Configuration Types
export interface ModelConfiguration {
  id: string;
  model_provider: string;
  model_name: string;
  temperature: number;
  interface: 'langchain' | 'openrouter' | 'manual';
  system_prompt: string;
}

export interface VerificationConfig {
  answering_models: ModelConfiguration[];
  parsing_models: ModelConfiguration[];
  replicate_count: number;
  rubric_enabled?: boolean;
  rubric_trait_names?: string[];
}

export interface VerificationResult {
  question_id: string;
  success: boolean;
  error?: string;
  question_text: string;
  raw_llm_response: string;
  parsed_response?: unknown;
  verify_result?: unknown;
  verify_granular_result?: unknown;
  verify_rubric?: Record<string, number | boolean>;
  answering_model: string;
  parsing_model: string;
  execution_time: number;
  timestamp: string;
  answering_system_prompt?: string;
  parsing_system_prompt?: string;
  run_name?: string;
  job_id?: string;
  answering_model_id?: string;
  parsing_model_id?: string;
  answering_replicate?: number;
  parsing_replicate?: number;
}

export interface VerificationProgress {
  job_id: string;
  status: string;
  percentage: number;
  current_question: string;
  processed_count: number;
  total_count: number;
  successful_count: number;
  failed_count: number;
  estimated_time_remaining?: number;
  error?: string;
  results?: Record<string, VerificationResult>;
}

// Rubric Types
export type TraitKind = "boolean" | "score";

export interface RubricTrait {
  name: string;
  description?: string;
  kind: TraitKind;
  min_score?: number; // For score traits
  max_score?: number; // For score traits
}

export interface Rubric {
  traits: RubricTrait[];
}

export interface RubricTraitGenerationRequest {
  questions: QuestionData;
  system_prompt?: string;
  user_suggestions?: string[];
  model_provider?: string;
  model_name?: string;
  temperature?: number;
}

export interface RubricTraitGenerationResponse {
  traits: RubricTrait[];
  job_id?: string;
}

export interface RubricEvaluation {
  trait_scores: Record<string, number | boolean>;
}