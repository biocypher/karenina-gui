import React, { useState, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Upload, Loader, AlertCircle, CheckCircle, FileJson } from 'lucide-react';
import { csrf } from '../../utils/csrf';
import { validateJsonFile } from '../../utils/fileValidator';
import { API_ENDPOINTS } from '../../constants/api';

interface ImportResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageUrl: string;
  benchmarkName: string | null;
  onImportSuccess: () => void;
}

export const ImportResultsModal: React.FC<ImportResultsModalProps> = ({
  isOpen,
  onClose,
  storageUrl,
  benchmarkName,
  onImportSuccess,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ run_id: string; count: number } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customRunName, setCustomRunName] = useState('');

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Use centralized file validation with proper MIME type checking
      const validation = await validateJsonFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Please select a valid JSON file');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      // Use centralized file validation with proper MIME type checking
      const validation = await validateJsonFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Please drop a valid JSON file');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleImport = async () => {
    if (!selectedFile || !benchmarkName) {
      setError('Please select a file and ensure a benchmark is selected');
      return;
    }

    setIsImporting(true);
    setError(null);
    setSuccess(null);

    try {
      // Read the file
      const fileContent = await selectedFile.text();
      let jsonData: Record<string, unknown>;

      try {
        jsonData = JSON.parse(fileContent);
      } catch {
        throw new Error('Invalid JSON file');
      }

      // Send to import endpoint
      const response = await csrf.fetchWithCsrf(API_ENDPOINTS.DATABASE_IMPORT_RESULTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storage_url: storageUrl,
          json_data: jsonData,
          benchmark_name: benchmarkName,
          run_name: customRunName || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to import results');
      }

      const data = await response.json();
      setSuccess({
        run_id: data.run_id,
        count: data.imported_count,
      });

      // Notify parent
      onImportSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import results');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    setCustomRunName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Verification Results" size="md">
      <div className="space-y-6">
        {/* Benchmark Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="text-sm text-blue-700 dark:text-blue-300">
            Importing to benchmark: <strong>{benchmarkName || '(none selected)'}</strong>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${
              selectedFile
                ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
            }
          `}
        >
          {selectedFile ? (
            <div className="space-y-2">
              <FileJson className="w-12 h-12 text-green-500 mx-auto" />
              <p className="font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-gray-600 dark:text-gray-300">
                  Drop a JSON file here or{' '}
                  <label className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                    browse
                    <input type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
                  </label>
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Supports Karenina JSON export format</p>
              </div>
            </div>
          )}
        </div>

        {/* Optional Run Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Run Name (optional)</label>
          <input
            type="text"
            value={customRunName}
            onChange={(e) => setCustomRunName(e.target.value)}
            placeholder="Leave empty to auto-generate"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-600 dark:text-green-400">
              <p className="font-medium">Import successful!</p>
              <p>Imported {success.count} verification results</p>
              <p className="text-xs text-green-500 dark:text-green-500 mt-1">Run ID: {success.run_id}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {success ? 'Close' : 'Cancel'}
          </button>
          {!success && (
            <button
              onClick={handleImport}
              disabled={!selectedFile || !benchmarkName || isImporting}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700
                       text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import Results
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
