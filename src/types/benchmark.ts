/**
 * Benchmark Configuration types
 * Data structures for model configuration and verification settings
 */

import type { AgentMiddlewareConfig } from './agent';

export interface ModelConfiguration {
  id: string;
  model_provider: string;
  model_name: string;
  temperature: number;
  interface: 'langchain' | 'openrouter' | 'manual' | 'openai_endpoint' | 'native_sdk';
  system_prompt: string;
  // MCP (Model Context Protocol) configuration
  mcp_urls_dict?: Record<string, string>;
  mcp_tool_filter?: string[];
  // OpenAI Endpoint configuration
  endpoint_base_url?: string;
  endpoint_api_key?: string;
  // Extra keyword arguments
  extra_kwargs?: Record<string, unknown>;
  // Agent middleware configuration (only used when mcp_urls_dict is provided)
  agent_middleware?: AgentMiddlewareConfig;
  // Maximum context tokens for the model (used for summarization trigger)
  max_context_tokens?: number;
}

export interface VerificationConfig {
  answering_models: ModelConfiguration[];
  parsing_models: ModelConfiguration[];
  replicate_count: number;
  rubric_enabled?: boolean;
  evaluation_mode?: 'template_only' | 'template_and_rubric' | 'rubric_only'; // Evaluation mode selection
  rubric_trait_names?: string[];
  rubric_evaluation_strategy?: 'batch' | 'sequential'; // Strategy for evaluating LLM rubric traits
  abstention_enabled?: boolean; // Enable abstention/refusal detection
  sufficiency_enabled?: boolean; // Enable trace sufficiency detection
  few_shot_enabled?: boolean;
  few_shot_mode?: 'all' | 'k-shot' | 'custom';
  few_shot_k?: number;
}
