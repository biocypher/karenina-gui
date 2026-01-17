import React, { useState } from 'react';
import { AlertTriangle, Loader, Trash2, X, Database, FileText } from 'lucide-react';
import { csrf } from '../../utils/csrf';
import { API_ENDPOINTS } from '../../constants/api';

interface BenchmarkInfo {
  id: string;
  name: string;
  total_questions: number;
  finished_count: number;
  unfinished_count: number;
  last_modified?: string;
}

interface DeleteBenchmarkModalProps {
  benchmark: BenchmarkInfo;
  storageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export const DeleteBenchmarkModal: React.FC<DeleteBenchmarkModalProps> = ({
  benchmark,
  storageUrl,
  isOpen,
  onClose,
  onDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await csrf.fetchWithCsrf(API_ENDPOINTS.DATABASE_DELETE, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_url: storageUrl,
          benchmark_name: benchmark.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete benchmark');
      }

      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete benchmark');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Warning icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">Delete Benchmark</h3>

        {/* Warning message */}
        <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to delete this benchmark? This will permanently delete all questions and verification
          results associated with it.
        </p>

        {/* Benchmark info */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{benchmark.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span>
              {benchmark.total_questions} question{benchmark.total_questions !== 1 ? 's' : ''}
              {benchmark.finished_count > 0 && (
                <span className="ml-1">
                  ({benchmark.finished_count} finished, {benchmark.unfinished_count} unfinished)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700
                     hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700
                     rounded-lg transition-colors flex items-center justify-center gap-2
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
