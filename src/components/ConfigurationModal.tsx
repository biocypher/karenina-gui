import React, { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { useConfigStore } from '../stores/useConfigStore';
import { CheckCircle, Eye, EyeOff, RefreshCw, Save, Trash2, RotateCcw } from 'lucide-react';

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigurationModal: React.FC<ConfigurationModalProps> = ({ isOpen, onClose }) => {
  const {
    defaultInterface,
    defaultProvider,
    defaultModel,
    envVariables,
    unmaskedEnvVariables,
    isLoading,
    isSaving,
    isSavingDefaults,
    error,
    hasUnsavedDefaults,
    loadConfiguration,
    loadUnmaskedEnvVariables,
    updateDefaultInterface,
    updateDefaultProvider,
    updateDefaultModel,
    saveDefaults,
    resetDefaults,
    updateEnvVariable,
    updateEnvFileContents,
    removeEnvVariable,
  } = useConfigStore();
  
  const [activeTab, setActiveTab] = useState<'defaults' | 'env'>('defaults');
  const [envFileContent, setEnvFileContent] = useState('');
  const [isEditingEnv, setIsEditingEnv] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Load configuration when modal opens
  useEffect(() => {
    if (isOpen) {
      loadConfiguration();
      loadEnvFileContent();
      setSaveSuccess(false);
      setLocalError(null);
    }
  }, [isOpen, loadConfiguration]);
  
  // Clear success state when user makes changes
  useEffect(() => {
    if (saveSuccess && hasUnsavedDefaults()) {
      setSaveSuccess(false);
    }
  }, [defaultInterface, defaultProvider, defaultModel, saveSuccess, hasUnsavedDefaults]);
  
  // Load .env file content
  const loadEnvFileContent = async () => {
    try {
      const response = await fetch('/api/config/env-file');
      if (response.ok) {
        const data = await response.json();
        setEnvFileContent(data.content);
      }
    } catch (error) {
      console.error('Failed to load .env file:', error);
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
  
  const renderDefaultsTab = () => (
    <div className="space-y-6">
      {/* Default Interface Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Default LLM Interface
        </label>
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
        </div>
      </div>
      
      {/* Provider and Model Selection */}
      {defaultInterface === 'langchain' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Provider
            </label>
            <input
              type="text"
              value={defaultProvider}
              onChange={(e) => updateDefaultProvider(e.target.value)}
              placeholder="e.g., openai, google_genai, anthropic, ollama"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Model
            </label>
            <input
              type="text"
              value={defaultModel}
              onChange={(e) => updateDefaultModel(e.target.value)}
              placeholder="e.g., gpt-4, gemini-pro"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Default OpenRouter Model
          </label>
          <input
            type="text"
            value={defaultModel}
            onChange={(e) => updateDefaultModel(e.target.value)}
            placeholder="e.g., openai/gpt-4"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
      
      {/* Save/Reset Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center gap-2">
          {hasUnsavedDefaults() && (
            <button
              onClick={handleResetDefaults}
              className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 
                       dark:hover:text-gray-200 transition-colors flex items-center gap-2"
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                     flex items-center gap-2"
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
          <strong>Note:</strong> When you save these defaults, they will be applied to all generation 
          interfaces (Chat, Template Generator, Benchmark) immediately. This affects both new and 
          existing configurations.
        </p>
      </div>
    </div>
  );
  
  const renderEnvTab = () => (
    <div className="space-y-4">
      {/* Toggle between view modes */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!showApiKeys) {
                // Load unmasked values when showing
                await loadUnmaskedEnvVariables();
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
            className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="# Add your environment variables here&#10;OPENAI_API_KEY=sk-..."
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsEditingEnv(false);
                loadEnvFileContent();
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                       dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEnvFile}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
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
                      {showApiKeys && key.endsWith('_API_KEY') ? 
                        (unmaskedEnvVariables[key] || value) : 
                        value
                      }
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveEnvVariable(key)}
                  className="ml-3 text-red-600 hover:text-red-700 dark:text-red-400 
                           dark:hover:text-red-300 transition-colors flex-shrink-0"
                  title="Remove variable"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          
          {/* Add New Variable */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-6 mt-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Add New Variable
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newEnvKey}
                onChange={(e) => setNewEnvKey(e.target.value)}
                placeholder="Variable name (e.g., OPENAI_API_KEY)"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newEnvValue}
                onChange={(e) => setNewEnvValue(e.target.value)}
                placeholder="Value"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddEnvVariable}
                disabled={isSaving || !newEnvKey.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                         flex items-center justify-center gap-2"
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
          API keys are sensitive information. Make sure to keep them secure and never share them publicly.
          Changes to API keys will require a server restart to take effect.
        </p>
      </div>
    </div>
  );
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuration"
      size="lg"
    >
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
      ) : (
        activeTab === 'defaults' ? renderDefaultsTab() : renderEnvTab()
      )}
    </Modal>
  );
};