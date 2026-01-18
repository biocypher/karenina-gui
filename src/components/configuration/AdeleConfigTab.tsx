/**
 * AdeleConfigTab - Configuration tab for ADeLe classification defaults.
 *
 * Allows users to set persistent default settings for ADeLe classification:
 * - Model configuration (interface, provider, model, temperature, endpoint)
 * - Default trait selection
 * - Default trait evaluation mode
 *
 * These defaults are persisted to localStorage and used to initialize
 * the session-based AdeleConfigStore on page load.
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, RotateCcw, Save } from 'lucide-react';
import { useConfigStore, type AdeleDefaults } from '../../stores/useConfigStore';
import { AdeleModelConfig } from '../adele/AdeleModelConfig';
import { AdeleTraitSelector } from '../adele/AdeleTraitSelector';
import type { AdeleModelConfig as AdeleModelConfigType, TraitEvalMode } from '../../stores/useAdeleConfigStore';

export interface AdeleConfigTabProps {
  /** Callback to set error message */
  setLocalError: (error: string | null) => void;
}

export function AdeleConfigTab({ setLocalError }: AdeleConfigTabProps): JSX.Element {
  const { adeleDefaults, updateAdeleDefaults, resetAdeleDefaults } = useConfigStore();

  // Local state for editing
  const [localConfig, setLocalConfig] = useState<AdeleDefaults | null>(adeleDefaults);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync local state when store changes
  useEffect(() => {
    setLocalConfig(adeleDefaults);
  }, [adeleDefaults]);

  // Handle model config changes
  const handleModelConfigChange = (updates: Partial<AdeleModelConfigType>) => {
    setLocalConfig((prev) => (prev ? { ...prev, ...updates } : null));
    setSaveSuccess(false);
  };

  // Handle trait selection changes
  const handleTraitChange = (traits: string[]) => {
    setLocalConfig((prev) => (prev ? { ...prev, selectedTraits: traits } : null));
    setSaveSuccess(false);
  };

  // Handle trait evaluation mode changes
  const handleModeChange = (mode: TraitEvalMode) => {
    setLocalConfig((prev) => (prev ? { ...prev, traitEvalMode: mode } : null));
    setSaveSuccess(false);
  };

  // Save defaults
  const handleSave = () => {
    setLocalError(null);
    if (localConfig) {
      updateAdeleDefaults(localConfig);
      setSaveSuccess(true);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Reset to built-in defaults
  const handleReset = () => {
    resetAdeleDefaults();
    setSaveSuccess(false);
    setLocalError(null);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges =
    localConfig && adeleDefaults && JSON.stringify(localConfig) !== JSON.stringify(adeleDefaults);

  if (!localConfig) {
    return <div className="text-center py-8 text-slate-500 dark:text-slate-400">Loading configuration...</div>;
  }

  // Convert to the format expected by AdeleModelConfig
  const modelConfig: AdeleModelConfigType = {
    interface: localConfig.interface,
    provider: localConfig.provider,
    modelName: localConfig.modelName,
    temperature: localConfig.temperature,
    endpointBaseUrl: localConfig.endpointBaseUrl,
    endpointApiKey: localConfig.endpointApiKey,
  };

  return (
    <div className="space-y-6">
      {/* Success message */}
      {saveSuccess && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          ADeLe defaults saved successfully!
        </div>
      )}

      {/* Model Configuration */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Default Model Configuration</h3>
        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4">
          <AdeleModelConfig config={modelConfig} onChange={handleModelConfigChange} idPrefix="adele-defaults" />
        </div>
      </div>

      {/* Trait Selection */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Default Trait Selection</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Select which ADeLe traits to evaluate by default. Empty selection means all traits.
        </p>
        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4">
          <AdeleTraitSelector selectedTraits={localConfig.selectedTraits} onChange={handleTraitChange} />
        </div>
      </div>

      {/* Trait Evaluation Mode */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Default Trait Evaluation Mode</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">How traits are evaluated for each question</p>
        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4">
          <div className="flex gap-4">
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 transition-colors flex-1">
              <input
                type="radio"
                name="adele-default-mode"
                value="batch"
                checked={localConfig.traitEvalMode === 'batch'}
                onChange={() => handleModeChange('batch')}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Batch</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  All traits evaluated in one LLM call (faster, cheaper)
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 transition-colors flex-1">
              <input
                type="radio"
                name="adele-default-mode"
                value="sequential"
                checked={localConfig.traitEvalMode === 'sequential'}
                onChange={() => handleModeChange('sequential')}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Sequential</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Each trait evaluated separately (potentially more accurate)
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges && !saveSuccess}
          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Save Defaults
        </button>
      </div>
    </div>
  );
}

export default AdeleConfigTab;
