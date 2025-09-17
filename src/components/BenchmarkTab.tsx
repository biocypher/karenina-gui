import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  Download,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Filter,
  FileDown,
  Trash2,
  Settings,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Checkpoint, VerificationResult, VerificationProgress, VerificationConfig } from '../types';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { Card } from './ui/Card';
import { API_ENDPOINTS, HTTP_METHODS, HEADERS } from '../constants/api';
import { exportFromServer, exportFilteredResults, ExportableResult } from '../utils/export';
import { ConfigurationPanel } from './benchmark/ConfigurationPanel';
import { ProgressIndicator } from './benchmark/ProgressIndicator';
import { BenchmarkTable } from './BenchmarkTable';
import { useBenchmarkConfiguration } from '../hooks/useBenchmarkConfiguration';
import { RubricResultsDisplay } from './RubricResultsDisplay';
import { useRubricStore } from '../stores/useRubricStore';
import { CustomExportDialog } from './CustomExportDialog';

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
    correctnessEnabled,
    fewShotEnabled,
    fewShotMode,
    fewShotK,
    setReplicateCount,
    setRunName,
    setRubricEnabled,
    setCorrectnessEnabled,
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
    getAsyncConfig,
  } = useBenchmarkConfiguration();

  // Rubric store
  const { currentRubric } = useRubricStore();

  // Verification state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<VerificationProgress | null>(null);
  const [selectedResult, setSelectedResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Test selection state
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());

  // Few-shot custom selection state
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [customFewShotSelections, setCustomFewShotSelections] = useState<Record<string, Set<number>>>({});

  // Add state for polling retry count
  const [, setRetryCount] = useState(0);

  // Filter state for table results
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  // Custom export dialog state
  const [isCustomExportDialogOpen, setIsCustomExportDialogOpen] = useState(false);
  const MAX_RETRIES = 10;

  // Get finished templates from checkpoint
  const finishedTemplates = Object.entries(checkpoint).filter(([, item]) => item.finished);

  const getQuestionPreview = (text: string) => {
    return text.length > 60 ? text.substring(0, 60) + '...' : text;
  };

  // Handle filtered count changes from table
  const handleFilteredCountChange = (filtered: number, total: number) => {
    setFilteredCount(filtered);
    setTotalCount(total);
  };

  // Handle export filtered results - Fix the function to work with simple client-side export
  const handleExportFilteredResults = async (format: 'json' | 'csv') => {
    const filteredResults = Object.values(benchmarkResults).map((result) => ({
      ...result,
      raw_answer: checkpoint[result.question_id]?.raw_answer,
    })) as ExportableResult[];

    exportFilteredResults(
      filteredResults,
      format,
      (error) => {
        setError(error);
      },
      currentRubric
    );
  };

  // Handle custom export with field selection
  const handleCustomExport = (selectedFields: string[], format: 'json' | 'csv') => {
    const filteredResults = Object.values(benchmarkResults).map((result) => ({
      ...result,
      raw_answer: checkpoint[result.question_id]?.raw_answer,
    })) as ExportableResult[];
    exportFilteredResults(
      filteredResults,
      format,
      (error) => {
        setError(error);
      },
      currentRubric,
      selectedFields
    );
  };

  // Poll for progress updates
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    if (isRunning && jobId) {
      console.log(`Starting polling for job: ${jobId}`);

      interval = setInterval(async () => {
        if (!isMounted || !isRunning) return;

        try {
          console.log(`Polling progress for job: ${jobId}`);
          const response = await fetch(API_ENDPOINTS.VERIFICATION_PROGRESS(jobId));

          if (!response.ok) {
            console.error(`Progress polling failed with status: ${response.status}`);
            if (response.status >= 400 && isMounted) {
              setIsRunning(false);
              setError(`Progress polling failed: ${response.status} ${response.statusText}`);
              return;
            }
          }

          const progressData = await response.json();
          console.log('Progress data received:', progressData);

          // Validate progress data structure
          if (!progressData || typeof progressData !== 'object') {
            console.error('Invalid progress data received:', progressData);
            setRetryCount((prev) => {
              const newCount = prev + 1;
              if (newCount >= MAX_RETRIES && isMounted) {
                setIsRunning(false);
                setError('Too many invalid responses from server');
              }
              return newCount;
            });
            return;
          }

          // Reset retry count on successful response
          if (isMounted) {
            setRetryCount(0);

            // Safely update progress
            try {
              setProgress((prev) => {
                console.log('Updating progress from:', prev?.status, 'to:', progressData.status);
                return progressData;
              });
            } catch (e) {
              console.error('Error setting progress:', e);
            }

            if (progressData.status === 'completed') {
              console.log('Verification completed, cleaning up...');
              setIsRunning(false);

              if (progressData.results && typeof progressData.results === 'object') {
                console.log('Setting results:', Object.keys(progressData.results).length, 'items');
                try {
                  // Validate and sanitize results before setting
                  const sanitizedResults: Record<string, VerificationResult> = {};
                  for (const [, value] of Object.entries(progressData.results)) {
                    if (value && typeof value === 'object') {
                      const result = value as VerificationResult;
                      // Use composite key with timestamp to ensure every result is stored uniquely
                      const timestamp = result.timestamp || new Date().toISOString();
                      const compositeKey = `${result.question_id}_${result.job_id || progressData.job_id}_${timestamp}`;
                      sanitizedResults[compositeKey] = result;
                    }
                  }
                  console.log('Sanitized results structure:', {
                    count: Object.keys(sanitizedResults).length,
                    firstKey: Object.keys(sanitizedResults)[0],
                    firstValue: sanitizedResults[Object.keys(sanitizedResults)[0]],
                    keys: Object.keys(sanitizedResults),
                  });
                  // Accumulate results instead of replacing them
                  setBenchmarkResults((prev) => ({ ...prev, ...sanitizedResults }));
                  console.log('Results set successfully');
                } catch (e) {
                  console.error('Error setting results:', e);
                  setError('Failed to process verification results');
                }
              } else {
                console.warn('Completed but no valid results received');
                setError('Verification completed but no results were returned');
              }
            } else if (progressData.status === 'failed') {
              console.log('Verification failed:', progressData.error);
              setIsRunning(false);
              setError(progressData.error || 'Verification failed');
            }
          }
        } catch (err) {
          console.error('Error polling progress:', err);
          if (isMounted) {
            setRetryCount((prev) => {
              const newCount = prev + 1;
              const errorMessage = err instanceof Error ? err.message : 'Unknown error';

              if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
                console.warn(`Network error during polling (attempt ${newCount}/${MAX_RETRIES}), will retry...`);
                if (newCount >= MAX_RETRIES) {
                  setIsRunning(false);
                  setError(`Polling failed after ${MAX_RETRIES} retries: ${errorMessage}`);
                }
              } else {
                // For non-network errors, stop polling
                setIsRunning(false);
                setError(`Polling error: ${errorMessage}`);
              }
              return newCount;
            });
          }
        }
      }, 1000);
    }

    return () => {
      console.log('Cleaning up polling interval');
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, jobId, MAX_RETRIES, setBenchmarkResults]);

  const handleStartVerification = async (questionIds?: string[]) => {
    const idsToRun = questionIds || Array.from(selectedTests);

    if (idsToRun.length === 0) {
      setError('No tests selected for verification.');
      return;
    }

    setIsRunning(true);
    setProgress(null);
    // DON'T clear existing results - we want to accumulate them
    setError(null);
    setRetryCount(0); // Reset retry count for new verification

    try {
      // Prepare verification config
      const config: VerificationConfig = getVerificationConfig();

      // Prepare finished templates data
      const templatesData = finishedTemplates.map(([questionId, item]) => ({
        question_id: questionId,
        question_text: item.question,
        question_preview: getQuestionPreview(item.question),
        template_code: item.answer_template,
        last_modified: item.last_modified,
        finished: true,
        question_rubric: item.question_rubric || null,
        keywords: item.keywords || null,
      }));

      const requestPayload = {
        config,
        question_ids: idsToRun,
        finished_templates: templatesData,
        run_name: runName.trim() || undefined, // Send run name if provided
        async_config: getAsyncConfig(), // Include async configuration from config store
      };

      const response = await fetch(API_ENDPOINTS.START_VERIFICATION, {
        method: HTTP_METHODS.POST,
        headers: HEADERS.CONTENT_TYPE_JSON,
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setJobId(data.job_id);
    } catch (err) {
      setIsRunning(false);
      setError(err instanceof Error ? err.message : 'Failed to start verification');
    }
  };

  const handleCancelVerification = async () => {
    if (!jobId) return;

    try {
      await fetch(API_ENDPOINTS.CANCEL_VERIFICATION(jobId), {
        method: HTTP_METHODS.POST,
      });
      setIsRunning(false);
      setProgress(null);
      setJobId(null);
    } catch (err) {
      console.error('Error cancelling verification:', err);
    }
  };

  const handleExportResults = async (format: 'json' | 'csv') => {
    if (!jobId) return;

    try {
      await exportFromServer(jobId, format);
    } catch (err) {
      console.error('Error exporting results:', err);
      setError('Failed to export results. Please try again.');
    }
  };

  // Test selection functions
  const handleSelectAll = () => {
    setSelectedTests(new Set(finishedTemplates.map(([id]) => id)));
  };

  const handleSelectNone = () => {
    setSelectedTests(new Set());
  };

  const handleToggleTest = (questionId: string) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedTests(newSelected);
  };

  // Few-shot example selection handlers
  const handleToggleQuestionExpansion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const handleToggleExampleSelection = (questionId: string, exampleIndex: number) => {
    const currentSelections = customFewShotSelections[questionId] || new Set<number>();
    const newSelections = new Set(currentSelections);

    if (newSelections.has(exampleIndex)) {
      newSelections.delete(exampleIndex);
    } else {
      newSelections.add(exampleIndex);
    }

    setCustomFewShotSelections({
      ...customFewShotSelections,
      [questionId]: newSelections,
    });
  };

  // Get all unfiltered results for statistics
  const getAllUnfilteredResults = () => {
    try {
      if (!benchmarkResults) {
        return [];
      }
      const unfiltered = Object.values(benchmarkResults);
      // Prevent memory issues with extremely large datasets
      const maxResults = 1000;
      if (unfiltered.length > maxResults) {
        console.warn(`Processing first ${maxResults} results out of ${unfiltered.length} total`);
        return unfiltered.slice(0, maxResults);
      }
      return unfiltered;
    } catch (e) {
      console.error('Error in getAllUnfilteredResults:', e);
      return [];
    }
  };

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
          <ConfigurationPanel
            answeringModels={answeringModels}
            parsingModels={parsingModels}
            replicateCount={replicateCount}
            expandedPrompts={expandedPrompts}
            isRunning={isRunning}
            finishedTemplates={finishedTemplates}
            rubricEnabled={rubricEnabled}
            correctnessEnabled={correctnessEnabled}
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
            onCorrectnessEnabledChange={setCorrectnessEnabled}
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

          {/* Control Panel */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Verification Control
              </h3>

              <div className="flex gap-3">
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
            />

            {/* Aggregated Test Stats - Only show when not running and we have results */}
            {!isRunning && getAllUnfilteredResults().length > 0 && (
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {getAllUnfilteredResults().length}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">Total Tests</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {getAllUnfilteredResults().filter((r) => r.success).length}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">Successful</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {getAllUnfilteredResults().filter((r) => !r.success).length}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400">Failed</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {getAllUnfilteredResults().length > 0
                      ? `${(getAllUnfilteredResults().reduce((sum, r) => sum + r.execution_time, 0) / getAllUnfilteredResults().length).toFixed(1)}s`
                      : 'N/A'}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Avg Time</div>
                </div>
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
          </Card>

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
                  value={replicateCount}
                  onChange={(e) => setReplicateCount(Math.max(1, parseInt(e.target.value) || 1))}
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
                Test Selection ({finishedTemplates.length} available)
              </h3>

              <div className="flex gap-3">
                <button
                  onClick={handleSelectAll}
                  disabled={isRunning || finishedTemplates.length === 0}
                  className="px-3 py-1 text-sm bg-slate-600 text-white rounded hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Select All
                </button>
                <button
                  onClick={handleSelectNone}
                  disabled={isRunning}
                  className="px-3 py-1 text-sm bg-slate-600 text-white rounded hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Select None
                </button>
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

            {finishedTemplates.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No finished templates available. Complete some templates in the curator first.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-600">
                      <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300 w-12">
                        <input
                          type="checkbox"
                          checked={selectedTests.size === finishedTemplates.length && finishedTemplates.length > 0}
                          onChange={
                            selectedTests.size === finishedTemplates.length ? handleSelectNone : handleSelectAll
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
                    {finishedTemplates.map(([questionId, item]) => (
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
                {getAllUnfilteredResults().length > 0 && !isRunning && (
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
            {getAllUnfilteredResults().length > 0 && (
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
            />
          </Card>

          {/* Results Modal */}
          {selectedResult && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Detailed Answering Trace
                    </h3>
                    <button
                      onClick={() => setSelectedResult(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                  {(() => {
                    try {
                      return (
                        <div className="space-y-4">
                          {/* Status */}
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Status</h4>
                            <div
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                                selectedResult.success
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                              }`}
                            >
                              {selectedResult.success ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <AlertCircle className="w-4 h-4" />
                              )}
                              {selectedResult.success ? 'Success' : 'Failed'}
                            </div>
                            {selectedResult.error && (
                              <p className="text-red-600 dark:text-red-400 mt-2">{selectedResult.error}</p>
                            )}
                          </div>

                          {/* Raw Question */}
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Raw Question</h4>
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                              <p className="text-slate-800 dark:text-slate-200">
                                {selectedResult.question_text || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Raw Answer (Expected) */}
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                              Raw Answer (Expected)
                            </h4>
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                              <p className="text-slate-800 dark:text-slate-200">
                                {checkpoint[selectedResult.question_id]?.raw_answer || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Raw LLM Response (Generated) */}
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                              Raw LLM Response (Generated)
                            </h4>
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                              <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                                {selectedResult.raw_llm_response || 'N/A'}
                              </pre>
                            </div>
                          </div>

                          {/* Ground Truth (Expected) */}
                          {selectedResult.parsed_gt_response && (
                            <div>
                              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                                Ground Truth (Expected)
                              </h4>
                              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                                  {(() => {
                                    try {
                                      return JSON.stringify(selectedResult.parsed_gt_response, null, 2);
                                    } catch {
                                      return String(selectedResult.parsed_gt_response);
                                    }
                                  })()}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* LLM Extraction (Generated) */}
                          {selectedResult.parsed_llm_response && (
                            <div>
                              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                                LLM Extraction (Generated)
                              </h4>
                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                                  {(() => {
                                    try {
                                      return JSON.stringify(selectedResult.parsed_llm_response, null, 2);
                                    } catch {
                                      return String(selectedResult.parsed_llm_response);
                                    }
                                  })()}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Verification Results */}
                          {selectedResult.verify_result && (
                            <div>
                              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Verify Result</h4>
                              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                                <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                                  {(() => {
                                    try {
                                      return typeof selectedResult.verify_result === 'string'
                                        ? selectedResult.verify_result
                                        : JSON.stringify(selectedResult.verify_result, null, 2);
                                    } catch {
                                      return String(selectedResult.verify_result);
                                    }
                                  })()}
                                </pre>
                              </div>
                            </div>
                          )}

                          {selectedResult.verify_granular_result && (
                            <div>
                              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                                Granular Verify Result
                              </h4>
                              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                                <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                                  {(() => {
                                    try {
                                      return typeof selectedResult.verify_granular_result === 'string'
                                        ? selectedResult.verify_granular_result
                                        : JSON.stringify(selectedResult.verify_granular_result, null, 2);
                                    } catch {
                                      return String(selectedResult.verify_granular_result);
                                    }
                                  })()}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Rubric Evaluation Results */}
                          {selectedResult.verify_rubric && (
                            <div>
                              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                                Rubric Evaluation Results
                              </h4>
                              <RubricResultsDisplay
                                rubricResults={selectedResult.verify_rubric}
                                currentRubric={currentRubric}
                                evaluationRubric={selectedResult.evaluation_rubric}
                              />
                            </div>
                          )}

                          {/* Embedding Check Results */}
                          {selectedResult.embedding_check_performed && (
                            <div>
                              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                                Embedding Check Results
                              </h4>
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                                  <div>
                                    <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                      Similarity Score:
                                    </h5>
                                    <p className="text-slate-800 dark:text-slate-200 text-sm">
                                      {selectedResult.embedding_similarity_score?.toFixed(3) || 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                      Model Used:
                                    </h5>
                                    <p className="text-slate-800 dark:text-slate-200 text-sm">
                                      {selectedResult.embedding_model_used || 'N/A'}
                                    </p>
                                  </div>
                                </div>

                                {selectedResult.embedding_override_applied && (
                                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                    <div className="flex items-center space-x-2">
                                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                        Verification Overridden by Semantic Check
                                      </span>
                                    </div>
                                    <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                                      The initial verification failed, but embedding similarity analysis determined the
                                      answers are semantically equivalent.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* System Prompts */}
                          {(selectedResult.answering_system_prompt || selectedResult.parsing_system_prompt) && (
                            <div>
                              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                                System Prompts Used
                              </h4>
                              <div className="space-y-3">
                                {selectedResult.answering_system_prompt && (
                                  <div>
                                    <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                      Answering Model System Prompt:
                                    </h5>
                                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                                      <p className="text-slate-800 dark:text-slate-200 text-sm">
                                        {selectedResult.answering_system_prompt}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {selectedResult.parsing_system_prompt && (
                                  <div>
                                    <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                      Parsing Model System Prompt:
                                    </h5>
                                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                                      <p className="text-slate-800 dark:text-slate-200 text-sm">
                                        {selectedResult.parsing_system_prompt}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Metadata */}
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Metadata</h4>
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium text-slate-600 dark:text-slate-300">
                                    Answering Model:
                                  </span>
                                  <p className="text-slate-800 dark:text-slate-200">
                                    {selectedResult.answering_model || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-slate-600 dark:text-slate-300">Parsing Model:</span>
                                  <p className="text-slate-800 dark:text-slate-200">
                                    {selectedResult.parsing_model || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-slate-600 dark:text-slate-300">
                                    Execution Time:
                                  </span>
                                  <p className="text-slate-800 dark:text-slate-200">
                                    {selectedResult.execution_time
                                      ? `${selectedResult.execution_time.toFixed(2)}s`
                                      : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-slate-600 dark:text-slate-300">Timestamp:</span>
                                  <p className="text-slate-800 dark:text-slate-200">
                                    {selectedResult.timestamp
                                      ? new Date(selectedResult.timestamp).toLocaleString()
                                      : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    } catch (e) {
                      console.error('Error rendering modal content:', e);
                      return (
                        <div className="text-center py-8 text-red-500">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                          <p>Error displaying result details</p>
                          <p className="text-sm mt-1">{e instanceof Error ? e.message : 'Unknown error'}</p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          )}
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
          Object.values(benchmarkResults).map((result) => ({
            ...result,
            raw_answer: checkpoint[result.question_id]?.raw_answer,
          })) as ExportableResult[]
        }
        globalRubric={currentRubric}
        onExport={handleCustomExport}
      />
    </ErrorBoundary>
  );
};
