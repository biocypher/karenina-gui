/**
 * DefaultsConfigTab - Configuration tab for default LLM settings
 *
 * Extracted from ConfigurationModal.tsx to reduce component size.
 * Handles interface selection, provider/model configuration, and preset application.
 */

import React from 'react';
import { CheckCircle, FileText, RefreshCw, RotateCcw, Save } from 'lucide-react';
import { useConfigStore } from '../../stores/useConfigStore';
import { usePresetStore } from '../../stores/usePresetStore';
import type { Preset } from '../../types';

export interface DefaultsConfigTabProps {
  saveSuccess: boolean;
  presetAppliedSuccess: boolean;
  selectedPresetId: string;
  setSaveSuccess: (value: boolean) => void;
  setPresetAppliedSuccess: (value: boolean) => void;
  setSelectedPresetId: (value: string) => void;
  setLocalError: (error: string | null) => void;
}

export function DefaultsConfigTab({
  saveSuccess,
  presetAppliedSuccess,
  selectedPresetId,
  setSaveSuccess,
  setPresetAppliedSuccess,
  setSelectedPresetId,
  setLocalError,
}: DefaultsConfigTabProps): JSX.Element {
  const {
    defaultInterface,
    defaultProvider,
    defaultModel,
    defaultEndpointBaseUrl,
    defaultEndpointApiKey,
    isSavingDefaults,
    hasUnsavedDefaults,
    updateDefaultInterface,
    updateDefaultProvider,
    updateDefaultModel,
    updateDefaultEndpointBaseUrl,
    updateDefaultEndpointApiKey,
    saveDefaults,
    resetDefaults,
  } = useConfigStore();

  const { presets, getPresetDetail } = usePresetStore();

  // Handle saving defaults
  const handleSaveDefaults = async () => {
    setLocalError(null);
    setSaveSuccess(false);
    try {
      await saveDefaults();
      setSaveSuccess(true);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Failed to save defaults');
    }
  };

  // Handle resetting defaults
  const handleResetDefaults = () => {
    resetDefaults();
    setSaveSuccess(false);
    setLocalError(null);
  };

  // Handle applying preset settings to default configuration
  const handleApplyPreset = async (presetId: string) => {
    if (!presetId) return;

    setLocalError(null);
    setPresetAppliedSuccess(false);

    try {
      const preset = await getPresetDetail(presetId);
      if (!preset) {
        setLocalError('Failed to load preset details');
        return;
      }

      // Extract first answering model as source for default settings
      const answeringModels = preset.config.answering_models;
      if (!answeringModels || answeringModels.length === 0) {
        setLocalError('Preset has no answering models configured');
        return;
      }

      const model = answeringModels[0];

      // Apply model configuration to default settings
      updateDefaultInterface(model.interface as 'langchain' | 'openrouter' | 'openai_endpoint');
      updateDefaultProvider(model.model_provider || '');
      updateDefaultModel(model.model_name || '');

      // Apply endpoint-specific settings if using openai_endpoint interface
      if (model.interface === 'openai_endpoint') {
        updateDefaultEndpointBaseUrl(model.endpoint_base_url || '');
        updateDefaultEndpointApiKey(model.endpoint_api_key || '');
      } else {
        // Clear endpoint settings for non-endpoint interfaces
        updateDefaultEndpointBaseUrl('');
        updateDefaultEndpointApiKey('');
      }

      // Show success feedback
      setPresetAppliedSuccess(true);
      setTimeout(() => setPresetAppliedSuccess(false), 3000);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Failed to apply preset');
    }
  };

  return (
    <div className="space-y-6">
      {/* Preset Selector - Only show if presets are available */}
      {presets.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Apply Settings from Preset</h4>
            </div>
            {presetAppliedSuccess && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs">Preset applied!</span>
              </div>
            )}
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            Select a benchmark preset to apply its model configuration as your default settings. This uses the first
            answering model from the preset.
          </p>
          <div className="flex gap-2">
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a preset --</option>
              {presets.map((preset: Preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                  {preset.description
                    ? ` - ${preset.description.substring(0, 50)}${preset.description.length > 50 ? '...' : ''}`
                    : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleApplyPreset(selectedPresetId)}
              disabled={!selectedPresetId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              Apply Preset
            </button>
          </div>
        </div>
      )}

      {/* Default Interface Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default LLM Interface</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="langchain"
              checked={defaultInterface === 'langchain'}
              onChange={() => updateDefaultInterface('langchain')}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">LangChain</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="openrouter"
              checked={defaultInterface === 'openrouter'}
              onChange={() => updateDefaultInterface('openrouter')}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">OpenRouter</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="openai_endpoint"
              checked={defaultInterface === 'openai_endpoint'}
              onChange={() => updateDefaultInterface('openai_endpoint')}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">OpenAI Endpoint</span>
          </label>
        </div>
      </div>

      {/* Provider and Model Selection */}
      {defaultInterface === 'langchain' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Provider</label>
            <input
              type="text"
              value={defaultProvider}
              onChange={(e) => updateDefaultProvider(e.target.value)}
              placeholder="e.g., openai, google_genai, anthropic, ollama"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Model</label>
            <input
              type="text"
              value={defaultModel}
              onChange={(e) => updateDefaultModel(e.target.value)}
              placeholder="e.g., gpt-4, gemini-pro"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      ) : defaultInterface === 'openrouter' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Default OpenRouter Model
          </label>
          <input
            type="text"
            value={defaultModel}
            onChange={(e) => updateDefaultModel(e.target.value)}
            placeholder="e.g., openai/gpt-4"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Endpoint Base URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={defaultEndpointBaseUrl}
              onChange={(e) => updateDefaultEndpointBaseUrl(e.target.value)}
              placeholder="e.g., http://localhost:11434/v1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              OpenAI-compatible API endpoint (e.g., vLLM, Ollama, Azure OpenAI)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={defaultEndpointApiKey}
              onChange={(e) => updateDefaultEndpointApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
              Stored securely in your browser's local storage
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Model Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={defaultModel}
              onChange={(e) => updateDefaultModel(e.target.value)}
              placeholder="e.g., llama2, gpt-4"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Save/Reset Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center gap-2">
          {hasUnsavedDefaults() && (
            <button
              onClick={handleResetDefaults}
              className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center gap-2"
              title="Reset to saved values"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Success feedback */}
          {saveSuccess && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Saved successfully!</span>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSaveDefaults}
            disabled={!hasUnsavedDefaults() || isSavingDefaults}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSavingDefaults ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Defaults
              </>
            )}
          </button>
        </div>
      </div>

      {/* Note about defaults */}
      <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900 p-3 rounded-md">
        <p>
          <strong>Note:</strong> When you save these defaults, they will be applied to all generation interfaces (Chat,
          Template Generator, Benchmark) immediately. This affects both new and existing configurations.
        </p>
      </div>

      {/* OpenAI Endpoint specific notice */}
      {defaultInterface === 'openai_endpoint' && (
        <div className="text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900 p-3 rounded-md">
          <p className="font-medium">OpenAI Endpoint Interface:</p>
          <p className="mt-1">
            Unlike other interfaces, the API key is stored in your browser's localStorage and never sent to the Karenina
            server. The base URL is saved server-side. Your API key will be passed directly to your custom endpoint with
            each request.
          </p>
        </div>
      )}
    </div>
  );
}
