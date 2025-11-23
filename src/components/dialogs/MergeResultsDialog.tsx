import React, { useState } from 'react';
import { Upload, Replace, Merge, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';

export type MergeAction = 'replace' | 'merge' | 'cancel';

interface MergeResultsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: MergeAction) => void;
  uploadedCount: number;
  existingCount: number;
  conflictCount: number;
  totalAfterMerge: number;
}

export const MergeResultsDialog: React.FC<MergeResultsDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  uploadedCount,
  existingCount,
  conflictCount,
  totalAfterMerge,
}) => {
  const [selectedAction, setSelectedAction] = useState<'replace' | 'merge'>('replace');

  const handleConfirm = () => {
    onConfirm(selectedAction);
  };

  const handleCancel = () => {
    onConfirm('cancel');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Upload Verification Results" size="lg">
      <div className="flex flex-col gap-4">
        {/* Info Message */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-start gap-3">
            <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                Ready to upload {uploadedCount} result{uploadedCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                From {new Set(Array.from({ length: uploadedCount })).size} question{uploadedCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Conflict Warning */}
        {existingCount > 0 && conflictCount > 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                  {conflictCount} result{conflictCount !== 1 ? 's' : ''} already exist
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Choose how to handle the existing results below
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Uploaded Results</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{uploadedCount}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Results</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{existingCount}</p>
          </div>
        </div>

        {/* Action Selection */}
        {existingCount > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              What would you like to do with existing results?
            </p>

            {/* Replace Option */}
            <button
              onClick={() => setSelectedAction('replace')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedAction === 'replace'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    selectedAction === 'replace' ? 'border-red-500 bg-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {selectedAction === 'replace' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Replace className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <p className="font-medium text-gray-900 dark:text-gray-100">Replace existing results</p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Clear all current results and load only the uploaded data. Current results will be lost.
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                    Final count: {uploadedCount} results
                  </p>
                </div>
              </div>
            </button>

            {/* Merge Option */}
            <button
              onClick={() => setSelectedAction('merge')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedAction === 'merge'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    selectedAction === 'merge'
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {selectedAction === 'merge' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Merge className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <p className="font-medium text-gray-900 dark:text-gray-100">Merge with existing results</p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Combine uploaded results with current results. Uploaded data will overwrite conflicts.
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                    Final count: {totalAfterMerge} results ({conflictCount} conflicts, uploaded data wins)
                  </p>
                </div>
              </div>
            </button>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              No existing results found. {uploadedCount} result{uploadedCount !== 1 ? 's' : ''} will be loaded.
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-gray-700">
          <button
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                     hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            className={`px-6 py-2 rounded-lg transition-colors text-white shadow-lg ${
              selectedAction === 'replace'
                ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
            }`}
          >
            {existingCount > 0
              ? selectedAction === 'replace'
                ? 'Replace and Load'
                : 'Merge and Load'
              : 'Load Results'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
