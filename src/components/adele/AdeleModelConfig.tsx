/**
 * AdeleModelConfig - Model configuration UI for ADeLe classification.
 *
 * Simplified model config based on ModelConfigurationSection pattern.
 * Supports: LangChain, OpenRouter, and OpenAI Endpoint interfaces.
 */

import React from 'react';
import type { AdeleModelConfig as AdeleModelConfigType, AdeleInterface } from '../../stores/useAdeleConfigStore';

interface AdeleModelConfigProps {
  /** Current model configuration */
  config: AdeleModelConfigType;
  /** Callback when configuration changes */
  onChange: (config: Partial<AdeleModelConfigType>) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Unique ID prefix for radio buttons */
  idPrefix?: string;
}

export const AdeleModelConfig: React.FC<AdeleModelConfigProps> = ({
  config,
  onChange,
  disabled = false,
  idPrefix = 'adele-model',
}) => {
  const handleInterfaceChange = (newInterface: AdeleInterface) => {
    onChange({ interface: newInterface });
  };

  return (
    <div className="space-y-4">
      {/* Interface Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Interface</label>
        <div className="flex gap-4 flex-wrap">
          <label className="flex items-center text-slate-900 dark:text-white cursor-pointer">
            <input
              type="radio"
              name={`${idPrefix}-interface`}
              value="langchain"
              checked={config.interface === 'langchain'}
              onChange={() => handleInterfaceChange('langchain')}
              disabled={disabled}
              className="mr-2"
            />
            LangChain
          </label>
          <label className="flex items-center text-slate-900 dark:text-white cursor-pointer">
            <input
              type="radio"
              name={`${idPrefix}-interface`}
              value="openrouter"
              checked={config.interface === 'openrouter'}
              onChange={() => handleInterfaceChange('openrouter')}
              disabled={disabled}
              className="mr-2"
            />
            OpenRouter
          </label>
          <label className="flex items-center text-slate-900 dark:text-white cursor-pointer">
            <input
              type="radio"
              name={`${idPrefix}-interface`}
              value="openai_endpoint"
              checked={config.interface === 'openai_endpoint'}
              onChange={() => handleInterfaceChange('openai_endpoint')}
              disabled={disabled}
              className="mr-2"
            />
            OpenAI Endpoint
          </label>
        </div>
      </div>

      {/* Provider - Show only for LangChain interface */}
      {config.interface === 'langchain' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Provider</label>
          <input
            type="text"
            value={config.provider}
            onChange={(e) => onChange({ provider: e.target.value })}
            disabled={disabled}
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-50"
            placeholder="e.g., google_genai, openai, anthropic"
          />
        </div>
      )}

      {/* OpenAI Endpoint Configuration */}
      {config.interface === 'openai_endpoint' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Endpoint Base URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={config.endpointBaseUrl || ''}
              onChange={(e) => onChange({ endpointBaseUrl: e.target.value })}
              disabled={disabled}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-50"
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
              value={config.endpointApiKey || ''}
              onChange={(e) => onChange({ endpointApiKey: e.target.value })}
              disabled={disabled}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-50"
              placeholder="Enter your API key"
            />
            <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
              Passed directly to your endpoint (not stored server-side)
            </p>
          </div>
        </div>
      )}

      {/* Model Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Model Name</label>
        <input
          type="text"
          value={config.modelName}
          onChange={(e) => onChange({ modelName: e.target.value })}
          disabled={disabled}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-50"
          placeholder={
            config.interface === 'openrouter'
              ? 'e.g., anthropic/claude-3.5-haiku'
              : 'e.g., claude-3-5-haiku-latest, gpt-4o-mini'
          }
        />
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Temperature: {config.temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={config.temperature}
          onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
          disabled={disabled}
          className="w-full"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Lower values (0.0) produce more deterministic classifications
        </p>
      </div>
    </div>
  );
};

export default AdeleModelConfig;
