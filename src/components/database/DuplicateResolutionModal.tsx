import React, { useState, useMemo } from 'react';
import { Loader } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { DuplicateQuestionItem } from './DuplicateQuestionItem';
import { DuplicateQuestionInfo, DuplicateResolutions } from '../../types';

interface DuplicateResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: DuplicateQuestionInfo[];
  onApplyResolutions: (resolutions: DuplicateResolutions) => Promise<void>;
}

export const DuplicateResolutionModal: React.FC<DuplicateResolutionModalProps> = ({
  isOpen,
  onClose,
  duplicates,
  onApplyResolutions,
}) => {
  // Initialize all resolutions to 'keep_new' by default
  const [resolutions, setResolutions] = useState<DuplicateResolutions>(() => {
    const initial: DuplicateResolutions = {};
    duplicates.forEach((dup) => {
      initial[dup.question_id] = 'keep_new';
    });
    return initial;
  });

  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Count resolutions
  const { keepOldCount, keepNewCount } = useMemo(() => {
    let keepOldCount = 0;
    let keepNewCount = 0;

    Object.values(resolutions).forEach((resolution) => {
      if (resolution === 'keep_old') keepOldCount++;
      else if (resolution === 'keep_new') keepNewCount++;
    });

    return { keepOldCount, keepNewCount };
  }, [resolutions]);

  const handleResolutionChange = (questionId: string, resolution: 'keep_old' | 'keep_new') => {
    setResolutions((prev) => ({
      ...prev,
      [questionId]: resolution,
    }));
  };

  const setAllResolutions = (resolution: 'keep_old' | 'keep_new') => {
    const newResolutions: DuplicateResolutions = {};
    duplicates.forEach((dup) => {
      newResolutions[dup.question_id] = resolution;
    });
    setResolutions(newResolutions);
  };

  const handleKeepAllOld = () => setAllResolutions('keep_old');
  const handleKeepAllNew = () => setAllResolutions('keep_new');

  const handleApply = async () => {
    setIsApplying(true);
    setError(null);

    try {
      await onApplyResolutions(resolutions);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply resolutions');
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancel = () => {
    if (!isApplying) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={`Duplicate Questions Found (${duplicates.length})`} size="xl">
      <div className="flex flex-col h-full max-h-[70vh]">
        {/* Info Message */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            The following questions already exist in the selected benchmark. Choose whether to keep the existing version
            (old) or update with the new version for each question.
          </p>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={handleKeepAllOld}
              disabled={isApplying}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50
                       text-red-700 dark:text-red-300 rounded-lg transition-colors text-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keep All Old
            </button>
            <button
              onClick={handleKeepAllNew}
              disabled={isApplying}
              className="px-4 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50
                       text-green-700 dark:text-green-300 rounded-lg transition-colors text-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keep All New
            </button>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-red-600 dark:text-red-400">{keepOldCount} keep old</span>
            {' | '}
            <span className="font-medium text-green-600 dark:text-green-400">{keepNewCount} keep new</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Scrollable Duplicate List */}
        <div className="flex-1 overflow-y-auto pr-2">
          {duplicates.map((duplicate) => (
            <DuplicateQuestionItem
              key={duplicate.question_id}
              duplicate={duplicate}
              resolution={resolutions[duplicate.question_id] || 'keep_new'}
              onResolutionChange={handleResolutionChange}
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t dark:border-gray-700">
          <button
            onClick={handleCancel}
            disabled={isApplying}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                     hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            disabled={isApplying}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700
                     text-white rounded-lg transition-colors flex items-center gap-2
                     disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isApplying ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Applying...
              </>
            ) : (
              `Apply Selections (${keepOldCount} old, ${keepNewCount} new)`
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
