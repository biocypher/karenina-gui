import React, { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  Code,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  Gauge,
  FileText,
  Wrench,
} from 'lucide-react';
import type {
  AgentMiddlewareConfig,
  AgentLimitConfig,
  ModelRetryConfig,
  ToolRetryConfig,
  SummarizationConfig,
} from '../../types';

// Return type for onSave - includes both extra_kwargs and agent_middleware
export interface ModelConfigurationUpdate {
  extra_kwargs: Record<string, unknown>;
  agent_middleware?: AgentMiddlewareConfig;
  max_context_tokens?: number;
}

interface ExtraKwargsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (update: ModelConfigurationUpdate) => void;
  initialKwargs?: Record<string, unknown>;
  initialMiddleware?: AgentMiddlewareConfig;
  initialMaxContextTokens?: number;
  hasMcp: boolean;
}

// Generation params type
interface GenerationParams {
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop_sequences?: string[];
}

// Keys that are generation params (handled in Tab 1)
const GENERATION_PARAM_KEYS = [
  'max_tokens',
  'top_p',
  'frequency_penalty',
  'presence_penalty',
  'stop_sequences',
  'stop',
];

// Default middleware values
const DEFAULT_LIMITS: AgentLimitConfig = {
  model_call_limit: 25,
  tool_call_limit: 50,
  exit_behavior: 'end',
};

const DEFAULT_MODEL_RETRY: ModelRetryConfig = {
  max_retries: 2,
  backoff_factor: 2.0,
  initial_delay: 2.0,
  max_delay: 10.0,
  jitter: true,
  on_failure: 'continue',
};

const DEFAULT_TOOL_RETRY: ToolRetryConfig = {
  max_retries: 3,
  backoff_factor: 2.0,
  initial_delay: 1.0,
  on_failure: 'return_message',
};

const DEFAULT_SUMMARIZATION: SummarizationConfig = {
  enabled: true,
  trigger_fraction: 0.8,
  keep_messages: 20,
};

// ============================================================================
// Sub-Components
// ============================================================================

// Expandable section component
const ExpandableSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}> = ({ title, icon, children, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-gray-700">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isExpanded && <div className="p-4 border-t border-gray-200">{children}</div>}
    </div>
  );
};

