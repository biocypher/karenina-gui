import React, { useState, useEffect } from 'react';
import {
  Save,
  Play,
  Trash2,
  Edit2,
  BookmarkPlus,
  AlertCircle,
  Check,
  X,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { usePresetStore } from '../../stores/usePresetStore';
import { useBenchmarkStore } from '../../stores/useBenchmarkStore';
import { Preset } from '../../utils/presetApi';

interface PresetManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresetManager: React.FC<PresetManagerProps> = ({ isOpen, onClose }) => {
  const {
    presets,
    isLoading,
    error,
    loadPresets,
    getPresetDetail,
    createNewPreset,
    updateExistingPreset,
    deleteExistingPreset,
    clearError,
  } = usePresetStore();

  const { getCurrentVerificationConfig, applyVerificationConfig } = useBenchmarkStore();

  // Local state
  const [expandedPresets, setExpandedPresets] = useState<Set<string>>(new Set());
  const [presetDetails, setPresetDetails] = useState<Record<string, Preset>>({});
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load presets on mount
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Toggle preset expansion and load details
  const toggleExpanded = async (presetId: string) => {
    setExpandedPresets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(presetId)) {
        newSet.delete(presetId);
      } else {
        newSet.add(presetId);
        // Load full details when expanding
        if (!presetDetails[presetId]) {
          getPresetDetail(presetId).then((preset) => {
            if (preset) {
              setPresetDetails((prev) => ({ ...prev, [presetId]: preset }));
            }
          });
        }
      }
      return newSet;
    });
  };

  // Handle apply preset
  const handleApply = async (presetId: string, presetName: string) => {
    clearError();
    const preset = await getPresetDetail(presetId);
    if (preset) {
      applyVerificationConfig(preset.config);
      setSuccessMessage(`Applied preset "${presetName}"`);
    }
  };

  // Handle save current config
  const handleSave = async () => {
    if (!presetName.trim()) return;

    clearError();
    const config = getCurrentVerificationConfig();
    const result = await createNewPreset({
      name: presetName.trim(),
      description: presetDescription.trim() || undefined,
      config,
    });

    if (result) {
      setSuccessMessage(`Preset "${result.name}" created successfully`);
      setShowSaveDialog(false);
      setPresetName('');
      setPresetDescription('');
    }
  };

  // Handle update name
  const handleUpdateName = async (presetId: string) => {
    if (!editValue.trim() || !editingName) return;

    clearError();
    const result = await updateExistingPreset(presetId, {
      name: editValue.trim(),
    });

    if (result) {
      setSuccessMessage(`Preset renamed to "${result.name}"`);
      setEditingName(null);
      setEditValue('');
    }
  };

  // Handle update description
  const handleUpdateDescription = async (presetId: string) => {
    if (!editingDescription) return;

    clearError();
    const result = await updateExistingPreset(presetId, {
      description: editValue.trim() || '',
    });

    if (result) {
      setSuccessMessage('Description updated');
      setEditingDescription(null);
      setEditValue('');
    }
  };

  // Handle delete
  const handleDelete = async (presetId: string, presetName: string) => {
    clearError();
    const success = await deleteExistingPreset(presetId);

    if (success) {
      setSuccessMessage(`Preset "${presetName}" deleted`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookmarkPlus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Benchmark Presets
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPresetName('');
                setPresetDescription('');
                setShowSaveDialog(true);
              }}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <Save className="w-4 h-4" />
              Save Current
            </button>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex items-center gap-2 mb-4">
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-800 dark:text-emerald-200">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Presets List */}
        <div className="space-y-3">
          {presets.length === 0 && !isLoading && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <BookmarkPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No presets yet</p>
              <p className="text-sm mt-1">Save your current configuration to create one</p>
            </div>
          )}

          {presets.map((preset) => {
            const isExpanded = expandedPresets.has(preset.id);
            const isEditingThisName = editingName === preset.id;
            const isEditingThisDesc = editingDescription === preset.id;

            return (
              <div
                key={preset.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors bg-white dark:bg-slate-800/50"
              >
                {/* Header with name, description, and delete */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    {/* Name */}
                    <div className="flex items-center gap-2 mb-1">
                      {isEditingThisName ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateName(preset.id);
                              if (e.key === 'Escape') {
                                setEditingName(null);
                                setEditValue('');
                              }
                            }}
                            className="flex-1 px-2 py-1 border border-purple-300 dark:border-purple-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateName(preset.id)}
                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingName(null);
                              setEditValue('');
                            }}
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{preset.name}</h4>
                          <button
                            onClick={() => {
                              setEditingName(preset.id);
                              setEditValue(preset.name);
                            }}
                            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                            title="Edit name"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Description */}
                    {isEditingThisDesc ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateDescription(preset.id);
                            if (e.key === 'Escape') {
                              setEditingDescription(null);
                              setEditValue('');
                            }
                          }}
                          placeholder="Add description..."
                          className="flex-1 px-2 py-1 border border-purple-300 dark:border-purple-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateDescription(preset.id)}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingDescription(null);
                            setEditValue('');
                          }}
                          className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {preset.description ? (
                          <p className="text-sm text-slate-600 dark:text-slate-400">{preset.description}</p>
                        ) : (
                          <p className="text-sm text-slate-400 dark:text-slate-500 italic">No description</p>
                        )}
                        <button
                          onClick={() => {
                            setEditingDescription(preset.id);
                            setEditValue(preset.description || '');
                          }}
                          className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                          title="Edit description"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(preset.id, preset.name)}
                    className="text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                    title="Delete preset"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Actions and expand/collapse */}
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={() => handleApply(preset.id, preset.name)}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Apply
                  </button>

                  <button
                    onClick={() => toggleExpanded(preset.id)}
                    className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-4 h-4" />
                        Show Details
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded p-2 text-center">
                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                          {preset.summary.answering_model_count}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">Answering Models</div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded p-2 text-center">
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {preset.summary.parsing_model_count}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">Parsing Models</div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded p-2 text-center">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {preset.summary.replicate_count}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">Replicates</div>
                      </div>
                    </div>

                    {/* Enabled Features */}
                    {preset.summary.enabled_features.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Enabled Features:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {preset.summary.enabled_features.map((feature) => (
                            <span
                              key={feature}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded"
                            >
                              {feature.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Configuration JSON */}
                    {presetDetails[preset.id] && (
                      <div>
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Full Configuration:
                        </div>
                        <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 overflow-x-auto">
                          <pre className="text-xs text-slate-100 dark:text-slate-200 font-mono">
                            {JSON.stringify(presetDetails[preset.id].config, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="font-medium">Created:</span> {new Date(preset.created_at).toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">ID:</span>{' '}
                        <span className="font-mono text-slate-400 dark:text-slate-500">{preset.id}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Save Current Configuration
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Preset Name *
                </label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  placeholder="e.g., Quick Test Setup"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                  rows={3}
                  placeholder="Brief description of this preset..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setPresetName('');
                  setPresetDescription('');
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!presetName.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
