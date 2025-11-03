import React, { useState, useEffect } from 'react';
import { Save, Play, Trash2, Edit2, BookmarkPlus, AlertCircle, Check } from 'lucide-react';
import { usePresetStore } from '../../stores/usePresetStore';
import { useBenchmarkStore } from '../../stores/useBenchmarkStore';

export const PresetManager: React.FC = () => {
  const {
    presets,
    currentPresetId,
    isLoading,
    error,
    loadPresets,
    getPresetDetail,
    createNewPreset,
    updateExistingPreset,
    deleteExistingPreset,
    setCurrentPresetId,
    clearError,
  } = usePresetStore();

  const { getCurrentVerificationConfig, applyVerificationConfig } = useBenchmarkStore();

  // Local state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  // Get current preset details
  const currentPreset = presets.find((p) => p.id === currentPresetId);

  // Handle apply preset
  const handleApply = async () => {
    if (!currentPresetId) return;

    clearError();
    const preset = await getPresetDetail(currentPresetId);
    if (preset) {
      applyVerificationConfig(preset.config);
      setSuccessMessage(`Applied preset "${preset.name}"`);
    }
  };

  // Handle save current config
  const handleSave = async () => {
    if (!presetName.trim()) {
      return;
    }

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

  // Handle rename
  const handleRename = async () => {
    if (!currentPresetId || !presetName.trim()) return;

    clearError();
    const result = await updateExistingPreset(currentPresetId, {
      name: presetName.trim(),
    });

    if (result) {
      setSuccessMessage(`Preset renamed to "${result.name}"`);
      setShowRenameDialog(false);
      setPresetName('');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!currentPresetId) return;

    clearError();
    const presetToDelete = currentPreset?.name || 'this preset';
    const success = await deleteExistingPreset(currentPresetId);

    if (success) {
      setSuccessMessage(`Preset "${presetToDelete}" deleted`);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <BookmarkPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        Benchmark Presets
      </h3>

      <div className="space-y-4">
        {/* Preset Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Preset</label>
          <select
            value={currentPresetId || ''}
            onChange={(e) => setCurrentPresetId(e.target.value || null)}
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            disabled={isLoading}
          >
            <option value="">-- Select a preset --</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id} title={preset.description}>
                {preset.name}
              </option>
            ))}
          </select>
          {presets.length === 0 && !isLoading && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              No presets yet. Save your current configuration to create one.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleApply}
            disabled={!currentPresetId || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4" />
            Apply Preset
          </button>

          <button
            onClick={() => {
              setPresetName('');
              setPresetDescription('');
              setShowSaveDialog(true);
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Current
          </button>

          {currentPresetId && (
            <>
              <button
                onClick={() => {
                  setPresetName(currentPreset?.name || '');
                  setShowRenameDialog(true);
                }}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Rename
              </button>

              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>

        {/* Preset Summary */}
        {currentPreset && (
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">{currentPreset.name}</h4>
                {currentPreset.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{currentPreset.description}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              <div className="bg-white dark:bg-slate-800 rounded p-2 text-center">
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {currentPreset.summary.answering_model_count}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Answering</div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded p-2 text-center">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {currentPreset.summary.parsing_model_count}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Parsing</div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded p-2 text-center">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {currentPreset.summary.replicate_count}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Replicates</div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded p-2 text-center">
                <div className="text-lg font-bold text-slate-600 dark:text-slate-400">
                  {currentPreset.summary.total_model_count}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Total Models</div>
              </div>
            </div>

            {currentPreset.summary.enabled_features.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Enabled Features:</div>
                <div className="flex flex-wrap gap-1">
                  {currentPreset.summary.enabled_features.map((feature) => (
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

            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Created: {new Date(currentPreset.created_at).toLocaleString()}
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-800 dark:text-emerald-200">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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

      {/* Rename Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Rename Preset</h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Name *</label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowRenameDialog(false);
                  setPresetName('');
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={!presetName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Delete Preset</h3>

            <p className="text-slate-700 dark:text-slate-300 mb-6">
              Are you sure you want to delete preset "{currentPreset?.name}"? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
