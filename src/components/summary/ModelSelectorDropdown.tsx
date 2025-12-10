/**
 * ModelSelectorDropdown - Select models for comparison
 *
 * Allows adding/removing models for side-by-side comparison.
 * Default: 2 models, Max: 4 models
 */

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { ModelConfig } from '../../types';

interface ModelOption {
  answering_model: string;
  mcp_config: string;
  display_name: string;
}

interface ModelSelectorDropdownProps {
  availableModels: ModelOption[];
  selectedModels: ModelConfig[];
  onModelsChange: (models: ModelConfig[]) => void;
  maxModels?: number;
}

export function ModelSelectorDropdown({
  availableModels,
  selectedModels,
  onModelsChange,
  maxModels = 4,
}: ModelSelectorDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleAddModel = (model: ModelOption) => {
    if (selectedModels.length >= maxModels) return;

    const newModel: ModelConfig = {
      answering_model: model.answering_model,
      mcp_config: model.mcp_config,
    };

    // Check if already selected
    const isAlreadySelected = selectedModels.some(
      (m) => m.answering_model === newModel.answering_model && m.mcp_config === newModel.mcp_config
    );

    if (!isAlreadySelected) {
      onModelsChange([...selectedModels, newModel]);
    }
    setShowDropdown(false);
  };

  const handleRemoveModel = (index: number) => {
    const newModels = selectedModels.filter((_, i) => i !== index);
    onModelsChange(newModels);
  };

  const getModelDisplayName = (model: ModelConfig): string => {
    const option = availableModels.find(
      (m) => m.answering_model === model.answering_model && m.mcp_config === model.mcp_config
    );
    return option?.display_name || model.answering_model;
  };

  const unselectedModels = availableModels.filter(
    (option) =>
      !selectedModels.some((m) => m.answering_model === option.answering_model && m.mcp_config === option.mcp_config)
  );

  return (
    <div className="space-y-3">
      {/* Selected Models */}
      <div className="flex flex-wrap gap-2">
        {selectedModels.map((model, index) => (
          <div
            key={index}
            className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1.5 rounded-md text-sm"
          >
            <span>{getModelDisplayName(model)}</span>
            <button
              onClick={() => handleRemoveModel(index)}
              className="hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded p-0.5 transition-colors"
              aria-label={`Remove ${getModelDisplayName(model)}`}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Add Model Button */}
        {selectedModels.length < maxModels && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-md text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Plus size={14} />
              Add Model
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />

                {/* Dropdown */}
                <div className="absolute top-full mt-1 left-0 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto min-w-[250px]">
                  {unselectedModels.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No more models available</div>
                  ) : (
                    unselectedModels.map((model, index) => (
                      <button
                        key={index}
                        onClick={() => handleAddModel(model)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        {model.display_name}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {selectedModels.length === 0
          ? 'Select at least 1 model to visualize'
          : `${selectedModels.length}/${maxModels} models selected`}
      </p>
    </div>
  );
}
