import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { AgentMiddlewareConfig } from '../../types';
import { useExtraKwargsState, CommonParametersTab, KwargsJsonEditor } from './kwargs';

// ============================================================================
// Types
// ============================================================================

// Return type for onSave - includes both extra_kwargs and agent_middleware
export interface ModelConfigurationUpdate {
  extra_kwargs: Record<string, unknown>;
  agent_middleware?: AgentMiddlewareConfig;
  max_context_tokens?: number;
}

interface ExtraKwargsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (update: ModelConfigurationUpdate) => void;
  initialKwargs?: Record<string, unknown>;
  initialMiddleware?: AgentMiddlewareConfig;
  initialMaxContextTokens?: number;
  hasMcp: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

const ExtraKwargsModal: React.FC<ExtraKwargsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialKwargs,
  initialMiddleware,
  initialMaxContextTokens,
  hasMcp,
}) => {
  // Use custom hook for all state management
  const {
    activeTab,
    setActiveTab,
    generationParams,
    setGenerationParams,
    middlewareConfig,
    maxContextTokens,
    setMaxContextTokens,
    jsonText,
    setJsonText,
    jsonError,
    conflicts,
    showExamples,
    setShowExamples,
    handleIndent,
    handleSave: handleSaveState,
    handleClear,
    updateLimits,
    updateModelRetry,
    updateToolRetry,
    updateSummarization,
  } = useExtraKwargsState({
    isOpen,
    initialKwargs,
    initialMiddleware,
    initialMaxContextTokens,
  });

  // Handle save with validation
  const handleSave = () => {
    const result = handleSaveState();
    if (result) {
      onSave(result);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Configure Extra Arguments</h2>
              <p className="text-indigo-100 text-sm mt-1">
                Pass custom parameters to the model interface (LangChain, OpenRouter, etc.)
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('common')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'common'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Common
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'json'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            JSON
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Conflict Warning */}
          {conflicts.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-700">
                Conflict: <code className="bg-amber-100 px-1 rounded">{conflicts.join(', ')}</code> defined in both
                tabs. Remove from one tab to save.
              </span>
            </div>
          )}

          {/* Tab 1: Common Parameters */}
          {activeTab === 'common' && (
            <CommonParametersTab
              generationParams={generationParams}
              setGenerationParams={setGenerationParams}
              middlewareConfig={middlewareConfig}
              maxContextTokens={maxContextTokens}
              onLimitsUpdate={updateLimits}
              onModelRetryUpdate={updateModelRetry}
              onToolRetryUpdate={updateToolRetry}
              onSummarizationUpdate={updateSummarization}
              onMaxContextTokensChange={setMaxContextTokens}
              hasMcp={hasMcp}
            />
          )}

          {/* Tab 2: JSON Editor */}
          {activeTab === 'json' && (
            <KwargsJsonEditor
              jsonText={jsonText}
              onJsonChange={(text) => setJsonText(text)}
              onIndent={handleIndent}
              jsonError={jsonError}
              showExamples={showExamples}
              onToggleExamples={() => setShowExamples(!showExamples)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t flex-shrink-0">
          <button onClick={handleClear} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium">
            Clear All
          </button>
          <div className="flex items-center space-x-3">
            {activeTab === 'json' && (
              <button
                onClick={handleIndent}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
              >
                Indent
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtraKwargsModal;
