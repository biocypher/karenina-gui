import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Save, FileText, Maximize2, Filter } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import type { QuestionData } from '../types';

interface ExpandedEditorProps {
  // Editor content
  value: string;
  onChange: (value: string) => void;
  originalCode: string;
  savedCode: string;

  // Question context
  selectedQuestion: QuestionData[string];
  questionIndex: number;
  totalQuestions: number;

  // Navigation
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;

  // Controls
  onClose: () => void;
  onSave: () => void;
  onToggleFinished: () => void;
  isFinished: boolean;

  // Filter support
  questionFilter?: 'all' | 'finished' | 'unfinished';
  onFilterChange?: (filter: 'all' | 'finished' | 'unfinished') => void;
  hasCheckpointData?: boolean;
}

export const ExpandedEditor: React.FC<ExpandedEditorProps> = ({
  value,
  onChange,
  originalCode,
  savedCode,
  selectedQuestion,
  questionIndex,
  totalQuestions,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  onClose,
  onSave,
  onToggleFinished,
  isFinished,
  questionFilter = 'all',
  onFilterChange,
  hasCheckpointData = false,
}) => {
  const [showFullQuestion, setShowFullQuestion] = useState(false);
  const [showFullAnswer, setShowFullAnswer] = useState(false);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Navigation shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            if (canGoPrevious) onPrevious();
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (canGoNext) onNext();
            break;
          case 's':
            e.preventDefault();
            onSave();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrevious, onNext, canGoPrevious, canGoNext, onSave]);

  // Prevent body scroll when expanded
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Close and Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              title="Exit full-screen (Esc)"
            >
              <X className="w-5 h-5" />
              <span className="font-medium">Close</span>
            </button>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevious}
                disabled={!canGoPrevious}
                className="flex items-center gap-1 px-3 py-2 bg-slate-600 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                title="Previous question (Ctrl/Cmd + Left)"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold">
                {questionIndex + 1} of {totalQuestions}
              </div>

              <button
                onClick={onNext}
                disabled={!canGoNext}
                className="flex items-center gap-1 px-3 py-2 bg-slate-600 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                title="Next question (Ctrl/Cmd + Right)"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Dropdown - only show if we have checkpoint data */}
            {hasCheckpointData && onFilterChange && (
              <div className="relative">
                <select
                  value={questionFilter}
                  onChange={(e) => onFilterChange(e.target.value as 'all' | 'finished' | 'unfinished')}
                  className="pl-8 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                >
                  <option value="all">Show All</option>
                  <option value="finished">Finished Only</option>
                  <option value="unfinished">Unfinished Only</option>
                </select>
                <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-3 h-3 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Center: Question Indicator */}
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Maximize2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Answer Template Editor</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleFinished}
              className={`px-4 py-2 rounded-xl font-medium transition-colors text-sm ${
                isFinished
                  ? 'bg-slate-600 dark:bg-slate-500 text-white hover:bg-slate-700 dark:hover:bg-slate-400'
                  : 'bg-emerald-600 dark:bg-emerald-700 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600'
              }`}
            >
              {isFinished ? 'Mark Unfinished' : 'Flag as Finished'}
            </button>

            <button
              onClick={onSave}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors text-sm font-medium"
              title="Save changes (Ctrl/Cmd + S)"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Compact Question Context Bar */}
      <div className="flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 px-6 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
          {/* Raw Question */}
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold min-w-0">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="flex-shrink-0">Question:</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {showFullQuestion ? (
                  <div>
                    <p>{selectedQuestion.question}</p>
                    <button
                      onClick={() => setShowFullQuestion(false)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium mt-1"
                    >
                      Show less
                    </button>
                  </div>
                ) : (
                  <div>
                    <span>{truncateText(selectedQuestion.question, 120)}</span>
                    {selectedQuestion.question.length > 120 && (
                      <button
                        onClick={() => setShowFullQuestion(true)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium ml-2"
                      >
                        Show more
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Raw Answer */}
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold min-w-0">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="flex-shrink-0">Answer:</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {showFullAnswer ? (
                  <div>
                    <p>{selectedQuestion.raw_answer}</p>
                    <button
                      onClick={() => setShowFullAnswer(false)}
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium mt-1"
                    >
                      Show less
                    </button>
                  </div>
                ) : (
                  <div>
                    <span>{truncateText(selectedQuestion.raw_answer, 120)}</span>
                    {selectedQuestion.raw_answer.length > 120 && (
                      <button
                        onClick={() => setShowFullAnswer(true)}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium ml-2"
                      >
                        Show more
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Maximized Editor Area */}
      <div className="flex-1 min-h-0 p-6">
        <div className="h-full">
          <CodeEditor
            value={value}
            onChange={onChange}
            onSave={onSave}
            originalCode={originalCode}
            savedCode={savedCode}
            enableFormEditor={true}
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 px-6 py-2">
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-6">
          <span>
            <kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded">Esc</kbd> Close
          </span>
          <span>
            <kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded">Ctrl</kbd> +{' '}
            <kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded">←/→</kbd> Navigate
          </span>
          <span>
            <kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded">Ctrl</kbd> +{' '}
            <kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded">S</kbd> Save
          </span>
        </div>
      </div>
    </div>
  );
};
