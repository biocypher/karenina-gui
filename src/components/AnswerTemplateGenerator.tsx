import React, { useEffect } from 'react';
import { Play, Square, Download, CheckCircle, AlertCircle, Plus, Trash2, RefreshCw } from 'lucide-react';
import { QuestionData } from '../types';
import { useTemplateStore } from '../stores/useTemplateStore';
import { useConfigStore } from '../stores/useConfigStore';
import { QuestionSelector } from './QuestionSelector';
import { TemplateProgress } from './TemplateProgress';
import { TemplateResults } from './TemplateResults';

interface AnswerTemplateGeneratorProps {
  questions: QuestionData;
  onTemplatesGenerated: (combinedData: QuestionData) => void;
  onSwitchToCurator?: () => void;
}

export const AnswerTemplateGenerator: React.FC<AnswerTemplateGeneratorProps> = ({
  questions,
  onTemplatesGenerated,
  onSwitchToCurator,
}) => {
  // Configuration store - use saved values (not working draft values)
  const { savedInterface, savedProvider, savedModel } = useConfigStore();

  // Template store state
  const {
    config,
    selectedQuestions,
    isGenerating,
    progress,
    result,
    error,
    generatedTemplates,
    setConfig,
    setSelectedQuestions,
    initializeSelection,
    startGeneration,
    cancelGeneration,
    removeGeneratedTemplate,
    downloadResults,
    downloadAllGenerated,
    addToCuration,
    getPendingQuestions,
    retryFailedTemplate,
  } = useTemplateStore();

  // Initialize config with saved defaults from configuration store
  useEffect(() => {
    // Only update if values have actually changed to prevent unnecessary re-renders
    if (
      config.interface === savedInterface &&
      config.model_provider === savedProvider &&
      config.model_name === savedModel
    ) {
      return;
    }

    setConfig({
      ...config,
      interface: savedInterface,
      model_provider: savedProvider,
      model_name: savedModel,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedInterface, savedProvider, savedModel]);

  // Get pending questions using the store getter
  const pendingQuestions = getPendingQuestions(questions);

  // Initialize selection when questions change
  useEffect(() => {
    initializeSelection(questions);
  }, [questions, initializeSelection]);

  // Progress updates now handled via WebSocket in useTemplateStore

  const handleStartGeneration = async (forceRegenerate: boolean = false) => {
    await startGeneration(questions, forceRegenerate);
  };

  const handleCancelGeneration = async () => {
    await cancelGeneration();
  };

  const handleDownloadResults = () => {
    downloadResults();
  };

  const handleDownloadAllGenerated = () => {
    downloadAllGenerated();
  };

  const handleAddToCuration = () => {
    addToCuration(questions, onTemplatesGenerated, onSwitchToCurator);
  };

  const handleRemoveGeneratedTemplate = (questionId: string) => {
    removeGeneratedTemplate(questionId);
  };

  const handleRetryFailedTemplate = async (questionId: string) => {
    await retryFailedTemplate(questionId, questions);
  };

  const handleClearAllGenerated = () => {
    if (window.confirm('Are you sure you want to clear all generated templates? This cannot be undone.')) {
      // Clear all generated templates by resetting the store's generated templates
      useTemplateStore.setState({ generatedTemplates: {} });
    }
  };

  // Add the store getters we need
  const { getGeneratedCount, getSuccessfulTemplates } = useTemplateStore();

  const totalQuestions = Object.keys(questions).length;
  const pendingQuestionsCount = Object.keys(pendingQuestions).length;
  const generatedCount = getGeneratedCount();
  const successfulTemplates = getSuccessfulTemplates();
  const successfulCount = Object.keys(successfulTemplates).length;
  const failedCount = generatedCount - successfulCount;
  const hasQuestions = totalQuestions > 0;

  const handleRetryAllFailed = async () => {
    // Get all failed template IDs
    const failedIds = Object.entries(generatedTemplates)
      .filter(([, template]) => !template.success)
      .map(([id]) => id);

    if (failedIds.length === 0) return;

    // Set selected questions to all failed questions
    setSelectedQuestions(new Set(failedIds));

    // Start generation with force regenerate
    await startGeneration(questions, true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Answer Template Generation</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          Generate answer templates from extracted questions using various LLM providers. Select which questions to
          process and configure the generation parameters.
          {pendingQuestionsCount < totalQuestions && (
            <span className="block mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
              Showing {pendingQuestionsCount} pending questions (out of {totalQuestions} total).
              {generatedCount} questions already have generated templates.
            </span>
          )}
        </p>

        {!hasQuestions ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto w-12 h-12 text-slate-400 dark:text-slate-500 mb-4" />
            <div className="space-y-3">
              <p className="text-slate-800 dark:text-slate-200 font-semibold">
                No questions available for template generation.
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Extract questions first using the Question Extractor tab, then return here to generate answer templates.
              </p>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl">
                <p className="text-blue-800 dark:text-blue-300 text-sm font-medium">
                  💡 <strong>Workflow:</strong> Question Extractor → Template Generator → Template Curator
                </p>
              </div>
            </div>
          </div>
        ) : pendingQuestionsCount === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto w-12 h-12 text-green-400 dark:text-green-500 mb-4" />
            <p className="text-slate-600 dark:text-slate-300">
              All questions have generated templates! Use "Add to Curation" above to proceed.
            </p>
          </div>
        ) : (
          <>
            {/* Question Selection */}
            <div className="mb-6">
              <QuestionSelector
                questions={pendingQuestions}
                selectedQuestions={selectedQuestions}
                onSelectionChange={setSelectedQuestions}
              />
            </div>

            {/* Interface Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">LLM Interface</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="interface"
                    value="langchain"
                    checked={config.interface === 'langchain'}
                    onChange={(e) => setConfig({ ...config, interface: e.target.value as 'langchain' | 'openrouter' })}
                    disabled={isGenerating}
                    className="mr-2"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">LangChain (requires provider)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="interface"
                    value="openrouter"
                    checked={config.interface === 'openrouter'}
                    onChange={(e) => setConfig({ ...config, interface: e.target.value as 'langchain' | 'openrouter' })}
                    disabled={isGenerating}
                    className="mr-2"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">OpenRouter (no provider needed)</span>
                </label>
              </div>
            </div>

            {/* Configuration */}
            <div
              className={`grid grid-cols-1 ${config.interface === 'langchain' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-6`}
            >
              {config.interface === 'langchain' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Model Provider
                  </label>
                  <input
                    type="text"
                    value={config.model_provider}
                    onChange={(e) => setConfig({ ...config, model_provider: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    disabled={isGenerating}
                    placeholder="e.g., google_genai, openai, anthropic, ollama"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Model Name</label>
                <input
                  type="text"
                  value={config.model_name}
                  onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  disabled={isGenerating}
                  placeholder={
                    config.interface === 'langchain'
                      ? 'e.g., gemini-2.0-flash, gpt-4'
                      : 'e.g., meta-llama/llama-3.2-3b-instruct:free'
                  }
                />
                {config.interface === 'openrouter' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Use OpenRouter model format: provider/model-name
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Temperature ({config.temperature})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full slider-horizontal"
                  disabled={isGenerating}
                />
              </div>
            </div>

            {/* Generation Controls */}
            <div className="flex gap-4 mb-6 flex-wrap">
              <button
                onClick={() => handleStartGeneration(true)}
                disabled={isGenerating || selectedQuestions.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              >
                <Play className="w-4 h-4" />
                Generate Templates ({selectedQuestions.size} questions)
              </button>

              {isGenerating && (
                <button
                  onClick={handleCancelGeneration}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-xl hover:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Square className="w-4 h-4" />
                  Cancel
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Progress Display */}
      <TemplateProgress progress={progress} questions={questions} />

      {/* Results Display */}
      <TemplateResults result={result} onDownloadResults={handleDownloadResults} />

      {/* Generated Templates Summary */}
      {generatedCount > 0 && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              Generated Templates ({successfulCount}/{generatedCount} successful)
            </h3>
            <div className="flex gap-3">
              {failedCount > 0 && (
                <button
                  onClick={handleRetryAllFailed}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 dark:bg-orange-700 text-white rounded-xl hover:bg-orange-700 dark:hover:bg-orange-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Failed ({failedCount})
                </button>
              )}
              <button
                onClick={handleDownloadAllGenerated}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-xl hover:bg-green-700 dark:hover:bg-green-600 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Download className="w-4 h-4" />
                Download All
              </button>
              <button
                onClick={handleClearAllGenerated}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-xl hover:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                title="Clear all generated templates from memory"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            </div>
          </div>

          {/* Generated Templates Table */}
          <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden shadow-inner mb-6">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                      Question
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                  {Object.entries(generatedTemplates).map(([questionId, template]) => {
                    const question = questions[questionId];
                    return (
                      <tr key={questionId} className="hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                          <div className="max-w-xs truncate" title={question?.question || questionId}>
                            {question?.question || questionId}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {template.success ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            {!template.success && (
                              <button
                                onClick={() => handleRetryFailedTemplate(questionId)}
                                disabled={isGenerating}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:text-slate-400 dark:disabled:text-slate-600 transition-colors"
                                title="Retry generation"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveGeneratedTemplate(questionId)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                              title="Remove from list"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Call to Action - Add to Curation */}
          <div className="flex justify-end">
            <button
              onClick={handleAddToCuration}
              disabled={successfulCount === 0}
              className="flex items-center gap-3 px-8 py-4 text-lg font-semibold bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 disabled:transform-none disabled:hover:shadow-xl"
            >
              <Plus className="w-6 h-6" />
              Add to Curation ({successfulCount})
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="font-medium text-red-800 dark:text-red-300">Error</span>
          </div>
          <p className="text-red-700 dark:text-red-300 mt-2">{error}</p>
        </div>
      )}
    </div>
  );
};
