import React from 'react';
import { Settings } from 'lucide-react';

export interface ModelConfig {
  model_provider: string;
  model_name: string;
  temperature: number;
  interface: string;
}

interface ModelConfigPanelProps {
  config: ModelConfig;
  onChange: (config: ModelConfig) => void;
  title?: string;
  disabled?: boolean;
}

export const ModelConfigPanel: React.FC<ModelConfigPanelProps> = ({
  config,
  onChange,
  title = "Model Configuration",
  disabled = false
}) => {
  const handleConfigChange = (field: keyof ModelConfig, value: any) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        {title}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Model Provider */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Provider
          </label>
          <select
            value={config.model_provider}
            onChange={(e) => handleConfigChange('model_provider', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm transition-all duration-200 text-slate-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="google_genai">Google GenAI</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        {/* Model Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Model
          </label>
          <select
            value={config.model_name}
            onChange={(e) => handleConfigChange('model_name', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm transition-all duration-200 text-slate-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {config.model_provider === 'google_genai' && (
              <>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              </>
            )}
            {config.model_provider === 'openai' && (
              <>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </>
            )}
            {config.model_provider === 'anthropic' && (
              <>
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
              </>
            )}
            {config.model_provider === 'openrouter' && (
              <>
                <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                <option value="openai/gpt-4o">GPT-4o</option>
                <option value="google/gemini-2.0-flash">Gemini 2.0 Flash</option>
              </>
            )}
          </select>
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Temperature: {config.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.temperature}
            onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${config.temperature * 100}%, #e2e8f0 ${config.temperature * 100}%, #e2e8f0 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Deterministic</span>
            <span>Creative</span>
          </div>
        </div>

        {/* Interface */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Interface
          </label>
          <select
            value={config.interface}
            onChange={(e) => handleConfigChange('interface', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm transition-all duration-200 text-slate-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="langchain">LangChain</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>
      </div>
    </div>
  );
}; 