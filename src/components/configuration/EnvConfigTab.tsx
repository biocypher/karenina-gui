/**
 * EnvConfigTab - Configuration tab for environment variables
 *
 * Extracted from ConfigurationModal.tsx to reduce component size.
 * Handles viewing, editing, and managing environment variables.
 */

import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, RefreshCw, Save, Trash2 } from 'lucide-react';
import { API_ENDPOINTS } from '../../constants/api';
import { useConfigStore } from '../../stores/useConfigStore';
import { logger } from '../../utils/logger';

export interface EnvConfigTabProps {
  setLocalError: (error: string | null) => void;
}

export function EnvConfigTab({ setLocalError }: EnvConfigTabProps): JSX.Element {
  const { envVariables, unmaskedEnvVariables, isSaving, updateEnvVariable, updateEnvFileContents, removeEnvVariable } =
    useConfigStore();

  const [envFileContent, setEnvFileContent] = useState('');
  const [isEditingEnv, setIsEditingEnv] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  // Load .env file content on mount
  useEffect(() => {
    loadEnvFileContent();
  }, []);

  // Load .env file content
  const loadEnvFileContent = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CONFIG_ENV_FILE);
      if (response.ok) {
        const data = await response.json();
        setEnvFileContent(data.content);
      }
    } catch (error) {
      logger.error('CONFIG', 'Failed to load .env file', 'EnvConfigTab', { error });
    }
  };

  // Handle saving .env file content
  const handleSaveEnvFile = async () => {
    setLocalError(null);
    try {
      await updateEnvFileContents(envFileContent);
      setIsEditingEnv(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Failed to save .env file');
    }
  };

  // Handle adding new environment variable
  const handleAddEnvVariable = async () => {
    if (!newEnvKey.trim()) {
      setLocalError('Environment variable key is required');
      return;
    }

    setLocalError(null);
    try {
      await updateEnvVariable(newEnvKey, newEnvValue);
      setNewEnvKey('');
      setNewEnvValue('');
      await loadEnvFileContent();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Failed to add environment variable');
    }
  };

  // Handle removing environment variable
  const handleRemoveEnvVariable = async (key: string) => {
    setLocalError(null);
    try {
      await removeEnvVariable(key);
      await loadEnvFileContent();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Failed to remove environment variable');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle between view modes */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!showApiKeys) {
                // Load unmasked values when showing
                await useConfigStore.getState().loadUnmaskedEnvVariables();
              }
              setShowApiKeys(!showApiKeys);
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            disabled={isSaving}
          >
            {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showApiKeys ? 'Hide' : 'Show'} API Keys
          </button>
        </div>
        <button
          onClick={() => setIsEditingEnv(!isEditingEnv)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {isEditingEnv ? 'Cancel Edit' : 'Edit Raw File'}
        </button>
      </div>

      {isEditingEnv ? (
        <div className="space-y-4">
          <textarea
            value={envFileContent}
            onChange={(e) => setEnvFileContent(e.target.value)}
            className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="# Add your environment variables here&#10;OPENAI_API_KEY=sk-..."
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsEditingEnv(false);
                loadEnvFileContent();
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEnvFile}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Ground Truth Exposure Toggle */}
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Parser Ground Truth Exposure
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  When enabled, the parser model receives ground truth information to help with semantic matching. Use
                  carefully - this information is for disambiguation only and should not influence parsing accuracy.
                </p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={envVariables.KARENINA_EXPOSE_GROUND_TRUTH === 'true'}
                      onChange={(e) => {
                        const newValue = e.target.checked ? 'true' : 'false';
                        updateEnvVariable('KARENINA_EXPOSE_GROUND_TRUTH', newValue);
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Expose ground truth to parser
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Environment Variables List */}
          <div className="space-y-3">
            {Object.entries(envVariables).map(([key, value]) => (
              <div
                key={key}
                className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="font-mono text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                      {key}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">=</span>
                    <span className="font-mono text-sm text-gray-600 dark:text-gray-400 break-all overflow-hidden">
                      {showApiKeys && key.endsWith('_API_KEY') ? unmaskedEnvVariables[key] || value : value}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveEnvVariable(key)}
                  className="ml-3 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors flex-shrink-0"
                  title="Remove variable"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add New Variable */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-6 mt-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Add New Variable</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newEnvKey}
                onChange={(e) => setNewEnvKey(e.target.value)}
                placeholder="Variable name (e.g., OPENAI_API_KEY)"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newEnvValue}
                onChange={(e) => setNewEnvValue(e.target.value)}
                placeholder="Value"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddEnvVariable}
                disabled={isSaving || !newEnvKey.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning about API keys */}
      <div className="text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900 p-3 rounded-md">
        <p className="font-medium">Security Notice:</p>
        <p>
          API keys are sensitive information. Make sure to keep them secure and never share them publicly. Changes to
          API keys will require a server restart to take effect.
        </p>
      </div>
    </div>
  );
}
