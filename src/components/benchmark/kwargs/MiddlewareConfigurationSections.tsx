import React from 'react';
import { Gauge, FileText, RefreshCw, Wrench } from 'lucide-react';
import type {
  AgentMiddlewareConfig,
  AgentLimitConfig,
  ModelRetryConfig,
  ToolRetryConfig,
  SummarizationConfig,
} from '../../../types';
import { ExpandableSection, NumberInput, SliderInput, SelectInput, ToggleInput } from './KwargsInputComponents';

// Default middleware values
export const DEFAULT_LIMITS: AgentLimitConfig = {
  model_call_limit: 25,
  tool_call_limit: 50,
  exit_behavior: 'end',
};

export const DEFAULT_MODEL_RETRY: ModelRetryConfig = {
  max_retries: 2,
  backoff_factor: 2.0,
  initial_delay: 2.0,
  max_delay: 10.0,
  jitter: true,
  on_failure: 'continue',
};

export const DEFAULT_TOOL_RETRY: ToolRetryConfig = {
  max_retries: 3,
  backoff_factor: 2.0,
  initial_delay: 1.0,
  on_failure: 'return_message',
};

export const DEFAULT_SUMMARIZATION: SummarizationConfig = {
  enabled: true,
  trigger_fraction: 0.8,
  keep_messages: 20,
};

// ============================================================================
// Middleware Configuration Section Props
// ============================================================================

export interface MiddlewareConfigurationSectionsProps {
  middlewareConfig?: AgentMiddlewareConfig;
  maxContextTokens?: number;
  onLimitsUpdate: (updates: Partial<AgentLimitConfig>) => void;
  onModelRetryUpdate: (updates: Partial<ModelRetryConfig>) => void;
  onToolRetryUpdate: (updates: Partial<ToolRetryConfig>) => void;
  onSummarizationUpdate: (updates: Partial<SummarizationConfig>) => void;
  onMaxContextTokensChange: (value: number | undefined) => void;
}

// ============================================================================
// Middleware Configuration Sections Component
// ============================================================================

