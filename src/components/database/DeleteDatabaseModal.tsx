import React, { useState } from 'react';
import { AlertTriangle, Loader, Trash2, X } from 'lucide-react';
import { csrf } from '../../utils/csrf';
import { API_ENDPOINTS } from '../../constants/api';

interface DatabaseInfo {
  name: string;
  path: string;
  size: number | null;
}

interface DeleteDatabaseModalProps {
  database: DatabaseInfo;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export const DeleteDatabaseModal: React.FC<DeleteDatabaseModalProps> = ({ database, isOpen, onClose, onDeleted }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatSize = (bytes: number | null): string => {
    if (bytes === null) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const storageUrl = `sqlite:///${database.path}`;
      const response = await csrf.fetchWithCsrf(API_ENDPOINTS.DATABASE_DELETE_DB, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storage_url: storageUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete database');
      }

      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete database');
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
        <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">Delete Database</h3>

        {/* Warning message */}
        <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to delete this database? This action cannot be undone.
        </p>

        {/* Database info */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <Trash2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{database.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatSize(database.size)}</p>
            </div>
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
