import React, { useState } from 'react';
import { BarChart3, Plus, Trash2, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { Card } from '../ui/Card';
import { ManualTraceUpload } from '../ManualTraceUpload';
import { MCPConfigurationModal } from './MCPConfigurationModal';
import ExtraKwargsModal from './ExtraKwargsModal';

interface ModelConfiguration {
  id: string;
  model_provider: string;
  model_name: string;
  temperature: number;
  interface: 'langchain' | 'openrouter' | 'manual' | 'openai_endpoint';
  system_prompt: string;
  // OpenAI Endpoint configuration
  endpoint_base_url?: string;
  endpoint_api_key?: string;
  // MCP (Model Context Protocol) configuration
  mcp_urls_dict?: Record<string, string>;
  mcp_tool_filter?: string[];
  mcp_validated_servers?: Record<string, string>;
  use_full_trace_for_template?: boolean;
  use_full_trace_for_rubric?: boolean;
  // Extra keyword arguments
  extra_kwargs?: Record<string, unknown>;
}

interface ConfigurationPanelProps {
  answeringModels: ModelConfiguration[];
  parsingModels: ModelConfiguration[];
  replicateCount: number;
  expandedPrompts: Set<string>;
  isRunning: boolean;
  finishedTemplates?: Array<[string, unknown]>;
  rubricEnabled: boolean;
  rubricEvaluationStrategy: 'batch' | 'sequential';
  evaluationMode: 'template_only' | 'template_and_rubric' | 'rubric_only';
  correctnessEnabled: boolean;
  abstentionEnabled: boolean;
  deepJudgmentTemplateEnabled: boolean;
  deepJudgmentSearchEnabled: boolean;
  deepJudgmentRubricEnabled: boolean;
  deepJudgmentRubricMode: 'enable_all' | 'use_checkpoint';
  deepJudgmentRubricExtractExcerpts: boolean;
  fewShotEnabled: boolean;
  fewShotMode: 'all' | 'k-shot' | 'custom';
  fewShotK: number;
  onAddAnsweringModel: () => void;
  onAddParsingModel: () => void;
  onRemoveAnsweringModel: (id: string) => void;
  onRemoveParsingModel: (id: string) => void;
  onUpdateAnsweringModel: (id: string, updates: Partial<ModelConfiguration>) => void;
  onUpdateParsingModel: (id: string, updates: Partial<ModelConfiguration>) => void;
  onTogglePromptExpanded: (modelId: string) => void;
  onRubricEnabledChange: (enabled: boolean) => void;
  onRubricEvaluationStrategyChange: (strategy: 'batch' | 'sequential') => void;
  onEvaluationModeChange: (mode: 'template_only' | 'template_and_rubric' | 'rubric_only') => void;
  onCorrectnessEnabledChange: (enabled: boolean) => void;
  onAbstentionEnabledChange: (enabled: boolean) => void;
  onDeepJudgmentTemplateEnabledChange: (enabled: boolean) => void;
  onDeepJudgmentSearchEnabledChange: (enabled: boolean) => void;
  onDeepJudgmentRubricEnabledChange: (enabled: boolean) => void;
  onDeepJudgmentRubricModeChange: (mode: 'enable_all' | 'use_checkpoint') => void;
  onDeepJudgmentRubricExtractExcerptsChange: (enabled: boolean) => void;
  onFewShotEnabledChange: (enabled: boolean) => void;
  onFewShotModeChange: (mode: 'all' | 'k-shot' | 'custom') => void;
  onFewShotKChange: (k: number) => void;
  onManualTraceUploadSuccess?: (traceCount: number) => void;
  onManualTraceUploadError?: (error: string) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  answeringModels,
  parsingModels,
  replicateCount,
  expandedPrompts,
  isRunning,
  finishedTemplates,
  rubricEnabled,
  rubricEvaluationStrategy,
  evaluationMode,
  correctnessEnabled,
  abstentionEnabled,
  deepJudgmentTemplateEnabled,
  deepJudgmentSearchEnabled,
  deepJudgmentRubricEnabled,
  deepJudgmentRubricMode,
  deepJudgmentRubricExtractExcerpts,
  fewShotEnabled,
  fewShotMode,
  fewShotK,
  onAddAnsweringModel,
  onAddParsingModel,
  onRemoveAnsweringModel,
  onRemoveParsingModel,
  onUpdateAnsweringModel,
  onUpdateParsingModel,
  onTogglePromptExpanded,
  onRubricEnabledChange,
  onRubricEvaluationStrategyChange,
  onEvaluationModeChange,
  onCorrectnessEnabledChange,
  onAbstentionEnabledChange,
  onDeepJudgmentTemplateEnabledChange,
  onDeepJudgmentSearchEnabledChange,
  onDeepJudgmentRubricEnabledChange,
  onDeepJudgmentRubricModeChange,
  onDeepJudgmentRubricExtractExcerptsChange,
  onFewShotEnabledChange,
  onFewShotModeChange,
  onFewShotKChange,
  onManualTraceUploadSuccess,
  onManualTraceUploadError,
}) => {
  const [mcpModalState, setMcpModalState] = useState<{ isOpen: boolean; modelId: string | null }>({
    isOpen: false,
    modelId: null,
  });

  const [extraKwargsModalState, setExtraKwargsModalState] = useState<{
    isOpen: boolean;
    modelId: string | null;
    isAnswering: boolean;
  }>({
    isOpen: false,
    modelId: null,
    isAnswering: true,
  });

  const handleMCPSave = (config: {
    mcp_urls_dict: Record<string, string>;
    mcp_tool_filter: string[];
    mcp_validated_servers?: Record<string, string>;
    use_full_trace_for_template?: boolean;
    use_full_trace_for_rubric?: boolean;
  }) => {
    if (mcpModalState.modelId) {
      const answeringModel = answeringModels.find((m) => m.id === mcpModalState.modelId);

      if (answeringModel) {
        onUpdateAnsweringModel(mcpModalState.modelId, config);
      }
    }
    setMcpModalState({ isOpen: false, modelId: null });
  };

  const getCurrentMCPConfig = () => {
    if (!mcpModalState.modelId) return undefined;

    const answeringModel = answeringModels.find((m) => m.id === mcpModalState.modelId);
    if (answeringModel) {
      return {
        mcp_urls_dict: answeringModel.mcp_urls_dict,
        mcp_tool_filter: answeringModel.mcp_tool_filter,
        mcp_validated_servers: answeringModel.mcp_validated_servers,
        use_full_trace_for_template: answeringModel.use_full_trace_for_template,
        use_full_trace_for_rubric: answeringModel.use_full_trace_for_rubric,
      };
    }

    return undefined;
  };

  const handleExtraKwargsSave = (kwargs: Record<string, unknown>) => {
    if (extraKwargsModalState.modelId) {
      if (extraKwargsModalState.isAnswering) {
        onUpdateAnsweringModel(extraKwargsModalState.modelId, { extra_kwargs: kwargs });
      } else {
        onUpdateParsingModel(extraKwargsModalState.modelId, { extra_kwargs: kwargs });
      }
    }
    setExtraKwargsModalState({ isOpen: false, modelId: null, isAnswering: true });
  };

  const getCurrentExtraKwargs = () => {
    if (!extraKwargsModalState.modelId) return undefined;

    const model = extraKwargsModalState.isAnswering
      ? answeringModels.find((m) => m.id === extraKwargsModalState.modelId)
      : parsingModels.find((m) => m.id === extraKwargsModalState.modelId);

    return model?.extra_kwargs;
  };

  const renderModelConfiguration = (model: ModelConfiguration, index: number, isAnswering: boolean) => (
    <div key={model.id} className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-slate-800 dark:text-slate-200">Model {index + 1}</h4>
        {((isAnswering && answeringModels.length > 1) || (!isAnswering && parsingModels.length > 1)) && (
          <button
            onClick={() => (isAnswering ? onRemoveAnsweringModel(model.id) : onRemoveParsingModel(model.id))}
            disabled={isRunning}
            className="text-red-600 hover:text-red-700 disabled:text-slate-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Interface Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Interface</label>
        <div className="flex gap-4 flex-wrap">
          <label className="flex items-center text-slate-900 dark:text-white">
            <input
              type="radio"
              name={`${model.id}-interface`}
              value="langchain"
              checked={model.interface === 'langchain'}
              onChange={(e) => {
                const update = {
                  interface: e.target.value as 'langchain' | 'openrouter' | 'manual' | 'openai_endpoint',
                };
                if (isAnswering) {
                  onUpdateAnsweringModel(model.id, update);
                } else {
                  onUpdateParsingModel(model.id, update);
                }
              }}
              disabled={isRunning}
              className="mr-2"
            />
            LangChain
          </label>
          <label className="flex items-center text-slate-900 dark:text-white">
            <input
              type="radio"
              name={`${model.id}-interface`}
              value="openrouter"
              checked={model.interface === 'openrouter'}
              onChange={(e) => {
                const update = {
                  interface: e.target.value as 'langchain' | 'openrouter' | 'manual' | 'openai_endpoint',
                };
                if (isAnswering) {
                  onUpdateAnsweringModel(model.id, update);
                } else {
                  onUpdateParsingModel(model.id, update);
                }
              }}
              disabled={isRunning}
              className="mr-2"
            />
            OpenRouter
          </label>
          <label className="flex items-center text-slate-900 dark:text-white">
            <input
              type="radio"
              name={`${model.id}-interface`}
              value="openai_endpoint"
              checked={model.interface === 'openai_endpoint'}
              onChange={(e) => {
                const update = {
                  interface: e.target.value as 'langchain' | 'openrouter' | 'manual' | 'openai_endpoint',
                };
                if (isAnswering) {
                  onUpdateAnsweringModel(model.id, update);
                } else {
                  onUpdateParsingModel(model.id, update);
                }
              }}
              disabled={isRunning}
              className="mr-2"
            />
            OpenAI Endpoint
          </label>
          {isAnswering && (
            <label className="flex items-center text-slate-900 dark:text-white">
              <input
                type="radio"
                name={`${model.id}-interface`}
                value="manual"
                checked={model.interface === 'manual'}
                onChange={(e) => {
                  const update = {
                    interface: e.target.value as 'langchain' | 'openrouter' | 'manual' | 'openai_endpoint',
                  };
                  if (isAnswering) {
                    onUpdateAnsweringModel(model.id, update);
                  } else {
                    onUpdateParsingModel(model.id, update);
                  }
                }}
                disabled={isRunning}
                className="mr-2"
              />
              Manual
            </label>
          )}
        </div>
      </div>

      {/* Provider Selection - Show only for LangChain interface */}
      {model.interface === 'langchain' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Provider</label>
          <input
            type="text"
            value={model.model_provider}
            onChange={(e) => {
              const update = { model_provider: e.target.value };
              if (isAnswering) {
                onUpdateAnsweringModel(model.id, update);
              } else {
                onUpdateParsingModel(model.id, update);
              }
            }}
            disabled={isRunning}
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            placeholder="e.g., google_genai, openai, anthropic"
          />
        </div>
      )}

      {/* OpenAI Endpoint Configuration - Show only for openai_endpoint interface */}
      {model.interface === 'openai_endpoint' && (
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Endpoint Base URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={model.endpoint_base_url || ''}
              onChange={(e) => {
                const update = { endpoint_base_url: e.target.value };
                if (isAnswering) {
                  onUpdateAnsweringModel(model.id, update);
                } else {
                  onUpdateParsingModel(model.id, update);
                }
              }}
              disabled={isRunning}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              placeholder="e.g., http://localhost:11434/v1"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              OpenAI-compatible API endpoint (e.g., vLLM, Ollama, Azure OpenAI)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={model.endpoint_api_key || ''}
              onChange={(e) => {
                const update = { endpoint_api_key: e.target.value };
                if (isAnswering) {
                  onUpdateAnsweringModel(model.id, update);
                } else {
                  onUpdateParsingModel(model.id, update);
                }
              }}
              disabled={isRunning}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              placeholder="Enter your API key"
            />
            <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
              Passed directly to your endpoint (not stored server-side)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Model Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={model.model_name}
              onChange={(e) => {
                const update = { model_name: e.target.value };
                if (isAnswering) {
                  onUpdateAnsweringModel(model.id, update);
                } else {
                  onUpdateParsingModel(model.id, update);
                }
              }}
              disabled={isRunning}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              placeholder="e.g., llama2, gpt-4"
            />
          </div>
        </div>
      )}

      {/* Model Name - Show for LangChain and OpenRouter interfaces */}
      {(model.interface === 'langchain' || model.interface === 'openrouter') && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Model Name</label>
          <input
            type="text"
            value={model.model_name}
            onChange={(e) => {
              const update = { model_name: e.target.value };
              if (isAnswering) {
                onUpdateAnsweringModel(model.id, update);
              } else {
                onUpdateParsingModel(model.id, update);
              }
            }}
            disabled={isRunning}
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            placeholder="e.g., gpt-4, claude-3-opus, gemini-pro"
          />
        </div>
      )}

      {/* Temperature - Show for LangChain, OpenRouter, and OpenAI Endpoint interfaces */}
      {(model.interface === 'langchain' ||
        model.interface === 'openrouter' ||
        model.interface === 'openai_endpoint') && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Temperature: {model.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={model.temperature}
            onChange={(e) => {
              const update = { temperature: parseFloat(e.target.value) };
              if (isAnswering) {
                onUpdateAnsweringModel(model.id, update);
              } else {
                onUpdateParsingModel(model.id, update);
              }
            }}
            disabled={isRunning}
            className="w-full"
          />
        </div>
      )}

      {/* System Prompt - Show for LangChain, OpenRouter, and OpenAI Endpoint interfaces */}
      {(model.interface === 'langchain' ||
        model.interface === 'openrouter' ||
        model.interface === 'openai_endpoint') && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">System Prompt</label>
            <button
              type="button"
              onClick={() => onTogglePromptExpanded(model.id)}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {expandedPrompts.has(model.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {expandedPrompts.has(model.id) && (
            <textarea
              value={model.system_prompt}
              onChange={(e) => {
                const update = { system_prompt: e.target.value };
                if (isAnswering) {
                  onUpdateAnsweringModel(model.id, update);
                } else {
                  onUpdateParsingModel(model.id, update);
                }
              }}
              disabled={isRunning}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs"
              rows={3}
              placeholder="Define the model's role and behavior..."
            />
          )}

          {!expandedPrompts.has(model.id) && (
            <div className="text-xs text-slate-500 dark:text-slate-400 p-2 bg-slate-50 dark:bg-slate-700/30 rounded border border-slate-200 dark:border-slate-600">
              {model.system_prompt.length > 60 ? model.system_prompt.substring(0, 60) + '...' : model.system_prompt}
            </div>
          )}
        </div>
      )}

      {/* MCP and Extra Arguments Configuration - Show for non-manual interface */}
      {model.interface !== 'manual' && (
        <div className="mt-3 flex items-center gap-2">
          {/* MCP Configuration - Show only for answering models */}
          {isAnswering && (
            <button
              onClick={() => setMcpModalState({ isOpen: true, modelId: model.id })}
              className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2 disabled:opacity-50"
              disabled={isRunning}
            >
              <Settings className="w-4 h-4" />
              <span>Configure MCP</span>
              {model.mcp_tool_filter && model.mcp_tool_filter.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                  {model.mcp_tool_filter.length} tools
                </span>
              )}
            </button>
          )}

          {/* Extra Arguments Configuration - Show for all models */}
          <button
            onClick={() => setExtraKwargsModalState({ isOpen: true, modelId: model.id, isAnswering })}
            className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2 disabled:opacity-50"
            disabled={isRunning}
          >
            <Settings className="w-4 h-4" />
            <span>Extra Arguments</span>
            {model.extra_kwargs && Object.keys(model.extra_kwargs).length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">
                {Object.keys(model.extra_kwargs).length} params
              </span>
            )}
          </button>
        </div>
      )}

      {/* Manual Trace Upload - Show only for answering models with manual interface */}
      {isAnswering && model.interface === 'manual' && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
          <ManualTraceUpload
            onUploadSuccess={onManualTraceUploadSuccess}
            onUploadError={onManualTraceUploadError}
            className="text-sm"
            finishedTemplates={finishedTemplates}
          />
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Configuration Section - Multiple Models Support */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Answering Models Configuration */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Answering Models ({answeringModels.length})
            </h3>
            <button
              onClick={onAddAnsweringModel}
              disabled={isRunning}
              className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 text-sm"
            >
              <Plus className="w-3 h-3" />
              Add Model
            </button>
          </div>
          <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
            Models used to generate answers to questions. Tests will run for all model combinations.
          </p>

          <div className="space-y-4">
            {answeringModels.map((model, index) => renderModelConfiguration(model, index, true))}
          </div>
        </Card>

        {/* Parsing Models Configuration */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Parsing Models ({parsingModels.length})
            </h3>
            <button
              onClick={onAddParsingModel}
              disabled={isRunning}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 text-sm"
            >
              <Plus className="w-3 h-3" />
              Add Model
            </button>
          </div>
          <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
            Models used to parse and validate responses against Pydantic templates.
          </p>

          <div className="space-y-4">
            {parsingModels.map((model, index) => renderModelConfiguration(model, index, false))}
          </div>
        </Card>
      </div>

      {/* Evaluation Configuration */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Evaluation Settings</h3>

          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={correctnessEnabled}
                onChange={(e) => onCorrectnessEnabledChange(e.target.checked)}
                disabled={isRunning}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300"> Correctness</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">(Basic answer validation and parsing)</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={rubricEnabled}
                onChange={(e) => onRubricEnabledChange(e.target.checked)}
                disabled={isRunning}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300"> Rubric</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                (Qualitative evaluation using defined traits)
              </span>
            </label>

            {/* Evaluation Mode Selector */}
            {rubricEnabled && (
              <div className="ml-7 mt-2 space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Evaluation Mode
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="evaluation-mode"
                      value="template_and_rubric"
                      checked={evaluationMode === 'template_and_rubric'}
                      onChange={(e) =>
                        onEvaluationModeChange(
                          e.target.value as 'template_only' | 'template_and_rubric' | 'rubric_only'
                        )
                      }
                      disabled={isRunning}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Template + Rubric</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="evaluation-mode"
                      value="rubric_only"
                      checked={evaluationMode === 'rubric_only'}
                      onChange={(e) =>
                        onEvaluationModeChange(
                          e.target.value as 'template_only' | 'template_and_rubric' | 'rubric_only'
                        )
                      }
                      disabled={isRunning}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Rubric Only</span>
                  </label>
                </div>
              </div>
            )}

            {/* Rubric Evaluation Strategy Selector */}
            {rubricEnabled && (
              <div className="ml-7 mt-2 space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Rubric Evaluation Strategy
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="rubric-strategy"
                      value="batch"
                      checked={rubricEvaluationStrategy === 'batch'}
                      onChange={(e) => onRubricEvaluationStrategyChange(e.target.value as 'batch' | 'sequential')}
                      disabled={isRunning}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">All Together (Batch)</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="rubric-strategy"
                      value="sequential"
                      checked={rubricEvaluationStrategy === 'sequential'}
                      onChange={(e) => onRubricEvaluationStrategyChange(e.target.value as 'batch' | 'sequential')}
                      disabled={isRunning}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">One by One (Sequential)</span>
                  </label>
                </div>
              </div>
            )}

            <label
              className="flex items-center space-x-3"
              title="Detect when models refuse to answer or abstain. When detected, marks the result as abstained regardless of other verification outcomes."
            >
              <input
                type="checkbox"
                checked={abstentionEnabled}
                onChange={(e) => onAbstentionEnabledChange(e.target.checked)}
                disabled={isRunning}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300"> Abstention Detection</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                (Detect refusals and mark as abstained)
              </span>
            </label>

            {/* Deep-Judgment Configuration */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Deep-Judgment</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  (Multi-stage LLM evaluation with evidence extraction)
                </span>
              </div>

              {/* Templates Deep-Judgment */}
              <div className="ml-4 space-y-2">
                <label
                  className="flex items-center space-x-3"
                  title="Extract excerpts and reasoning for template validation. Always extracts excerpts when enabled."
                >
                  <input
                    type="checkbox"
                    checked={deepJudgmentTemplateEnabled}
                    onChange={(e) => onDeepJudgmentTemplateEnabledChange(e.target.checked)}
                    disabled={isRunning}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Templates</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">(Always extracts excerpts)</span>
                </label>

                {deepJudgmentTemplateEnabled && (
                  <div className="ml-7 mt-2">
                    <label
                      className="flex items-center space-x-3"
                      title="Validate excerpts against external search results to detect potential hallucinations."
                    >
                      <input
                        type="checkbox"
                        checked={deepJudgmentSearchEnabled}
                        onChange={(e) => onDeepJudgmentSearchEnabledChange(e.target.checked)}
                        disabled={isRunning}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Search Enhancement</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        (Validate with external search)
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Rubrics Deep-Judgment */}
              <div className="ml-4 space-y-2">
                <label
                  className="flex items-center space-x-3"
                  title="Extract excerpts and reasoning for LLM trait evaluation in rubrics."
                >
                  <input
                    type="checkbox"
                    checked={deepJudgmentRubricEnabled}
                    onChange={(e) => onDeepJudgmentRubricEnabledChange(e.target.checked)}
                    disabled={isRunning}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Rubrics</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">(LLM trait evaluation)</span>
                </label>

                {deepJudgmentRubricEnabled && (
                  <div className="ml-7 mt-2 space-y-3">
                    {/* Mode Selection */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Mode</label>
                      <div className="space-y-1">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="deep-judgment-rubric-mode"
                            value="enable_all"
                            checked={deepJudgmentRubricMode === 'enable_all'}
                            onChange={(e) =>
                              onDeepJudgmentRubricModeChange(e.target.value as 'enable_all' | 'use_checkpoint')
                            }
                            disabled={isRunning}
                            className="h-3 w-3 text-violet-600 focus:ring-violet-500 border-slate-300"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300">Enable All</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">(Apply to all LLM traits)</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="deep-judgment-rubric-mode"
                            value="use_checkpoint"
                            checked={deepJudgmentRubricMode === 'use_checkpoint'}
                            onChange={(e) =>
                              onDeepJudgmentRubricModeChange(e.target.value as 'enable_all' | 'use_checkpoint')
                            }
                            disabled={isRunning}
                            className="h-3 w-3 text-violet-600 focus:ring-violet-500 border-slate-300"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300">Use Checkpoint</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">(Per-trait configuration)</span>
                        </label>
                      </div>
                    </div>

                    {/* Extract Excerpts - Only show for enable_all mode */}
                    {deepJudgmentRubricMode === 'enable_all' && (
                      <div className="ml-0">
                        <label className="flex items-center space-x-2" title="Extract excerpts for rubric traits.">
                          <input
                            type="checkbox"
                            checked={deepJudgmentRubricExtractExcerpts}
                            onChange={(e) => onDeepJudgmentRubricExtractExcerptsChange(e.target.checked)}
                            disabled={isRunning}
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300">Extract Excerpts</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={fewShotEnabled}
                onChange={(e) => onFewShotEnabledChange(e.target.checked)}
                disabled={isRunning}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300"> Few-shot Prompting</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                (Use examples to improve LLM performance)
              </span>
            </label>
          </div>

          {/* Few-shot Configuration */}
          {fewShotEnabled && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Few-shot Mode
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="few-shot-mode"
                      value="all"
                      checked={fewShotMode === 'all'}
                      onChange={(e) => onFewShotModeChange(e.target.value as 'all' | 'k-shot' | 'custom')}
                      disabled={isRunning}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Use all available examples</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="few-shot-mode"
                      value="k-shot"
                      checked={fewShotMode === 'k-shot'}
                      onChange={(e) => onFewShotModeChange(e.target.value as 'all' | 'k-shot' | 'custom')}
                      disabled={isRunning}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Use k examples per question</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="few-shot-mode"
                      value="custom"
                      checked={fewShotMode === 'custom'}
                      onChange={(e) => onFewShotModeChange(e.target.value as 'all' | 'k-shot' | 'custom')}
                      disabled={isRunning}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Custom examples selection</span>
                  </label>
                </div>
              </div>

              {fewShotMode === 'k-shot' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Number of Examples (k)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={fewShotK}
                    onChange={(e) => onFewShotKChange(parseInt(e.target.value))}
                    disabled={isRunning}
                    className="w-24 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Maximum number of examples to use per question (1-10)
                  </p>
                </div>
              )}

              <div className="p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-md">
                <p className="text-sm text-violet-800 dark:text-violet-200">
                  <strong>Note:</strong> Few-shot examples are defined per question in the Template Curator. Questions
                  without examples will use zero-shot prompting even when this feature is enabled.
                </p>
              </div>
            </div>
          )}

          {!correctnessEnabled && !rubricEnabled && (
            <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-sm text-amber-800 dark:text-amber-200">
              ⚠ At least one evaluation method should be enabled
            </div>
          )}
        </div>
      </Card>

      {/* Model Combinations Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-blue-900 dark:text-blue-100">Test Combinations</span>
        </div>
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          With {answeringModels.length} answering model(s), {parsingModels.length} parsing model(s), and{' '}
          {replicateCount} replicate(s), each selected test will run{' '}
          <span className="font-semibold">{answeringModels.length * parsingModels.length * replicateCount}</span> times
          (one for each model combination × replicate).
        </p>
      </div>

      {/* MCP Configuration Modal */}
      <MCPConfigurationModal
        isOpen={mcpModalState.isOpen}
        onClose={() => setMcpModalState({ isOpen: false, modelId: null })}
        onSave={handleMCPSave}
        initialConfig={getCurrentMCPConfig()}
      />

      <ExtraKwargsModal
        isOpen={extraKwargsModalState.isOpen}
        onClose={() => setExtraKwargsModalState({ isOpen: false, modelId: null, isAnswering: true })}
        onSave={handleExtraKwargsSave}
        initialKwargs={getCurrentExtraKwargs()}
      />
    </>
  );
};
