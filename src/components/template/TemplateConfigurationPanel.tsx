import React from 'react';

// ============================================================================
// Types
// ============================================================================

export type InterfaceType = 'langchain' | 'openrouter' | 'openai_endpoint';

export interface TemplateConfig {
  interface: InterfaceType;
  model_provider?: string;
  model_name: string;
  endpoint_base_url?: string;
  endpoint_api_key?: string;
  temperature: number;
}

export interface TemplateConfigurationPanelProps {
  config: TemplateConfig;
  setConfig: (config: TemplateConfig | ((prev: TemplateConfig) => TemplateConfig)) => void;
  isGenerating: boolean;
  selectedQuestionsCount: number;
  onStartGeneration: () => void;
  onCancelGeneration: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const TemplateConfigurationPanel: React.FC<TemplateConfigurationPanelProps> = ({
  config,
  setConfig,
  isGenerating,
  selectedQuestionsCount,
  onStartGeneration,
  onCancelGeneration,
}) => {
  return (
    <>
      {/* Interface Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">LLM Interface</label>
        <div className="flex gap-4 flex-wrap">
          <label className="flex items-center">
            <input
              type="radio"
              name="interface"
              value="langchain"
              checked={config.interface === 'langchain'}
              onChange={(e) =>
                setConfig({
                  ...config,
                  interface: e.target.value as InterfaceType,
                })
              }
              disabled={isGenerating}
              className="mr-2"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">LangChain (requires provider)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="interface"
              value="openrouter"
              checked={config.interface === 'openrouter'}
              onChange={(e) =>
                setConfig({
                  ...config,
                  interface: e.target.value as InterfaceType,
                })
              }
              disabled={isGenerating}
              className="mr-2"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">OpenRouter (no provider needed)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="interface"
              value="openai_endpoint"
              checked={config.interface === 'openai_endpoint'}
              onChange={(e) =>
                setConfig({
                  ...config,
                  interface: e.target.value as InterfaceType,
                })
              }
              disabled={isGenerating}
              className="mr-2"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">OpenAI Endpoint (custom API)</span>
          </label>
        </div>
      </div>

      {/* Configuration */}
      {config.interface === 'openai_endpoint' ? (
        /* OpenAI Endpoint Configuration */
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Endpoint Base URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={config.endpoint_base_url || ''}
              onChange={(e) => setConfig({ ...config, endpoint_base_url: e.target.value })}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              disabled={isGenerating}
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
              value={config.endpoint_api_key || ''}
              onChange={(e) => setConfig({ ...config, endpoint_api_key: e.target.value })}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              disabled={isGenerating}
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
              value={config.model_name}
              onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              disabled={isGenerating}
              placeholder="e.g., llama2, gpt-4"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Temperature ({config.temperature})
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.temperature}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
              className="w-full slider-horizontal"
              disabled={isGenerating}
            />
          </div>
        </div>
      ) : (
        /* LangChain and OpenRouter Configuration */
        <div
          className={`grid grid-cols-1 ${config.interface === 'langchain' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-6`}
        >
          {config.interface === 'langchain' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Model Provider
              </label>
              <input
                type="text"
                value={config.model_provider}
                onChange={(e) => setConfig({ ...config, model_provider: e.target.value })}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                disabled={isGenerating}
                placeholder="e.g., google_genai, openai, anthropic, ollama"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Model Name</label>
            <input
              type="text"
              value={config.model_name}
              onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              disabled={isGenerating}
              placeholder={
                config.interface === 'langchain'
                  ? 'e.g., gemini-2.0-flash, gpt-4'
                  : 'e.g., meta-llama/llama-3.2-3b-instruct:free'
              }
            />
            {config.interface === 'openrouter' && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Use OpenRouter model format: provider/model-name
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Temperature ({config.temperature})
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.temperature}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
              className="w-full slider-horizontal"
              disabled={isGenerating}
            />
          </div>
        </div>
      )}

      {/* Generation Controls */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <button
          onClick={onStartGeneration}
          disabled={isGenerating || selectedQuestionsCount === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
        >
          <span className="text-sm font-medium">Generate Templates ({selectedQuestionsCount} questions)</span>
        </button>

        {isGenerating && (
          <button
            onClick={onCancelGeneration}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-xl hover:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <span className="text-sm font-medium">Cancel</span>
          </button>
        )}
      </div>
    </>
  );
};
