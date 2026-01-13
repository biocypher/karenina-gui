import React from 'react';
import { Trash2, ChevronDown, ChevronUp, Settings, X } from 'lucide-react';
import { ManualTraceUpload } from '../ManualTraceUpload';
import type { AgentMiddlewareConfig } from '../../types';

interface ModelConfiguration {
  id: string;
  model_provider: string;
  model_name: string;
  temperature: number;
  interface: 'langchain' | 'openrouter' | 'manual' | 'openai_endpoint' | 'native_sdk';
  system_prompt: string;
  endpoint_base_url?: string;
  endpoint_api_key?: string;
  mcp_urls_dict?: Record<string, string>;
  mcp_tool_filter?: string[];
  mcp_validated_servers?: Record<string, string>;
  use_full_trace_for_template?: boolean;
  use_full_trace_for_rubric?: boolean;
  extra_kwargs?: Record<string, unknown>;
  agent_middleware?: AgentMiddlewareConfig;
  max_context_tokens?: number;
}

export interface ModelConfigurationSectionProps {
  model: ModelConfiguration;
  index: number;
  isAnswering: boolean;
  expandedPrompts: Set<string>;
  isRunning: boolean;
  finishedTemplates?: Array<[string, unknown]>;
  canRemove: boolean;
  onUpdateModel: (id: string, updates: Partial<ModelConfiguration>) => void;
  onRemoveModel: (id: string) => void;
  onTogglePromptExpanded: (modelId: string) => void;
  onConfigureMCP: (modelId: string) => void;
  onRemoveMCP: (modelId: string) => void;
  onConfigureExtraKwargs: (modelId: string, isAnswering: boolean) => void;
  onManualTraceUploadSuccess?: (traceCount: number) => void;
  onManualTraceUploadError?: (error: string) => void;
}

export const ModelConfigurationSection: React.FC<ModelConfigurationSectionProps> = ({
  model,
  index,
  isAnswering,
  expandedPrompts,
  isRunning,
  finishedTemplates,
  canRemove,
  onUpdateModel,
  onRemoveModel,
  onTogglePromptExpanded,
  onConfigureMCP,
  onRemoveMCP,
  onConfigureExtraKwargs,
  onManualTraceUploadSuccess,
  onManualTraceUploadError,
}) => {
  const handleUpdate = (updates: Partial<ModelConfiguration>) => {
    onUpdateModel(model.id, updates);
  };

  return (
    <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-slate-800 dark:text-slate-200">Model {index + 1}</h4>
        {canRemove && (
          <button
            onClick={() => onRemoveModel(model.id)}
            disabled={isRunning}
            className="text-red-600 hover:text-red-700 disabled:text-slate-400"
            title="Remove model"
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
              onChange={() => handleUpdate({ interface: 'langchain' })}
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
              onChange={() => handleUpdate({ interface: 'openrouter' })}
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
              onChange={() => handleUpdate({ interface: 'openai_endpoint' })}
              disabled={isRunning}
              className="mr-2"
            />
            OpenAI Endpoint
          </label>
          <label className="flex items-center text-slate-900 dark:text-white">
            <input
              type="radio"
              name={`${model.id}-interface`}
              value="native_sdk"
              checked={model.interface === 'native_sdk'}
              onChange={() => {
                // When switching to native_sdk, force provider to be openai or anthropic
                const currentProvider = model.model_provider;
                const validNativeSdkProvider =
                  currentProvider === 'openai' || currentProvider === 'anthropic' ? currentProvider : 'openai';
                handleUpdate({ interface: 'native_sdk', model_provider: validNativeSdkProvider });
              }}
              disabled={isRunning}
              className="mr-2"
            />
            Native SDK
          </label>
          {isAnswering && (
            <label className="flex items-center text-slate-900 dark:text-white">
              <input
                type="radio"
                name={`${model.id}-interface`}
                value="manual"
                checked={model.interface === 'manual'}
                onChange={() => handleUpdate({ interface: 'manual' })}
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
            onChange={(e) => handleUpdate({ model_provider: e.target.value })}
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
              onChange={(e) => handleUpdate({ endpoint_base_url: e.target.value })}
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
              onChange={(e) => handleUpdate({ endpoint_api_key: e.target.value })}
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
              onChange={(e) => handleUpdate({ model_name: e.target.value })}
              disabled={isRunning}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              placeholder="e.g., llama2, gpt-4"
            />
          </div>
        </div>
      )}

      {/* Native SDK Configuration - Show only for native_sdk interface */}
      {model.interface === 'native_sdk' && (
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Provider <span className="text-red-500">*</span>
            </label>
            <select
              value={model.model_provider}
              onChange={(e) => handleUpdate({ model_provider: e.target.value })}
              disabled={isRunning}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Direct SDK calls without LangChain abstraction
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Model Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={model.model_name}
              onChange={(e) => handleUpdate({ model_name: e.target.value })}
              disabled={isRunning}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              placeholder={
                model.model_provider === 'openai' ? 'e.g., gpt-4.1-mini, gpt-4o' : 'e.g., claude-sonnet-4-20250514'
              }
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
            onChange={(e) => handleUpdate({ model_name: e.target.value })}
            disabled={isRunning}
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            placeholder="e.g., gpt-4, claude-3-opus, gemini-pro"
          />
        </div>
      )}

      {/* Temperature - Show for LangChain, OpenRouter, OpenAI Endpoint, and Native SDK interfaces */}
      {(model.interface === 'langchain' ||
        model.interface === 'openrouter' ||
        model.interface === 'openai_endpoint' ||
        model.interface === 'native_sdk') && (
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
            onChange={(e) => handleUpdate({ temperature: parseFloat(e.target.value) })}
            disabled={isRunning}
            className="w-full"
          />
        </div>
      )}

      {/* System Prompt - Show for LangChain, OpenRouter, OpenAI Endpoint, and Native SDK interfaces */}
      {(model.interface === 'langchain' ||
        model.interface === 'openrouter' ||
        model.interface === 'openai_endpoint' ||
        model.interface === 'native_sdk') && (
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
              onChange={(e) => handleUpdate({ system_prompt: e.target.value })}
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
              onClick={() => onConfigureMCP(model.id)}
              className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2 disabled:opacity-50"
              disabled={isRunning}
            >
              <Settings className="w-4 h-4" />
              <span>Configure MCP</span>
              {model.mcp_tool_filter && model.mcp_tool_filter.length > 0 && (
                <span className="ml-2 pl-1 pr-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs flex items-center gap-1">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isRunning) onRemoveMCP(model.id);
                    }}
                    className="p-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800 hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-colors"
                    title="Remove MCP configuration"
                  >
                    <X className="w-3 h-3" />
                  </span>
                  {model.mcp_tool_filter.length} tools
                </span>
              )}
            </button>
          )}

          {/* Extra Arguments Configuration - Show for all models */}
          <button
            onClick={() => onConfigureExtraKwargs(model.id, isAnswering)}
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
};
