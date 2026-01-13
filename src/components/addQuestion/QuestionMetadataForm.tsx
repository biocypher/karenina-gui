import React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface QuestionMetadataFormProps {
  author: string;
  keywords: string;
  onAuthorChange: (value: string) => void;
  onKeywordsChange: (value: string) => void;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const QuestionMetadataForm: React.FC<QuestionMetadataFormProps> = ({
  author,
  keywords,
  onAuthorChange,
  onKeywordsChange,
  disabled = false,
}) => {
  return (
    <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Optional Metadata</h4>

      {/* Author Field */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Author</label>
        <input
          type="text"
          value={author}
          onChange={(e) => onAuthorChange(e.target.value)}
          placeholder="Question author name..."
          disabled={disabled}
          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Keywords Field */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Keywords (comma-separated)
        </label>
        <input
          type="text"
          value={keywords}
          onChange={(e) => onKeywordsChange(e.target.value)}
          placeholder="e.g., math, geometry, basic"
          disabled={disabled}
          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
};
