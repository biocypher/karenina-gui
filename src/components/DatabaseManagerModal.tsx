import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Database, FolderOpen, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { UnifiedCheckpoint } from '../types';

interface DatabaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCheckpoint: (checkpoint: UnifiedCheckpoint, storageUrl?: string) => void;
}

interface BenchmarkInfo {
  id: string;
  name: string;
  total_questions: number;
  finished_count: number;
  unfinished_count: number;
}

export const DatabaseManagerModal: React.FC<DatabaseManagerModalProps> = ({ isOpen, onClose, onLoadCheckpoint }) => {
  const [storageUrl, setStorageUrl] = useState('');
  const [benchmarks, setBenchmarks] = useState<BenchmarkInfo[]>([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setStorageUrl('');
      setBenchmarks([]);
      setSelectedBenchmark(null);
      setIsConnecting(false);
      setIsLoading(false);
      setConnectionStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen]);

  const handleConnect = async () => {
    if (!storageUrl.trim()) {
      setErrorMessage('Please enter a database URL');
      return;
    }

    setIsConnecting(true);
    setErrorMessage('');
    setConnectionStatus('idle');

    try {
      // Connect to database
      const connectResponse = await fetch('/api/database/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_url: storageUrl,
          create_if_missing: true,
        }),
      });

      if (!connectResponse.ok) {
        const error = await connectResponse.json();
        throw new Error(error.detail || 'Failed to connect to database');
      }

      // Get benchmarks list
      const benchmarksResponse = await fetch(`/api/database/benchmarks?storage_url=${encodeURIComponent(storageUrl)}`);

      if (!benchmarksResponse.ok) {
        const error = await benchmarksResponse.json();
        throw new Error(error.detail || 'Failed to load benchmarks');
      }

      const data = await benchmarksResponse.json();
      setBenchmarks(data.benchmarks || []);
      setConnectionStatus('connected');
      setSelectedBenchmark(null);
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect to database');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLoadBenchmark = async () => {
    if (!selectedBenchmark) {
      setErrorMessage('Please select a benchmark');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/database/load-benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_url: storageUrl,
          benchmark_name: selectedBenchmark,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to load benchmark');
      }

      const data = await response.json();

      // Convert checkpoint_data to UnifiedCheckpoint format
      const checkpoint: UnifiedCheckpoint = {
        dataset_metadata: data.checkpoint_data.dataset_metadata,
        questions: data.checkpoint_data.questions,
        global_rubric: data.checkpoint_data.global_rubric || null,
      };

      // Pass both checkpoint and storage URL to parent
      onLoadCheckpoint(checkpoint, storageUrl);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load benchmark');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowse = () => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db,.sqlite,.sqlite3';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // For SQLite, use the file path format
        setStorageUrl(`sqlite:///${file.path || file.name}`);
      }
    };
    input.click();
  };

  const resetModal = () => {
    setStorageUrl('');
    setBenchmarks([]);
    setSelectedBenchmark(null);
    setConnectionStatus('idle');
    setErrorMessage('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Database Manager" size="lg">
      <div className="space-y-6">
        {/* Database Connection Section */}
        <div className="space-y-4">
          <div>
            <label htmlFor="storage-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Database URL
            </label>
            <div className="flex gap-2">
              <input
                id="storage-url"
                type="text"
                value={storageUrl}
                onChange={(e) => setStorageUrl(e.target.value)}
                placeholder="sqlite:///path/to/database.db or postgresql://..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isConnecting}
              />
              <button
                onClick={handleBrowse}
                disabled={isConnecting}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                         rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
                title="Browse for SQLite database file"
              >
                <FolderOpen className="h-5 w-5" />
              </button>
              <button
                onClick={handleConnect}
                disabled={isConnecting || !storageUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Database className="h-5 w-5" />
                    Connect
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Connection Status */}
          {connectionStatus === 'connected' && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>Connected successfully. Found {benchmarks.length} benchmark(s).</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Benchmarks List Section */}
        {connectionStatus === 'connected' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Available Benchmarks</h3>

            {benchmarks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No benchmarks found in this database.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {benchmarks.map((benchmark) => (
                  <button
                    key={benchmark.id}
                    onClick={() => setSelectedBenchmark(benchmark.name)}
                    className={`
                      w-full text-left px-4 py-3 rounded-lg border transition-all
                      ${
                        selectedBenchmark === benchmark.name
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{benchmark.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {benchmark.total_questions} questions
                          {benchmark.finished_count > 0 && (
                            <span className="ml-2">
                              ({benchmark.finished_count} finished, {benchmark.unfinished_count} unfinished)
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedBenchmark === benchmark.name && (
                        <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
                     rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLoadBenchmark}
            disabled={!selectedBenchmark || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Database className="h-5 w-5" />
                Load Benchmark
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