export const MiddlewareConfigurationSections: React.FC<MiddlewareConfigurationSectionsProps> = ({
  middlewareConfig,
  maxContextTokens,
  onLimitsUpdate,
  onModelRetryUpdate,
  onToolRetryUpdate,
  onSummarizationUpdate,
  onMaxContextTokensChange,
}) => {
  return (
    <div className="space-y-3">
      {/* Limits Section */}
      <ExpandableSection title="Limits" icon={<Gauge className="w-4 h-4 text-blue-600" />} defaultExpanded={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberInput
            label="Model Call Limit"
            value={middlewareConfig?.limits?.model_call_limit ?? DEFAULT_LIMITS.model_call_limit}
            onChange={(v) => onLimitsUpdate({ model_call_limit: v ?? DEFAULT_LIMITS.model_call_limit })}
            min={1}
            helpText="Max LLM calls per invocation"
          />
          <NumberInput
            label="Tool Call Limit"
            value={middlewareConfig?.limits?.tool_call_limit ?? DEFAULT_LIMITS.tool_call_limit}
            onChange={(v) => onLimitsUpdate({ tool_call_limit: v ?? DEFAULT_LIMITS.tool_call_limit })}
            min={1}
            helpText="Max tool calls per invocation"
          />
          <SelectInput
            label="Exit Behavior"
            value={middlewareConfig?.limits?.exit_behavior ?? DEFAULT_LIMITS.exit_behavior}
            onChange={(v) => onLimitsUpdate({ exit_behavior: v as 'end' | 'continue' })}
            options={[
              { value: 'end', label: 'End (return partial response)' },
              { value: 'continue', label: 'Continue (may exceed limit)' },
            ]}
            helpText="Behavior when limit reached"
          />
        </div>
      </ExpandableSection>

      {/* Summarization Section */}
      <ExpandableSection title="Summarization" icon={<FileText className="w-4 h-4 text-green-600" />}>
        <div className="space-y-4">
          <ToggleInput
            label="Enable Summarization"
            value={middlewareConfig?.summarization?.enabled ?? DEFAULT_SUMMARIZATION.enabled}
            onChange={(v) => onSummarizationUpdate({ enabled: v })}
            helpText="Auto-summarize conversation when approaching context limit"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumberInput
              label="Max Context Tokens"
              value={maxContextTokens}
              onChange={onMaxContextTokensChange}
              min={1000}
              placeholder="e.g., 128000"
              helpText="Context window size (auto-detected for LangChain)"
            />
            <SliderInput
              label="Trigger Fraction"
              value={middlewareConfig?.summarization?.trigger_fraction ?? DEFAULT_SUMMARIZATION.trigger_fraction}
              onChange={(v) => onSummarizationUpdate({ trigger_fraction: v ?? DEFAULT_SUMMARIZATION.trigger_fraction })}
              min={0.1}
              max={0.95}
              step={0.05}
              defaultValue={DEFAULT_SUMMARIZATION.trigger_fraction}
              helpText="Fraction of context that triggers summarization"
            />
            <NumberInput
              label="Keep Messages"
              value={middlewareConfig?.summarization?.keep_messages ?? DEFAULT_SUMMARIZATION.keep_messages}
              onChange={(v) => onSummarizationUpdate({ keep_messages: v ?? DEFAULT_SUMMARIZATION.keep_messages })}
              min={1}
              helpText="Messages to preserve after summarization"
            />
          </div>
        </div>
      </ExpandableSection>

      {/* Model Retry Section */}
      <ExpandableSection title="Model Retry" icon={<RefreshCw className="w-4 h-4 text-orange-600" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberInput
            label="Max Retries"
            value={middlewareConfig?.model_retry?.max_retries ?? DEFAULT_MODEL_RETRY.max_retries}
            onChange={(v) => onModelRetryUpdate({ max_retries: v ?? DEFAULT_MODEL_RETRY.max_retries })}
            min={0}
            helpText="Retry attempts on failure"
          />
          <NumberInput
            label="Backoff Factor"
            value={middlewareConfig?.model_retry?.backoff_factor ?? DEFAULT_MODEL_RETRY.backoff_factor}
            onChange={(v) => onModelRetryUpdate({ backoff_factor: v ?? DEFAULT_MODEL_RETRY.backoff_factor })}
            min={1}
            step={0.1}
            helpText="Multiplier for exponential backoff"
          />
          <NumberInput
            label="Initial Delay (s)"
            value={middlewareConfig?.model_retry?.initial_delay ?? DEFAULT_MODEL_RETRY.initial_delay}
            onChange={(v) => onModelRetryUpdate({ initial_delay: v ?? DEFAULT_MODEL_RETRY.initial_delay })}
            min={0}
            step={0.5}
            helpText="First retry delay in seconds"
          />
          <NumberInput
            label="Max Delay (s)"
            value={middlewareConfig?.model_retry?.max_delay ?? DEFAULT_MODEL_RETRY.max_delay}
            onChange={(v) => onModelRetryUpdate({ max_delay: v ?? DEFAULT_MODEL_RETRY.max_delay })}
            min={1}
            step={1}
            helpText="Maximum retry delay"
          />
          <ToggleInput
            label="Jitter"
            value={middlewareConfig?.model_retry?.jitter ?? DEFAULT_MODEL_RETRY.jitter}
            onChange={(v) => onModelRetryUpdate({ jitter: v })}
            helpText="Add random jitter to delays"
          />
          <SelectInput
            label="On Failure"
            value={middlewareConfig?.model_retry?.on_failure ?? DEFAULT_MODEL_RETRY.on_failure}
            onChange={(v) => onModelRetryUpdate({ on_failure: v as 'continue' | 'raise' })}
            options={[
              { value: 'continue', label: 'Continue (graceful)' },
              { value: 'raise', label: 'Raise (throw error)' },
            ]}
            helpText="Behavior when retries exhausted"
          />
        </div>
      </ExpandableSection>

      {/* Tool Retry Section */}
      <ExpandableSection title="Tool Retry" icon={<Wrench className="w-4 h-4 text-red-600" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberInput
            label="Max Retries"
            value={middlewareConfig?.tool_retry?.max_retries ?? DEFAULT_TOOL_RETRY.max_retries}
            onChange={(v) => onToolRetryUpdate({ max_retries: v ?? DEFAULT_TOOL_RETRY.max_retries })}
            min={0}
            helpText="Retry attempts for tool calls"
          />
          <NumberInput
            label="Backoff Factor"
            value={middlewareConfig?.tool_retry?.backoff_factor ?? DEFAULT_TOOL_RETRY.backoff_factor}
            onChange={(v) => onToolRetryUpdate({ backoff_factor: v ?? DEFAULT_TOOL_RETRY.backoff_factor })}
            min={1}
            step={0.1}
            helpText="Multiplier for exponential backoff"
          />
          <NumberInput
            label="Initial Delay (s)"
            value={middlewareConfig?.tool_retry?.initial_delay ?? DEFAULT_TOOL_RETRY.initial_delay}
            onChange={(v) => onToolRetryUpdate({ initial_delay: v ?? DEFAULT_TOOL_RETRY.initial_delay })}
            min={0}
            step={0.5}
            helpText="First retry delay in seconds"
          />
          <SelectInput
            label="On Failure"
            value={middlewareConfig?.tool_retry?.on_failure ?? DEFAULT_TOOL_RETRY.on_failure}
            onChange={(v) => onToolRetryUpdate({ on_failure: v as 'return_message' | 'raise' })}
            options={[
              { value: 'return_message', label: 'Return Message (graceful)' },
              { value: 'raise', label: 'Raise (throw error)' },
            ]}
            helpText="Behavior when retries exhausted"
          />
        </div>
      </ExpandableSection>
    </div>
  );
};
