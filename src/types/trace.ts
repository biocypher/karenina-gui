/**
 * Structured trace message types for the frontend.
 *
 * These types mirror the flat dict format stored in
 * VerificationResultTemplate.trace_messages on the backend.
 */

export type TraceRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultMeta {
  tool_use_id: string;
  is_error: boolean;
}

export interface ThinkingMeta {
  thinking: string;
  signature?: string;
}

export interface TraceMessage {
  role: TraceRole;
  content: string;
  block_index: number;
  tool_calls?: ToolCall[];
  tool_result?: ToolResultMeta;
  thinking?: ThinkingMeta;
  model?: string;
  // Frontend-only annotations (set by curation trace enrichment, not from backend)
  _isCurrentTurn?: boolean;
  _isInjected?: boolean;
}
