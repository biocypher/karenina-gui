import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Database, Loader, Save, Upload } from 'lucide-react';
import { BenchmarkCard } from './BenchmarkCard';
import { CreateBenchmarkForm } from './CreateBenchmarkForm';
import { DuplicateResolutionModal } from './DuplicateResolutionModal';
import { ImportResultsModal } from './ImportResultsModal';
import { DeleteBenchmarkModal } from './DeleteBenchmarkModal';
import {
  UnifiedCheckpoint,
  DuplicateQuestionInfo,
  DuplicateResolutions,
  DatasetMetadata,
  Checkpoint,
  Rubric,
} from '../../types';
import { useQuestionStore } from '../../stores/useQuestionStore';
import { useDatasetStore } from '../../stores/useDatasetStore';
import { useRubricStore } from '../../stores/useRubricStore';
import { logger } from '../../utils/logger';
import { createDatabaseApiService, type DatabaseApiService, DatabaseApiError } from '../../services/databaseApi';

interface BenchmarkInfo {
  id: string;
  name: string;
  total_questions: number;
  finished_count: number;
  unfinished_count: number;
  last_modified?: string;
}

interface DatabaseManageTabProps {
  storageUrl: string;
  onLoadBenchmark: (checkpoint: UnifiedCheckpoint, benchmarkName: string) => void;
}

