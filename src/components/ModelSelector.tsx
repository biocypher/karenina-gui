import React from 'react';
import { TemplateGenerationConfig, RubricTraitGenerationConfig } from '../types';

interface ModelSelectorProps {
  config: TemplateGenerationConfig | RubricTraitGenerationConfig;
  onConfigChange: (config: TemplateGenerationConfig | RubricTraitGenerationConfig) => void;
  disabled?: boolean;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  config,
  onConfigChange,
  disabled = false,
  className = ''
}) => {
  const handleInterfaceChange = (interface_type: 'langchain' | 'openrouter') => {
    onConfigChange({ ...config, interface: interface_type });
  };

  const handleProviderChange = (provider: string) => {
    onConfigChange({ ...config, model_provider: provider });
  };

  const handleModelNameChange = (modelName: string) => {
    onConfigChange({ ...config, model_name: modelName });
  };

  const handleTemperatureChange = (temperature: number) => {
    onConfigChange({ ...config, temperature });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Interface Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          LLM Interface
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="interface"
              value="langchain"
              checked={config.interface === 'langchain'}
              onChange={(e) => handleInterfaceChange(e.target.value as 'langchain' | 'openrouter')}
              disabled={disabled}
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
              onChange={(e) => handleInterfaceChange(e.target.value as 'langchain' | 'openrouter')}
              disabled={disabled}
              className="mr-2"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">OpenRouter (no provider needed)</span>
          </label>
        </div>
      </div>

      {/* Configuration */}
      <div className={`grid grid-cols-1 ${config.interface === 'langchain' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        {config.interface === 'langchain' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Model Provider
            </label>
            <input
              type="text"
              value={config.model_provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              disabled={disabled}
              placeholder="e.g., google_genai, openai, anthropic, ollama"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Model Name
          </label>
          <input
            type="text"
            value={config.model_name}
            onChange={(e) => handleModelNameChange(e.target.value)}
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            disabled={disabled}
            placeholder={config.interface === 'langchain' ? 'e.g., gemini-2.0-flash, gpt-4' : 'e.g., meta-llama/llama-3.2-3b-instruct:free'}
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
            onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
            className="w-full slider-horizontal"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};