// Stop sequences multi-value input
const StopSequencesInput: React.FC<{
  value: string[];
  onChange: (sequences: string[]) => void;
}> = ({ value, onChange }) => {
  const addSequence = () => {
    onChange([...value, '']);
  };

  const removeSequence = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateSequence = (index: number, newValue: string) => {
    const updated = [...value];
    updated[index] = newValue;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {value.map((seq, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={seq}
            onChange={(e) => updateSequence(index, e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Stop sequence..."
          />
          <button
            type="button"
            onClick={() => removeSequence(index)}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addSequence}
        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
      >
        <Plus className="w-4 h-4" />
        Add Stop Sequence
      </button>
    </div>
  );
};

// Number input with optional clear
const NumberInput: React.FC<{
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  helpText?: string;
}> = ({ label, value, onChange, min, max, step = 1, placeholder, helpText }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {value !== undefined && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
        min={min}
        max={max}
        step={step}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        placeholder={placeholder}
      />
      {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
    </div>
  );
};

// Slider input with value display
const SliderInput: React.FC<{
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  helpText?: string;
}> = ({ label, value, onChange, min, max, step, defaultValue, helpText }) => {
  const displayValue = value ?? defaultValue;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}: <span className="text-indigo-600">{value !== undefined ? displayValue.toFixed(2) : 'Not set'}</span>
        </label>
        {value !== undefined && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>
      <input
        type="range"
        value={displayValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
    </div>
  );
};

// Select input
const SelectInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  helpText?: string;
}> = ({ label, value, onChange, options, helpText }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
    </div>
  );
};

// Toggle input
const ToggleInput: React.FC<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  helpText?: string;
}> = ({ label, value, onChange, helpText }) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
          value ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const ExtraKwargsModal: React.FC<ExtraKwargsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialKwargs,
  initialMiddleware,
  initialMaxContextTokens,
  hasMcp,
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'common' | 'json'>('common');

  // Tab 1: Common params state
  const [generationParams, setGenerationParams] = useState<GenerationParams>({});
  const [middlewareConfig, setMiddlewareConfig] = useState<AgentMiddlewareConfig | undefined>(undefined);
  const [maxContextTokens, setMaxContextTokens] = useState<number | undefined>(undefined);

  // Tab 2: JSON state
  const [jsonText, setJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Conflict detection
  const [conflicts, setConflicts] = useState<string[]>([]);

  // Examples toggle
  const [showExamples, setShowExamples] = useState(false);

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Extract generation params from initialKwargs
      const extractedGenParams: GenerationParams = {};
      const remainingKwargs: Record<string, unknown> = {};

      if (initialKwargs) {
        Object.entries(initialKwargs).forEach(([key, value]) => {
          if (key === 'max_tokens' && typeof value === 'number') {
            extractedGenParams.max_tokens = value;
          } else if (key === 'top_p' && typeof value === 'number') {
            extractedGenParams.top_p = value;
          } else if (key === 'frequency_penalty' && typeof value === 'number') {
            extractedGenParams.frequency_penalty = value;
          } else if (key === 'presence_penalty' && typeof value === 'number') {
            extractedGenParams.presence_penalty = value;
          } else if ((key === 'stop_sequences' || key === 'stop') && Array.isArray(value)) {
            extractedGenParams.stop_sequences = value as string[];
          } else {
            remainingKwargs[key] = value;
          }
        });
      }

      setGenerationParams(extractedGenParams);
      setJsonText(JSON.stringify(remainingKwargs, null, 2));
      setMiddlewareConfig(initialMiddleware);
      setMaxContextTokens(initialMaxContextTokens);
      setJsonError(null);
      setConflicts([]);
      setActiveTab('common');
    }
  }, [isOpen, initialKwargs, initialMiddleware, initialMaxContextTokens]);

  // Detect conflicts between Tab 1 and Tab 2
  const detectConflicts = (): string[] => {
    const detectedConflicts: string[] = [];

    try {
      const jsonData = JSON.parse(jsonText);

      // Check generation params
      GENERATION_PARAM_KEYS.forEach((key) => {
        const genKey = key === 'stop' ? 'stop_sequences' : key;
        if (
          generationParams[genKey as keyof GenerationParams] !== undefined &&
          (jsonData[key] !== undefined || jsonData[genKey] !== undefined)
        ) {
          detectedConflicts.push(key);
        }
      });

      // Check middleware
      if (middlewareConfig && jsonData.agent_middleware) {
        detectedConflicts.push('agent_middleware');
      }
    } catch {
      // JSON is invalid, no conflicts from it
    }

    return detectedConflicts;
  };

  // Handle JSON text change
  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonText(e.target.value);
    if (jsonError) setJsonError(null);
    if (conflicts.length > 0) setConflicts([]);
  };

  // Validate JSON
  const validateJson = (): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonError(null);
      return parsed;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid JSON';
      setJsonError(errorMessage);
      return null;
    }
  };

  // Format/indent JSON
  const handleIndent = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid JSON';
      setJsonError(errorMessage);
    }
  };

  // Handle save
  const handleSave = () => {
    // Validate JSON first
    const jsonData = validateJson();
    if (jsonData === null) return;

    // Check for conflicts
    const detected = detectConflicts();
    if (detected.length > 0) {
      setConflicts(detected);
      return;
    }

    // Merge generation params into extra_kwargs
    const finalExtraKwargs: Record<string, unknown> = { ...jsonData };

    if (generationParams.max_tokens !== undefined) {
      finalExtraKwargs.max_tokens = generationParams.max_tokens;
    }
    if (generationParams.top_p !== undefined) {
      finalExtraKwargs.top_p = generationParams.top_p;
    }
    if (generationParams.frequency_penalty !== undefined) {
      finalExtraKwargs.frequency_penalty = generationParams.frequency_penalty;
    }
    if (generationParams.presence_penalty !== undefined) {
      finalExtraKwargs.presence_penalty = generationParams.presence_penalty;
    }
    if (generationParams.stop_sequences && generationParams.stop_sequences.length > 0) {
      // Filter out empty strings
      const validSequences = generationParams.stop_sequences.filter((s) => s.trim() !== '');
      if (validSequences.length > 0) {
        finalExtraKwargs.stop = validSequences;
      }
    }

    onSave({
      extra_kwargs: finalExtraKwargs,
      agent_middleware: middlewareConfig,
      max_context_tokens: maxContextTokens,
    });
  };

  // Clear all
  const handleClear = () => {
    setGenerationParams({});
    setMaxContextTokens(undefined);
    setMiddlewareConfig(undefined);
    setJsonText('{}');
    setJsonError(null);
    setConflicts([]);
  };

  // Update middleware sub-configs
  const updateLimits = (updates: Partial<AgentLimitConfig>) => {
    setMiddlewareConfig((prev) => ({
      limits: { ...(prev?.limits ?? DEFAULT_LIMITS), ...updates },
      model_retry: prev?.model_retry ?? DEFAULT_MODEL_RETRY,
      tool_retry: prev?.tool_retry ?? DEFAULT_TOOL_RETRY,
      summarization: prev?.summarization ?? DEFAULT_SUMMARIZATION,
    }));
  };

  const updateModelRetry = (updates: Partial<ModelRetryConfig>) => {
    setMiddlewareConfig((prev) => ({
      limits: prev?.limits ?? DEFAULT_LIMITS,
      model_retry: { ...(prev?.model_retry ?? DEFAULT_MODEL_RETRY), ...updates },
      tool_retry: prev?.tool_retry ?? DEFAULT_TOOL_RETRY,
      summarization: prev?.summarization ?? DEFAULT_SUMMARIZATION,
    }));
  };

  const updateToolRetry = (updates: Partial<ToolRetryConfig>) => {
    setMiddlewareConfig((prev) => ({
      limits: prev?.limits ?? DEFAULT_LIMITS,
      model_retry: prev?.model_retry ?? DEFAULT_MODEL_RETRY,
      tool_retry: { ...(prev?.tool_retry ?? DEFAULT_TOOL_RETRY), ...updates },
      summarization: prev?.summarization ?? DEFAULT_SUMMARIZATION,
    }));
  };

  const updateSummarization = (updates: Partial<SummarizationConfig>) => {
    setMiddlewareConfig((prev) => ({
      limits: prev?.limits ?? DEFAULT_LIMITS,
      model_retry: prev?.model_retry ?? DEFAULT_MODEL_RETRY,
      tool_retry: prev?.tool_retry ?? DEFAULT_TOOL_RETRY,
      summarization: { ...(prev?.summarization ?? DEFAULT_SUMMARIZATION), ...updates },
    }));
  };

  // Example templates
  const examples = [
    {
      name: 'Google API Key',
      json: JSON.stringify({ google_api_key: 'your-api-key-here' }, null, 2),
    },
    {
      name: 'Anthropic API Key',
      json: JSON.stringify({ anthropic_api_key: 'your-api-key-here', timeout: 60 }, null, 2),
    },
    {
      name: 'Custom Parameters',
      json: JSON.stringify({ custom_param: 'custom_value', seed: 42 }, null, 2),
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Configure Extra Arguments</h2>
              <p className="text-indigo-100 text-sm mt-1">
                Pass custom parameters to the model interface (LangChain, OpenRouter, etc.)
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('common')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'common'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Common
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'json'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            JSON
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Conflict Warning */}
          {conflicts.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-700">
                Conflict: <code className="bg-amber-100 px-1 rounded">{conflicts.join(', ')}</code> defined in both
                tabs. Remove from one tab to save.
              </span>
            </div>
          )}

          {/* Tab 1: Common Parameters */}
          {activeTab === 'common' && (
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

                  <div className="space-y-3">
                    {/* Limits Section */}
                    <ExpandableSection
                      title="Limits"
                      icon={<Gauge className="w-4 h-4 text-blue-600" />}
                      defaultExpanded={true}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <NumberInput
                          label="Model Call Limit"
                          value={middlewareConfig?.limits?.model_call_limit ?? DEFAULT_LIMITS.model_call_limit}
                          onChange={(v) => updateLimits({ model_call_limit: v ?? DEFAULT_LIMITS.model_call_limit })}
                          min={1}
                          helpText="Max LLM calls per invocation"
                        />
                        <NumberInput
                          label="Tool Call Limit"
                          value={middlewareConfig?.limits?.tool_call_limit ?? DEFAULT_LIMITS.tool_call_limit}
                          onChange={(v) => updateLimits({ tool_call_limit: v ?? DEFAULT_LIMITS.tool_call_limit })}
                          min={1}
                          helpText="Max tool calls per invocation"
                        />
                        <SelectInput
                          label="Exit Behavior"
                          value={middlewareConfig?.limits?.exit_behavior ?? DEFAULT_LIMITS.exit_behavior}
                          onChange={(v) => updateLimits({ exit_behavior: v as 'end' | 'continue' })}
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
                          onChange={(v) => updateSummarization({ enabled: v })}
                          helpText="Auto-summarize conversation when approaching context limit"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <NumberInput
                            label="Max Context Tokens"
                            value={maxContextTokens}
                            onChange={(v) => setMaxContextTokens(v)}
                            min={1000}
                            placeholder="e.g., 128000"
                            helpText="Context window size (auto-detected for LangChain)"
                          />
                          <SliderInput
                            label="Trigger Fraction"
                            value={
                              middlewareConfig?.summarization?.trigger_fraction ??
                              DEFAULT_SUMMARIZATION.trigger_fraction
                            }
                            onChange={(v) =>
                              updateSummarization({ trigger_fraction: v ?? DEFAULT_SUMMARIZATION.trigger_fraction })
                            }
                            min={0.1}
                            max={0.95}
                            step={0.05}
                            defaultValue={DEFAULT_SUMMARIZATION.trigger_fraction}
                            helpText="Fraction of context that triggers summarization"
                          />
                          <NumberInput
                            label="Keep Messages"
                            value={
                              middlewareConfig?.summarization?.keep_messages ?? DEFAULT_SUMMARIZATION.keep_messages
                            }
                            onChange={(v) =>
                              updateSummarization({ keep_messages: v ?? DEFAULT_SUMMARIZATION.keep_messages })
                            }
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
                          onChange={(v) => updateModelRetry({ max_retries: v ?? DEFAULT_MODEL_RETRY.max_retries })}
                          min={0}
                          helpText="Retry attempts on failure"
                        />
                        <NumberInput
                          label="Backoff Factor"
                          value={middlewareConfig?.model_retry?.backoff_factor ?? DEFAULT_MODEL_RETRY.backoff_factor}
                          onChange={(v) =>
                            updateModelRetry({ backoff_factor: v ?? DEFAULT_MODEL_RETRY.backoff_factor })
                          }
                          min={1}
                          step={0.1}
                          helpText="Multiplier for exponential backoff"
                        />
                        <NumberInput
                          label="Initial Delay (s)"
                          value={middlewareConfig?.model_retry?.initial_delay ?? DEFAULT_MODEL_RETRY.initial_delay}
                          onChange={(v) => updateModelRetry({ initial_delay: v ?? DEFAULT_MODEL_RETRY.initial_delay })}
                          min={0}
                          step={0.5}
                          helpText="First retry delay in seconds"
                        />
                        <NumberInput
                          label="Max Delay (s)"
                          value={middlewareConfig?.model_retry?.max_delay ?? DEFAULT_MODEL_RETRY.max_delay}
                          onChange={(v) => updateModelRetry({ max_delay: v ?? DEFAULT_MODEL_RETRY.max_delay })}
                          min={1}
                          step={1}
                          helpText="Maximum retry delay"
                        />
                        <ToggleInput
                          label="Jitter"
                          value={middlewareConfig?.model_retry?.jitter ?? DEFAULT_MODEL_RETRY.jitter}
                          onChange={(v) => updateModelRetry({ jitter: v })}
                          helpText="Add random jitter to delays"
                        />
                        <SelectInput
                          label="On Failure"
                          value={middlewareConfig?.model_retry?.on_failure ?? DEFAULT_MODEL_RETRY.on_failure}
                          onChange={(v) => updateModelRetry({ on_failure: v as 'continue' | 'raise' })}
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
                          onChange={(v) => updateToolRetry({ max_retries: v ?? DEFAULT_TOOL_RETRY.max_retries })}
                          min={0}
                          helpText="Retry attempts for tool calls"
                        />
                        <NumberInput
                          label="Backoff Factor"
                          value={middlewareConfig?.tool_retry?.backoff_factor ?? DEFAULT_TOOL_RETRY.backoff_factor}
                          onChange={(v) => updateToolRetry({ backoff_factor: v ?? DEFAULT_TOOL_RETRY.backoff_factor })}
                          min={1}
                          step={0.1}
                          helpText="Multiplier for exponential backoff"
                        />
                        <NumberInput
                          label="Initial Delay (s)"
                          value={middlewareConfig?.tool_retry?.initial_delay ?? DEFAULT_TOOL_RETRY.initial_delay}
                          onChange={(v) => updateToolRetry({ initial_delay: v ?? DEFAULT_TOOL_RETRY.initial_delay })}
                          min={0}
                          step={0.5}
                          helpText="First retry delay in seconds"
                        />
                        <SelectInput
                          label="On Failure"
                          value={middlewareConfig?.tool_retry?.on_failure ?? DEFAULT_TOOL_RETRY.on_failure}
                          onChange={(v) => updateToolRetry({ on_failure: v as 'return_message' | 'raise' })}
                          options={[
                            { value: 'return_message', label: 'Return Message (graceful)' },
                            { value: 'raise', label: 'Raise (throw error)' },
                          ]}
                          helpText="Behavior when retries exhausted"
                        />
                      </div>
                    </ExpandableSection>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: JSON Editor */}
          {activeTab === 'json' && (
            <div className="space-y-4">
              {/* Examples Toggle */}
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">JSON Configuration</label>
                <button
                  onClick={() => setShowExamples(!showExamples)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-1"
                >
                  <Code className="w-4 h-4" />
                  <span>{showExamples ? 'Hide' : 'Show'} Examples</span>
                </button>
              </div>

              {/* Examples Dropdown */}
              {showExamples && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {examples.map((example) => (
                    <button
                      key={example.name}
                      onClick={() => {
                        setJsonText(example.json);
                        setShowExamples(false);
                      }}
                      className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-left"
                    >
                      {example.name}
                    </button>
                  ))}
                </div>
              )}

              {/* JSON Editor */}
              <div>
                <textarea
                  value={jsonText}
                  onChange={handleJsonChange}
                  className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder='{\n  "key": "value"\n}'
                  spellCheck={false}
                />
              </div>

              {/* JSON Error */}
              {jsonError && (
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{jsonError}</span>
                </div>
              )}

              {/* Help Text */}
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-1">💡 Tip:</p>
                <p>
                  Use this tab for custom parameters not available in the Common tab. Avoid duplicating keys between
                  tabs.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t flex-shrink-0">
          <button onClick={handleClear} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium">
            Clear All
          </button>
          <div className="flex items-center space-x-3">
            {activeTab === 'json' && (
              <button
                onClick={handleIndent}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
              >
                Indent
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtraKwargsModal;
