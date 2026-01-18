/**
 * AdeleBatchModal - Modal for batch classification of multiple questions.
 *
 * Allows selecting questions and traits, shows progress during classification,
 * and reports results when complete.
 *
 * Uses session configuration from useAdeleConfigStore for:
 * - Model configuration (interface, provider, model, temperature, endpoint)
 * - Pre-selected traits (from session defaults)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Brain, Loader2, CheckCircle, AlertCircle, Play, StopCircle } from 'lucide-react';
import { adeleApi } from '../../services/adeleApi';
import { useAdeleConfigStore } from '../../stores/useAdeleConfigStore';
import type {
  AdeleTraitInfo,
  ClassificationResult,
  BatchProgressResponse,
  AdeleModelConfigRequest,
} from '../../types/adele';

interface Question {
  questionId: string;
  questionText: string;
}

interface AdeleBatchModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Questions available for classification */
  questions: Question[];
  /** Initially selected question IDs (optional) */
  initialSelectedIds?: string[];
  /** Callback when classifications are complete */
  onClassificationsComplete?: (results: Map<string, ClassificationResult>) => void;
}

type ModalState = 'config' | 'running' | 'complete' | 'error';

export const AdeleBatchModal: React.FC<AdeleBatchModalProps> = ({
  isOpen,
  onClose,
  questions,
  initialSelectedIds,
  onClassificationsComplete,
}) => {
  // Get session configuration
  const {
    modelConfig,
    selectedTraits: sessionSelectedTraits,
    traitEvalMode,
    initializeFromDefaults,
  } = useAdeleConfigStore();

  // Initialize session config on mount
  useEffect(() => {
    initializeFromDefaults();
  }, [initializeFromDefaults]);

  // Configuration state
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    new Set(initialSelectedIds || questions.map((q) => q.questionId))
  );
  const [availableTraits, setAvailableTraits] = useState<AdeleTraitInfo[]>([]);
  const [selectedTraits, setSelectedTraits] = useState<Set<string>>(new Set());
  const [traitsInitialized, setTraitsInitialized] = useState(false);
  const [traitsLoading, setTraitsLoading] = useState(false);
  const [traitsError, setTraitsError] = useState<string | null>(null);

  // Job state
  const [modalState, setModalState] = useState<ModalState>('config');
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<BatchProgressResponse | null>(null);
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);

  // Convert model config to API request format
  const buildLlmConfig = useCallback((): AdeleModelConfigRequest => {
    return {
      interface: modelConfig.interface,
      provider: modelConfig.provider,
      model_name: modelConfig.modelName,
      temperature: modelConfig.temperature,
      endpoint_base_url: modelConfig.endpointBaseUrl,
      endpoint_api_key: modelConfig.endpointApiKey,
      trait_eval_mode: traitEvalMode,
    };
  }, [modelConfig, traitEvalMode]);

  // Load available traits on mount
  useEffect(() => {
    if (!isOpen) return;

    const loadTraits = async () => {
      setTraitsLoading(true);
      setTraitsError(null);
      try {
        const traits = await adeleApi.getTraits();
        setAvailableTraits(traits);
        // Use session traits if specified, otherwise select all
        if (sessionSelectedTraits.length > 0 && !traitsInitialized) {
          setSelectedTraits(new Set(sessionSelectedTraits));
        } else if (!traitsInitialized) {
          setSelectedTraits(new Set(traits.map((t) => t.name)));
        }
        setTraitsInitialized(true);
      } catch (err) {
        setTraitsError(err instanceof Error ? err.message : 'Failed to load traits');
      } finally {
        setTraitsLoading(false);
      }
    };

    loadTraits();
  }, [isOpen, sessionSelectedTraits, traitsInitialized]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setModalState('config');
      setJobId(null);
      setProgress(null);
      setResults([]);
      setErrorMessage(null);
      setTraitsInitialized(false);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }
  }, [isOpen]);

  // Poll for progress when running
  useEffect(() => {
    if (modalState !== 'running' || !jobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const progressData = await adeleApi.getBatchProgress(jobId);
        setProgress(progressData);

        if (progressData.status === 'completed') {
          clearInterval(pollInterval);
          const finalResults = await adeleApi.getBatchResults(jobId);
          setResults(finalResults);
          setModalState('complete');

          // Convert to Map and call callback
          const resultsMap = new Map<string, ClassificationResult>();
          finalResults.forEach((r) => {
            if (r.questionId) {
              resultsMap.set(r.questionId, r);
            }
          });
          onClassificationsComplete?.(resultsMap);
        } else if (progressData.status === 'failed') {
          clearInterval(pollInterval);
          setErrorMessage(progressData.error || 'Classification failed');
          setModalState('error');
        } else if (progressData.status === 'cancelled') {
          clearInterval(pollInterval);
          setErrorMessage('Classification was cancelled');
          setModalState('error');
        }
      } catch (err) {
        // Don't fail on poll errors, just log
        console.error('Poll error:', err);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [modalState, jobId, onClassificationsComplete]);

  const handleSelectAll = () => {
    setSelectedQuestionIds(new Set(questions.map((q) => q.questionId)));
  };

  const handleSelectNone = () => {
    setSelectedQuestionIds(new Set());
  };

  const handleToggleQuestion = (questionId: string) => {
    const newSet = new Set(selectedQuestionIds);
    if (newSet.has(questionId)) {
      newSet.delete(questionId);
    } else {
      newSet.add(questionId);
    }
    setSelectedQuestionIds(newSet);
  };

  const handleSelectAllTraits = () => {
    setSelectedTraits(new Set(availableTraits.map((t) => t.name)));
  };

  const handleSelectNoTraits = () => {
    setSelectedTraits(new Set());
  };

  const handleToggleTrait = (traitName: string) => {
    const newSet = new Set(selectedTraits);
    if (newSet.has(traitName)) {
      newSet.delete(traitName);
    } else {
      newSet.add(traitName);
    }
    setSelectedTraits(newSet);
  };

  const handleStartClassification = async () => {
    if (selectedQuestionIds.size === 0 || selectedTraits.size === 0) return;

    setModalState('running');
    setErrorMessage(null);

    try {
      const questionsToClassify = questions
        .filter((q) => selectedQuestionIds.has(q.questionId))
        .map((q) => ({ questionId: q.questionId, questionText: q.questionText }));

      const traitNames = Array.from(selectedTraits);
      const llmConfig = buildLlmConfig();

      const { jobId: newJobId } = await adeleApi.startBatchClassification(questionsToClassify, traitNames, llmConfig);
      setJobId(newJobId);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start classification');
      setModalState('error');
    }
  };

  const handleCancel = async () => {
    if (jobId && modalState === 'running') {
      try {
        await adeleApi.cancelBatchJob(jobId);
      } catch (err) {
        console.error('Failed to cancel:', err);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Batch ADeLe Classification
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {modalState === 'config' && (
            <div className="space-y-6">
              {/* Question selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Select Questions ({selectedQuestionIds.size} / {questions.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleSelectNone}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Select None
                    </button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-1">
                  {questions.map((q) => (
                    <label
                      key={q.questionId}
                      className="flex items-start gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.has(q.questionId)}
                        onChange={() => handleToggleQuestion(q.questionId)}
                        className="mt-1 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                        {q.questionText.slice(0, 100)}
                        {q.questionText.length > 100 ? '...' : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Trait selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Select Traits ({selectedTraits.size} / {availableTraits.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAllTraits}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleSelectNoTraits}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Select None
                    </button>
                  </div>
                </div>
                {traitsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                    <span className="ml-2 text-sm text-slate-500">Loading traits...</span>
                  </div>
                ) : traitsError ? (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                    {traitsError}
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                    <div className="grid grid-cols-2 gap-1">
                      {availableTraits.map((trait) => (
                        <label
                          key={trait.name}
                          className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer"
                          title={trait.description || trait.name}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTraits.has(trait.name)}
                            onChange={() => handleToggleTrait(trait.name)}
                            className="rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                            {trait.name.replace(/_/g, ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {modalState === 'running' && progress && (
            <div className="space-y-6">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-600" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Classifying Questions...
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{progress.message}</p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>

              <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                {progress.completed} / {progress.total} questions ({Math.round(progress.progress)}%)
              </div>
            </div>
          )}

          {modalState === 'complete' && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Classification Complete!
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Successfully classified {results.length} questions across {selectedTraits.size} traits.
                </p>
              </div>

              {/* Summary stats */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Questions:</span>{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-200">{results.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Traits:</span>{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-200">{selectedTraits.size}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {modalState === 'error' && (
            <div className="space-y-6">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Classification Failed</h3>
                <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          {modalState === 'config' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartClassification}
                disabled={selectedQuestionIds.size === 0 || selectedTraits.size === 0 || traitsLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                Start Classification
              </button>
            </>
          )}

          {modalState === 'running' && (
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/50 dark:hover:bg-red-900/70 rounded-lg transition-colors"
            >
              <StopCircle className="w-4 h-4" />
              Cancel
            </button>
          )}

          {(modalState === 'complete' || modalState === 'error') && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdeleBatchModal;
