import React from 'react';
import { Settings, Wrench } from 'lucide-react';
import type { GenerationParams } from './useExtraKwargsState';
import type {
  AgentMiddlewareConfig,
  AgentLimitConfig,
  ModelRetryConfig,
  ToolRetryConfig,
  SummarizationConfig,
} from '../../../types';
import { NumberInput, SliderInput, StopSequencesInput } from './KwargsInputComponents';
import { MiddlewareConfigurationSections } from './MiddlewareConfigurationSections';

// ============================================================================
// Common Parameters Tab Props
// ============================================================================

export interface CommonParametersTabProps {
  generationParams: GenerationParams;
  setGenerationParams: React.Dispatch<React.SetStateAction<GenerationParams>>;
  middlewareConfig: AgentMiddlewareConfig | undefined;
  maxContextTokens: number | undefined;
  onLimitsUpdate: (updates: Partial<AgentLimitConfig>) => void;
  onModelRetryUpdate: (updates: Partial<ModelRetryConfig>) => void;
  onToolRetryUpdate: (updates: Partial<ToolRetryConfig>) => void;
  onSummarizationUpdate: (updates: Partial<SummarizationConfig>) => void;
  onMaxContextTokensChange: (value: number | undefined) => void;
  hasMcp: boolean;
}

// ============================================================================
// Common Parameters Tab Component
// ============================================================================

export const CommonParametersTab: React.FC<CommonParametersTabProps> = ({
  generationParams,
  setGenerationParams,
  middlewareConfig,
  maxContextTokens,
  onLimitsUpdate,
  onModelRetryUpdate,
  onToolRetryUpdate,
  onSummarizationUpdate,
  onMaxContextTokensChange,
  hasMcp,
}) => {
  return (
    <div className="space-y-6">
      {/* Generation Parameters Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          Generation Parameters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberInput
            label="Max Tokens"
            value={generationParams.max_tokens}
            onChange={(v) => setGenerationParams((prev) => ({ ...prev, max_tokens: v }))}
            min={1}
            placeholder="e.g., 4096"
            helpText="Maximum number of tokens to generate"
          />
          <SliderInput
            label="Top P"
            value={generationParams.top_p}
            onChange={(v) => setGenerationParams((prev) => ({ ...prev, top_p: v }))}
            min={0}
            max={1}
            step={0.01}
            defaultValue={1}
            helpText="Nucleus sampling threshold"
          />
          <SliderInput
            label="Frequency Penalty"
            value={generationParams.frequency_penalty}
            onChange={(v) => setGenerationParams((prev) => ({ ...prev, frequency_penalty: v }))}
            min={-2}
            max={2}
            step={0.1}
            defaultValue={0}
            helpText="Penalize repeated tokens"
          />
          <SliderInput
            label="Presence Penalty"
            value={generationParams.presence_penalty}
            onChange={(v) => setGenerationParams((prev) => ({ ...prev, presence_penalty: v }))}
            min={-2}
            max={2}
            step={0.1}
            defaultValue={0}
            helpText="Encourage topic diversity"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Stop Sequences</label>
          <StopSequencesInput
            value={generationParams.stop_sequences ?? []}
            onChange={(sequences) => setGenerationParams((prev) => ({ ...prev, stop_sequences: sequences }))}
          />
        </div>
      </div>

      {/* Agent Middleware Section (conditional on hasMcp) */}
      {hasMcp && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-purple-600" />
            Agent Middleware Configuration
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Configure behavior for MCP-enabled agents (limits, retries, summarization)
          </p>

          <MiddlewareConfigurationSections
            middlewareConfig={middlewareConfig}
            maxContextTokens={maxContextTokens}
            onLimitsUpdate={onLimitsUpdate}
            onModelRetryUpdate={onModelRetryUpdate}
            onToolRetryUpdate={onToolRetryUpdate}
            onSummarizationUpdate={onSummarizationUpdate}
            onMaxContextTokensChange={onMaxContextTokensChange}
          />
        </div>
      )}
    </div>
  );
};
