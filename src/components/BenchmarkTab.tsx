import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  Download,
  AlertCircle,
  BarChart3,
  Filter,
  FileDown,
  Trash2,
  Settings,
  ChevronRight,
  ChevronDown,
  BookmarkPlus,
  Upload,
  Search,
} from 'lucide-react';
import { ColumnFiltersState } from '@tanstack/react-table';
import { Checkpoint, VerificationResult, VerificationProgress } from '../types';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { Card } from './ui/Card';
import { ConfigurationPanel } from './benchmark/ConfigurationPanel';
import { PresetManager } from './presets/PresetManager';
import { ProgressIndicator } from './benchmark/ProgressIndicator';
import { VerificationResultDetailModal } from './benchmark/VerificationResultDetailModal';
import { BenchmarkTable } from './BenchmarkTable';
import { useBenchmarkConfiguration } from '../hooks/useBenchmarkConfiguration';
import { useTestSelection } from '../hooks/useTestSelection';
import { useVerificationWebSocket } from '../hooks/useVerificationWebSocket';
import { useBenchmarkUpload } from '../hooks/useBenchmarkUpload';
import { useVerificationRun } from '../hooks/useVerificationRun';
import { useBenchmarkExport } from '../hooks/useBenchmarkExport';
import { useBenchmarkResults } from '../hooks/useBenchmarkResults';
import { useRubricStore } from '../stores/useRubricStore';
import { useDatasetStore } from '../stores/useDatasetStore';
import { CustomExportDialog } from './CustomExportDialog';
import { autoSaveToDatabase } from '../utils/databaseAutoSave';
import { SummaryStatisticsPanel } from './summary/SummaryStatisticsPanel';
import { formatDuration } from '../utils/time';
import { MergeResultsDialog, MergeAction } from './dialogs/MergeResultsDialog';

// Interfaces now imported from types

interface BenchmarkTabProps {
  checkpoint: Checkpoint;
  benchmarkResults: Record<string, VerificationResult>;
  setBenchmarkResults: React.Dispatch<React.SetStateAction<Record<string, VerificationResult>>>;
}