export const DatabaseManageTab: React.FC<DatabaseManageTabProps> = ({ storageUrl, onLoadBenchmark }) => {
  // Zustand stores
  const { checkpoint } = useQuestionStore();
  const { metadata } = useDatasetStore();
  const { currentRubric } = useRubricStore();

  // Local state
  const [benchmarks, setBenchmarks] = useState<BenchmarkInfo[]>([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBenchmark, setIsLoadingBenchmark] = useState(false);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Duplicate resolution state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateQuestionInfo[]>([]);

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);

  // Delete benchmark modal state
  const [benchmarkToDelete, setBenchmarkToDelete] = useState<BenchmarkInfo | null>(null);

  // Database API service - created with useMemo to avoid recreating on every render
  const databaseApi: DatabaseApiService = useMemo(() => createDatabaseApiService({ storageUrl }), [storageUrl]);

  // Check if we have questions loaded in memory
  const hasQuestionsInMemory = Object.keys(checkpoint).length > 0;

  // Load benchmarks list when component mounts or storageUrl changes
  useEffect(() => {
    loadBenchmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageUrl]);

  const loadBenchmarks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiBenchmarks = await databaseApi.getBenchmarks();

      // Map API response to component's BenchmarkInfo format
      const mappedBenchmarks: BenchmarkInfo[] = apiBenchmarks.map((b) => ({
        id: b.name,
        name: b.name,
        total_questions: b.question_count,
        finished_count: 0, // Not provided by API
        unfinished_count: 0, // Not provided by API
        last_modified: b.updated_at,
      }));

      setBenchmarks(mappedBenchmarks);
    } catch (err) {
      if (err instanceof DatabaseApiError) {
        setError(err.message);
      } else {
        setError('Failed to load benchmarks');
      }
      logger.error('DATABASE', 'Failed to load benchmarks', 'DatabaseManageTab', { error: err });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuccess = async (benchmarkName: string) => {
    // Reload benchmarks list
    await loadBenchmarks();

    // Close the create form
    setShowCreateForm(false);

    // Select the newly created benchmark (but don't load it)
    setSelectedBenchmark(benchmarkName);
  };

  const handleLoadBenchmark = async (benchmarkName?: string) => {
    const nameToLoad = benchmarkName || selectedBenchmark;

    if (!nameToLoad) {
      setError('Please select a benchmark');
      return;
    }

    setIsLoadingBenchmark(true);
    setError(null);

    try {
      databaseApi.setBenchmarkName(nameToLoad);
      const data = await databaseApi.loadBenchmark(nameToLoad);

      // Convert checkpoint_data to UnifiedCheckpoint format
      const checkpoint: UnifiedCheckpoint = {
        version: '2.0',
        dataset_metadata: data.checkpoint_data.dataset_metadata,
        checkpoint: data.checkpoint_data.questions,
        global_rubric: data.checkpoint_data.global_rubric || null,
      };

      // Pass to parent component
      onLoadBenchmark(checkpoint, nameToLoad);
    } catch (err) {
      if (err instanceof DatabaseApiError) {
        setError(err.message);
      } else {
        setError('Failed to load benchmark');
      }
      logger.error('DATABASE', 'Failed to load benchmark', 'DatabaseManageTab', {
        error: err,
        benchmarkName: nameToLoad,
      });
    } finally {
      setIsLoadingBenchmark(false);
    }
  };

  const handleSaveToSelectedBenchmark = async () => {
    if (!selectedBenchmark) {
      setError('Please select a benchmark');
      return;
    }

    if (!hasQuestionsInMemory) {
      setError('No questions loaded in memory to export');
      return;
    }

    setIsSavingQuestions(true);
    setError(null);

    try {
      // Build checkpoint data in the format expected by the API
      const checkpointData = {
        dataset_metadata: metadata,
        questions: checkpoint,
        global_rubric: currentRubric,
      };

      // Set the benchmark name for the API service
      databaseApi.setBenchmarkName(selectedBenchmark);

      // First, detect duplicates
      const data = await databaseApi.saveBenchmark(checkpointData, true);

      // If duplicates found, show resolution modal
      if (data.duplicates && data.duplicates.length > 0) {
        logger.debugLog('DATABASE', `Found ${data.duplicates.length} duplicate question(s)`, 'DatabaseManageTab');
        setDuplicates(data.duplicates);
        setShowDuplicateModal(true);
      } else {
        // No duplicates, proceed with normal save
        await performSave(checkpointData);
      }
    } catch (err) {
      if (err instanceof DatabaseApiError) {
        setError(err.message);
      } else {
        setError('Failed to export questions to benchmark');
      }
      logger.error('DATABASE', 'Failed to save benchmark', 'DatabaseManageTab', { error: err });
      setIsSavingQuestions(false);
    }
  };

  const performSave = async (checkpointData: {
    dataset_metadata: DatasetMetadata;
    questions: Checkpoint;
    global_rubric: Rubric | null;
  }) => {
    try {
      await databaseApi.saveBenchmark(checkpointData, false);

      // Success - show message and reload benchmarks list to reflect updated counts
      logger.debugLog(
        'DATABASE',
        `Successfully exported ${Object.keys(checkpoint).length} questions to benchmark '${selectedBenchmark}'`,
        'DatabaseManageTab'
      );

      // Reload benchmarks to show updated question counts
      await loadBenchmarks();

      // Clear any previous errors
      setError(null);
    } catch (err) {
      if (err instanceof DatabaseApiError) {
        setError(err.message);
      } else {
        setError('Failed to export questions to benchmark');
      }
      logger.error('DATABASE', 'Failed to perform save', 'DatabaseManageTab', { error: err });
    } finally {
      setIsSavingQuestions(false);
    }
  };

  // Handle delete benchmark
  const handleDeleteBenchmark = (benchmark: BenchmarkInfo) => {
    setBenchmarkToDelete(benchmark);
  };

  const handleDeleteSuccess = () => {
    setBenchmarkToDelete(null);
    // Clear selection if we deleted the selected benchmark
    if (selectedBenchmark === benchmarkToDelete?.name) {
      setSelectedBenchmark(null);
    }
    // Reload benchmarks list
    loadBenchmarks();
  };

  const handleApplyResolutions = async (resolutions: DuplicateResolutions) => {
    if (!selectedBenchmark) {
      throw new Error('No benchmark selected');
    }

    // Build checkpoint data
    const checkpointData = {
      dataset_metadata: metadata,
      questions: checkpoint,
      global_rubric: currentRubric,
    };

    try {
      // Set the benchmark name for the API service
      databaseApi.setBenchmarkName(selectedBenchmark);

      // Call resolve-duplicates endpoint
      const data = await databaseApi.resolveDuplicates(checkpointData, resolutions);

      // Success - reload benchmarks list
      logger.debugLog('DATABASE', data.message, 'DatabaseManageTab');
      await loadBenchmarks();

      // Clear state
      setIsSavingQuestions(false);
      setError(null);
    } catch (err) {
      if (err instanceof DatabaseApiError) {
        setError(err.message);
      } else {
        setError('Failed to resolve duplicates');
      }
      logger.error('DATABASE', 'Failed to resolve duplicates', 'DatabaseManageTab', { error: err });
      setIsSavingQuestions(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create New Benchmark / Import Results Buttons */}
      {!showCreateForm ? (
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700
                     text-white rounded-lg transition-colors flex items-center justify-center gap-2
                     shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            Create New Benchmark
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            disabled={!selectedBenchmark}
            className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600
                     text-white rounded-lg transition-colors flex items-center justify-center gap-2
                     shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            title={!selectedBenchmark ? 'Select a benchmark first' : 'Import verification results from JSON'}
          >
            <Upload className="w-5 h-5" />
            Import Results
          </button>
        </div>
      ) : (
        <CreateBenchmarkForm
          storageUrl={storageUrl}
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Existing Benchmarks Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Existing Benchmarks {benchmarks.length > 0 && `(${benchmarks.length})`}
        </h3>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : /* Error State */
        error && !isLoadingBenchmark ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : /* Empty State */
        benchmarks.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No benchmarks found in this database.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create a new benchmark to get started.</p>
          </div>
        ) : (
          /* Benchmarks List */
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {benchmarks.map((benchmark) => (
              <BenchmarkCard
                key={benchmark.id}
                id={benchmark.id}
                name={benchmark.name}
                totalQuestions={benchmark.total_questions}
                finishedCount={benchmark.finished_count}
                unfinishedCount={benchmark.unfinished_count}
                lastModified={benchmark.last_modified}
                isSelected={selectedBenchmark === benchmark.name}
                onClick={() => setSelectedBenchmark(benchmark.name)}
                onDelete={() => handleDeleteBenchmark(benchmark)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {benchmarks.length > 0 && (
        <div className="flex justify-end gap-3">
          {/* Export Current Questions Button */}
          <button
            onClick={handleSaveToSelectedBenchmark}
            disabled={!selectedBenchmark || !hasQuestionsInMemory || isSavingQuestions || isLoadingBenchmark}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700
                     text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                     disabled:transform-none"
            title={
              !selectedBenchmark
                ? 'Select a benchmark first'
                : !hasQuestionsInMemory
                  ? 'No questions loaded in memory'
                  : 'Export current questions to selected benchmark'
            }
          >
            {isSavingQuestions ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Export current quest. to Benchmark
              </>
            )}
          </button>

          {/* Load Benchmark Button */}
          <button
            onClick={() => handleLoadBenchmark()}
            disabled={!selectedBenchmark || isLoadingBenchmark || isSavingQuestions}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700
                     text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                     disabled:transform-none"
          >
            {isLoadingBenchmark ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                Load Selected Benchmark
              </>
            )}
          </button>
        </div>
      )}

      {/* Duplicate Resolution Modal */}
      <DuplicateResolutionModal
        isOpen={showDuplicateModal}
        onClose={() => {
          setShowDuplicateModal(false);
          setIsSavingQuestions(false); // Reset saving state when modal is closed
        }}
        duplicates={duplicates}
        onApplyResolutions={handleApplyResolutions}
      />

      {/* Import Results Modal */}
      <ImportResultsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        storageUrl={storageUrl}
        benchmarkName={selectedBenchmark}
        onImportSuccess={() => {
          // Optionally refresh benchmarks list or show success message
          loadBenchmarks();
        }}
      />

      {/* Delete Benchmark Modal */}
      {benchmarkToDelete && (
        <DeleteBenchmarkModal
          benchmark={benchmarkToDelete}
          storageUrl={storageUrl}
          isOpen={true}
          onClose={() => setBenchmarkToDelete(null)}
          onDeleted={handleDeleteSuccess}
        />
      )}
    </div>
  );
};
