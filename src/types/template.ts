/**
 * Template Generation types
 * Data structures for LLM-based answer template generation
 */

export interface TemplateGenerationConfig {
  model_provider: string;
  model_name: string;
  temperature: number;
  interface: 'langchain' | 'openrouter' | 'manual' | 'openai_endpoint' | 'native_sdk';
  endpoint_base_url?: string;
  endpoint_api_key?: string;
}

export interface TemplateGenerationProgress {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  percentage: number;
  current_question: string;
  processed_count: number;
  total_count: number;
  start_time?: number; // Unix timestamp for client-side live clock calculation
  duration_seconds?: number;
  last_task_duration?: number;
  error?: string;
  result?: TemplateGenerationResult;
  in_progress_questions?: string[];
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
export interface QuestionWithTemplate {
  question: string;
  raw_answer: string;
  answer_template: string;
  metadata?: {
    author?: import('./index').SchemaOrgPerson;
    url?: string;
    keywords?: string[];
  };
  generation_metadata?: {
    model_used: string;
    provider_used: string;
    generation_time: number;
    generated_at: string;
  };
}