export const BenchmarkTab: React.FC<BenchmarkTabProps> = ({ checkpoint, benchmarkResults, setBenchmarkResults }) => {
  // Configuration management
  const {
    answeringModels,
    parsingModels,
    replicateCount,
    expandedPrompts,
    runName,
    rubricEnabled,
    rubricEvaluationStrategy,
    evaluationMode,
    correctnessEnabled,
    abstentionEnabled,
    sufficiencyEnabled,
    deepJudgmentTemplateEnabled,
    deepJudgmentSearchEnabled,
    deepJudgmentRubricEnabled,
    deepJudgmentRubricMode,
    deepJudgmentRubricExtractExcerpts,
    fewShotEnabled,
    fewShotMode,
    fewShotK,
    setReplicateCount,
    setRunName,
    setRubricEnabled,
    setRubricEvaluationStrategy,
    setEvaluationMode,
    setCorrectnessEnabled,
    setAbstentionEnabled,
    setSufficiencyEnabled,
    setDeepJudgmentTemplateEnabled,
    setDeepJudgmentSearchEnabled,
    setDeepJudgmentRubricEnabled,
    setDeepJudgmentRubricMode,
    setDeepJudgmentRubricExtractExcerpts,
    setFewShotEnabled,
    setFewShotMode,
    setFewShotK,
    addAnsweringModel,
    addParsingModel,
    removeAnsweringModel,
    removeParsingModel,
    updateAnsweringModel,
    updateParsingModel,
    togglePromptExpanded,
    getVerificationConfig,
  } = useBenchmarkConfiguration();

  // Rubric store
  const { currentRubric, setCurrentRubric } = useRubricStore();
  const { storageUrl, metadata } = useDatasetStore();

  // Verification state
  const [isRunning, setIsRunning] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- isUploading is used but setter not yet implemented
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<VerificationProgress | null>(null);
  const [selectedResult, setSelectedResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Get finished templates from checkpoint
  const finishedTemplates = Object.entries(checkpoint).filter(([, item]) => item.finished);

  // Test selection and filtering via custom hook
  const {
    selectedTests,
    testSearchTerm,
    setTestSearchTerm,
    filteredTemplates,
    expandedQuestions,
    customFewShotSelections,
    handleSelectAll,
    handleSelectNone,
    handleClearAllSelections,
    handleToggleTest,
    handleToggleQuestionExpansion,
    handleToggleExampleSelection,
  } = useTestSelection({
    finishedTemplates,
  });

  // WebSocket management via custom hook
  const { connectProgressWebSocket, disconnectProgressWebSocket } = useVerificationWebSocket({
    onProgressUpdate: setProgress,
    onJobCompleted: async (completedJobId, results) => {
      setIsRunning(false);
      // Accumulate results instead of replacing them
      setBenchmarkResults((prev) => ({ ...prev, ...results }));
      console.log('Results set successfully');

      // Auto-save to database after verification completes
      try {
        await autoSaveToDatabase(checkpoint);
        console.log('💾 Checkpoint auto-saved to database after verification');
      } catch (saveError) {
        console.warn('⚠️ Failed to auto-save to database after verification:', saveError);
      }
    },
    onJobFailed: (errorMessage) => {
      setIsRunning(false);
      setError(errorMessage);
    },
    onJobCancelled: () => {
      setProgress((prev) => ({
        ...prev,
        status: 'cancelled',
        processed_count: prev?.processed_count || 0,
        total_count: prev?.total_count || 0,
      }));
      setIsRunning(false);
    },
  });

  // Verification run management via custom hook
  const { handleStartVerification, handleCancelVerification: handleCancelVerificationBase } = useVerificationRun({
    selectedTests,
    finishedTemplates,
    runName,
    storageUrl,
    benchmarkName: metadata?.name,
    getVerificationConfig,
    onSetIsRunning: setIsRunning,
    onSetProgress: setProgress,
    onSetError: setError,
    onSetJobId: setJobId,
    connectProgressWebSocket,
  });

  // Wrapper for cancel that also disconnects WebSocket
  const handleCancelVerification = async () => {
    await handleCancelVerificationBase(jobId);
    disconnectProgressWebSocket();
  };

  // Export management via custom hook
  const { handleExportResults, handleExportFilteredResults, handleCustomExport } = useBenchmarkExport({
    benchmarkResults,
    progress,
    currentRubric,
    jobId,
    getVerificationConfig,
    onSetError: setError,
  });

  // Results statistics via custom hook
  const { getAllUnfilteredResults, stats } = useBenchmarkResults({
    benchmarkResults,
  });

  // Local state for replicate count input to allow clearing
  const [replicateInputValue, setReplicateInputValue] = useState<string>(replicateCount.toString());

  // Filter state for table results
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [externalFilters, setExternalFilters] = useState<ColumnFiltersState | undefined>(undefined);

  // Custom export dialog state
  const [isCustomExportDialogOpen, setIsCustomExportDialogOpen] = useState(false);
  // Preset modal state
  const [showPresetModal, setShowPresetModal] = useState(false);

  // Upload success message
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Upload/import management via custom hook
  const {
    isUploadDialogOpen,
    parsedUpload,
    fileInputRef,
    setIsUploadDialogOpen,
    handleFileSelect,
    handleUploadConfirm: handleUploadConfirmBase,
    uploadedCount,
    existingCount,
    conflictCount,
    totalAfterMerge,
  } = useBenchmarkUpload({
    checkpoint,
    benchmarkResults,
    onSetBenchmarkResults: setBenchmarkResults,
    onSetCurrentRubric: setCurrentRubric,
    onSetError: setError,
  });

  // Wrapper to set success message after upload
  const handleUploadConfirm = (action: MergeAction) => {
    handleUploadConfirmBase(action);
    if (action !== 'cancel' && parsedUpload) {
      const message =
        action === 'replace'
          ? `Successfully loaded ${parsedUpload.stats.totalResults} results from ${parsedUpload.stats.questions.size} questions. Previous results were replaced.`
          : `Successfully merged ${parsedUpload.stats.totalResults} results. Total results: ${totalAfterMerge}`;
      setUploadSuccess(message);
      // Clear success message after 5 seconds
      setTimeout(() => {
        setUploadSuccess(null);
      }, 5000);
    }
  };

  const getQuestionPreview = (text: string) => {
    return text.length > 60 ? text.substring(0, 60) + '...' : text;
  };

  // Handle filtered count changes from table
  const handleFilteredCountChange = (filtered: number, total: number) => {
    setFilteredCount(filtered);
    setTotalCount(total);
  };

  // WebSocket cleanup on unmount
  useEffect(() => {
    return () => {
      // Disconnect WebSocket when component unmounts
      disconnectProgressWebSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Don't load historical results on mount - we want a fresh start on page refresh
  // Results will only accumulate during the current page session

  // Add a cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (jobId) {
        console.log('Component unmounting, cleaning up job:', jobId);
      }
    };
  }, [jobId]);

  // Safe rendering helper for results table

  // Debug logging for state changes
  useEffect(() => {
    console.log('BenchmarkTab state update:', {
      isRunning,
      jobId,
      hasResults: benchmarkResults ? Object.keys(benchmarkResults).length : 0,
      hasProgress: !!progress,
      progressStatus: progress?.status,
      error,
    });
  }, [isRunning, jobId, benchmarkResults, progress, error]);

  // Create wrapped component with Error Boundary
  const renderContent = () => {
    try {
      return (
        <div className="space-y-6">
          {/* Preset Manager Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowPresetModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isRunning}
            >
              <BookmarkPlus className="w-5 h-5" />
              Manage Presets
            </button>
          </div>

          <ConfigurationPanel
            answeringModels={answeringModels}
            parsingModels={parsingModels}
            replicateCount={replicateCount}
            expandedPrompts={expandedPrompts}
            isRunning={isRunning}
            finishedTemplates={finishedTemplates}
            rubricEnabled={rubricEnabled}
            rubricEvaluationStrategy={rubricEvaluationStrategy}
            evaluationMode={evaluationMode}
            correctnessEnabled={correctnessEnabled}
            abstentionEnabled={abstentionEnabled}
            sufficiencyEnabled={sufficiencyEnabled}
            deepJudgmentTemplateEnabled={deepJudgmentTemplateEnabled}
            deepJudgmentSearchEnabled={deepJudgmentSearchEnabled}
            deepJudgmentRubricEnabled={deepJudgmentRubricEnabled}
            deepJudgmentRubricMode={deepJudgmentRubricMode}
            deepJudgmentRubricExtractExcerpts={deepJudgmentRubricExtractExcerpts}
            fewShotEnabled={fewShotEnabled}
            fewShotMode={fewShotMode}
            fewShotK={fewShotK}
            onAddAnsweringModel={addAnsweringModel}
            onAddParsingModel={addParsingModel}
            onRemoveAnsweringModel={removeAnsweringModel}
            onRemoveParsingModel={removeParsingModel}
            onUpdateAnsweringModel={updateAnsweringModel}
            onUpdateParsingModel={updateParsingModel}
            onTogglePromptExpanded={togglePromptExpanded}
            onRubricEnabledChange={setRubricEnabled}
            onRubricEvaluationStrategyChange={setRubricEvaluationStrategy}
            onEvaluationModeChange={setEvaluationMode}
            onCorrectnessEnabledChange={setCorrectnessEnabled}
            onAbstentionEnabledChange={setAbstentionEnabled}
            onSufficiencyEnabledChange={setSufficiencyEnabled}
            onDeepJudgmentTemplateEnabledChange={setDeepJudgmentTemplateEnabled}
            onDeepJudgmentSearchEnabledChange={setDeepJudgmentSearchEnabled}
            onDeepJudgmentRubricEnabledChange={setDeepJudgmentRubricEnabled}
            onDeepJudgmentRubricModeChange={setDeepJudgmentRubricMode}
            onDeepJudgmentRubricExtractExcerptsChange={setDeepJudgmentRubricExtractExcerpts}
            onFewShotEnabledChange={setFewShotEnabled}
            onFewShotModeChange={setFewShotMode}
            onFewShotKChange={setFewShotK}
            onManualTraceUploadSuccess={(traceCount) => {
              setError(null);
              console.log(`Successfully loaded ${traceCount} manual traces`);
            }}
            onManualTraceUploadError={(errorMessage) => {
              setError(`Manual trace upload failed: ${errorMessage}`);
            }}
          />

          {/* Run Management Section */}
          <Card>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Run Management
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Run Name (Optional)
                </label>
                <input
                  type="text"
                  value={runName}
                  onChange={(e) => setRunName(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  disabled={isRunning}
                  placeholder="Enter a name for this run (auto-generated if empty)"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  If empty, a name will be auto-generated with timestamp
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Number of Replicates
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={replicateInputValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    setReplicateInputValue(value);
                    // Update store with valid number, or 1 if empty/invalid
                    if (value === '') {
                      // Don't update store yet, wait for blur
                    } else {
                      const parsed = parseInt(value);
                      if (!isNaN(parsed)) {
                        setReplicateCount(Math.max(1, Math.min(10, parsed)));
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // On blur, ensure we have a valid value (default to 1 if empty)
                    if (e.target.value === '' || parseInt(e.target.value) < 1) {
                      setReplicateInputValue('1');
                      setReplicateCount(1);
                    } else {
                      const parsed = parseInt(e.target.value);
                      const clamped = Math.max(1, Math.min(10, parsed));
                      setReplicateInputValue(clamped.toString());
                      setReplicateCount(clamped);
                    }
                  }}
                  disabled={isRunning}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Run each test combination multiple times to mitigate LLM variance
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-end">
                <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                    {answeringModels.length}
                  </div>
                  <div className="text-sm text-indigo-600 dark:text-indigo-300">Answering Models</div>
                </div>
              </div>

              <div className="flex items-end">
                <div className="w-full bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                    {parsingModels.length}
                  </div>
                  <div className="text-sm text-emerald-600 dark:text-emerald-300">Parsing Models</div>
                </div>
              </div>

              <div className="flex items-end">
                <div className="w-full bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {answeringModels.length * parsingModels.length * replicateCount}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">Total Runs per Question</div>
                </div>
              </div>

              <div className="flex items-end">
                <div className="w-full bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {benchmarkResults ? Object.keys(benchmarkResults).length : 0}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-300">Total Results</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Test Selection Widget */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Test Selection ({filteredTemplates.length}
                {testSearchTerm ? ` of ${finishedTemplates.length}` : ''} available)
              </h3>

              <div className="flex gap-3">
                <button
                  onClick={handleSelectAll}
                  disabled={isRunning || filteredTemplates.length === 0}
                  className="px-3 py-1 text-sm bg-slate-600 text-white rounded hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Select Visible
                </button>
                <button
                  onClick={handleSelectNone}
                  disabled={isRunning}
                  className="px-3 py-1 text-sm bg-slate-600 text-white rounded hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Deselect Visible
                </button>
                {selectedTests.size > 0 && (
                  <button
                    onClick={handleClearAllSelections}
                    disabled={isRunning}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Clear All ({selectedTests.size})
                  </button>
                )}
                <button
                  onClick={() => handleStartVerification()}
                  disabled={isRunning || selectedTests.size === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  <Play className="w-4 h-4" />
                  Run Selected ({selectedTests.size} × {answeringModels.length * parsingModels.length * replicateCount}{' '}
                  = {selectedTests.size * answeringModels.length * parsingModels.length * replicateCount})
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={testSearchTerm}
                  onChange={(e) => setTestSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                />
                {testSearchTerm && (
                  <button
                    onClick={() => setTestSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {finishedTemplates.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No finished templates available. Complete some templates in the curator first.
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No questions match your search. Try a different search term.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-600">
                      <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300 w-12">
                        <input
                          type="checkbox"
                          checked={
                            filteredTemplates.length > 0 && filteredTemplates.every(([id]) => selectedTests.has(id))
                          }
                          onChange={
                            filteredTemplates.every(([id]) => selectedTests.has(id))
                              ? handleSelectNone
                              : handleSelectAll
                          }
                          disabled={isRunning}
                          className="rounded border-slate-300 dark:border-slate-600"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Question</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        Last Modified
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTemplates.map(([questionId, item]) => (
                      <tr
                        key={questionId}
                        className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedTests.has(questionId)}
                            onChange={() => handleToggleTest(questionId)}
                            disabled={isRunning}
                            className="rounded border-slate-300 dark:border-slate-600"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-900 dark:text-slate-100 font-medium">
                            {getQuestionPreview(item.question)}

                            {/* Show few-shot indicator when custom mode is active and question has examples */}
                            {fewShotEnabled &&
                              fewShotMode === 'custom' &&
                              item.few_shot_examples &&
                              item.few_shot_examples.length > 0 && (
                                <div className="mt-2">
                                  <button
                                    onClick={() => handleToggleQuestionExpansion(questionId)}
                                    disabled={isRunning}
                                    className="flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 disabled:opacity-50"
                                  >
                                    {expandedQuestions.has(questionId) ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                    Custom Examples ({item.few_shot_examples.length} available)
                                  </button>

                                  {/* Expanded example selection */}
                                  {expandedQuestions.has(questionId) && (
                                    <div className="mt-2 p-3 bg-violet-50 dark:bg-violet-900/20 rounded border border-violet-200 dark:border-violet-800">
                                      <div className="text-xs text-violet-700 dark:text-violet-300 mb-2 font-medium">
                                        Select examples to use for few-shot prompting:
                                      </div>
                                      <div className="space-y-2">
                                        {item.few_shot_examples.map((example, index) => (
                                          <label key={index} className="flex items-start gap-2 text-xs">
                                            <input
                                              type="checkbox"
                                              checked={customFewShotSelections[questionId]?.has(index) || false}
                                              onChange={() => handleToggleExampleSelection(questionId, index)}
                                              disabled={isRunning}
                                              className="mt-0.5 rounded border-violet-300 dark:border-violet-600 text-violet-600"
                                            />
                                            <span className="text-slate-600 dark:text-slate-300">
                                              <strong>Q:</strong> {example.question?.substring(0, 50)}
                                              {example.question?.length > 50 ? '...' : ''}
                                              <br />
                                              <strong>A:</strong> {example.answer?.substring(0, 50)}
                                              {example.answer?.length > 50 ? '...' : ''}
                                            </span>
                                          </label>
                                        ))}
                                      </div>
                                      <div className="mt-2 text-xs text-violet-600 dark:text-violet-400">
                                        Selected: {customFewShotSelections[questionId]?.size || 0} of{' '}
                                        {item.few_shot_examples.length}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {new Date(item.last_modified).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleStartVerification([questionId])}
                            disabled={isRunning}
                            className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 text-sm"
                          >
                            <Play className="w-3 h-3" />
                            Run Single
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Control Panel */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Verification Control
              </h3>

              <div className="flex gap-3">
                {/* Upload Results Button - Always visible */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="results-upload"
                  />
                  <label htmlFor="results-upload">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isRunning || isUploading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      type="button"
                    >
                      <Upload className="w-4 h-4" />
                      {isUploading ? 'Loading...' : 'Upload Results'}
                    </button>
                  </label>
                </div>

                {isRunning && (
                  <button
                    onClick={handleCancelVerification}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Square className="w-4 h-4" />
                    Cancel
                  </button>
                )}

                {progress && progress.status === 'completed' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExportResults('json')}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <FileDown className="w-4 h-4" />
                      Export JSON
                    </button>
                    <button
                      onClick={() => handleExportResults('csv')}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <FileDown className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>
                )}
              </div>
            </div>

            <ProgressIndicator
              isRunning={isRunning}
              progress={progress}
              selectedTestsCount={selectedTests.size}
              answeringModelsCount={answeringModels.length}
              parsingModelsCount={parsingModels.length}
              replicateCount={replicateCount}
              finishedTemplates={finishedTemplates}
            />

            {/* Aggregated Test Stats - Only show after verification completes */}
            {!isRunning && stats.hasResults && (
              <div className="grid grid-cols-6 gap-3 mb-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalResults}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">Total Tests</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.successfulCount}</div>
                  <div className="text-xs text-green-600 dark:text-green-400">Completed Without Errors</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.failedCount}</div>
                  <div className="text-xs text-red-600 dark:text-red-400">With Errors</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {
                      getAllUnfilteredResults().filter(
                        (r) => r.template?.abstention_detected && r.template?.abstention_check_performed
                      ).length
                    }
                  </div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">Abstained</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {stats.passedVerificationCount}
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">Passed</div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                    {stats.failedVerificationCount}
                  </div>
                  <div className="text-xs text-rose-600 dark:text-rose-400">Failed</div>
                </div>
              </div>
            )}

            {/* Job Duration - Show after verification completes */}
            {!isRunning && progress?.duration_seconds !== undefined && (
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Last job took: {formatDuration(progress.duration_seconds)}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-red-800 dark:text-red-200 font-medium">Error</span>
                </div>
                <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            )}

            {/* Success Display */}
            {uploadSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-800 dark:text-green-200 font-medium">Upload Successful</span>
                </div>
                <p className="text-green-700 dark:text-green-300 mt-1">{uploadSuccess}</p>
              </div>
            )}
          </Card>

          {/* Help message for custom few-shot mode */}
          {fewShotEnabled && fewShotMode === 'custom' && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">i</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Custom Examples Selection Mode</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    You've selected custom examples selection. To use this feature:
                  </p>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside space-y-1">
                    <li>
                      Go to the <strong>Template Curator</strong> tab
                    </li>
                    <li>Select a question and click "Edit Few-shot Examples" in the status badge</li>
                    <li>Add example question-answer pairs for that question</li>
                    <li>Return to this tab - questions with examples will show expandable selection controls</li>
                  </ol>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    Questions without few-shot examples will use zero-shot prompting even when this feature is enabled.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Test Results Table */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {filteredCount !== null && filteredCount !== totalCount
                    ? `Test Results (${filteredCount} of ${totalCount})`
                    : `Test Results (${Object.keys(benchmarkResults).length})`}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {stats.hasResults && !isRunning && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all test results? This action cannot be undone.')) {
                        setBenchmarkResults({});
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-all duration-200 text-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear Results
                  </button>
                )}
                {Object.keys(benchmarkResults).length > 0 && (
                  <>
                    <button
                      onClick={() => handleExportFilteredResults('json')}
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-all duration-200 text-sm"
                    >
                      <Download className="w-3 h-3" />
                      JSON
                    </button>
                    <button
                      onClick={() => handleExportFilteredResults('csv')}
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-all duration-200 text-sm"
                    >
                      <Download className="w-3 h-3" />
                      CSV
                    </button>
                    <button
                      onClick={() => setIsCustomExportDialogOpen(true)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all duration-200 text-sm"
                    >
                      <Settings className="w-3 h-3" />
                      Customized Export
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Filters help text */}
            {stats.hasResults && (
              <div className="mb-4 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Filter className="w-4 h-4" />
                  <span className="font-medium">Interactive Filters & Sorting</span>
                </div>
                <p>
                  Use the filters in each column header to narrow down results. Click column headers to sort. Filters
                  persist across tab switches but reset on page reload.
                </p>
              </div>
            )}

            <BenchmarkTable
              benchmarkResults={benchmarkResults}
              checkpoint={checkpoint}
              onViewResult={setSelectedResult}
              onFilteredCountChange={handleFilteredCountChange}
              externalFilters={externalFilters}
            />
          </Card>

          {/* Summary Statistics Panel */}
          {stats.hasResults && (
            <SummaryStatisticsPanel
              benchmarkResults={benchmarkResults}
              checkpoint={checkpoint}
              currentRubric={currentRubric}
              onDrillDown={(filter) => {
                // Build column filters based on drill-down type
                const filters: ColumnFiltersState = [];

                if (filter.type === 'completed') {
                  filters.push({ id: 'completed_without_errors', value: true });
                } else if (filter.type === 'errors') {
                  filters.push({ id: 'completed_without_errors', value: false });
                } else if (filter.type === 'passed') {
                  filters.push({ id: 'verify_result', value: true });
                } else if (filter.type === 'failed') {
                  filters.push({ id: 'verify_result', value: false });
                } else if (filter.type === 'abstained') {
                  filters.push({ id: 'abstained', value: true });
                }

                if (filter.questionId) {
                  filters.push({ id: 'question_text', value: filter.questionId });
                }

                if (filter.modelKey) {
                  // Model key is in format "model_name|mcp_config"
                  const [modelName] = filter.modelKey.split('|');
                  filters.push({ id: 'answering_model', value: modelName });
                }

                setExternalFilters(filters);

                // Scroll to summary panel
                setTimeout(() => {
                  const summaryElement = document.querySelector('[class*="Summary Statistics"]');
                  summaryElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
            />
          )}

          {/* Results Modal */}
          <VerificationResultDetailModal
            result={selectedResult}
            checkpoint={checkpoint}
            currentRubric={currentRubric}
            onClose={() => setSelectedResult(null)}
          />
        </div>
      );
    } catch (e) {
      console.error('Error rendering content:', e);
      return (
        <div className="text-center py-8 text-red-500 dark:text-red-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>Error loading benchmark data. Please refresh the page and try again.</p>
          <p className="text-sm mt-1">Error: {e instanceof Error ? e.message : 'Unknown error'}</p>
        </div>
      );
    }
  };

  return (
    <ErrorBoundary>
      {renderContent()}
      <CustomExportDialog
        isOpen={isCustomExportDialogOpen}
        onClose={() => setIsCustomExportDialogOpen(false)}
        results={
          // No transformation needed - raw_answer is already in metadata
          Object.values(benchmarkResults) as ExportableResult[]
        }
        globalRubric={currentRubric}
        onExport={handleCustomExport}
      />
      <PresetManager isOpen={showPresetModal} onClose={() => setShowPresetModal(false)} />
      <MergeResultsDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onConfirm={handleUploadConfirm}
        uploadedCount={uploadedCount}
        existingCount={existingCount}
        conflictCount={conflictCount}
        totalAfterMerge={totalAfterMerge}
      />
    </ErrorBoundary>
  );
};
