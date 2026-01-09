/**
 * Model Configuration Utilities
 * Helper functions for sanitizing and converting model configurations
 */

import type { ModelConfiguration } from '../types';

/**
 * Sanitizes a ModelConfiguration by removing empty/undefined optional fields
 * and ensuring only relevant fields are included based on the interface type.
 */
export function sanitizeModelConfig(model: ModelConfiguration): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    id: model.id,
    model_provider: model.model_provider,
    model_name: model.model_name,
    temperature: model.temperature,
    interface: model.interface,
    system_prompt: model.system_prompt,
  };

  // Only include max_retries if it's set
  if (model.max_retries !== undefined) {
    sanitized.max_retries = model.max_retries;
  }

  // Only include endpoint fields for openai_endpoint interface
  if (model.interface === 'openai_endpoint') {
    if (model.endpoint_base_url) {
      sanitized.endpoint_base_url = model.endpoint_base_url;
    }
    if (model.endpoint_api_key) {
      sanitized.endpoint_api_key = model.endpoint_api_key;
    }
  }

  // Only include MCP fields if they have values
  if (model.mcp_urls_dict && Object.keys(model.mcp_urls_dict).length > 0) {
    sanitized.mcp_urls_dict = model.mcp_urls_dict;
  }
  if (model.mcp_tool_filter && model.mcp_tool_filter.length > 0) {
    sanitized.mcp_tool_filter = model.mcp_tool_filter;
  }

  // Only include extra_kwargs if it has values
  if (model.extra_kwargs && Object.keys(model.extra_kwargs).length > 0) {
    sanitized.extra_kwargs = model.extra_kwargs;
  }

  // Include agent_middleware if present (for MCP-enabled agents)
  if (model.agent_middleware) {
    sanitized.agent_middleware = model.agent_middleware;
  }

  // Include max_context_tokens if specified
  if (model.max_context_tokens !== undefined && model.max_context_tokens !== null) {
    sanitized.max_context_tokens = model.max_context_tokens;
  }

  return sanitized;
}

/**
 * Converts a ModelConfiguration back to a full ModelConfiguration by
 * filling in any missing optional fields with defaults.
 */
export function expandModelConfig(sanitized: Record<string, unknown>): ModelConfiguration {
  return {
    id: sanitized.id as string,
    model_provider: sanitized.model_provider as string,
    model_name: sanitized.model_name as string,
    temperature: sanitized.temperature as number,
    interface: sanitized.interface as ModelConfiguration['interface'],
    system_prompt: sanitized.system_prompt as string,
    endpoint_base_url: sanitized.endpoint_base_url as string | undefined,
    endpoint_api_key: sanitized.endpoint_api_key as string | undefined,
    mcp_urls_dict: sanitized.mcp_urls_dict as Record<string, string> | undefined,
    mcp_tool_filter: sanitized.mcp_tool_filter as string[] | undefined,
    extra_kwargs: sanitized.extra_kwargs as Record<string, unknown> | undefined,
    agent_middleware: sanitized.agent_middleware as ModelConfiguration['agent_middleware'] | undefined,
    max_context_tokens: sanitized.max_context_tokens as number | undefined,
  };
}
