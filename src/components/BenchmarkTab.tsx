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
} from 'lucide-react';
import { Checkpoint, VerificationResult, VerificationProgress, VerificationConfig } from '../types';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { Card } from './ui/Card';
import { API_ENDPOINTS, HTTP_METHODS, HEADERS } from '../constants/api';
import { exportFromServer, exportFilteredResults, ExportableResult } from '../utils/export';
import { ConfigurationPanel } from './benchmark/ConfigurationPanel';
import { ProgressIndicator } from './benchmark/ProgressIndicator';
import { VerificationResultDetailModal } from './benchmark/VerificationResultDetailModal';
import { BenchmarkTable } from './BenchmarkTable';
import { useBenchmarkConfiguration } from '../hooks/useBenchmarkConfiguration';
import { useRubricStore } from '../stores/useRubricStore';
import { useDatasetStore } from '../stores/useDatasetStore';
import { CustomExportDialog } from './CustomExportDialog';
import { autoSaveToDatabase } from '../utils/databaseAutoSave';

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
    evaluationMode,
    correctnessEnabled,
    abstentionEnabled,
    deepJudgmentEnabled,
    deepJudgmentSearchEnabled,
    fewShotEnabled,
    fewShotMode,
    fewShotK,
    setReplicateCount,
    setRunName,
    setRubricEnabled,
    setEvaluationMode,
    setCorrectnessEnabled,
    setAbstentionEnabled,
    setDeepJudgmentEnabled,
    setDeepJudgmentSearchEnabled,
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
  const { storageUrl, metadata } = useDatasetStore();

  // Verification state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<VerificationProgress | null>(null);
  const [selectedResult, setSelectedResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);

  // Test selection state
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());

  // Few-shot custom selection state
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [customFewShotSelections, setCustomFewShotSelections] = useState<Record<string, Set<number>>>({});

  // Local state for replicate count input to allow clearing
  const [replicateInputValue, setReplicateInputValue] = useState<string>(replicateCount.toString());

  // Filter state for table results
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  // Custom export dialog state
  const [isCustomExportDialogOpen, setIsCustomExportDialogOpen] = useState(false);

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

  // WebSocket cleanup on unmount
  useEffect(() => {
    return () => {
      // Disconnect WebSocket when component unmounts
      disconnectProgressWebSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Note: HTTP polling logic has been removed and replaced with WebSocket streaming.
  // The WebSocket connection is established in handleStartVerification() after the job starts
  // and provides real-time progress updates with <100ms latency (vs 1s polling delay).
  // Progress events: snapshot, job_started, task_started, task_completed, job_completed, job_failed, job_cancelled

  // WebSocket connection management
  const connectProgressWebSocket = (jobId: string) => {
    // Disconnect any existing connection
    if (websocket) {
      websocket.close();
      setWebsocket(null);
    }

    try {
      // Determine WebSocket protocol based on current page protocol
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/verification-progress/${jobId}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected for verification job', jobId);
      };

      ws.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data);

          // Handle different event types
          switch (eventData.type) {
            case 'snapshot':
            case 'job_started':
            case 'task_started':
            case 'task_completed':
              // Update progress
              setProgress({
                job_id: eventData.job_id,
                status: eventData.status,
                percentage: eventData.percentage,
                processed_count: eventData.processed,
                total_count: eventData.total,
                current_question: eventData.current_question || '',
                estimated_time_remaining: eventData.estimated_time_remaining,
                in_progress_questions: eventData.in_progress_questions || [],
                ema_seconds_per_item: eventData.ema_seconds_per_item || 0,
                successful_count: 0,
                failed_count: 0,
              });
              break;

            case 'job_completed':
              // Update progress to show completed status
              setProgress((prev) => ({
                ...prev,
                job_id: jobId,
                status: 'completed',
                percentage: 100,
                in_progress_questions: [],
                current_question: '',
                processed_count: prev?.processed_count || 0,
                total_count: prev?.total_count || 0,
                successful_count: 0,
                failed_count: 0,
              }));

              // Fetch final results
              fetch(`/api/verification-progress/${jobId}`)
                .then((res) => res.json())
                .then(async (data) => {
                  setIsRunning(false);
                  if (data.results && typeof data.results === 'object') {
                    console.log('Setting results:', Object.keys(data.results).length, 'items');
                    const sanitizedResults: Record<string, VerificationResult> = {};
                    for (const [, value] of Object.entries(data.results)) {
                      if (value && typeof value === 'object') {
                        const result = value as VerificationResult;
                        const timestamp = result.timestamp || new Date().toISOString();
                        const compositeKey = `${result.question_id}_${result.job_id || jobId}_${timestamp}`;
                        sanitizedResults[compositeKey] = result;
                      }
                    }
                    // Accumulate results instead of replacing them
                    setBenchmarkResults((prev) => ({ ...prev, ...sanitizedResults }));
                    console.log('Results set successfully');

                    // Auto-save to database after verification completes
                    try {
                      await autoSaveToDatabase(checkpoint);
                      console.log('💾 Checkpoint auto-saved to database after verification');
                    } catch (saveError) {
                      console.warn('⚠️ Failed to auto-save to database after verification:', saveError);
                    }
                  }
                  disconnectProgressWebSocket();
                })
                .catch((err) => {
                  console.error('Failed to fetch final results:', err);
                  setIsRunning(false);
                  disconnectProgressWebSocket();
                });
              break;

            case 'job_failed':
              setError(eventData.error || 'Verification failed');
              setIsRunning(false);
              disconnectProgressWebSocket();
              break;

            case 'job_cancelled':
              setProgress((prev) => ({
                ...prev,
                job_id: jobId,
                status: 'cancelled',
                processed_count: prev?.processed_count || 0,
                total_count: prev?.total_count || 0,
                successful_count: 0,
                failed_count: 0,
              }));
              setIsRunning(false);
              disconnectProgressWebSocket();
              break;

            default:
              console.warn('Unknown WebSocket event type:', eventData.type);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setWebsocket(null);
      };

      setWebsocket(ws);
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
    }
  };

  const disconnectProgressWebSocket = () => {
    if (websocket) {
      websocket.close();
      setWebsocket(null);
    }
  };

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
        storage_url: storageUrl || undefined, // Include storage URL for database auto-save
        benchmark_name: metadata?.name || undefined, // Include benchmark name for database auto-save
      };

      // DEBUG: Log verification request details
      console.log('🔍 Verification Request Debug:');
      console.log('  Config:', JSON.stringify(config, null, 2));
      console.log('  Rubric Enabled?', config.rubric_enabled);

      // Log first template's rubric (if any) to verify metric_traits are included
      if (templatesData.length > 0 && templatesData[0].question_rubric) {
        console.log('  Sample Question Rubric:', JSON.stringify(templatesData[0].question_rubric, null, 2));
        console.log('  Has Metric Traits?', templatesData[0].question_rubric.metric_traits?.length > 0);
      } else {
        console.log('  No question rubrics found in templates');
      }

      console.log('  Complete Request Payload:', JSON.stringify(requestPayload, null, 2));

      // Log database auto-save configuration
      if (storageUrl && metadata?.name) {
        console.log('🔗 Database auto-save enabled:', { storageUrl, benchmarkName: metadata.name });
      } else {
        console.warn('⚠️ Database auto-save disabled - missing:', {
          storageUrl: storageUrl ? 'set' : 'NOT SET',
          benchmarkName: metadata?.name ? metadata.name : 'NOT SET',
        });
      }

      const response = await fetch(API_ENDPOINTS.START_VERIFICATION, {
        method: HTTP_METHODS.POST,
        headers: HEADERS.CONTENT_TYPE_JSON,
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        // Try to get error detail from response body
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {
          // If parsing fails, use the default error message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setJobId(data.job_id);

      // Connect to WebSocket for real-time progress updates
      connectProgressWebSocket(data.job_id);
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

      // Disconnect WebSocket
      disconnectProgressWebSocket();

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
            evaluationMode={evaluationMode}
            correctnessEnabled={correctnessEnabled}
            abstentionEnabled={abstentionEnabled}
            deepJudgmentEnabled={deepJudgmentEnabled}
            deepJudgmentSearchEnabled={deepJudgmentSearchEnabled}
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
            onEvaluationModeChange={setEvaluationMode}
            onCorrectnessEnabledChange={setCorrectnessEnabled}
            onAbstentionEnabledChange={setAbstentionEnabled}
            onDeepJudgmentEnabledChange={setDeepJudgmentEnabled}
            onDeepJudgmentSearchEnabledChange={setDeepJudgmentSearchEnabled}
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
              finishedTemplates={finishedTemplates}
            />

            {/* Aggregated Test Stats - Always show when running or have results to prevent layout shift */}
            {(isRunning || getAllUnfilteredResults().length > 0) && (
              <div className="grid grid-cols-6 gap-3 mb-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {getAllUnfilteredResults().length}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">Total Tests</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {getAllUnfilteredResults().filter((r) => r.completed_without_errors).length}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">Completed Without Errors</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {getAllUnfilteredResults().filter((r) => !r.completed_without_errors).length}
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">With Errors</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {
                      getAllUnfilteredResults().filter((r) => r.abstention_detected && r.abstention_check_performed)
                        .length
                    }
                  </div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">Abstained</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {
                      getAllUnfilteredResults().filter(
                        (r) =>
                          r.verify_result === true ||
                          (typeof r.verify_result === 'object' &&
                            r.verify_result !== null &&
                            'completed_without_errors' in r.verify_result &&
                            r.verify_result.completed_without_errors === true)
                      ).length
                    }
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">Passed</div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                    {
                      getAllUnfilteredResults().filter(
                        (r) =>
                          r.verify_result === false ||
                          (typeof r.verify_result === 'object' &&
                            r.verify_result !== null &&
                            'completed_without_errors' in r.verify_result &&
                            r.verify_result.completed_without_errors === false)
                      ).length
                    }
                  </div>
                  <div className="text-xs text-rose-600 dark:text-rose-400">Failed</div>
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
