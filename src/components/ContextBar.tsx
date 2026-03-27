import React, { useState } from 'react';
import { Pencil, Copy, Trash2 } from 'lucide-react';

interface ContextBarProps {
  question: string;
  rawAnswer: string | null;
  answerNotes: string | null;
  onEditQuestion: () => void;
  onDelete: () => void;
  onClone: () => void;
  disabled: boolean;
}

export const ContextBar: React.FC<ContextBarProps> = ({
  question,
  rawAnswer,
  answerNotes,
  onEditQuestion,
  onDelete,
  onClone,
  disabled,
}) => {
  const [expandedSection, setExpandedSection] = useState<'question' | 'answer' | 'notes' | null>(null);

  const toggleSection = (section: 'question' | 'answer' | 'notes') => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 px-6 py-3">
      <div className="flex items-center gap-4">
        {/* Raw Question */}
        <div
          className="flex-1 min-w-0 flex items-center gap-2"
          data-expanded={expandedSection === 'question' ? 'true' : 'false'}
        >
          <span className="flex-shrink-0 text-xs font-bold uppercase bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
            Q
          </span>
          <span
            className={`text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 ${
              expandedSection === 'question' ? 'whitespace-normal' : 'truncate'
            }`}
            onClick={() => toggleSection('question')}
            title={question}
          >
            {question}
          </span>
          <button
            onClick={onEditQuestion}
            className="flex-shrink-0 p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
            title="Edit question and answer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 flex-shrink-0" />

        {/* Raw Answer */}
        <div
          className="flex-1 min-w-0 flex items-center gap-2"
          data-expanded={expandedSection === 'answer' ? 'true' : 'false'}
        >
          <span className="flex-shrink-0 text-xs font-bold uppercase bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
            A
          </span>
          <span
            className={`text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 ${
              expandedSection === 'answer' ? 'whitespace-normal' : 'truncate'
            }`}
            onClick={() => toggleSection('answer')}
            title={rawAnswer || ''}
          >
            {rawAnswer || '(no answer)'}
          </span>
          <button
            onClick={onEditQuestion}
            className="flex-shrink-0 p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors"
            title="Edit question and answer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Answer Notes (conditional) */}
        {answerNotes && (
          <>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 flex-shrink-0" />
            <div
              className="flex-shrink-0 flex items-center gap-2 max-w-[200px]"
              data-expanded={expandedSection === 'notes' ? 'true' : 'false'}
            >
              <span className="flex-shrink-0 text-xs font-bold uppercase bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">
                N
              </span>
              <span
                className={`text-sm text-amber-700 dark:text-amber-300 cursor-pointer ${
                  expandedSection === 'notes' ? 'whitespace-normal' : 'truncate'
                }`}
                onClick={() => toggleSection('notes')}
                title={answerNotes}
              >
                {answerNotes}
              </span>
            </div>
          </>
        )}

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 flex-shrink-0" />

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onClone}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 hover:from-indigo-200 hover:to-blue-200 border border-indigo-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed dark:from-indigo-900/50 dark:to-blue-900/50 dark:text-indigo-300 dark:border-indigo-700"
            title="Clone question"
          >
            <Copy className="w-3 h-3" />
            Clone
          </button>
          <button
            onClick={onDelete}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-red-100 to-rose-100 text-red-700 hover:from-red-200 hover:to-rose-200 border border-red-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed dark:from-red-900/50 dark:to-rose-900/50 dark:text-red-300 dark:border-red-700"
            title="Delete question"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
