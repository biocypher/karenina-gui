import React from 'react';
import { Settings, Loader2, Sparkles } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface GenerationConfig {
  model_provider: string;
  model_name: string;
  temperature: number;
  interface: 'langchain' | 'openrouter';
}

export interface TemplateGenerationSectionProps {
  isGenerating: boolean;
  hasQuestion: boolean;
  hasRawAnswer: boolean;
  generatedTemplate: string | null;
  generationError: string | null;
  isSettingsOpen: boolean;
  config: GenerationConfig;
  onGenerate: () => void;
  onToggleSettings: () => void;
  onConfigChange: (config: GenerationConfig | ((prev: GenerationConfig) => GenerationConfig)) => void;
}

// ============================================================================
// Component
// ============================================================================

export const TemplateGenerationSection: React.FC<TemplateGenerationSectionProps> = ({
  isGenerating,
  hasQuestion,
  hasRawAnswer,
  generatedTemplate,
  generationError,
  isSettingsOpen,
  config,
  onGenerate,
  onToggleSettings,
  onConfigChange,
}) => {
  const canGenerate = hasQuestion && hasRawAnswer;

  return (
    <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
      <div className="space-y-4">
        {/* Button Row */}
        <div className="flex items-center gap-2">
          <button
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            className="px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Answer Template
              </>
            )}
          </button>

          {/* Settings Toggle Button */}
          <button
            onClick={onToggleSettings}
            disabled={isGenerating}
            className="p-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Generation settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Collapsible Settings Panel */}
        {isSettingsOpen && (
          <GenerationSettingsPanel config={config} onConfigChange={onConfigChange} disabled={isGenerating} />
        )}

        {/* Status Messages */}
        <div>
          {generatedTemplate && (
            <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              Template generated successfully!
            </div>
          )}
          {generationError && <div className="text-sm text-red-600 dark:text-red-400">Error: {generationError}</div>}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Generation Settings Panel Component
// ============================================================================

interface GenerationSettingsPanelProps {
  config: GenerationConfig;
  onConfigChange: (config: GenerationConfig | ((prev: GenerationConfig) => GenerationConfig)) => void;
  disabled?: boolean;
}

const GenerationSettingsPanel: React.FC<GenerationSettingsPanelProps> = ({
  config,
  onConfigChange,
  disabled = false,
}) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600 rounded-lg p-4 space-y-4">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Generation Settings</h4>

      {/* Interface Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Interface</label>
        <div className="flex gap-4">
          <label className="flex items-center text-slate-900 dark:text-white">
            <input
              type="radio"
              value="langchain"
              checked={config.interface === 'langchain'}
              onChange={(e) => onConfigChange({ ...config, interface: e.target.value as 'langchain' | 'openrouter' })}
              disabled={disabled}
              className="mr-2"
            />
            LangChain
          </label>
          <label className="flex items-center text-slate-900 dark:text-white">
            <input
              type="radio"
              value="openrouter"
              checked={config.interface === 'openrouter'}
              onChange={(e) => onConfigChange({ ...config, interface: e.target.value as 'langchain' | 'openrouter' })}
              disabled={disabled}
              className="mr-2"
            />
            OpenRouter
          </label>
        </div>
      </div>

      {/* Provider (for LangChain) */}
      {config.interface === 'langchain' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Provider</label>
          <input
            type="text"
            value={config.model_provider}
            onChange={(e) => onConfigChange({ ...config, model_provider: e.target.value })}
            placeholder="e.g., openai, google_genai, anthropic"
            disabled={disabled}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      )}

      {/* Model Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Model Name</label>
        <input
          type="text"
          value={config.model_name}
          onChange={(e) => onConfigChange({ ...config, model_name: e.target.value })}
          placeholder={config.interface === 'openrouter' ? 'e.g., openai/gpt-4' : 'e.g., gpt-4.1-mini'}
          disabled={disabled}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Temperature: {config.temperature}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={config.temperature}
          onChange={(e) => onConfigChange({ ...config, temperature: parseFloat(e.target.value) })}
          disabled={disabled}
          className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
};
