/**
 * Agent Middleware Configuration types
 * Configuration for LangChain agent middleware (retry, summarization, limits)
 */

/**
 * Configuration for LangChain ModelRetryMiddleware.
 * Controls automatic retry behavior for failed model calls with exponential backoff.
 */
export interface ModelRetryConfig {
  /** Maximum retry attempts (total calls = max_retries + 1 initial) */
  max_retries: number;
  /** Multiplier for exponential backoff between retries */
  backoff_factor: number;
  /** Initial delay in seconds before first retry */
  initial_delay: number;
  /** Maximum delay in seconds between retries */
  max_delay: number;
  /** Add random jitter (±25%) to retry delays */
  jitter: boolean;
  /** Behavior when all retries exhausted */
  on_failure: 'continue' | 'raise';
}

/**
 * Configuration for LangChain ToolRetryMiddleware.
 * Controls automatic retry behavior for failed tool calls with exponential backoff.
 */
export interface ToolRetryConfig {
  /** Maximum retry attempts for tool calls */
  max_retries: number;
  /** Multiplier for exponential backoff between retries */
  backoff_factor: number;
  /** Initial delay in seconds before first retry */
  initial_delay: number;
  /** Behavior when all retries exhausted */
  on_failure: 'return_message' | 'raise';
}

/**
 * Configuration for LangChain SummarizationMiddleware.
 * Automatically summarizes conversation history when approaching token limits.
 */
export interface SummarizationConfig {
  /** Enable automatic summarization of conversation history (default: true for MCP agents) */
  enabled: boolean;
  /** Model to use for summarization (defaults to a lightweight model like gpt-4o-mini) */
  model?: string;
  /** Fraction of context window that triggers summarization (0.0-1.0) */
  trigger_fraction: number;
  /** Number of recent messages to preserve after summarization */
  keep_messages: number;
}

/**
 * Configuration for agent execution limits.
 * Controls maximum model and tool calls to prevent infinite loops or excessive costs.
 */
export interface AgentLimitConfig {
  /** Maximum number of LLM calls per agent invocation */
  model_call_limit: number;
  /** Maximum number of tool calls per agent invocation */
  tool_call_limit: number;
  /** Behavior when limit reached */
  exit_behavior: 'end' | 'continue';
}

/**
 * Complete middleware configuration for MCP-enabled agents.
 * Only applies when mcp_urls_dict is provided in ModelConfiguration.
 */
export interface AgentMiddlewareConfig {
  /** Agent execution limits (model/tool call caps) */
  limits: AgentLimitConfig;
  /** Model call retry configuration */
  model_retry: ModelRetryConfig;
  /** Tool call retry configuration */
  tool_retry: ToolRetryConfig;
  /** Conversation summarization configuration */
  summarization: SummarizationConfig;
}
