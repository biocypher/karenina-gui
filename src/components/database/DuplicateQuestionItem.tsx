import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DuplicateQuestionInfo, DuplicateResolution } from '../../types';

interface DuplicateQuestionItemProps {
  duplicate: DuplicateQuestionInfo;
  resolution: DuplicateResolution;
  onResolutionChange: (questionId: string, resolution: DuplicateResolution) => void;
}

export const DuplicateQuestionItem: React.FC<DuplicateQuestionItemProps> = ({
  duplicate,
  resolution,
  onResolutionChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderFieldComparison = (label: string, oldValue: unknown, newValue: unknown) => {
    const oldStr = typeof oldValue === 'object' ? JSON.stringify(oldValue, null, 2) : String(oldValue || '');
    const newStr = typeof newValue === 'object' ? JSON.stringify(newValue, null, 2) : String(newValue || '');
    const isDifferent = oldStr !== newStr;

    return (
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</h4>
        <div className="grid grid-cols-2 gap-4">
          {/* Old Version */}
          <div
            className={`p-3 rounded border ${
              isDifferent
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          >
            <pre className="text-xs whitespace-pre-wrap break-words font-mono text-gray-900 dark:text-gray-100">
              {oldStr}
            </pre>
          </div>

          {/* New Version */}
          <div
            className={`p-3 rounded border ${
              isDifferent
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          >
            <pre className="text-xs whitespace-pre-wrap break-words font-mono text-gray-900 dark:text-gray-100">
              {newStr}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-3">
      {/* Collapsible Header */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>

          {/* Question Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
              {truncateText(duplicate.question_text)}
            </p>
          </div>

          {/* Radio Buttons */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`resolution-${duplicate.question_id}`}
                value="keep_old"
                checked={resolution === 'keep_old'}
                onChange={() => onResolutionChange(duplicate.question_id, 'keep_old')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Keep Old</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`resolution-${duplicate.question_id}`}
                value="keep_new"
                checked={resolution === 'keep_new'}
                onChange={() => onResolutionChange(duplicate.question_id, 'keep_new')}
                className="w-4 h-4 text-green-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Keep New</span>
            </label>
          </div>
        </div>
      </div>

      {/* Expanded Comparison View */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
          {/* Headers */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white">Current in Database (Old)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last modified: {formatDate(duplicate.old_version.last_modified)}
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white">New from Session</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last modified: {formatDate(duplicate.new_version.last_modified)}
              </p>
            </div>
          </div>

          {/* Field Comparisons */}
          <div className="space-y-4">
            {renderFieldComparison('Question Text', duplicate.old_version.question, duplicate.new_version.question)}
            {renderFieldComparison('Raw Answer', duplicate.old_version.raw_answer, duplicate.new_version.raw_answer)}
            {renderFieldComparison(
              'Answer Template',
              duplicate.old_version.answer_template,
              duplicate.new_version.answer_template
            )}
            {renderFieldComparison('Finished Status', duplicate.old_version.finished, duplicate.new_version.finished)}
            {renderFieldComparison('Tags', duplicate.old_version.tags, duplicate.new_version.tags)}
            {renderFieldComparison('Keywords', duplicate.old_version.keywords, duplicate.new_version.keywords)}
            {renderFieldComparison(
              'Few-shot Examples',
              duplicate.old_version.few_shot_examples,
              duplicate.new_version.few_shot_examples
            )}
            {renderFieldComparison(
              'Question Rubric',
              duplicate.old_version.question_rubric,
              duplicate.new_version.question_rubric
            )}
          </div>
        </div>
      )}
    </div>
  );
};
