import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { QuestionData } from '../types';
import { useTemplateStore } from '../stores/useTemplateStore';
import { useConfigStore } from '../stores/useConfigStore';
import { QuestionSelector } from './QuestionSelector';
import { TemplateProgress } from './TemplateProgress';
import { TemplateResults } from './TemplateResults';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { TemplateConfigurationPanel, GeneratedTemplatesSection, EmptyState } from './template';

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
  const { savedInterface, savedProvider, savedModel, savedEndpointBaseUrl, savedEndpointApiKey } = useConfigStore();

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

  // Add the store getters we need
  const { getGeneratedCount, getSuccessfulTemplates } = useTemplateStore();

  // Confirmation dialog state
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Initialize config with saved defaults from configuration store
  useEffect(() => {
    // Only update if values have actually changed to prevent unnecessary re-renders
    if (
      config.interface === savedInterface &&
      config.model_provider === savedProvider &&
      config.model_name === savedModel &&
      config.endpoint_base_url === savedEndpointBaseUrl &&
      config.endpoint_api_key === savedEndpointApiKey
    ) {
      return;
    }

    setConfig({
      ...config,
      interface: savedInterface,
      model_provider: savedProvider,
      model_name: savedModel,
      endpoint_base_url: savedEndpointBaseUrl,
      endpoint_api_key: savedEndpointApiKey,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedInterface, savedProvider, savedModel, savedEndpointBaseUrl, savedEndpointApiKey]);

  // Get pending questions using the store getter
  const pendingQuestions = getPendingQuestions(questions);

  // Initialize selection when questions change
  useEffect(() => {
    initializeSelection(questions);
  }, [questions, initializeSelection]);

  // Compute stats
  const totalQuestions = Object.keys(questions).length;
  const pendingQuestionsCount = Object.keys(pendingQuestions).length;
  const generatedCount = getGeneratedCount();
  const successfulTemplates = getSuccessfulTemplates();
  const successfulCount = Object.keys(successfulTemplates).length;
  const failedCount = generatedCount - successfulCount;
  const hasQuestions = totalQuestions > 0;
  const hasPendingQuestions = pendingQuestionsCount > 0;

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
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    // Clear all generated templates by resetting the store's generated templates
    useTemplateStore.setState({ generatedTemplates: {} });
    setShowClearConfirm(false);
  };

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
      {/* Main Configuration Panel */}
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

        <EmptyState
          hasQuestions={hasQuestions}
          pendingQuestionsCount={pendingQuestionsCount}
          totalQuestions={totalQuestions}
          generatedCount={generatedCount}
        />

        {hasPendingQuestions && (
          <>
            {/* Question Selection */}
            <div className="mb-6">
              <QuestionSelector
                questions={pendingQuestions}
                selectedQuestions={selectedQuestions}
                onSelectionChange={setSelectedQuestions}
              />
            </div>

            {/* Configuration Panel */}
            <TemplateConfigurationPanel
              config={config}
              setConfig={setConfig}
              isGenerating={isGenerating}
              selectedQuestionsCount={selectedQuestions.size}
              onStartGeneration={() => handleStartGeneration(true)}
              onCancelGeneration={handleCancelGeneration}
            />
          </>
        )}
      </div>

      {/* Progress Display */}
      <TemplateProgress progress={progress} questions={questions} />

      {/* Results Display */}
      <TemplateResults result={result} onDownloadResults={handleDownloadResults} />

      {/* Generated Templates Section */}
      <GeneratedTemplatesSection
        questions={questions}
        generatedTemplates={generatedTemplates}
        generatedCount={generatedCount}
        successfulCount={successfulCount}
        failedCount={failedCount}
        isGenerating={isGenerating}
        onRetryAllFailed={handleRetryAllFailed}
        onDownloadAllGenerated={handleDownloadAllGenerated}
        onClearAllGenerated={handleClearAllGenerated}
        onAddToCuration={handleAddToCuration}
        onRemoveTemplate={handleRemoveGeneratedTemplate}
        onRetryFailedTemplate={handleRetryFailedTemplate}
      />

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

      {/* Confirmation Dialog for Clear All */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={confirmClearAll}
        title="Clear All Templates"
        message="Are you sure you want to clear all generated templates? This cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};
