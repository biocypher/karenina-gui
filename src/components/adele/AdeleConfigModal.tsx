/**
 * AdeleConfigModal - Modal for configuring ADeLe classification settings.
 *
 * Allows configuration of:
 * - Model settings (interface, provider, model, temperature, endpoint)
 * - Trait selection (which ADeLe dimensions to evaluate)
 * - Trait evaluation mode (batch vs sequential)
 */

import React, { useState, useEffect } from 'react';
import { X, Brain, ChevronDown, ChevronRight, Save } from 'lucide-react';
import {
  useAdeleConfigStore,
  type AdeleModelConfig as AdeleModelConfigType,
  type TraitEvalMode,
} from '../../stores/useAdeleConfigStore';
import { useConfigStore } from '../../stores/useConfigStore';
import { AdeleModelConfig } from './AdeleModelConfig';
import { AdeleTraitSelector } from './AdeleTraitSelector';

interface AdeleConfigModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
}

export const AdeleConfigModal: React.FC<AdeleConfigModalProps> = ({ isOpen, onClose }) => {
  const { modelConfig, selectedTraits, traitEvalMode, setModelConfig, setSelectedTraits, setTraitEvalMode } =
    useAdeleConfigStore();
  const { updateAdeleDefaults } = useConfigStore();

  // Local state for editing (only applied on "Apply")
  const [localModelConfig, setLocalModelConfig] = useState<AdeleModelConfigType>(modelConfig);
  const [localSelectedTraits, setLocalSelectedTraits] = useState<string[]>(selectedTraits);
  const [localTraitEvalMode, setLocalTraitEvalMode] = useState<TraitEvalMode>(traitEvalMode);
  const [isModelConfigExpanded, setIsModelConfigExpanded] = useState(false);
  const [savedConfirmation, setSavedConfirmation] = useState(false);

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalModelConfig(modelConfig);
      setLocalSelectedTraits(selectedTraits);
      setLocalTraitEvalMode(traitEvalMode);
    }
  }, [isOpen, modelConfig, selectedTraits, traitEvalMode]);

  const handleApply = () => {
    setModelConfig(localModelConfig);
    setSelectedTraits(localSelectedTraits);
    setTraitEvalMode(localTraitEvalMode);
    onClose();
  };

  const handleModelConfigChange = (updates: Partial<AdeleModelConfigType>) => {
    setLocalModelConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleSaveAsDefaults = () => {
    updateAdeleDefaults({
      interface: localModelConfig.interface,
      provider: localModelConfig.provider,
      modelName: localModelConfig.modelName,
      temperature: localModelConfig.temperature,
      endpointBaseUrl: localModelConfig.endpointBaseUrl,
      endpointApiKey: localModelConfig.endpointApiKey,
      selectedTraits: localSelectedTraits,
      traitEvalMode: localTraitEvalMode,
    });
    setSavedConfirmation(true);
    setTimeout(() => setSavedConfirmation(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-[90vw] max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            ADeLe Configuration
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Model Configuration (Collapsible) */}
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsModelConfigExpanded(!isModelConfigExpanded)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isModelConfigExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Model Configuration</h3>
              </div>
              {!isModelConfigExpanded && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {localModelConfig.modelName} ({localModelConfig.interface})
                </span>
              )}
            </button>
            {isModelConfigExpanded && (
              <div className="px-4 pb-4">
                <AdeleModelConfig
                  config={localModelConfig}
                  onChange={handleModelConfigChange}
                  idPrefix="adele-config-modal"
                />
              </div>
            )}
          </div>

          {/* Section 2: Trait Selection */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Trait Selection</h3>
            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4">
              <AdeleTraitSelector selectedTraits={localSelectedTraits} onChange={setLocalSelectedTraits} />
            </div>
          </div>

          {/* Section 3: Trait Evaluation Mode */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Trait Evaluation Mode</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              How traits are evaluated for each question
            </p>
            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4">
              <div className="flex gap-4">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 transition-colors flex-1">
                  <input
                    type="radio"
                    name="trait-eval-mode"
                    value="batch"
                    checked={localTraitEvalMode === 'batch'}
                    onChange={() => setLocalTraitEvalMode('batch')}
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
                    name="trait-eval-mode"
                    value="sequential"
                    checked={localTraitEvalMode === 'sequential'}
                    onChange={() => setLocalTraitEvalMode('sequential')}
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleSaveAsDefaults}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-300 dark:border-slate-600"
          >
            <Save className="w-4 h-4" />
            {savedConfirmation ? 'Saved!' : 'Save as Defaults'}
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg transition-all"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdeleConfigModal;
