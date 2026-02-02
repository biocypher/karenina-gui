/**
 * ConfigurationModal - Modal for managing application configuration
 *
 * Composition root for configuration tabs using extracted components.
 * Handles tab navigation, loading state, and error display.
 */

import React, { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { useConfigStore } from '../stores/useConfigStore';
import { usePresetStore } from '../stores/usePresetStore';
import { ConfigModalTab } from '../stores/useConfigModalStore';
import { TraceHighlightingTab } from './TraceHighlightingTab';
import { DefaultsConfigTab } from './configuration/DefaultsConfigTab';
import { EnvConfigTab } from './configuration/EnvConfigTab';
import { AdeleConfigTab } from './configuration/AdeleConfigTab';
import { Brain, Highlighter, RefreshCw } from 'lucide-react';

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ConfigModalTab;
}

export const ConfigurationModal: React.FC<ConfigurationModalProps> = ({ isOpen, onClose, initialTab }) => {
  const { isLoading, error, loadConfiguration, hasUnsavedDefaults } = useConfigStore();
  const { loadPresets } = usePresetStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<ConfigModalTab>('defaults');

  // Local state for tab components
  const [localError, setLocalError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [presetAppliedSuccess, setPresetAppliedSuccess] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // Load configuration and presets when modal opens
  useEffect(() => {
    if (isOpen) {
      loadConfiguration();
      loadPresets();
      setSaveSuccess(false);
      setPresetAppliedSuccess(false);
      setLocalError(null);
      setSelectedPresetId('');
      // Set initial tab if provided
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, loadConfiguration, loadPresets, initialTab]);

  // Clear success state when user makes changes
  useEffect(() => {
    if (saveSuccess && hasUnsavedDefaults()) {
      setSaveSuccess(false);
    }
    if (presetAppliedSuccess && hasUnsavedDefaults()) {
      setPresetAppliedSuccess(false);
    }
  }, [hasUnsavedDefaults, saveSuccess, presetAppliedSuccess]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configuration" size="lg">
      {/* Tabs */}
      <div className="border-b dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('defaults')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'defaults'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Default Settings
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'env'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Environment Variables
          </button>
          <button
            onClick={() => setActiveTab('traceHighlighting')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${
              activeTab === 'traceHighlighting'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Highlighter className="w-4 h-4" />
            Trace Highlighting
          </button>
          <button
            onClick={() => setActiveTab('adele')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${
              activeTab === 'adele'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            ADeLe Defaults
          </button>
        </nav>
      </div>

      {/* Error Display */}
      {(error || localError) && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md">
          {error || localError}
        </div>
      )}

      {/* Tab Content */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center text-gray-600 dark:text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Loading configuration...
          </div>
        </div>
      ) : activeTab === 'defaults' ? (
        <DefaultsConfigTab
          saveSuccess={saveSuccess}
          presetAppliedSuccess={presetAppliedSuccess}
          selectedPresetId={selectedPresetId}
          setSaveSuccess={setSaveSuccess}
          setPresetAppliedSuccess={setPresetAppliedSuccess}
          setSelectedPresetId={setSelectedPresetId}
          setLocalError={setLocalError}
        />
      ) : activeTab === 'env' ? (
        <EnvConfigTab setLocalError={setLocalError} />
      ) : activeTab === 'adele' ? (
        <AdeleConfigTab setLocalError={setLocalError} />
      ) : (
        <TraceHighlightingTab />
      )}
    </Modal>
  );
};
